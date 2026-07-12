# utils

Loki's local MCP toolbox for agents — the `utils/` dir of
[`zyx1121/plugin`](https://github.com/zyx1121/plugin), absorbed from the
archived `zyx1121/utils` repo (see `../decisions/ADR-0004-merge-utils.md`).

`utils` exposes machine-local capabilities through a native stdio MCP server:
Calendar, Mail, Reminders, Safari, screenshots, PDFs, PVE, E3, Uber Eats, and
other personal automation. The public interface is MCP. The scripts under
`scripts/` are implementation atoms, not a supported human CLI surface.

## MCP

The server lives in `mcp/` and uses `@modelcontextprotocol/sdk` directly. It
exposes only active agent-facing domains:

```text
calendar e3p mail md2slide pdf pve reminders safari screenshot ubereats
```

Registration stays **user-scope** — deliberately not the plugin's `.mcp.json`,
which would rename every tool into the plugin namespace (ADR-0004).

Claude Code:

```bash
claude mcp add utils -- bun run ~/plugin/utils/mcp/src/server.ts
```

Codex:

```toml
[mcp_servers.utils]
command = "bun"
args = ["run", "/absolute/path/to/plugin/utils/mcp/src/server.ts"]
```

## Layout

```text
mcp/src/       native MCP server and domain tools
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
