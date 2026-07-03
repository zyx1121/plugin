#!/usr/bin/env python3
"""Scribe — ad-hoc script observer (PostToolUse/PostToolUseFailure on Write|Bash|mcp__utils__*).

Appends script writes, script runs, `utils`-CLI invocations, and `mcp__utils__*`
tool calls to the instance's observations.jsonl. This is the raw material the
Scribe authors new skills from (repeated script patterns -> a candidate skill)
and the /review skill digests.

Failure-path note (verified on CC 2.1.198, headless -p and a real --plugin-dir
end-to-end run): a tool call whose result is an error NEVER reaches
PostToolUse — it fires the separate PostToolUseFailure event instead, with a
different payload shape (`error` string + `is_interrupt` bool, no
`tool_response`). This applies to plain Bash non-zero exits, not just MCP
`isError` results — hooks.json wires PostToolUseFailure for both
`mcp__utils__*` (-> `_build_mcp_record`) and `Write|Bash` (-> the Bash branch
below); the Write branch is unaffected since write-script records don't carry
a success/fail signal to begin with.

Never-raise contract: `event` is harness-supplied JSON of a shape this script
doesn't control. `main()` wraps the whole `_build_record` call in
try/except — any unexpected shape (top-level list/null/int/string, a
tool_name/tool_input/tool_response that isn't the type a branch expects, ...)
degrades to "skip this event" (exit 0), never a crash that could read as
blocking the tool call the hook fired for.

Stays cheap on purpose: no LLM, no network, ~1ms per event. Heavy lifting happens
later in /review. Writes to SCRIPTORIUM_HOME/data/observations.jsonl.
"""
from __future__ import annotations

import hashlib
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))  # engine root onto path
from armarium import paths  # noqa: E402
from scribe import config   # noqa: E402

MAX_CONTENT = 4096
MAX_STDERR = 512
MCP_PREFIX = "mcp__utils__"
CREDENTIAL_KEY_RE = re.compile(r"(?i)(password|passwd|token|secret|cookie|credential|api[_-]?key)")

NOISE_BASH_FIRST_WORD = {
    "ls", "cd", "cat", "head", "tail", "grep", "find", "git",
    "echo", "pwd", "which", "type", "rg", "fd", "tree", "mkdir",
    "touch", "cp", "mv", "rm", "ln", "stat", "wc", "sort", "uniq",
    "diff", "test", "true", "false", "sleep", "env", "export",
    "source", ".",
}
NOISE_PATH_PARTS = (
    "node_modules", "__pycache__", ".next", ".venv", "venv", "dist",
    "build", ".git/", ".cache",
)
SCRIPT_EXTS = (".py", ".sh", ".ts", ".js", ".mjs", ".rb", ".pl")

SCRIPT_RUN_RE = re.compile(r"\b(python3?|node|bun|deno|sh|bash|zsh|ruby|perl)\s+\S")
UV_RUN_RE = re.compile(r"\buv\s+run\b")
# `utils <tool>` — bare, path-prefixed, or after any `.../`. Optional utils-CLI
# integration: an instance that ships a `utils` dispatcher gets per-tool usage
# tracking; instances without one degrade to recognizing nothing (no false hits).
UTILS_CMD_RE = re.compile(r"(?:^|[\s;&|()`])(?:\S*/)?utils\s+([\w-]+)")
PLUGIN_SCRIPT_RE = re.compile(r"/scripts/([\w.\-]+?)\.py\b")

try:
    _SCRIPTS_DIR = Path.home() / "utils" / "scripts"
    _KNOWN_TOOLS = {f.stem for f in _SCRIPTS_DIR.iterdir() if f.is_file() and not f.name.startswith(("_", "."))}
except OSError:
    _KNOWN_TOOLS = set()


def _is_noise_bash(cmd: str) -> bool:
    cmd = cmd.strip()
    if not cmd:
        return True
    for seg in re.split(r"[;|&\n]+", cmd):
        seg = seg.strip()
        if not seg:
            continue
        head = seg.split(None, 1)[0]
        if head not in NOISE_BASH_FIRST_WORD:
            return False
    return True


def _is_script_run(cmd: str) -> bool:
    return bool(SCRIPT_RUN_RE.search(cmd) or UV_RUN_RE.search(cmd))


