# ADR-0009: Tier worker models — opus for judgment workers, sonnet for fan-out

Status: Accepted (2026-09-05, Loki's call).

## Context

Every worker agent shipped with `model: sonnet` since the fleet was
introduced (ADR-0001). That was a cost call made when the lead ran on
Opus 4.x and the workers' output was always re-read by a lead of a
similar class.

Two things changed by 2026-09:

- The lead now runs on Fable 5.1, a class above Opus 5. A sonnet-class
  worker returning a `developer` contract or a `reviewer` verdict is
  now far enough below the lead that the lead re-does the verification
  itself, which defeats the point of delegating.
- Usage data from 92 sessions (2026-07-22 to 2026-09-05) shows the
  fleet is load-bearing: 153 `Agent` dispatches, of which `developer`
  50, `surveyor` 39, `reviewer` 9, plus 32 `general-purpose` and 20
  `fork`. Worker quality is on the critical path of most non-trivial
  sessions.

The workers split cleanly by what they are paid for:

- **Judgment workers** (`developer`, `reviewer`, `planner`): their value
  is a correct change, an honest verdict, or a sound decomposition. A
  wrong `pass` from `reviewer` is worse than no review.
- **Fan-out workers** (`surveyor`, `utils-promoter`): their value is
  breadth and source-traced findings, or a mechanical promotion of an
  already-approved script. Sonnet 5 is adequate and much cheaper.

## Decision

- `developer`, `reviewer`, `planner`: `model: opus`.
- `surveyor`, `utils-promoter`: stay on `model: sonnet`.
- No worker uses `inherit`: the lead's own model is reserved for the
  lead, and a Fable-class worker per dispatch would exhaust the rate
  budget the fleet exists to protect.

Model aliases (`opus`, `sonnet`) resolve to the current generation of
each tier, so this ADR does not need revisiting when a new point
release lands.

## Consequences

- **+** `reviewer` verdicts and `developer` contracts become trustworthy
  enough that the lead can act on them without re-running the work.
- **+** Read-heavy fan-out stays cheap; `surveyor` is the most-dispatched
  worker after `developer` and its cost profile is unchanged.
- **-** A `developer` or `reviewer` dispatch costs roughly an Opus turn
  instead of a Sonnet turn. Under rate pressure the lead should fold a
  small change into its own turn rather than dispatch.
- Companion change outside this repo: the lead's global CLAUDE.md gained
  a `## Fleet` section that names when each worker is dispatched, since
  the harness now defaults to no subagents unless the project asks.
