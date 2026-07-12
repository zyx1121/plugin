# ADR-0003: Retire the scriptorium engine — plugin becomes skills + agents only

Status: Accepted (2026-07-12, Loki's call).

## Context

ADR-0001 consolidated the scriptorium self-evolution engine (Armarium /
Scribe / Corrector offices, lifecycle hooks, instance binding) into this
plugin. By 0.2.7 the engine was feature-complete (observe → author →
review loops for skills, agents, memory, and tools; delegation trip-wire;
memory index generation and sync) with 200+ tests.

It is retired anyway. The same week, the Noir agent was rebuilt from an
autonomous compound architecture down to a clean template instance — this
is the same move at the capability layer: the machinery's upkeep and
per-session overhead (observation subprocesses on every Bash/Write/MCP
call, Stop/SessionStart measurement, staged-candidate bookkeeping)
outweighed what the loops actually yielded. Growth of skills / memory /
tools continues, but as deliberate manual work in-session, not as a
background pipeline.

## Decision

The plugin is now **skills + worker agents only**:

- **Deleted**: `armarium/`, `scribe/`, `corrector/`, `hooks/`, `bin/`,
  `docs/CHARTER.md`, and the engine-facing skills `authoring`, `dreaming`,
  `scriptorium-init`.
- **Kept**: capability skills (`method`, `pve`, `keel`, `macos-dev`,
  `nextjs-dev`, `winlab-pptx`, `paper-revise`, `post`, `review`, `a2a`),
  the worker fleet under `agents/` (`docs/agents-contract.md` still the
  contract), and `decisions/` as the ADR trail.
- `method` and `review` stay because they are standalone procedures with
  no engine dependency; `review` §1/§3 now read the **historical**
  observation logs only (nothing appends to them anymore).

Instance-side (not in this repo): `~/.kilo` keeps memory / doctrine / data
as plain files. `MEMORY.md` is hand-maintained again (no Stop-hook
rebuild), memory commits are manual, `nudge.py` is unregistered from
`settings.json`, and the `SCRIPTORIUM_*` environment variables are gone.

## Consequences

**+** Zero engine subprocesses in the session lifecycle; no staged/
bookkeeping; the plugin's mental model shrinks to "a folder of skills and
agents"; skill edits are live from the source directory (ADR-0001
2026-07-12 amendment) with nothing else to keep in sync.

**−** No automatic observation → authoring loop, no delegation-ratio
trip-wire, no auto memory-index rebuild or sync. These become the agent's
own discipline (KILO.md guardrails) rather than enforced machinery.

**Rollback**: the engine's last complete state is `45e89ae` (0.2.7);
`git revert` of the removal commit restores it, and the old standalone
repo `zyx1121/scriptorium` remains archived.
