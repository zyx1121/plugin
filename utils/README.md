# utils

Loki's local MCP toolbox for agents — the `utils/` dir of
[`zyx1121/plugin`](https://github.com/zyx1121/plugin), absorbed from the
archived `zyx1121/utils` repo (see `../decisions/ADR-0004-merge-utils.md`).

`utils` exposes machine-local capabilities through a native stdio MCP server:
PDFs, Google Maps lists and Markdown slide generation. The public interface is MCP. The
scripts under `scripts/` are implementation atoms, not a supported human CLI
surface.

## MCP

The server lives in `mcp/` and uses `@modelcontextprotocol/sdk` directly. It
exposes only active agent-facing domains:

```text
gmaps md2slide pdf
```

Registration is host-aware: each domain declares what the machine must provide,
and only the tools this host can run are registered (`decisions/ADR-0003`). The always-on
`utils_capabilities` tool reports what was registered, what was hidden, and the
requirement each hidden tool failed.

Claude Code registration is automatic: the plugin's `.mcp.json` serves this
server, and tools appear as `mcp__plugin_zyx_utils__<tool>` (ADR-0004
amendment). Don't also register it user-scope — a same-named user-scope
entry shadows the plugin one.

For a direct Codex MCP registration of this remaining toolbox:

```toml
[mcp_servers.utils]
command = "bun"
args = ["run", "/absolute/path/to/plugin/utils/mcp/src/server.ts"]
```

PVE is now provided by [`pve@zyx1121`](https://github.com/zyx1121/pve),
installed separately from the shared marketplace. Since zyx 0.25.0 this server
contains no `pve_*` tools. See the standalone plugin for profile migration and
Codex / Claude Code installation.

NYCU portal, E3, timetable and part-time attendance moved to
[`nycu@zyx1121`](https://github.com/zyx1121/nycu) in zyx 0.26.0. Install it and run
its private token migration before updating zyx; this toolbox had 45 tools at that release.

macOS automation and Uber Eats moved to
[`macos@zyx1121`](https://github.com/zyx1121/macos) and
[`ubereats@zyx1121`](https://github.com/zyx1121/ubereats) in zyx 0.27.0.
Install both before updating zyx. This toolbox now has 13 tools.

## Tool contracts

Every tool declares an input schema, an output schema and annotations
(ADR-0002). Three rules hold across all of them, each enforced by test:

- **Destructive implies gated.** A tool annotated `destructiveHint: true` must
  take a literal-`true` `confirm`/`yes` argument. Read-only tools may not carry
  one, and may not be marked destructive.
- **Failures share one shape.** Envelope-speaking scripts always fail as
  `{error: {message, why, hint}}`, including timeouts and crashes. The client
  validates error results against the output schema too, so this shape is part
  of the contract rather than an afterthought.
- **Output is capped at the string leaves.** Long strings are cut and the loss
  is reported in `_truncation`; arrays and object keys are never dropped.
  Override with `UTILS_MCP_MAX_STRING_CHARS` (default 20000) and
  `UTILS_MCP_MAX_TOTAL_CHARS` (default 120000).

Output schemas are tiered: chainable reads declare a real (loose) shape once
their live output has been captured; everything else declares the envelope shell
with `data` unknown. A precise schema that has drifted is worse than none.

## Layout

```text
mcp/src/core/  execution, schemas, truncation, registration
mcp/src/tools/ one directory per domain
scripts/       internal script atoms used by MCP tools
lib/           shared script helpers
```

## Development

```bash
cd mcp
bun install
bun test
bun run typecheck
```

## License

[MIT](LICENSE)
