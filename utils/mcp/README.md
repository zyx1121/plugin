# utils MCP server

Local stdio MCP server for Loki's agent toolbox. The user is the agent, so the
MCP surface is the product interface; the legacy `../scripts/*` atoms are
implementation details and debug fallbacks.

## Architecture

```text
src/server.ts              MCP entrypoint: probe host -> registerTools() -> StdioServerTransport
src/core/argv.ts           argv construction helpers
src/core/exec.ts           Bun.spawn wrapper, timeout, envelope/raw output mapping
src/core/requires.ts       host requirement DSL and bounded, memoised probes
src/core/tool.ts           native @modelcontextprotocol/sdk tool registration helper
src/tools/<domain>/        one folder per toolbox domain
tests/                     registry + argv + host-requirement contract tests
```

The server uses `@modelcontextprotocol/sdk` directly. There is no YAML manifest
loader. Each domain owns native zod input schemas and explicit tool names.

Tool call flow:

```text
MCP tool -> zod parse -> domain buildArgs() -> runScript()
         -> Bun.spawn(["../scripts/<atom>", ...argv], stdio=["ignore","pipe","pipe"])
         -> structuredContent + mirrored JSON text content
```

Subprocesses never inherit the MCP server's stdin/stdout because those are the
JSON-RPC channel. Tool logs must go to stderr.

## Domains

Only active agent-facing domains are exposed:

- `gmaps`
- `md2slide`
- `pdf`
- `utils` (`utils_capabilities` only, always registered)

Dormant utilities such as clipboard/json/uuid/tokens/notebooklm remain outside
the MCP surface.

## Naming Rules

- Tool names are `domain_verb_object`, e.g. `pdf_info`,
  `pdf_extract_text`, `md2slide_build`.
- One MCP tool should represent one agent intent. Do not expose generic
  `action` or `mode` multiplexers when the actions have different required
  inputs.
- Destructive tools must say so in the description and require explicit
  confirmation input when the underlying operation is confirm-gated.
- Sensitive inputs belong in typed tools only when there is no better local
  credential path. Do not MCP-expose password-login tools without a redaction
  path.
- Interactive tools must say they block for user interaction.

## Host awareness

Registration is host-aware. Each domain declares what the machine must provide
(`src/core/requires.ts`), the server probes those requirements in parallel at
startup, and only the tools that can actually run are registered. A Linux box
never sees the macOS-only domains.

Requirement kinds:

| Kind | Satisfied when |
|------|----------------|
| `platform:darwin` / `platform:linux` | the process platform matches |
| `binary:<name>` | the executable is on the augmented PATH the tools run with |
| `ssh:<alias>` | `ssh` is on PATH and the alias is a `Host` entry in `~/.ssh/config` (`Include` followed, wildcard patterns ignored) |
| `env:<NAME>` | the variable is set and non-empty |
| `file:<path>` | the path exists (leading `~` expanded) |

No check touches the network. The snapshot is taken once at startup and holds
for the whole session, so a requirement states whether the host is *configured*
for a tool, not whether a remote service answers this second. An unreachable
service is the tool's own timeout to report. An unknown kind fails closed, every check is capped at 4 s,
results are memoised per requirement string, and a check that throws hides its
tool rather than taking the server down. Startup logs the registered and hidden
tool counts with failed requirements to stderr.

`utils_capabilities` declares no requirements, so it is registered on every
host. It reports platform/hostname/arch, the registered tool names, and each
hidden tool with the requirement it failed, which is how a caller finds out why
a tool it remembers is missing today.

`UTILS_FORCE_PLATFORM=linux` overrides the detected platform. It exists to
exercise the split on one machine (the darwin domains disappear); it does not
make macOS tools work anywhere else.

## Current Tool Surface

13 tools total:

- `gmaps_get_list`
- `md2slide_init`, `md2slide_build`
- `pdf_info`, `pdf_extract_text`, `pdf_extract_comments`, `pdf_compress`,
  `pdf_decrypt`, `pdf_merge`, `pdf_split`, `pdf_rotate`, `pdf_render`
- `utils_capabilities`

PVE's 16 tools moved to [zyx1121/pve](https://github.com/zyx1121/pve),
installed as `pve@zyx1121`. They are no longer registered here.

NYCU's 21 portal, E3, timetable and attendance tools moved to
[zyx1121/nycu](https://github.com/zyx1121/nycu), installed as `nycu@zyx1121`.

macOS automation (28 tools) and Uber Eats (4 tools) moved to
[macos](https://github.com/zyx1121/macos) and
[ubereats](https://github.com/zyx1121/ubereats), installed as
`macos@zyx1121` and `ubereats@zyx1121`.

## Registering With Clients

```bash
# Claude Code
claude mcp add utils -- bun run /absolute/path/to/utils/mcp/src/server.ts
```

Codex:

```toml
[mcp_servers.utils]
command = "bun"
args = ["run", "/absolute/path/to/utils/mcp/src/server.ts"]
```

## Development

```bash
bun install
bun test
bun run typecheck
bun run start
```

Add a new domain tool by editing `src/tools/<domain>/index.ts` or adding a new
domain folder, then export it from `src/tools/index.ts`. Declare the domain's
`requires` alongside its `script` const, one shared array per domain. Add/adjust
tests for tool count, name prefix, and any nontrivial argv mapping.

## Executor Rules

Any `../scripts/<atom>` that shells out must capture child stdout/stderr. If a
grandchild inherits the direct child's pipe descriptors, killing the direct
child on timeout does not close the pipes and can hang the MCP response. The
executor has a grace cutoff, but the source script still owns subprocess
hygiene.
