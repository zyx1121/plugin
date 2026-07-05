#!/usr/bin/env python3
"""Tests for armarium.gen_memory_index — hot/cold tiering, budget eviction, row
format, and the CC-writer-aligned lint (>160-char description warning).
Run:  python3 armarium/test_gen_memory_index.py

See armarium/test_armarium.py for frontmatter parsing, bad-type/orphan-link/
unquoted-desc lint, and the memory-sync.sh subprocess smoke tests (unchanged
plumbing this file doesn't re-cover).
"""
from __future__ import annotations

import contextlib
import importlib.util
import io
import re
import unittest
from pathlib import Path
from tempfile import TemporaryDirectory

HERE = Path(__file__).resolve().parent
_spec = importlib.util.spec_from_file_location("gen_memory_index", str(HERE / "gen_memory_index.py"))
gmi = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(gmi)


def _write(path: Path, **fm) -> None:
    """Write a memory file with the given frontmatter keys (insertion order) + a body."""
    lines = ["---", *(f"{k}: {v}" for k, v in fm.items()), "---", "body"]
    path.write_text("\n".join(lines))


class RowFormatTest(unittest.TestCase):
    """Item 1 — CC-writer-aligned row format; slug appears exactly once."""

    def test_title_present_uses_markdown_link(self):
        with TemporaryDirectory() as d:
            mem = Path(d)
            _write(mem / "feedback_a.md", title="A", description="desc", type="feedback")
            rows, _ = gmi.build_rows(mem)
            self.assertEqual(rows, ["- [A](feedback_a.md) — desc"])

    def test_no_title_uses_bare_link_not_markdown_link(self):
        with TemporaryDirectory() as d:
            mem = Path(d)
            _write(mem / "feedback_b.md", description="desc", type="feedback")
            rows, _ = gmi.build_rows(mem)
            self.assertEqual(rows, ["- feedback_b.md — desc"])
            self.assertNotIn("[", rows[0])                       # no markdown-link wrapper
            self.assertEqual(rows[0].count("feedback_b.md"), 1)  # slug appears exactly once


class TitleBracketEscapeTest(unittest.TestCase):
    """Pre-existing bug found during PR #11 adversarial review (reproduced against
    pre-#11 code — NOT introduced by #11): a frontmatter `title` containing `[`/`]`/`\\`
    was interpolated unescaped into the markdown link-text span, e.g. title
    `weird ] bracket` -> `- [weird ] bracket](link)`, where the bare `]` closes the
    `[...]` span early and produces a malformed link. `_row()` now escapes the title
    via `_escape_link_text()`; the link target and description are untouched."""

    # A row is a well-formed markdown link only if the `[...]` span ends at an
    # *unescaped* `]` immediately followed by `(` — every char before it must be
    # either an escaped pair (`\\.`) or a non-metacharacter. This also means a
    # regressed (unescaped) row — e.g. `- [weird ] bracket](x.md) — d` — fails to
    # match at all, since the bare `]` can't be consumed by either alternative.
    LINK_ROW_RE = re.compile(r"^- \[((?:\\.|[^\[\]\\])*)\]\(([^()]+)\) — (.*)$")

    @staticmethod
    def _unescape(s: str) -> str:
        out, i = [], 0
        while i < len(s):
            if s[i] == "\\" and i + 1 < len(s):
                out.append(s[i + 1]); i += 2
            else:
                out.append(s[i]); i += 1
        return "".join(out)

    def _assert_well_formed(self, row: str, title: str, link: str, description: str) -> None:
        """row parses as ONE markdown link whose text round-trips to the raw title,
        and whose link/description are byte-for-byte the unescaped originals."""
        m = self.LINK_ROW_RE.match(row)
        self.assertIsNotNone(m, f"not a well-formed markdown link row: {row!r}")
        self.assertEqual(self._unescape(m.group(1)), title)
        self.assertEqual(m.group(2), link)
        self.assertEqual(m.group(3), description)

    def test_title_with_closing_bracket(self):
        with TemporaryDirectory() as d:
            mem = Path(d)
            _write(mem / "feedback_a.md", title="weird ] bracket", description="desc", type="feedback")
            rows, _ = gmi.build_rows(mem)
            self.assertEqual(rows, [r"- [weird \] bracket](feedback_a.md) — desc"])
            self._assert_well_formed(rows[0], "weird ] bracket", "feedback_a.md", "desc")

    def test_title_with_opening_bracket(self):
        with TemporaryDirectory() as d:
            mem = Path(d)
            _write(mem / "feedback_b.md", title="open [ bracket", description="desc", type="feedback")
            rows, _ = gmi.build_rows(mem)
            self.assertEqual(rows, [r"- [open \[ bracket](feedback_b.md) — desc"])
            self._assert_well_formed(rows[0], "open [ bracket", "feedback_b.md", "desc")

    def test_title_with_backslash(self):
        with TemporaryDirectory() as d:
            mem = Path(d)
            _write(mem / "feedback_c.md", title="back\\slash", description="desc", type="feedback")
            rows, _ = gmi.build_rows(mem)
            self.assertEqual(rows, [r"- [back\\slash](feedback_c.md) — desc"])
            self._assert_well_formed(rows[0], "back\\slash", "feedback_c.md", "desc")

    def test_title_with_mixed_brackets_and_backslash(self):
        with TemporaryDirectory() as d:
            mem = Path(d)
            _write(mem / "feedback_d.md", title="a [b] c\\", description="desc", type="feedback")
            rows, _ = gmi.build_rows(mem)
            self.assertEqual(rows, [r"- [a \[b\] c\\](feedback_d.md) — desc"])
            self._assert_well_formed(rows[0], "a [b] c\\", "feedback_d.md", "desc")

    def test_build_index_hot_path_shares_the_same_fix(self):
        """hot pipeline (build_index) goes through the same _scan()/_row() as build_rows
        (back-compat flat scan) — confirms one fix point covers both callers."""
        with TemporaryDirectory() as d:
            mem = Path(d)
            _write(mem / "feedback_e.md", title="weird ] bracket", description="desc", type="feedback")
            hot, cold, warn, hot_n, cold_n, overflow_n = gmi.build_index(mem)
            hot_row = hot.splitlines()[1]
            self.assertEqual(hot_row, r"- [weird \] bracket](feedback_e.md) — desc")
            self._assert_well_formed(hot_row, "weird ] bracket", "feedback_e.md", "desc")


