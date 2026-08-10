# ADR-0002: Agent-facing tool contracts

Status: Accepted (2026-08-10)

## Context

ADR-0001 moved the atoms behind a native MCP server. What the server exposed was
a name, a description and an input schema. Everything a caller needs *after*
deciding to call was missing:

- **No output schema.** The result shape was undiscoverable, so planning a
  multi-step chain meant spending one call to find out what the previous call
  returns.
- **Descriptions carried no traps.** `safari_eval_js` said "Evaluate JavaScript
  in Safari front tab" and nothing about it hitting the browser window the user
  is reading. That fact lived in an auto-memory, which is only present when it
  happens to be recalled; the description is present in every session.
- **No read/write signal.** Only `safari_close_tab` gated itself behind
  `confirm`. `pve_destroy_guest`, `reminders_delete`, `calendar_delete_event`
  and others were annotated the same as a list call, so nothing downstream could
  tell them apart.
- **Unbounded output.** `safari_get_text`, `pdf_extract_text` and
  `mail_read_message` return whole documents. One call could consume a large
  share of the caller's context, degrading every judgement afterwards.
- **Errors without a next step.** 11 `fail()` sites across 8 scripts had no
  `hint`. `safari.py` was worse than that: its error branches probed for
  `"Can't get current tab"` with an ASCII apostrophe while AppleScript emits
  `"Can’t"` (U+2019), so the branches never matched and the raw osascript error
  surfaced instead.

## Decision

1. **Every tool declares an outputSchema**, via one of two shells in
   `core/schema.ts` — the envelope shell (`data` / `metadata` / `error`) or the
   raw-stream shell (`stdout` / `stderr` / `exit_code`).

2. **Precise output shapes are tiered.** Tier A declares a real loose shape and
   is earned per tool: the tool's actual output must be captured and parsed
   first. Tier B is `z.unknown()` under the same shell. A precise schema that
   has drifted from reality is worse than none, because it turns a working tool
   into an error on the success path. Eleven chainable reads are Tier A today.

3. **The failure path is part of the schema.** The server skips output
   validation when `isError` is set, but the client does not, and the generated
   JSON Schema carries `additionalProperties: false`. Every failure of an
   envelope-speaking script therefore reports one shape, `{error: {message, why,
   hint}}` — including timeouts and crashes that produce no envelope at all.

4. **Every tool declares annotations**, and the field is required in
   `ScriptToolDefinition`, so a new tool cannot be added without stating whether
   it reads or writes.

5. **Destructive implies gated.** Any tool annotated `destructiveHint: true`
   must carry a literal-`true` `confirm`/`yes` field. This is enforced by test,
   not by discipline, and applies in both directions: a read-only tool may not
   carry a gate, and may not be marked destructive.

6. **String leaves are truncated, structures are not.** Output over budget is
   shortened at the string level only; arrays keep their length and objects keep
   their keys, so truncation can never violate an output schema and a caller is
   never handed a silently shorter list. What was cut is reported in
   `_truncation`, and the marker names the escape hatch for that tool.

7. **Every `fail()` names a next action.** Hints say what to do, not what broke.

## Consequences

- (+) A caller knows the result shape before spending a probe call, and knows
  from the annotations whether a tool is safe to run unattended.
- (+) "Destructive operations are gated" became a property of the toolbox rather
  than a habit; adding an ungated destructive tool now fails CI.
- (+) Failure output is uniform across 69 tools, so error handling is one path.
- (−) `data` and `metadata` are optional in every schema, because the error
  envelope has to validate against the same shape. The schema documents the
  success shape rather than guaranteeing it.
- (−) Tier A shapes can drift from their scripts. Mitigated by parsing synthetic
  fixtures in CI, but a script that changes its output silently will only be
  caught by a live call.
- (−) Descriptions grew. Capped at 300 characters each and asserted in CI, since
  all 69 sit in every session's context.
- (−) `ubereats.py` still emits no envelope, so its failures remain raw stderr.
  Moving it onto the envelope contract is separate work.

## Verification

- 467 tests, including the failure-path regression above for all 69 tools.
- `.github/workflows/ci.yml` added (this repo had no CI): install → typecheck →
  test, matching the house template.
- Live smoke against a real stdio client for the Tier A reads. Its output is
  reported in the PR, not committed — this repo is public and those calls return
  internal hostnames and addresses.
