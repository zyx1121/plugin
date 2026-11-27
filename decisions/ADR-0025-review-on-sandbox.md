# ADR-0025: Run the Codex and Gemini reviews on the sandbox

- Status: accepted
- Date: 2026-11-27

## Context

ADR-0024 ran Gemini on the MacBook, read-only, with the diff in the prompt.
Codex ran there too, through the codex-companion script. Three problems
showed up:

- Each model answered in its own free text, so the lead merged findings by
  reading them.
- Gemini could not run `git` or tests, so its findings were never reproduced.
- Round 2 started a fresh conversation, so a reviewer could not check its
  own earlier findings.

The MacBook is for editing only; builds and tests run on the sandbox.

## Decision

- `review.sh` sends one leg to the sandbox over `ssh sandbox bash -s`. The
  sandbox clones the pushed branch into a disposable checkout per model under
  `~/p/<org>/<repo>/review-<branch>/`, reaped by `claim --reap`.
- In that checkout the reviewer may run commands and tests and edit files.
  Codex runs in its `workspace-write` sandbox. Gemini runs with allow rules,
  since `agy` has no Linux sandbox that keeps commands useful.
- Both legs return JSON that follows `finding.schema.json`
  (`--output-schema` for Codex, `--json-schema` for Gemini).
- Round 2 resumes the round 1 conversation by its stored id.
- The `gemini` agent keeps only `ask`, run locally and read-only, so it can
  read uncommitted files.
- Persistent servers (`agy acp`, Codex app-server) are not used: resuming by
  id gives the same continuity without a daemon to keep alive.

## Consequences

- A review needs the branch pushed first.
- The sandbox holds the Codex and Antigravity sign-ins. A reviewer with
  command access there can read them; a malicious diff could try prompt
  injection. The checkout is disposable, but the host is not.