class HotSortTest(unittest.TestCase):
    """Item 4 — hot sort: user > project > feedback > 其他, alpha within a type."""

    def test_type_priority_then_alphabetical(self):
        with TemporaryDirectory() as d:
            mem = Path(d)
            _write(mem / "feedback_z.md", title="FZ", description="d", type="feedback")
            _write(mem / "feedback_a.md", title="FA", description="d", type="feedback")
            _write(mem / "project_m.md", title="PM", description="d", type="project")
            _write(mem / "user_x.md", title="UX", description="d", type="user")
            _write(mem / "other_q.md", title="OQ", description="d")   # no type -> 其他
            hot, cold, warn, hot_n, cold_n, overflow_n = gmi.build_index(mem)
            titles_in_order = [line.split("[")[1].split("]")[0] for line in hot.splitlines()[1:]]
            self.assertEqual(titles_in_order, ["UX", "PM", "FA", "FZ", "OQ"])
            self.assertEqual(overflow_n, 0)
            self.assertEqual((hot_n, cold_n), (5, 0))


class TieringTest(unittest.TestCase):
    """Item 3 — type=reference or status=archived routes to MEMORY-COLD.md."""

    def test_reference_type_goes_cold(self):
        with TemporaryDirectory() as d:
            mem = Path(d)
            _write(mem / "reference_r.md", title="R", description="d", type="reference")
            _write(mem / "feedback_f.md", title="F", description="d", type="feedback")
            hot, cold, warn, hot_n, cold_n, overflow_n = gmi.build_index(mem)
            self.assertNotIn("reference_r.md", hot)
            self.assertIn("[R](reference_r.md)", cold)
            self.assertIn("[F](feedback_f.md)", hot)
            self.assertEqual((hot_n, cold_n), (1, 1))

    def test_status_archived_goes_cold(self):
        with TemporaryDirectory() as d:
            mem = Path(d)
            _write(mem / "feedback_old.md", title="Old", description="d", type="feedback", status="archived")
            hot, cold, warn, hot_n, cold_n, overflow_n = gmi.build_index(mem)
            self.assertNotIn("Old", hot)
            self.assertIn("[Old](feedback_old.md)", cold)
            self.assertEqual((hot_n, cold_n), (0, 1))

    def test_headers_are_first_line_of_each_file(self):
        with TemporaryDirectory() as d:
            mem = Path(d)
            _write(mem / "feedback_f.md", title="F", description="d", type="feedback")
            hot, cold, *_ = gmi.build_index(mem)
            self.assertEqual(hot.splitlines()[0], gmi.hot_header(mem))
            self.assertEqual(cold.splitlines()[0], gmi.COLD_HEADER)

    def test_hot_header_is_absolute_path_scoped_to_this_index_dir(self):
        with TemporaryDirectory() as d:
            mem = Path(d)
            _write(mem / "feedback_f.md", title="F", description="d", type="feedback")
            hot, *_ = gmi.build_index(mem)
            header = hot.splitlines()[0]
            self.assertIn(str((mem / "MEMORY-COLD.md").resolve()), header)   # points at THIS dir, not ~/.kilo
            self.assertNotIn("~/.kilo", header)

    def test_reference_block_precedes_archived_block_in_cold(self):
        with TemporaryDirectory() as d:
            mem = Path(d)
            _write(mem / "reference_z.md", title="RZQ", description="d", type="reference")
            _write(mem / "feedback_a.md", title="AAQ", description="d", type="feedback", status="archived")
            _, cold, *_ = gmi.build_index(mem)
            self.assertLess(cold.index("RZQ"), cold.index("AAQ"))