def _is_utils_call(cmd: str) -> tuple[bool, str | None]:
    for match in UTILS_CMD_RE.finditer(cmd):
        name = match.group(1)
        if name in _KNOWN_TOOLS:
            return True, name
    if "CLAUDE_PLUGIN_ROOT" in cmd or ".claude/plugins" in cmd:
        m = PLUGIN_SCRIPT_RE.search(cmd)
        if m:
            return True, m.group(1)
    return False, None


def _resolve_atom(tool_suffix: str) -> str | None:
    """Best-effort MCP tool-name -> atom(script) name resolution: underscore
    tokens joined with hyphens, longest-prefix match against known scripts/
    stems (subject_lift -> subject-lift, pve_list -> pve). None if no prefix
    matches a known atom — never guess past what the scripts/ dir confirms."""
    parts = tool_suffix.split("_")
    for n in range(len(parts), 0, -1):
        candidate = "-".join(parts[:n])
        if candidate in _KNOWN_TOOLS:
            return candidate
    return None


def _redact_params(params: dict) -> dict:
    """Shallow credential redaction: key names one level deep, plus one level
    into list-of-dict values (an `array`-type param holding repeated
    key=value dicts, e.g. e3p_call). MCP tool_input is a flat manifest-declared
    shape (mcp/README.md), not arbitrary nested JSON, so this is sufficient."""
    def scrub(d: dict) -> dict:
        out = {}
        for k, v in d.items():
            if CREDENTIAL_KEY_RE.search(k):
                out[k] = "[REDACTED]"
            elif isinstance(v, list):
                out[k] = [scrub(item) if isinstance(item, dict) else item for item in v]
            else:
                out[k] = v
        return out
    return scrub(params)


def _summarize_mcp_error(parsed: dict) -> str:
    """Compact failure message from a parsed MCP error payload — envelope
    shape ({"error": {"message": ...}}, per exec.ts's EnvelopeFailure
    mapping), timeout/non-envelope shape ({"message": ...} or {"stderr": ...}),
    or an unrecognized dict (dumped as-is)."""
    err = parsed.get("error")
    if isinstance(err, dict) and err.get("message"):
        return str(err["message"])[:MAX_STDERR]
    if parsed.get("message"):
        return str(parsed["message"])[:MAX_STDERR]
    if parsed.get("stderr"):
        return str(parsed["stderr"])[:MAX_STDERR]
    return json.dumps(parsed, ensure_ascii=False)[:MAX_STDERR]


def _build_mcp_record(base: dict, event: dict) -> dict | None:
    """PostToolUse (success) or PostToolUseFailure (error/interrupt) on a
    `mcp__utils__*` tool call -> a utils-usage record. Never raises — any
    unexpected shape falls back to `None` (skip this event) rather than
    blocking the tool call or the hook chain (see module docstring).

    Verified on CC 2.1.198: an MCP call whose result is isError:true does NOT
    reach PostToolUse at all — it fires PostToolUseFailure instead, with
    `error` (the same JSON.stringify(structuredContent) text, per
    mcp/README.md's convention) and `is_interrupt` in place of `tool_response`.
    PostToolUse's `tool_response` is therefore expected to always be a success
    payload; the isError/timed_out/non-zero-exit_code check on it is a
    defensive fallback in case that invariant ever changes upstream.
    """
    try:
        tool_name = event.get("tool_name", "")
        suffix = tool_name[len(MCP_PREFIX):]
        atom = _resolve_atom(suffix)
        params = _redact_params(event.get("tool_input") or {})
        # `script` mirrors `atom` (null when atom is null) so
        # tool_review.aggregate() / otel_sync.collect_utils_usage() — both
        # keyed on the Bash-path's `script` field — pick up MCP usage with
        # zero changes on their end.
        record = {**base, "kind": "utils-usage", "transport": "mcp",
                  "tool": suffix, "atom": atom, "script": atom, "params": params}

        if event.get("hook_event_name") == "PostToolUseFailure":
            record["interrupted"] = bool(event.get("is_interrupt", False))
            raw = event.get("error")
            if not isinstance(raw, str):
                record["stderr_tail"] = ""
                return record
            try:
                parsed = json.loads(raw)
            except (json.JSONDecodeError, ValueError):
                record["stderr_tail"] = raw[:MAX_STDERR]
                record["raw"] = raw[:MAX_STDERR]
            else:
                record["stderr_tail"] = (_summarize_mcp_error(parsed) if isinstance(parsed, dict)
                                          else str(parsed)[:MAX_STDERR])
            return record

        # PostToolUse: success in current CC behavior; defensive re-check below.
        record["interrupted"] = False
        record["stderr_tail"] = ""
        raw = event.get("tool_response")
        if isinstance(raw, str):
            try:
                parsed = json.loads(raw)
            except (json.JSONDecodeError, ValueError):
                record["raw"] = raw[:MAX_STDERR]
            else:
                if isinstance(parsed, dict) and (
                    parsed.get("error") is not None
                    or parsed.get("timed_out")
                    or (isinstance(parsed.get("exit_code"), int) and parsed.get("exit_code") != 0)
                ):
                    record["stderr_tail"] = _summarize_mcp_error(parsed)
        return record
    except Exception:
        return None


