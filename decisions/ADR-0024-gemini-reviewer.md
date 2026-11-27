# ADR-0024: Add Gemini as a third reviewer

- Status: accepted
- Date: 2026-11-27

## Context

Gemini 4 Neon shipped on 2026-11-18 and scores close to Claude Opus 5.5 on
coding and agentic benchmarks. Gemini CLI stopped serving personal accounts
on 2026-06-18; Google's replacement is the Antigravity CLI (`agy`), signed in
with a personal Google account. `dual-review` already pairs the Claude
reviewer with Codex, and a third model from a different lab adds an
independent read.

## Decision

- `skills/dual-review/scripts/gemini.sh` runs `agy` headless with
  `gemini-4-neon-<effort>`. It has two commands: `review` sends the diff from
  the merge base, `ask` sends a prompt.
- Every run is read-only: plan mode, per-session deny rules for
  `write_file(*)` and `command(*)`, and a check that the git working tree is
  unchanged afterwards.
- `dual-review` runs Gemini in parallel with Codex and the reviewer. The skill
  keeps its name so existing triggers still route to it.
- The `gemini` agent is a thin forwarder, like `codex:codex-rescue`, for a
  second opinion outside a review.

## Consequences

- A host without `agy`, or signed out, gets an error that says how to fix it;
  `dual-review` continues with two reviewers.
- Gemini cannot run `git` itself, so the script puts the diff in the prompt.
  Diffs over about 900 KB fail instead of being cut.
