# ADR-0006: Retire the setup-review skill — reviews go native

Status: Accepted (2026-07-18, Loki's call).

## Context

setup-review was a three-layer review harness: (1) usage review over the
scriptorium observation log, (2) static SKILL.md lint via `utils skill-lint`,
(3) effectiveness stats via `utils skill-usage`. All three legs are dead or
were never built:

- Layer 1's data source (`observations.jsonl`) froze when the engine and its
  hooks were retired (ADR-0003). The skill itself carried a note admitting it
  operated "on the historical log only".
- Layers 2–3 depend on a `utils` CLI (`skill-lint`, `skill-usage`,
  `utils --list`) that does not exist: no binary on PATH, no alias, no such
  scripts in `utils/scripts/`. They were never migrated into the MCP toolbox
  during the ADR-0004 merge.

A 2026-07-18 review of winlab-pptx + project-docs had to hand-roll the lint
in a python one-liner because the documented tooling was dead — the review
skill was itself the most drifted asset in the audit it prescribes. The
valuable findings of that audit (a dead golden-standard file reference,
three-layer rule accretion, checklist bloat, doc-debt vs engineering-debt
triage) all came from model judgment over repo state, not from any scripted
check.

The mechanical checks the skill scripted are things the model now does
natively from `skills/AGENTS.md` + the repo: frontmatter validity,
description length (50–500 chars) and grammar, name/dir match, empty body,
staleness (>90 days = review candidate), plus the content-level review no
linter covered.

## Decision

Retire `skills/setup-review` entirely. Skill/setup reviews are performed
natively by the agent on request ("復盤 skills", "review my agent setup",
"lint my skills"), grounded in `skills/AGENTS.md` (description grammar and
thresholds) and live repo state. No replacement machinery.

## Consequences

- `agents/utils-promoter.md` intake rewording: candidates arrive from a
  native review or directly from the user, not from `/zyx:setup-review`
  tables. Bail path reports back to the user instead of "telling
  setup-review to drop it".
- `skills/AGENTS.md` stops pointing at `utils skill-lint` / `/review`;
  the numeric thresholds live there as the native-review contract.
- `~/.kilo/data/observations.jsonl` and `reviewed.jsonl` remain as
  historical data; nothing reads or writes them anymore.
- If a scripted lint is ever wanted again (e.g. CI over the skills dir),
  it should be a `utils/scripts/` atom per ADR-0004 — not a skill that
  documents a pipeline.
