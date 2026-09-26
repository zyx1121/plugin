# ADR-0011: Merge release-engineering into dev-workflow — one skill for the whole chain

Status: Accepted (2026-09-26, Loki's call).

## Context

`skills/release-engineering` standardised everything after a merge:
Conventional Commits, Release Please, SemVer tags. Nothing standardised the
work before the first commit. Backlogs, sprints and task lists were
improvised per repo or lived only in a `zyx:planner` reply, so the chain
broke at the point where planned work should become a PR. A course
project that must show Scrum evidence exposed the gap.

A separate `scrum` skill would have split one chain across two skills.
Routing loads whichever description matches, so an agent opening a PR could
miss the `Closes #n` rule, and one closing a sprint could miss the release
step. ADR-0005 also warns against methodology prose that agents never read:
the surviving value there was concrete procedure, not theory.

## Decision

Rename `skills/release-engineering` to `skills/dev-workflow` and split it by
link of the chain, with progressive disclosure:

- `SKILL.md` is a short router: the chain, which reference to read for which
  task, and the rules that span both.
- `references/release.md` is the former `SKILL.md` body, unchanged apart
  from the title and two self-references.
- `references/backlog.md` is new: GitHub Issues as the backlog, Milestones as
  sprints, a GitHub Project board, and a definition of done, written as `gh`
  commands and templates rather than Scrum theory.
- New assets: `labels.sh`, issue forms, and a PR template.

Stack house styles (`nextjs-dev`, and a future Unity one) stay separate.
They describe how code looks; this skill describes how work flows, and
every repo needs exactly one of each axis.

## Consequences

- **+** One trigger surface for the whole chain, and one place to change it.
- **+** Sprint boards, burn-up charts and milestone retros double as report
  evidence with no extra bookkeeping.
- **-** Breaking rename: anything calling `zyx:release-engineering` must
  switch to `zyx:dev-workflow`. A repo-wide grep found no caller besides the
  README, `skills/AGENTS.md` and `project-docs`, all updated here.
- **-** `gh project` needs the `project` token scope, which an agent cannot
  grant itself; the board step asks Loki to run `gh auth refresh -s project`.
- House defaults chosen here and open to revision per repo `AGENTS.md`:
  one-week sprints, S/M/L size labels as the only estimate, and an issue
  before every PR except typo-level `docs:` or `chore:` fixes.