class BudgetOverflowTest(unittest.TestCase):
    """Item 5 — hot budget: overflow evicts the feedback tail into COLD, marks both files.
    budget is a UTF-8 BYTE count (not Python len()/chars) — see BudgetIsBytesNotCharsTest
    for the CJK regression this distinction exists to catch."""

    def test_overflow_evicts_feedback_tail_and_marks_index(self):
        with TemporaryDirectory() as d:
            mem = Path(d)
            long_desc = "x" * 500
            for i in range(60):
                _write(mem / f"feedback_{i:02d}.md", title=f"F{i:02d}", description=long_desc, type="feedback")
            hot, cold, warn, hot_n, cold_n, overflow_n = gmi.build_index(mem, budget=5_000)
            self.assertGreater(overflow_n, 0)
            self.assertLessEqual(len(hot.encode("utf-8")), 5_000)
            self.assertEqual(hot_n + cold_n, 60)                          # zero entries lost
            self.assertTrue(hot.rstrip("\n").splitlines()[-1].startswith("> [INDEX-OVERFLOW]"))
            self.assertIn(f"[INDEX-OVERFLOW] {overflow_n} entries moved to MEMORY-COLD.md", hot)
            self.assertIn("## overflow from hot", cold)

    def test_user_and_project_never_evicted(self):
        with TemporaryDirectory() as d:
            mem = Path(d)
            _write(mem / "user_keep.md", title="Keep", description="x" * 400, type="user")
            long_desc = "y" * 500
            for i in range(60):
                _write(mem / f"feedback_{i:02d}.md", title=f"F{i:02d}", description=long_desc, type="feedback")
            hot, cold, warn, hot_n, cold_n, overflow_n = gmi.build_index(mem, budget=5_000)
            self.assertIn("[Keep](user_keep.md)", hot)                    # user tier survives eviction
            self.assertGreater(overflow_n, 0)

    def test_no_overflow_under_budget(self):
        with TemporaryDirectory() as d:
            mem = Path(d)
            _write(mem / "feedback_a.md", title="A", description="short", type="feedback")
            hot, cold, warn, hot_n, cold_n, overflow_n = gmi.build_index(mem)
            self.assertEqual(overflow_n, 0)
            self.assertNotIn("INDEX-OVERFLOW", hot)
            self.assertNotIn("overflow from hot", cold)


