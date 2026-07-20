# ADR-0004: Absorb the utils toolbox as `utils/`

Status: Accepted (2026-07-12).

## Context

After ADR-0003 retired the engine, this repo settled into "the capability
layer" (skills + agents), while `zyx1121/utils` had independently shrunk to
an MCP-only toolbox (its #79 dropped the CLI dispatcher; #69 retired dormant
atoms). Two public repos, one consumer (the agent), one maintainer. Loki
asked to merge utils in.

The open question was wiring: the standard plugin architecture distributes
MCP servers via plugin `.mcp.json`, but ADR-0001's amendment (2026-07-03,
CC 2.1.198) had rejected exactly that after live-verifying the forced tool
rename. Re-verified 2026-07-12 on CC 2.1.207 before deciding:

- Docs still mandate `mcp__plugin_<plugin>_<server>__<tool>` naming for
  plugin-provided servers, with no knob to customise or disable the prefix
  (plugin-dev `mcp-integration` skill; `plugins-reference`). No CHANGELOG
  entry between 2.1.198 and 2.1.207 touches this.
- A live probe (throwaway plugin whose `.mcp.json` declared a `probeutils`
  server) registered in `claude plugin details`, but its tools never
  surfaced in a headless session at all — an extra reliability strike.

## Decision

1. Import the tracked tree of `zyx1121/utils`@`7d5d12e` as the `utils/`
   subdirectory (via `git archive | tar -x`; full history stays in the
   archived source repo). Internal layout (`scripts/`, `mcp/`, `lib/`,
   `decisions/`) is unchanged; utils' own ADR trail stays in
   `utils/decisions/`.
2. The MCP server registration **stays user-scope**, per ADR-0001's
   amendment — only the path moves:
   `claude mcp add utils -- bun run ~/plugin/utils/mcp/src/server.ts`.
   `mcp__utils__*` tool names are untouched; no downstream rename.
   Plugin `.mcp.json` remains reserved for servers whose tool names are
   born inside the plugin namespace.
3. `zyx1121/utils` is archived with a pointer README; local `~/utils`
   clones are removed. `~/plugin/utils` is the only live copy.

## Consequences

**+** One public repo carries the whole capability layer; toolbox changes
ride the same PR flow and version cadence (this lands as 0.4.0).
**+** `utils-promoter` and the README now point at one canonical path.
**-** The plugin install payload grows by the toolbox (inert to the plugin
loader — no `.mcp.json`, so nothing loads unless registered user-scope).
**-** Sessions started before the local `~/utils` removal hold an MCP
server spawned from the old path; utils tools in those sessions fail after
deletion until the session restarts.

Known debt (predates the merge, out of scope here): `skills/pve/SKILL.md`
CLI examples and `agents/utils-promoter.md` smoke-test/manifest steps still
describe the retired `bin/utils` dispatcher and `mcp/manifests/` layer
(gone since utils #79; tools now live in `utils/mcp/src/tools/`).

## Amendment (2026-07-12): wiring reversed — ship `.mcp.json` after all

Landed hours after the merge, Loki's call: install-time auto-registration
(the standard plugin architecture) is worth more than stable tool names.
Point 2 above is reversed; the plugin now ships `.mcp.json` pointing at
`${CLAUDE_PLUGIN_ROOT}/utils/mcp/src/server.ts`, and the user-scope
registration is removed.

What re-testing on the real plugin showed (CC 2.1.207):

- The forced rename is real, as documented: tools surface as
  `mcp__plugin_zyx_utils__<tool>`. All `mcp__utils__*` references in the
  instance layer were renamed in the same motion (blast radius at the time:
  ~9 doc/memory files, no hook matchers, no permission entries).
- **Same-name shadowing**: with a user-scope server also named `utils`
  registered, the plugin-provided server's tools never load — the
  user-scope entry wins silently. This is why the original headless probe
  looked like "plugin MCP doesn't load at all" and why both registrations
  must never coexist.
- With the user-scope entry removed, plugin-provided tools load fine in
  headless (`claude -p`) sessions.

Scope note: this renaming applies only where the server arrives via the
plugin (CC on the Mac). Environments that mount the server through an
explicit MCP config — Codex `config.toml`, Noir's `mcp-config.json` — keep
their own registration and the plain `mcp__utils__*` names.

## Resolution (2026-07-20): known debt cleared

Both items in the known-debt note above are now resolved:

- `skills/pve/SKILL.md` — retired outright (ADR-0007); the drifted CLI
  reference and MCP roster died with the file.
- `agents/utils-promoter.md` — its smoke-test step no longer names
  `bin/utils`, and its manifest step was rewritten to describe the actual
  native TS wiring (`utils/mcp/src/tools/<domain>/index.ts` +
  `scriptTool()`) in place of the retired `mcp/manifests/` YAML layer.
