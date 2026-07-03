#!/usr/bin/env python3
"""Armarium — generate the instance's memory/MEMORY.md (hot) + MEMORY-COLD.md (cold)
from each file's frontmatter, and lint the corpus for convention drift.

Single source of truth = each memory file's frontmatter `title` + `description`.
MEMORY.md / MEMORY-COLD.md are BUILD ARTIFACTS — never hand-edit them; edit the
memory file's frontmatter and rerun. Invoked by memory-sync.sh (pre-commit) and
the dreaming skill.

Tiering — Claude Code only auto-loads the first ~24.4KB of MEMORY.md; a flat,
unbounded index silently truncates past that. So the index is split in two:
  - MEMORY.md      (hot)  — user/project/feedback/其他, budget-capped, always loaded.
  - MEMORY-COLD.md (cold) — type=reference or status=archived entries, plus any
                             hot entries evicted for budget. Grep/Read on demand.

Index row (aligned with Claude Code's own memory writer — slug appears exactly once):
  - frontmatter has `title` : `- [<title>](<link>) — <description>`
  - no `title`              : `- <link> — <description>`               (bare path)
  title presence is never required/linted — either shape is valid.

Hot sort: type priority user > project > feedback > 其他, alphabetical by filename
within each type. Cold sort: reference block (alphabetical) then archived block
(alphabetical); an entry that is both goes to the reference block. Budget: once
the assembled hot text exceeds HOT_BUDGET_CHARS (Python len(), i.e. characters,
not bytes), entries are evicted from the feedback tier's alphabetical tail into
a `## overflow from hot` section at the top of MEMORY-COLD.md until back under
budget (falls back to the 其他 tier if feedback is exhausted; user/project are
never evicted). When that happens MEMORY.md gets a trailing `[INDEX-OVERFLOW]`
marker line and a stderr warning is printed — fail loud, but exit code stays 0
(memory-sync.sh is a fail-open hook and must not be blocked by this).

Lint — surfaced for the dreaming skill's 規範對齊 (convention-alignment) step,
never auto-mutates (mutating hand-written memory stays human/dreaming-gated):
  - bad-type      : `type:` absent/invalid, or mismatching the filename prefix
  - orphan-link   : a `[[wikilink]]` whose target is not an existing memory file
                    (catches `-`/`_` naming drift as well as truly dangling refs)
  - unquoted-desc : a bare (unquoted) `description:` scalar — Claude Code's memory
                    normalizer truncates these; wrap the value in double quotes
Separately (stderr, outside the LINT block above): a `description:` longer than
DESC_WARN_CHARS characters prints one warning line per offending file.

Usage:  gen_memory_index.py [MEMORY_DIR ...]   (1+ dirs; MEMORY.md/MEMORY-COLD.md are
        written into the FIRST dir and every row's link is relative to it, so files in
        the other dirs — e.g. a shared common-memory/memory submodule — get a correct
        `../…` path. Defaults to SCRIPTORIUM_HOME/memory. Missing dirs are skipped, so
        an instance that hasn't mounted the common submodule still builds its index
        from what's present.)
"""
from __future__ import annotations

import os
import re
import sys
from pathlib import Path

KEY_RE = re.compile(r"^(title|description):\s*(.*)$")
# `type:`/`status:` may sit at the top level OR nested under `metadata:` — match either
# by ignoring leading indentation (instance corpora use both shapes historically).
TYPE_RE = re.compile(r"^\s*type:\s*([A-Za-z]+)\s*$", re.M)
STATUS_RE = re.compile(r"^\s*status:\s*([A-Za-z_-]+)\s*$", re.M)
WIKILINK_RE = re.compile(r"\[\[([^\]\|]+?)\]\]")
DESC_RE = re.compile(r"^description:\s*(.*)$", re.M)
VALID_TYPES = ("feedback", "project", "reference", "user")

GENERATED_NAMES = ("MEMORY.md", "MEMORY-COLD.md")   # never ingest our own build output as an entry
HOT_TYPE_PRIORITY = {"user": 0, "project": 1, "feedback": 2}   # unlisted/unknown type = 其他 (3)
HOT_BUDGET_CHARS = 23_000        # headroom under Claude Code's ~24.4KB always-load cutoff
DESC_WARN_CHARS = 160
COLD_HEADER = "# MEMORY-COLD — reference / archived 冷索引(按需 grep / Read,不會自動載入)"


def hot_header(index_dir: Path) -> str:
    """MEMORY.md's fixed first line: a pointer to THIS instance's cold index, computed
    from index_dir (absolute, symlinks resolved) — never hardcode one instance's home
    (armarium.paths' own principle: one engine, many instances)."""
    cold_path = Path(index_dir).resolve() / "MEMORY-COLD.md"
    return f"> 冷索引(reference / archived)→ {cold_path}(憑索引找不到時先 grep 那裡)"


def _default_memory_dir() -> Path:
    sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
    from armarium import paths
    return paths.memory_dir()


