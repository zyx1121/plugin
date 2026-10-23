# ADR-0018: alint turns repeated corrections into rule files

- Status: accepted
- Date: 2026-10-23

## Context

Loki's corrections pile up as prose: CLAUDE.md lines and feedback memories.
Prose drifts and gets skipped in long sessions. Cursor's pstack states the
fix as a principle (`principle-encode-lessons-in-structure`): when a lesson
can be structure, the instruction is only the symptom.

Most of Loki's rules are not regex-shaped ("no explanatory sentences in the
UI", "GitHub text is English"), so a classic linter covers few of them. Loki
proposed an agent that runs a fast special-purpose scan instead.

## Decision

- New skill `alint` and agent `alint` (haiku). One rule per Markdown file
  with `id`, `engine`, `files`, a Bad and a Good example, and a `source`.
- `engine: grep` rules run in `scripts/alint.mjs` (Node, no dependencies) on
  the added lines of the diff against the merge base, untracked files
  included. `engine: model` rules go to the agent, only with the changed
  files they cover.
- Shared rules live in `skills/alint/rules/`. A repo adds or overrides rules
  in `.alint/rules/`.
- The lead runs it before opening a PR. It does not run in CI: a model call
  per PR would need an API key in CI and cost money on every push.
- Six seed rules from CLAUDE.md and feedback memories: `no-dash-separators`,
  `text-size-scale`, `secret-tokens` (grep), `ui-copy-no-filler`,
  `github-english`, `markdown-image-exfil` (model).

## Consequences

- A correction Loki makes twice becomes a rule file with a test case, and
  the memory notes that alint checks it.
- A false alarm that returns is a defect in the rule, fixed in its Good
  example or its globs.
- Nothing stops a PR when the lead skips alint. The CI-free choice trades
  that for zero running cost.
