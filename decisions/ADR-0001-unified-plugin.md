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
constraint); any skill content change bumps `version`. *(Superseded — see
Amendment 2026-07-12: skills now load live from the source directory too.)*

Scope: P0 (scaffold) + P1 (scriptorium migration) here. P2 (kilo
skills/agents) and P3 (utils MCP) are later phases, not blocked on this.

## Verified parameters

- Local marketplaces work: `marketplace add <local-clone-path>` resolves
  like a GitHub source. Hooks are live (next fire, no reinstall); skills are
  version-pinned (`SKILL.md` edits invisible until `plugin.json.version`
  bumps + `claude plugin update`). *(Version-pinning superseded — see
  Amendment 2026-07-12.)*
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
stay live; only skills are pinned). *(Superseded — see Amendment
2026-07-12; the bump is now registry hygiene, not a visibility gate.)*

**Deferred**: Noir (PVE) references the engine by a bare path, not a plugin
install — unaffected now, alignment is a follow-up. P2 must double-check no
`pve`-convention/machine content leaks into the public layer beyond a
placeholder; P3 needs interactive verification (tool discovery, auth).

## Amendment (2026-07-03): P3 reversed — utils MCP stays user-scope

P3 (bundling the utils MCP via plugin `.mcp.json`) shipped in 0.2.0 and was
reverted in 0.2.1. Verified live: plugin-provided MCP tools get an
uncontrollable namespaced identity (`mcp__plugin_zyx_utils__<tool>` instead
of `mcp__utils__<tool>`). Converging on that name would force a rename across
everything that hardcodes the `mcp__utils__` pattern (scribe observe, hook
matchers, instance memory), while the only machine that would benefit from
plugin distribution (Noir) has no `~/utils` at all — the launcher's fail-fast
branch was its only behavior there. Negative net value.

Verdict: the utils MCP server remains a **user-scope** registration
(`claude mcp add utils -- bun run ~/utils/mcp/server.ts`), documented in the
README install section. Plugin `.mcp.json` stays reserved for servers whose
tool names are born inside the plugin namespace.

Also recorded from P2 evidence: the plugin agent loader treats every `.md`
under `agents/` as an agent definition (a phantom `README` agent appeared in
`claude plugin details`), so the worker contract lives at
`docs/agents-contract.md`. Migrated capability loads under the plugin
namespace: skills as `zyx:<skill>`, agents as `zyx:<agent>`.

Noir alignment update: recon showed Noir actually installs the engine via
the CC marketplace (`~/.claude/plugins/marketplaces/scriptorium`), not a
bare path — `deploy/install.sh`'s bare-path fallbacks never fired. Alignment
= repeat the Mac cutover there (clone `~/plugin`, local marketplace add,
install `zyx@zyx`, uninstall old scriptorium).

## Amendment (2026-07-12): skills load live from directory marketplaces

Re-verified on Claude Code 2.1.207: for a `directory`-type marketplace the
registry's `installLocation` is the source path itself (`~/plugin`), and
skill resolution follows it — a Skill invocation reported its base directory
as `/Users/loki/plugin/skills/method` while the installed cache still sat at
0.2.5. `SKILL.md` edits are therefore visible immediately after `git pull`,
same as hooks; the version-pinning observed on CC 2.1.198 (2026-07-03) no
longer applies.

What remains true: `claude plugin update zyx@zyx` (the bare plugin name is
rejected — use `name@marketplace`) copies the current source into
`cache/zyx/zyx/<version>/` and refreshes `installed_plugins.json`
(version + `gitCommitSha`). Run it after merging so the registry reflects
reality, but it no longer gates skill visibility. Old cache version
directories accumulate and are safe to delete.
