# ADR-0001: Unified plugin (`zyx1121/plugin`, name `zyx`)

Status: Accepted (2026-07-03).

## Context

Capability was split across three places: `zyx1121/scriptorium` (engine —
Armarium/Scribe/Corrector, `method` router, hooks), `zyx1121/utils` (script
atoms + MCP), and `~/.kilo` (skills/agents meant to stay instance-level but
drifting toward shared capability). No shared versioning cadence. Claude
Code's plugin-cache model pins one version per install — bumping scriptorium
meant a manual `update` per machine, and stale cache copies silently
diverged from source (observed directly). Separately, `utils` was once
itself a plugin and was retired from that role after skills/hooks drifted
from a second source of truth — the dual-source failure mode this ADR avoids.

## Decision

Consolidate into one public plugin repo, `zyx1121/plugin`, plugin name `zyx`
(namespace becomes `zyx:method` etc). Split stays crisp: **plugin** =
capability layer (engine + skills + hooks + agents + MCP, no personal
content, shared across machines); **kilo (`~/.kilo`)** = instance layer
(CANON, memory, per-machine state), wired to the plugin one-way.

Deploy per machine: `git clone` to a fixed local path, then
`claude plugin marketplace add <local-path>` (not the GitHub URL) so hook/
script edits land on `git pull` without reinstall. Skills still need a
`plugin.json` version bump + `claude plugin update` (Claude Code
constraint); any skill content change bumps `version`.

Scope: P0 (scaffold) + P1 (scriptorium migration) here. P2 (kilo
skills/agents) and P3 (utils MCP) are later phases, not blocked on this.

## Verified parameters

- Local marketplaces work: `marketplace add <local-clone-path>` resolves
  like a GitHub source. Hooks are live (next fire, no reinstall); skills are
  version-pinned (`SKILL.md` edits invisible until `plugin.json.version`
  bumps + `claude plugin update`).
- Marketplace `name` is a global key — same-name registration silently
  overwrites; confirmed `zyx` was free (existing local marketplaces:
  `claude-plugins-official`, `openai-codex`, `scriptorium`).
- Plugin-provided MCP documented as equivalent to user-level MCP config; not
  independently re-verified here — deferred to P3.

## Consequences

**+** One source of truth, one version to bump, no more dual-source drift
between a plugin repo and a shadow copy in `~/.kilo`. `SCRIPTORIUM_HOME` and
the office architecture carry over unchanged — kilo/Noir keep working by
only repointing their marketplace source.

**-** Skill iteration now needs a mandatory version bump per change (hooks
stay live; only skills are pinned).

**Deferred**: Noir (PVE) references the engine by a bare path, not a plugin
install — unaffected now, alignment is a follow-up. P2 must double-check no
`pve`-convention/machine content leaks into the public layer beyond a
placeholder; P3 needs interactive verification (tool discovery, auth).