def unquote(v: str) -> str:
    v = v.strip()
    if len(v) >= 2 and v[0] == '"' and v[-1] == '"':
        v = v[1:-1].replace('\\"', '"').replace("\\\\", "\\")
    return v


def _fm_block(text: str) -> str:
    """Raw frontmatter block between the leading --- fences, or '' if none."""
    if not text.startswith("---"):
        return ""
    end = text.find("\n---", 3)
    return text[3:end] if end >= 0 else ""


def frontmatter(text: str) -> dict:
    out = {}
    for line in _fm_block(text).splitlines():
        m = KEY_RE.match(line)
        if m:
            out[m.group(1)] = unquote(m.group(2))
    return out


def type_of(text: str) -> str | None:
    """The declared `type`, top-level or nested under metadata; None if absent."""
    m = TYPE_RE.search(_fm_block(text))
    return m.group(1) if m else None


def status_of(text: str) -> str | None:
    """The declared `status` (e.g. `archived`), top-level or nested; None if absent."""
    m = STATUS_RE.search(_fm_block(text))
    return m.group(1) if m else None


def _escape_link_text(text: str) -> str:
    """Escape markdown link-text metacharacters in a frontmatter `title` so a
    literal `[`/`]` doesn't prematurely close the `[...]` span and produce a
    broken link (e.g. title `weird ] bracket` -> `- [weird ] bracket...](link)`).
    Backslash first, then brackets — reversing the order would double-escape
    the backslashes this step just inserted. Only applied to link text; the
    link target and description are passed through unchanged."""
    return text.replace("\\", "\\\\").replace("[", "\\[").replace("]", "\\]")


def _row(title: str | None, link: str, description: str) -> str:
    """`- [<title>](<link>) — <description>`, or a bare `- <link> — <description>` when
    there's no title — never both a bracketed title AND a bare link (slug appears once).
    title is escaped (see _escape_link_text); link/description are not."""
    head = f"[{_escape_link_text(title)}]({link})" if title else link
    return f"- {head} — {description}"


def _scan(mem_dirs: list[Path], index_dir: Path) -> tuple[list[dict], dict[str, list[str]]]:
    """Read every memory file once. Pure — reads only. Expects already-normalized
    (list[Path], Path) args; build_rows()/build_index() do that normalization.

    Returns (entries, warn):
      entries — list of {name, type, status, row}, filename-sorted across the union
                of mem_dirs (hot type-priority sort, if any, happens downstream).
      warn    — bad-type / orphan-link / unquoted-desc (see module docstring), computed
                over the union so a private→common [[wikilink]] resolves correctly.

    Side effect: prints one stderr line per file whose description exceeds
    DESC_WARN_CHARS — independent of the returned data, never affects exit code.
    """
    files = sorted(
        (p for d in mem_dirs for p in d.glob("*.md") if p.name not in GENERATED_NAMES),
        key=lambda p: p.name,
    )
    stems = {p.stem for p in files}
    entries: list[dict] = []
    warn: dict[str, list[str]] = {"bad-type": [], "orphan-link": [], "unquoted-desc": []}
    for p in files:
        text = p.read_text(encoding="utf-8")
        fm = frontmatter(text)
        prefix = re.split(r"[_-]", p.stem, maxsplit=1)[0]
        tval = type_of(text)
        if tval not in VALID_TYPES or (prefix in VALID_TYPES and prefix != tval):
            warn["bad-type"].append(f"{p.name}(prefix={prefix}, type={tval})")
        dm = DESC_RE.search(_fm_block(text))
        if dm and dm.group(1).strip() and not dm.group(1).strip().startswith('"'):
            warn["unquoted-desc"].append(p.name)
        for m in WIKILINK_RE.finditer(text):
            tgt = m.group(1).strip()
            if tgt not in stems:
                warn["orphan-link"].append(f"{p.name}→[[{tgt}]]")
        description = fm.get("description", "")
        if len(description) > DESC_WARN_CHARS:
            print(f"gen-memory-index: WARN description {len(description)} chars "
                  f"(>{DESC_WARN_CHARS}): {p.name}", file=sys.stderr)
        link = os.path.relpath(p, index_dir)
        entries.append({
            "name": p.name,
            "type": tval,
            "status": status_of(text),
            "row": _row(fm.get("title"), link, description),
        })
    return entries, warn


def build_rows(mem_dirs, index_dir=None) -> tuple[list[str], dict[str, list[str]]]:
    """Back-compat flat scan: (rows, warn) in filename-sorted order — no hot/cold
    tiering or budget. Used by callers that just want a plain index (e.g.
    scriptorium-init's first-boot scaffold, always empty in practice). Prefer
    build_index() for the tiered pipeline the CLI (main()) writes.

    mem_dirs: a single dir (Path/str) OR a list of dirs merged into one index — e.g. the
    instance memory/ plus a shared common-memory/memory submodule. index_dir is where
    MEMORY.md lives; each row's link is computed relative to it, so files in the other dirs
    (common) get a correct `../…` path. Defaults to the first dir."""
    if isinstance(mem_dirs, (str, Path)):
        mem_dirs = [mem_dirs]
    mem_dirs = [Path(d) for d in mem_dirs]
    index_dir = Path(index_dir) if index_dir is not None else mem_dirs[0]
    entries, warn = _scan(mem_dirs, index_dir)
    return [e["row"] for e in entries], warn


