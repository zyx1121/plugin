# ADR-0027: Run the Codex and Gemini reviews on the sandbox

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

- `review.sh` sends one leg to the sandbox over `ssh sandbox bash -s`, with
  every argument base64-encoded so ssh never re-parses a branch name.
- The sandbox makes a fresh clone of the pushed commit for each model and
  round under `~/p/<org>/<repo>/review-<branch>-<hash>/`, reaped by
  `claim --reap`. The hash keeps `feat/a` and `feat-a` apart.
- The reviewer runs in a bwrap jail: the filesystem read-only, the home
  directory replaced by an empty tmpfs, and only the checkout, its state and
  its own sign-in mounted back. Inside, Codex runs with `danger-full-access`
  (it cannot nest its own bwrap) and Gemini with allow rules (`agy --sandbox`
  restricts nothing on Linux, tested).
- Both legs return JSON that follows `finding.schema.json`
  (`--output-schema` for Codex, `--json-schema` for Gemini).
- Round 2 resumes the round 1 conversation by its stored id.
- The `gemini` agent keeps only `ask`, run locally and read-only, so it can
  read uncommitted files.
- Persistent servers (`agy acp`, Codex app-server) are not used: resuming by
  id gives the same continuity without a daemon to keep alive.

## Consequences

- A review needs the branch pushed first.
- Network stays open in the jail, because the model APIs need it. A
  prompt injection in a diff can reach the reviewer's own sign-in token and
  the internet, but not the gh token, ssh keys, the other model's token or
  other repositories.
