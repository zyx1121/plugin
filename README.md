```
███████╗██╗   ██╗██╗  ██╗
╚══███╔╝╚██╗ ██╔╝╚██╗██╔╝
  ███╔╝  ╚████╔╝  ╚███╔╝
 ███╔╝    ╚██╔╝   ██╔██╗
███████╗   ██║   ██╔╝ ██╗
╚══════╝   ╚═╝   ╚═╝  ╚═╝
```

# zyx

> One namespace for everything my agents know and touch: house-style skills, a worker fleet, and a machine-local MCP toolbox, in a single Claude Code plugin.

`claude-code` · `skills` · `agents` · `mcp`

[![Claude Code plugin](https://img.shields.io/badge/Claude%20Code-plugin-d97757)](https://github.com/zyx1121/plugin) &nbsp;[![version](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fraw.githubusercontent.com%2Fzyx1121%2Fplugin%2Fmain%2F.claude-plugin%2Fplugin.json&query=%24.version&label=version&color=111111)](.claude-plugin/plugin.json) &nbsp;[![License: MIT](https://img.shields.io/badge/license-MIT-blue)](#license)

```
> "讀取論文 PDF 的資訊，投影片照 winlab 格式開個底"
  ⚡ pdf_info { file: "paper.pdf" }
  ⚡ Skill: zyx:winlab-pptx
✓ PDF inspected · deck scaffolded the house way
```

<sub>One prompt, two pillars: a machine-local MCP tool plus a house-style skill, same `zyx:*` namespace.</sub>

Capability used to be scattered across separate plugin repos: a skill here, an agent there, a toolbox script somewhere else. This plugin folds all of it into one repo with one namespace, so every machine gets the same brain by installing a single thing. Every structural change along the way is written down as an ADR, so the repo remembers why it looks the way it does.

## Install

Requires **Claude Code >= 2.1.186** (older versions reject the plugin's root-relative `source`).

```bash
git clone https://github.com/zyx1121/plugin.git ~/plugin
claude plugin marketplace add ~/plugin
claude plugin install zyx@zyx
```

A local marketplace serves skill and agent edits live from the clone: `git pull` is enough, then `claude plugin update zyx@zyx` to keep the install registry aligned (ADR-0001, 2026-07-12 amendment). Installing straight off GitHub (`claude plugin marketplace add zyx1121/plugin`) also works, minus the live-edit convenience.

## What it gives you

| Pillar | Pieces |
|--------|--------|
| [`skills/`](skills/) | `academic-sentence` · `dev-workflow` · `nextjs-dev` · `paper-revise` · `photo-realism` · `project-docs` · `winlab-pptx` · `xiao-lin-shuo` |
| [`agents/`](agents/) | `planner` · `surveyor` · `developer` · `reviewer` · `utils-promoter` |
| [`utils/`](utils/) | MCP toolbox: pdf · md2slide · gmaps |
| [`decisions/`](decisions/) | ADR trail: every merge and retirement has a written why |

The `utils` MCP server is bundled via `.mcp.json`: installing the plugin registers it, no separate `claude mcp add`. Tools land as `mcp__plugin_zyx_utils__<tool>`.

> [!WARNING]
> Do not also register the server user-scope: a same-named user-scope entry shadows the plugin one (ADR-0004 amendment).
> First run resolves server deps via bun; warm up with `cd ~/plugin/utils/mcp && bun install`.

## Independent plugins

PVE moved to [zyx1121/pve](https://github.com/zyx1121/pve) in zyx 0.25.0.
Install `pve@zyx1121` from [zyx1121/marketplace](https://github.com/zyx1121/marketplace)
before updating zyx. Its 16 tool names and parameters are preserved; the MCP
namespace changes from `plugin_zyx_utils` to `plugin_pve_pve`.
Machine settings now live in `~/.config/pve/config.json`; see the new plugin's
setup guide and [ADR-0012](decisions/ADR-0012-extract-pve.md).

NYCU moved to [zyx1121/nycu](https://github.com/zyx1121/nycu) in zyx 0.26.0.
Install `nycu@zyx1121`, migrate existing token files with its setup script, then
update zyx. Its 21 portal, E3, timetable and attendance tools retain their short
names and schemas; the provider namespace becomes `plugin_nycu_nycu`.
See [ADR-0013](decisions/ADR-0013-extract-nycu.md) for the platform and credential boundaries.

macOS automation moved to [zyx1121/macos](https://github.com/zyx1121/macos)
and Uber Eats moved to [zyx1121/ubereats](https://github.com/zyx1121/ubereats)
in zyx 0.27.0. Install `macos@zyx1121` and `ubereats@zyx1121` before updating
zyx. The 28 and 4 tool names and schemas are preserved, with provider namespaces
`plugin_macos_macos` and `plugin_ubereats_ubereats`. Update today-mod to 0.3.0
for its standalone Calendar, Reminders and E3 source paths. No Uber Eats cookie
or ledger migration is needed. The remaining utils toolbox has 13 tools.
See [ADR-0014](decisions/ADR-0014-extract-macos-ubereats.md).

## The Claude-native angle

- **The fleet is contractual**: each worker agent (`planner` / `surveyor` / `developer` / `reviewer`) embeds its own report contract, so the lead gets structured deliverables back, not chat.
- **`reviewer` is adversarial by design**: nothing a worker claims counts until it fails to be refuted.
- **`utils` is agent-only surface**: MCP is the public interface; `scripts/` are implementation atoms, not a supported human CLI.

## Extending it

New tools are not added by hand. Hand a one-off script to the **`utils-promoter`** agent: it writes the self-contained PEP 723 atom under `utils/scripts/`, wires a native MCP tool when agents will call it, and opens the PR.

## Lineage

Migrated from [`zyx1121/scriptorium`](https://github.com/zyx1121/scriptorium)@`c12e4933`; the scriptorium engine was retired in 0.3.0 ([ADR-0003](decisions/ADR-0003-retire-engine.md)). `utils/` absorbed from the archived [`zyx1121/utils`](https://github.com/zyx1121/utils)@`7d5d12e` in 0.4.0 ([ADR-0004](decisions/ADR-0004-merge-utils.md)).

## Contributing

A personal plugin, but issues and PRs are welcome: ground rules in [CONTRIBUTING.md](https://github.com/zyx1121/.github/blob/main/CONTRIBUTING.md).

## License

[MIT](LICENSE) · assembled by the agents it feeds
