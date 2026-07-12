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
