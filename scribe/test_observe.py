#!/usr/bin/env python3
"""Tests for scribe/observe.py — classification of Write/Bash into observation records.
Run:  python3 scribe/test_observe.py
"""
from __future__ import annotations

import importlib.util
import json
import os
import subprocess
import sys
import unittest
from pathlib import Path
from tempfile import TemporaryDirectory

_OBSERVE_PATH = Path(__file__).resolve().parent / "observe.py"
_spec = importlib.util.spec_from_file_location("observe", str(_OBSERVE_PATH))
ob = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(ob)


class NoiseBashTest(unittest.TestCase):
    def test_pure_noise_filtered(self):
        self.assertTrue(ob._is_noise_bash("ls -la && cd /tmp"))
        self.assertTrue(ob._is_noise_bash("git status"))

    def test_compound_run_not_noise(self):
        self.assertFalse(ob._is_noise_bash("cd x && python run.py"))   # has a real run segment

    def test_empty_is_noise(self):
        self.assertTrue(ob._is_noise_bash("   "))


class ScriptRunTest(unittest.TestCase):
    def test_detects_interpreters(self):
        self.assertTrue(ob._is_script_run("python3 foo.py"))
        self.assertTrue(ob._is_script_run("uv run x.py"))
        self.assertTrue(ob._is_script_run("node app.mjs"))

    def test_no_interpreter_is_not_run(self):
        self.assertFalse(ob._is_script_run("grep foo bar.txt"))   # no interpreter token
        # NB: a grep that mentions 'python' would match here, but _build_record
        # filters it earlier via _is_noise_bash (grep is a noise head) — see test below.


class UtilsCallTest(unittest.TestCase):
    def setUp(self):
        self._orig = ob._KNOWN_TOOLS
        ob._KNOWN_TOOLS = {"uuid", "ssl-check"}

    def tearDown(self):
        ob._KNOWN_TOOLS = self._orig

    def test_known_tool_detected(self):
        ok, name = ob._is_utils_call("utils uuid")
        self.assertTrue(ok)
        self.assertEqual(name, "uuid")

    def test_first_known_wins_over_flag(self):
        ok, name = ob._is_utils_call("utils --list && utils ssl-check x")
        self.assertTrue(ok)
        self.assertEqual(name, "ssl-check")

    def test_unknown_token_not_utils(self):
        self.assertEqual(ob._is_utils_call("utils 2"), (False, None))


class BuildRecordTest(unittest.TestCase):
    def test_write_script(self):
        r = ob._build_record({"tool_name": "Write",
                              "tool_input": {"file_path": "/x/foo.py", "content": "print(1)"}})
        self.assertEqual(r["kind"], "write-script")
        self.assertEqual(r["path"], "/x/foo.py")
        self.assertIn("content_hash", r)

    def test_write_noise_path_skipped(self):
        self.assertIsNone(ob._build_record({"tool_name": "Write",
            "tool_input": {"file_path": "/x/node_modules/foo.py", "content": "x"}}))

    def test_write_non_script_skipped(self):
        self.assertIsNone(ob._build_record({"tool_name": "Write",
            "tool_input": {"file_path": "/x/README.md", "content": "x"}}))

    def test_bash_script_run(self):
        r = ob._build_record({"tool_name": "Bash",
            "tool_input": {"command": "python3 analyze.py"}, "tool_response": {}})
        self.assertEqual(r["kind"], "script-run")

    def test_bash_noise_skipped(self):
        self.assertIsNone(ob._build_record({"tool_name": "Bash",
            "tool_input": {"command": "ls -la"}, "tool_response": {}}))


