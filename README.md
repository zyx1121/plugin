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
> "把下週三 10:00 的 lab meeting 加進行事曆，投影片照 winlab 格式開個底"
  ⚡ calendar_add_event { title: "lab meeting", start: "…" }
  ⚡ Skill: zyx:winlab-pptx
✓ Event added · deck scaffolded the house way
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
| [`skills/`](skills/) | `academic-sentence` · `nextjs-dev` · `paper-revise` · `project-docs` · `winlab-pptx` |
| [`agents/`](agents/) | `planner` · `surveyor` · `developer` · `reviewer` · `utils-promoter` |
| [`utils/`](utils/) | MCP toolbox: calendar · mail · reminders · safari · screenshot · pdf · pve · e3p · md2slide · ubereats |
| [`decisions/`](decisions/) | ADR trail: every merge and retirement has a written why |

The `utils` MCP server is bundled via `.mcp.json`: installing the plugin registers it, no separate `claude mcp add`. Tools land as `mcp__plugin_zyx_utils__<tool>`.

> [!WARNING]
> Do not also register the server user-scope: a same-named user-scope entry shadows the plugin one (ADR-0004 amendment).
> First run resolves server deps via bun; warm up with `cd ~/plugin/utils/mcp && bun install`.

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