def _is_script_file(path: str) -> bool:
    return path.endswith(SCRIPT_EXTS)


def _in_noise_path(path: str) -> bool:
    return any(part in path for part in NOISE_PATH_PARTS)


def _hash(content: str) -> str:
    return hashlib.sha256(content.encode("utf-8", errors="replace")).hexdigest()[:12]


def _now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def _emit(record: dict) -> None:
    log_dir = paths.data_dir()
    log_dir.mkdir(parents=True, exist_ok=True)
    with (log_dir / "observations.jsonl").open("a") as f:
        f.write(json.dumps(record, ensure_ascii=False) + "\n")


def _build_record(event: dict) -> dict | None:
    tool = event.get("tool_name", "")
    tool_input = event.get("tool_input") or {}
    tool_response = event.get("tool_response") or {}
    hook_event = event.get("hook_event_name", "")
    base = {"ts": _now(), "session": event.get("session_id", ""), "cwd": event.get("cwd", "")}

    if tool.startswith(MCP_PREFIX):
        return _build_mcp_record(base, event)

    if tool == "Write":
        path = tool_input.get("file_path", "") or ""
        if not _is_script_file(path) or _in_noise_path(path):
            return None
        content = tool_input.get("content", "") or ""
        return {**base, "kind": "write-script", "path": path,
                "content_hash": _hash(content), "content_preview": content[:MAX_CONTENT]}

    if tool == "Bash":
        cmd = (tool_input.get("command", "") or "").strip()
        if not cmd:
            return None

        if hook_event == "PostToolUseFailure":
            # No tool_response on this event (see module docstring) — the
            # failure signal lives in `error` (string) + `is_interrupt`
            # instead. Classification below (utils-usage / script-run /
            # noise) is identical either way; only the signal source differs.
            interrupted = bool(event.get("is_interrupt", False))
            err = event.get("error")
            stderr_tail = (err if isinstance(err, str) else "")[-MAX_STDERR:]
        else:
            stderr_tail = (tool_response.get("stderr", "") or "")[-MAX_STDERR:]
            interrupted = bool(tool_response.get("interrupted", False))

        is_utils, script_name = _is_utils_call(cmd)
        if is_utils:
            return {**base, "kind": "utils-usage", "script": script_name,
                    "command": cmd[:MAX_CONTENT], "interrupted": interrupted, "stderr_tail": stderr_tail}
        if _is_noise_bash(cmd):
            return None
        if _is_script_run(cmd):
            return {**base, "kind": "script-run", "command": cmd[:MAX_CONTENT],
                    "interrupted": interrupted, "stderr_tail": stderr_tail}
    return None


def main() -> int:
    if config.observe_off():
        return 0
    try:
        event = json.load(sys.stdin)
    except (json.JSONDecodeError, ValueError):
        return 0
    # Never-raise contract for the whole hook, not just the MCP branch:
    # `event` is attacker/harness-controlled JSON — valid JSON but the wrong
    # shape (top-level list/null/int/string, tool_name not a string,
    # tool_input/tool_response not a dict, ...) must degrade to "skip this
    # event", never a non-zero exit that could be read as blocking the tool
    # call. `_build_mcp_record` already guards itself; this outer guard is
    # the backstop for every other branch in `_build_record` too.
    try:
        record = _build_record(event)
    except Exception:
        record = None
    if record is not None:
        try:
            _emit(record)
        except OSError:
            pass
    return 0


if __name__ == "__main__":
    sys.exit(main())