class BashFailureTest(unittest.TestCase):
    """PostToolUseFailure on Bash — no tool_response; `error` + `is_interrupt`
    instead. Classification (utils-usage / script-run / noise) must be
    unaffected; only the failure-signal source differs."""

    def setUp(self):
        self._orig = ob._KNOWN_TOOLS
        ob._KNOWN_TOOLS = {"ssl-check"}

    def tearDown(self):
        ob._KNOWN_TOOLS = self._orig

    def test_failing_script_run_recorded(self):
        r = ob._build_record({
            "hook_event_name": "PostToolUseFailure",
            "tool_name": "Bash",
            "tool_input": {"command": "python3 analyze.py"},
            "error": "Exit code 1",
            "is_interrupt": False,
        })
        self.assertEqual(r["kind"], "script-run")
        self.assertFalse(r["interrupted"])
        self.assertEqual(r["stderr_tail"], "Exit code 1")

    def test_failing_utils_call_recorded_as_utils_usage(self):
        r = ob._build_record({
            "hook_event_name": "PostToolUseFailure",
            "tool_name": "Bash",
            "tool_input": {"command": "utils ssl-check bad-host"},
            "error": "Exit code 2",
            "is_interrupt": False,
        })
        self.assertEqual(r["kind"], "utils-usage")
        self.assertEqual(r["script"], "ssl-check")
        self.assertEqual(r["stderr_tail"], "Exit code 2")

    def test_is_interrupt_maps_to_interrupted(self):
        r = ob._build_record({
            "hook_event_name": "PostToolUseFailure",
            "tool_name": "Bash",
            "tool_input": {"command": "python3 analyze.py"},
            "error": "cancelled",
            "is_interrupt": True,
        })
        self.assertTrue(r["interrupted"])

    def test_noise_command_still_skipped_on_failure(self):
        self.assertIsNone(ob._build_record({
            "hook_event_name": "PostToolUseFailure",
            "tool_name": "Bash",
            "tool_input": {"command": "ls -la /gone"},
            "error": "Exit code 2",
            "is_interrupt": False,
        }))

    def test_non_string_error_does_not_raise(self):
        r = ob._build_record({
            "hook_event_name": "PostToolUseFailure",
            "tool_name": "Bash",
            "tool_input": {"command": "python3 analyze.py"},
            "error": None,
            "is_interrupt": False,
        })
        self.assertEqual(r["stderr_tail"], "")


class ResolveAtomTest(unittest.TestCase):
    def setUp(self):
        self._orig = ob._KNOWN_TOOLS
        ob._KNOWN_TOOLS = {"pve", "subject-lift", "mail", "mac-app"}

    def tearDown(self):
        ob._KNOWN_TOOLS = self._orig

    def test_exact_match(self):
        self.assertEqual(ob._resolve_atom("pve"), "pve")

    def test_multi_segment_atom(self):
        self.assertEqual(ob._resolve_atom("subject_lift"), "subject-lift")

    def test_longest_prefix_over_full_tool_name(self):
        # pve_list: "pve-list" isn't a known atom, "pve" is -> falls back to it
        self.assertEqual(ob._resolve_atom("pve_list"), "pve")
        self.assertEqual(ob._resolve_atom("mac_app"), "mac-app")

    def test_unresolvable_is_none(self):
        self.assertIsNone(ob._resolve_atom("totally_unknown_thing"))


class RedactParamsTest(unittest.TestCase):
    def test_top_level_credential_key_redacted(self):
        out = ob._redact_params({"password": "hunter2", "path": "/x"})
        self.assertEqual(out["password"], "[REDACTED]")
        self.assertEqual(out["path"], "/x")

    def test_case_and_synonym_insensitive(self):
        out = ob._redact_params({"API_KEY": "abc", "Cookie": "sid=1", "secretValue": "x"})
        self.assertEqual(out["API_KEY"], "[REDACTED]")
        self.assertEqual(out["Cookie"], "[REDACTED]")
        self.assertEqual(out["secretValue"], "[REDACTED]")

    def test_list_of_dict_one_level_scrubbed(self):
        # e.g. e3p_call's variadic key=value array param
        out = ob._redact_params({"pairs": [{"password": "hunter2", "name": "x"}, {"count": 1}]})
        self.assertEqual(out["pairs"][0]["password"], "[REDACTED]")
        self.assertEqual(out["pairs"][0]["name"], "x")
        self.assertEqual(out["pairs"][1], {"count": 1})

    def test_list_of_non_dict_untouched(self):
        out = ob._redact_params({"tags": ["a", "b"]})
        self.assertEqual(out["tags"], ["a", "b"])

    def test_non_credential_untouched(self):
        out = ob._redact_params({"count": 3, "name": "x"})
        self.assertEqual(out, {"count": 3, "name": "x"})


