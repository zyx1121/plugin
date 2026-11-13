# ADR-0021: Retire the developer agent

- Status: accepted
- Date: 2026-11-13

## Context

Since 2026-09-28 the lead writes all code itself, and the global instructions
say not to dispatch `developer`. The agent file stayed, so the planner still
offered it as a worker and the reviewer still handed fixes back to it. A
30-day measurement had also put subagents at half of the spend, and two
parallel `developer` runs had used up a session quota.

## Decision

- Delete `agents/developer.md`.
- The planner offers `lead`, `surveyor` and `reviewer`. The reviewer hands
  fixes back to the lead.
- ADR-0009 keeps its text as history. Its `developer` tier no longer exists.

## Consequences

- 5 agents: `planner`, `surveyor`, `reviewer`, `alint`, `utils-promoter`.
- Isolated coding in a worktree is no longer one dispatch away. The lead does
  it, or uses a fork when it needs the same context.
