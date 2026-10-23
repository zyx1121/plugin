<div align="center">

<h1>zyx</h1>

<p><strong>One Claude Code plugin with house-style skills, a worker agent fleet and a local MCP toolbox.</strong></p>

[![CI](https://img.shields.io/github/actions/workflow/status/zyx1121/plugin/ci.yml?branch=main&style=flat-square&label=CI)](https://github.com/zyx1121/plugin/actions)
[![Version](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fraw.githubusercontent.com%2Fzyx1121%2Fplugin%2Fmain%2F.claude-plugin%2Fplugin.json&query=%24.version&label=version&style=flat-square)](.claude-plugin/plugin.json)
[![Claude Code](https://img.shields.io/badge/Claude%20Code-plugin-d97757?style=flat-square)](https://docs.anthropic.com/en/docs/claude-code/plugins)
[![License](https://img.shields.io/github/license/zyx1121/plugin?style=flat-square)](LICENSE)

**English** | [繁體中文](README.zh-TW.md) | [简体中文](README.zh-CN.md)

</div>

```
> utils_capabilities
{"host":{"platform":"darwin","arch":"arm64"},"registered":["utils_capabilities",
"gmaps_get_list","md2slide_init","md2slide_build","pdf_info","pdf_extract_text",
"pdf_extract_comments","pdf_compress","pdf_decrypt","pdf_merge","pdf_split",
"pdf_rotate","pdf_render"],"hidden":[]}
```

Skills, agents and tools used to live in separate repos. Each machine then had a different mix. This plugin puts them in one repo under one namespace, `zyx:*`, so one install gives every machine the same set. Each structural change has an ADR in [decisions/](decisions/).

## Features

- **Skills**: house rules for slides, project docs, academic writing, Next.js, the dev workflow and photorealistic image prompts.
- **Worker agents**: `planner`, `surveyor`, `developer` and `reviewer` return structured reports, not chat. `reviewer` tries to refute a claim before it counts, and the `dual-review` skill pairs it with a Codex review for high-risk changes. `surveyor` and `reviewer` grade each claim with the Admiralty Code.
- **utils MCP server**: 13 tools for PDFs, Google Maps lists and Markdown slides. The plugin registers the server for you.
- **Host-aware tools**: the server registers only the tools that this machine can run, and `utils_capabilities` reports the rest.

## Quick start

Claude Code 2.1.186 or later:

```sh
claude plugin marketplace add zyx1121/plugin
claude plugin install zyx@zyx
```

Start a new session and ask for `utils_capabilities`. The tools appear as `mcp__plugin_zyx_utils__<tool>`.

Codex gets the skills only: install `zyx@zyx1121` from [zyx1121/marketplace](https://github.com/zyx1121/marketplace).

## Usage

| Part | Contents |
|------|----------|
| [skills/](skills/) | `academic-sentence`, `dev-workflow`, `dual-review`, `nextjs-dev`, `paper-revise`, `photo-realism`, `project-docs`, `winlab-pptx`, `xiao-lin-shuo` |
| [agents/](agents/) | `planner`, `surveyor`, `developer`, `reviewer`, `utils-promoter` |
| [utils/](utils/) | MCP tools: `pdf_*` (9), `md2slide_init`, `md2slide_build`, `gmaps_get_list`, `utils_capabilities` |
| [decisions/](decisions/) | ADRs for each merge, extraction and retirement |

Skills load when a request matches their description. Agents run through the Agent tool as `zyx:<name>`.

To add a tool, give a script to the `utils-promoter` agent. It writes a PEP 723 script in `utils/scripts/`, adds an MCP tool when agents will call it, and opens a PR.

## Configuration

| Needs | For |
|-------|-----|
| `bun` | the utils MCP server |
| `uv` | the PDF, slide and Maps scripts |
| `gs` (Ghostscript) | `pdf_compress` only |
| [admiralty-code](https://github.com/zyx1121/admiralty-code) plugin | grades in `surveyor` and `reviewer` reports |

No secrets. A local clone as the marketplace serves skill edits after `git pull`: `claude plugin marketplace add <clone>`, then `claude plugin update zyx@zyx`.

## Limits

- Do not also register `utils` at user scope. A user-scope server with the same name hides the plugin server.
- PVE, NYCU, macOS and Uber Eats tools moved to their own plugins: [pve](https://github.com/zyx1121/pve), [nycu](https://github.com/zyx1121/nycu), [macos](https://github.com/zyx1121/macos), [ubereats](https://github.com/zyx1121/ubereats). ADR-0012 to ADR-0014 tell why.

## For AI agents

Facts for coding agents and LLM tools. The rules for changing the code are in [AGENTS.md](AGENTS.md).

- **Summary**: Claude Code plugin `zyx` with 9 skills, 5 worker agents and a bundled stdio MCP server (`utils`, 13 tools).
- **Type**: plugin
- **Interfaces**: skills `zyx:<skill>`, agents `zyx:<agent>`, MCP tools `mcp__plugin_zyx_utils__<tool>`
- **Install**: `claude plugin marketplace add zyx1121/plugin && claude plugin install zyx@zyx`
- **Run**: Claude Code starts the server from `.mcp.json` (`bun run utils/mcp/src/server.ts`)
- **Verify**: `cd utils/mcp && bun install --frozen-lockfile && bun run typecheck && bun test`
- **Config**: none. Tool registration depends on `uv` and `gs` on the host.
- **Secrets**: none
- **Limits**: Claude Code 2.1.186 or later. Codex reads the skills only.

## Development

```sh
cd utils/mcp
bun install --frozen-lockfile
bun run typecheck
bun test
```

CI runs the same commands. A version bump changes `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json` and `plugin.json` together.

## License

[MIT](LICENSE)