class BuildMcpRecordTest(unittest.TestCase):
    def setUp(self):
        self._orig = ob._KNOWN_TOOLS
        ob._KNOWN_TOOLS = {"json", "pve"}

    def tearDown(self):
        ob._KNOWN_TOOLS = self._orig

    def test_posttooluse_success(self):
        r = ob._build_record({
            "hook_event_name": "PostToolUse",
            "tool_name": "mcp__utils__json",
            "tool_input": {"path": "/x.json", "validate": True},
            "tool_response": '{"data":{"valid":true},"metadata":{}}',
            "session_id": "s1", "cwd": "/wd",
        })
        self.assertEqual(r["kind"], "utils-usage")
        self.assertEqual(r["transport"], "mcp")
        self.assertEqual(r["tool"], "json")
        self.assertEqual(r["atom"], "json")
        self.assertEqual(r["script"], "json")   # mirrors atom for existing script-keyed consumers
        self.assertEqual(r["params"], {"path": "/x.json", "validate": True})
        self.assertFalse(r["interrupted"])
        self.assertEqual(r["stderr_tail"], "")
        self.assertNotIn("raw", r)

    def test_posttoolusefailure_envelope_error(self):
        r = ob._build_record({
            "hook_event_name": "PostToolUseFailure",
            "tool_name": "mcp__utils__json",
            "tool_input": {"path": "/nope.json"},
            "error": '{"error":{"message":"file not found: /nope.json","why":"path does not exist","hint":"check the path"}}',
            "is_interrupt": False,
            "session_id": "s1", "cwd": "/wd",
        })
        self.assertEqual(r["kind"], "utils-usage")
        self.assertFalse(r["interrupted"])
        self.assertEqual(r["stderr_tail"], "file not found: /nope.json")
        self.assertNotIn("raw", r)

    def test_posttoolusefailure_non_json_error_string(self):
        # e.g. a plain-Bash-style "Exit code N" error string, or any atom
        # failure that doesn't come back as JSON — must not raise, and the
        # raw string still becomes a usable stderr_tail for the fail heuristic.
        r = ob._build_record({
            "hook_event_name": "PostToolUseFailure",
            "tool_name": "mcp__utils__pve_list",
            "tool_input": {},
            "error": "Exit code 7",
            "is_interrupt": False,
            "session_id": "s1", "cwd": "/wd",
        })
        self.assertEqual(r["tool"], "pve_list")
        self.assertEqual(r["atom"], "pve")
        self.assertEqual(r["stderr_tail"], "Exit code 7")
        self.assertEqual(r["raw"], "Exit code 7")

    def test_posttoolusefailure_is_interrupt_true(self):
        r = ob._build_record({
            "hook_event_name": "PostToolUseFailure",
            "tool_name": "mcp__utils__json",
            "tool_input": {},
            "error": "cancelled",
            "is_interrupt": True,
            "session_id": "s1", "cwd": "/wd",
        })
        self.assertTrue(r["interrupted"])

    def test_unresolvable_atom_is_none(self):
        r = ob._build_record({
            "hook_event_name": "PostToolUse",
            "tool_name": "mcp__utils__totally_unknown_thing",
            "tool_input": {},
            "tool_response": '{"data":{}}',
            "session_id": "s1", "cwd": "/wd",
        })
        self.assertIsNone(r["atom"])
        self.assertIsNone(r["script"])

    def test_posttooluse_non_json_tool_response_does_not_raise(self):
        r = ob._build_record({
            "hook_event_name": "PostToolUse",
            "tool_name": "mcp__utils__json",
            "tool_input": {},
            "tool_response": "not json at all",
            "session_id": "s1", "cwd": "/wd",
        })
        self.assertEqual(r["stderr_tail"], "")
        self.assertEqual(r["raw"], "not json at all")

    def test_credentials_redacted_in_mcp_params(self):
        r = ob._build_record({
            "hook_event_name": "PostToolUse",
            "tool_name": "mcp__utils__json",
            "tool_input": {"path": "/x", "token": "sekrit"},
            "tool_response": '{"data":{}}',
            "session_id": "s1", "cwd": "/wd",
        })
        self.assertEqual(r["params"]["token"], "[REDACTED]")
        self.assertEqual(r["params"]["path"], "/x")

    def test_malformed_event_never_raises(self):
        # tool_input missing entirely, hook_event_name absent -> still must
        # not throw; falls through the PostToolUse (success) branch.
        r = ob._build_record({"tool_name": "mcp__utils__json"})
        self.assertIsNotNone(r)
        self.assertEqual(r["kind"], "utils-usage")