class BudgetIsBytesNotCharsTest(unittest.TestCase):
    """Regression for the CC-truncation bug: Claude Code's MEMORY.md always-load cutoff
    is a UTF-8 BYTE count (~24.4KB), but CJK text runs ~3 bytes/char — so a char-count
    budget (`len(_render_hot(overflow))`, no `.encode()`) massively undercounts CJK-heavy
    hot indexes and never fires eviction even though the real byte cutoff is blown.

    This constructs a hot index whose assembled CHARACTER count is under budget but whose
    UTF-8 BYTE count is over budget — the exact shape that let 15 real feedback entries
    silently vanish from MEMORY.md in production. Under the old (reverted-to, char-based)
    check this test fails: overflow_n == 0 and hot bytes stay far above budget. Under the
    fixed byte-based check it passes."""

    BUDGET = 5_000
    CJK_DESC = "測試中文記憶內容需要足夠長度才能觸發位元組層級的預算裁切機制無視字元計數"  # 36 chars, 108 bytes
    N_ENTRIES = 45

    def _make_entries(self, mem: Path) -> None:
        for i in range(self.N_ENTRIES):
            _write(mem / f"feedback_{i:02d}.md", title=f"F{i:02d}", description=self.CJK_DESC, type="feedback")

    def test_cjk_hot_text_is_under_char_budget_but_over_byte_budget(self):
        """Precondition the regression depends on: without this gap there'd be nothing
        for a char-vs-byte budget distinction to catch."""
        with TemporaryDirectory() as d:
            mem = Path(d)
            self._make_entries(mem)
            hot_full, *_ = gmi.build_index(mem, budget=10**9)   # effectively unlimited -> no eviction
            self.assertLess(len(hot_full), self.BUDGET)                     # chars: looks fine (old code's blind spot)
            self.assertGreater(len(hot_full.encode("utf-8")), self.BUDGET)  # bytes: actually over

    def test_byte_based_budget_evicts_cjk_overflow(self):
        with TemporaryDirectory() as d:
            mem = Path(d)
            self._make_entries(mem)
            hot, cold, warn, hot_n, cold_n, overflow_n = gmi.build_index(mem, budget=self.BUDGET)
            self.assertGreater(overflow_n, 0)                                # would be 0 under char-based budget
            self.assertLessEqual(len(hot.encode("utf-8")), self.BUDGET)
            self.assertEqual(hot_n + cold_n, self.N_ENTRIES)                 # zero entries lost


class DescLintWarningTest(unittest.TestCase):
    """Item 7 — description >160 chars warns on stderr; doesn't affect output/exit code."""

    def test_long_description_warns_on_stderr(self):
        with TemporaryDirectory() as d:
            mem = Path(d)
            _write(mem / "feedback_long.md", title="Long", description="y" * 200, type="feedback")
            buf = io.StringIO()
            with contextlib.redirect_stderr(buf):
                rows, warn = gmi.build_rows(mem)
            self.assertIn("feedback_long.md", buf.getvalue())
            self.assertIn("200", buf.getvalue())
            self.assertEqual(len(rows), 1)                                 # output unaffected

    def test_short_description_no_warning(self):
        with TemporaryDirectory() as d:
            mem = Path(d)
            _write(mem / "feedback_short.md", title="Short", description="short", type="feedback")
            buf = io.StringIO()
            with contextlib.redirect_stderr(buf):
                gmi.build_rows(mem)
            self.assertEqual(buf.getvalue(), "")


class DualDirColdTest(unittest.TestCase):
    """Item 8 — a second (common-memory) dir's relative link behavior is unchanged, and
    tiering applies the same way across the union of dirs."""

    def test_common_dir_reference_gets_relative_link_in_cold(self):
        with TemporaryDirectory() as d:
            base = Path(d)
            priv = base / "memory"; priv.mkdir()
            common = base / "common-memory" / "memory"; common.mkdir(parents=True)
            _write(priv / "feedback_p.md", title="Priv", description="mine", type="feedback")
            _write(common / "reference_shared.md", title="Shared", description="ours", type="reference")
            hot, cold, warn, hot_n, cold_n, overflow_n = gmi.build_index([priv, common], index_dir=priv)
            self.assertIn("- [Priv](feedback_p.md) — mine", hot)                       # private: bare filename
            self.assertIn("Shared](../common-memory/memory/reference_shared.md) — ours", cold)  # common: ../
            self.assertEqual((hot_n, cold_n), (1, 1))

    def test_common_dir_hot_entry_gets_relative_link_too(self):
        with TemporaryDirectory() as d:
            base = Path(d)
            priv = base / "memory"; priv.mkdir()
            common = base / "common-memory" / "memory"; common.mkdir(parents=True)
            _write(common / "feedback_shared.md", title="SharedHot", description="ours", type="feedback")
            hot, cold, warn, hot_n, cold_n, overflow_n = gmi.build_index([priv, common], index_dir=priv)
            self.assertIn("SharedHot](../common-memory/memory/feedback_shared.md) — ours", hot)


if __name__ == "__main__":
    unittest.main(verbosity=2)
