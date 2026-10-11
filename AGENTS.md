# zyx plugin

Claude Code plugin `zyx`: skills in `skills/`, worker agents in `agents/`, and the `utils` stdio MCP server in `utils/mcp/`. Read [README.md](README.md) first.

## Rules

- One change, one PR. Bump the version in `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json` and `plugin.json` together. Codex reads the root `plugin.json`.
- Write an ADR in `decisions/` for each structural change: a merge, an extraction or a retirement.
- Skill `description` fields follow [skills/AGENTS.md](skills/AGENTS.md).
- MCP is the public interface of `utils`. The scripts in `utils/scripts/` are implementation parts, not a human CLI.
- Each tool declares what the host needs, such as `binary:uv`. The server registers only the tools that the host can run.
- New tools go through the `utils-promoter` agent. When the tool list changes, update the count in `utils/mcp/README.md` and in README.md.
- Repository documents and code comments are English. No em dashes in documents or skills.

## Verify

```sh
cd utils/mcp
bun install --frozen-lockfile
bun run typecheck
bun test
```

Run these on the sandbox, not in the iCloud clone. After a merge, pull the local marketplace clone and run `claude plugin update zyx@zyx`. Then call `utils_capabilities` in a new session.