class BashPathRegressionTest(unittest.TestCase):
    """MCP branch must not change shape/behavior of the pre-existing Bash path."""

    def test_bash_utils_usage_record_unchanged_shape(self):
        orig = ob._KNOWN_TOOLS
        ob._KNOWN_TOOLS = {"ssl-check"}
        try:
            r = ob._build_record({"tool_name": "Bash",
                "tool_input": {"command": "utils ssl-check example.com"},
                "tool_response": {"stderr": "", "interrupted": False}})
        finally:
            ob._KNOWN_TOOLS = orig
        self.assertEqual(r["kind"], "utils-usage")
        self.assertEqual(r["script"], "ssl-check")
        self.assertNotIn("transport", r)
        self.assertNotIn("atom", r)
        self.assertNotIn("params", r)

    def test_write_and_script_run_untouched(self):
        self.assertEqual(ob._build_record({"tool_name": "Write",
            "tool_input": {"file_path": "/x/foo.py", "content": "1"}})["kind"], "write-script")
        self.assertEqual(ob._build_record({"tool_name": "Bash",
            "tool_input": {"command": "python3 analyze.py"}, "tool_response": {}})["kind"], "script-run")


class EmitTest(unittest.TestCase):
    def test_emit_writes_to_instance_data(self):
        with TemporaryDirectory() as d:
            orig = os.environ.get("SCRIPTORIUM_HOME")
            os.environ["SCRIPTORIUM_HOME"] = d
            try:
                ob._emit({"kind": "script-run", "command": "python3 x.py"})
                f = Path(d) / "data" / "observations.jsonl"
                self.assertTrue(f.exists())
                self.assertIn("script-run", f.read_text())
            finally:
                if orig is None:
                    os.environ.pop("SCRIPTORIUM_HOME", None)
                else:
                    os.environ["SCRIPTORIUM_HOME"] = orig


# Reviewer-found (feat/observe-mcp review round 1): 10 legal-JSON-but-wrong-shape
# payloads that all crashed main() with exit 1 before the never-raise contract
# was enforced at the outermost layer (main() wrapping the _build_record call,
# not just _build_mcp_record's own internal guard). Every one of these must
# now exit 0, produce no stderr, and write nothing to observations.jsonl —
# a bad/adversarial hook payload must degrade to "skip this event", never
# something that could read as blocking the tool call the hook fired for.
FUZZ_PAYLOADS = [
    ("top_level_list", [1, 2, 3]),
    ("top_level_null", None),
    ("top_level_int", 42),
    ("top_level_string", "hello"),
    ("tool_name_int", {"tool_name": 42, "tool_input": {}, "tool_response": {}}),
    ("tool_name_none", {"tool_name": None, "tool_input": {}, "tool_response": {}}),
    ("bash_tool_response_str", {"tool_name": "Bash", "tool_input": {"command": "ls"},
                                  "tool_response": "oops"}),
    ("bash_tool_response_list", {"tool_name": "Bash", "tool_input": {"command": "ls"},
                                   "tool_response": [1, 2]}),
    ("bash_tool_input_str", {"tool_name": "Bash", "tool_input": "oops", "tool_response": {}}),
    ("write_tool_input_list", {"tool_name": "Write", "tool_input": [1, 2], "tool_response": {}}),
]


class FuzzNeverRaiseTest(unittest.TestCase):
    """Runs the real `python3 observe.py` subprocess against each fuzz payload
    on stdin — the same invocation shape Claude Code uses for a hook command —
    so this is a true end-to-end regression test for the crash, not just a
    unit test of an implementation-specific code path."""

    def setUp(self):
        self._tmp = TemporaryDirectory()
        self._orig = os.environ.get("SCRIPTORIUM_HOME")
        os.environ["SCRIPTORIUM_HOME"] = self._tmp.name

    def tearDown(self):
        if self._orig is None:
            os.environ.pop("SCRIPTORIUM_HOME", None)
        else:
            os.environ["SCRIPTORIUM_HOME"] = self._orig
        self._tmp.cleanup()

    def _run(self, payload) -> subprocess.CompletedProcess:
        return subprocess.run(
            [sys.executable, str(_OBSERVE_PATH)],
            input=json.dumps(payload), capture_output=True, text=True,
            timeout=10, env=dict(os.environ),
        )

    def test_every_fuzz_payload_exits_zero_with_no_stderr(self):
        for name, payload in FUZZ_PAYLOADS:
            with self.subTest(case=name):
                result = self._run(payload)
                self.assertEqual(result.returncode, 0, f"{name}: stderr={result.stderr!r}")
                self.assertEqual(result.stderr.strip(), "", f"{name}: unexpected stderr {result.stderr!r}")

    def test_every_fuzz_payload_writes_nothing(self):
        for name, payload in FUZZ_PAYLOADS:
            with self.subTest(case=name):
                self._run(payload)
        log = Path(self._tmp.name) / "data" / "observations.jsonl"
        self.assertFalse(log.exists(), f"fuzz payloads wrote to {log}")


if __name__ == "__main__":
    unittest.main(verbosity=2)