def build_index(mem_dirs, index_dir=None, budget: int = HOT_BUDGET_CHARS):
    """The tiered pipeline the CLI writes: hot (MEMORY.md) + cold (MEMORY-COLD.md).

    reference-type or status=archived entries go straight to cold; everything else
    is hot, sorted by type priority (user > project > feedback > 其他) then filename.
    If the assembled hot text exceeds `budget` characters, entries are evicted from
    the feedback tier's alphabetical tail into a cold `## overflow from hot` section
    until back under budget.

    Returns (hot_text, cold_text, warn, hot_count, cold_count, overflow_count) — cold_count
    includes overflow_count (both land in cold_text), so hot_count + cold_count always equals
    the number of scanned entries."""
    if isinstance(mem_dirs, (str, Path)):
        mem_dirs = [mem_dirs]
    mem_dirs = [Path(d) for d in mem_dirs]
    index_dir = Path(index_dir) if index_dir is not None else mem_dirs[0]
    entries, warn = _scan(mem_dirs, index_dir)

    hot, cold_ref, cold_archived = [], [], []
    for e in entries:
        if e["type"] == "reference":              # reference wins over archived when both apply
            cold_ref.append(e)
        elif e["status"] == "archived":
            cold_archived.append(e)
        else:
            hot.append(e)
    hot.sort(key=lambda e: (HOT_TYPE_PRIORITY.get(e["type"], 3), e["name"]))
    cold_ref.sort(key=lambda e: e["name"])
    cold_archived.sort(key=lambda e: e["name"])

    def _render_hot(overflow: list[dict]) -> str:
        lines = [hot_header(index_dir), *(e["row"] for e in hot)]
        if overflow:
            lines.append(f"> [INDEX-OVERFLOW] {len(overflow)} entries moved to MEMORY-COLD.md")
        return "\n".join(lines) + "\n"

    def _evict_one() -> dict | None:
        for i in range(len(hot) - 1, -1, -1):          # feedback tier's alphabetical tail first
            if hot[i]["type"] == "feedback":
                return hot.pop(i)
        for i in range(len(hot) - 1, -1, -1):          # feedback exhausted -> 其他 tier's tail
            if HOT_TYPE_PRIORITY.get(hot[i]["type"], 3) == 3:
                return hot.pop(i)
        return None                                     # only user/project left — stop, don't evict those

    overflow: list[dict] = []
    while len(_render_hot(overflow)) > budget:
        victim = _evict_one()
        if victim is None:
            break
        overflow.append(victim)
    overflow.sort(key=lambda e: e["name"])

    if overflow:
        print(f"gen-memory-index: WARN hot index exceeded {budget} chars — moved {len(overflow)} "
              f"entrie(s) to MEMORY-COLD.md (## overflow from hot)", file=sys.stderr)

    hot_text = _render_hot(overflow)
    cold_lines = [COLD_HEADER, ""]
    if overflow:
        cold_lines += ["## overflow from hot", *(e["row"] for e in overflow), ""]
    cold_lines += [e["row"] for e in cold_ref]
    cold_lines += [e["row"] for e in cold_archived]
    cold_text = "\n".join(cold_lines).rstrip("\n") + "\n"

    # cold_count includes overflow (it's physically written into MEMORY-COLD.md too) so
    # hot_count + cold_count always equals the total scanned entries — nothing goes missing.
    cold_count = len(cold_ref) + len(cold_archived) + len(overflow)
    return hot_text, cold_text, warn, len(hot), cold_count, len(overflow)


def main() -> int:
    args = [Path(a).expanduser() for a in sys.argv[1:]] or [_default_memory_dir()]
    index_dir = args[0]
    # Skip dirs that don't exist (e.g. the common-memory submodule on an instance that
    # hasn't mounted it) so the index still builds from whatever is present.
    mem_dirs = [d for d in args if d.is_dir()] or [index_dir]
    hot_text, cold_text, warn, hot_n, cold_n, overflow_n = build_index(mem_dirs, index_dir=index_dir)
    (index_dir / "MEMORY.md").write_text(hot_text, encoding="utf-8")
    (index_dir / "MEMORY-COLD.md").write_text(cold_text, encoding="utf-8")
    print(f"gen-memory-index: {hot_n} hot + {cold_n} cold entries from {len(mem_dirs)} dir(s) "
          f"-> {index_dir / 'MEMORY.md'} (+ MEMORY-COLD.md)")
    if overflow_n:
        print(f"  OVERFLOW: {overflow_n} entrie(s) moved hot -> cold to stay under budget")
    total = sum(len(v) for v in warn.values())
    if total:
        print(f"  LINT: {total} convention issue(s) — for the dreaming 規範對齊 step:")
        for cat, items in warn.items():
            if items:
                print(f"    {cat} ({len(items)}): {', '.join(items)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
