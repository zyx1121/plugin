# zyx

A unified **Claude Code** plugin: one namespace (`zyx:*`) for skills and
worker agents instead of scattering capability across separate plugin repos.

> The scriptorium self-evolution engine (Armarium / Scribe / Corrector
> offices + lifecycle hooks) lived here from 0.1.0 to 0.2.7 and was retired
> in 0.3.0 — see [`decisions/ADR-0003-retire-engine.md`](decisions/ADR-0003-retire-engine.md).

## Install

Requires **Claude Code ≥ 2.1.186** (older versions reject the plugin's
root-relative `source`). Check with `claude --version`; `claude update` if needed.

```bash
# clone to a fixed local path
git clone https://github.com/zyx1121/plugin.git ~/plugin

# add as a local marketplace, then install
claude plugin marketplace add ~/plugin
claude plugin install zyx@zyx
```

With a local (`directory`-type) marketplace, skill and agent edits are
served live from the clone — `git pull` is enough (see ADR-0001, 2026-07-12
amendment). Run `claude plugin update zyx@zyx` after merging to keep the
install registry aligned. Installing directly off GitHub
(`claude plugin marketplace add zyx1121/plugin`) also works, at the cost of
that live-edit convenience.

The `utils` MCP toolbox lives in-repo under [`utils/`](utils/) (absorbed
from `zyx1121/utils` — see ADR-0004), but its server is deliberately **not**
bundled via plugin `.mcp.json` (see ADR-0001 amendment, re-verified in
ADR-0004 — plugin-provided MCP tools get renamed into the plugin namespace,
breaking every `mcp__utils__*` reference). Register it user-scope instead:

```bash
cd ~/plugin/utils/mcp && bun install
claude mcp add utils -- bun run ~/plugin/utils/mcp/src/server.ts
```

## Layout

| Dir | Role | Pieces |
|-----|------|--------|
| `skills/` | procedures + domain knowledge | `method` · `pve` · `keel` · `macos-dev` · `nextjs-dev` · `winlab-pptx` · `paper-revise` · `post` · `review` · `a2a` |
| `agents/` | worker fleet (subagent definitions) | `developer` · `surveyor` · `reviewer` · `planner` · `utils-promoter` (contract: [`docs/agents-contract.md`](docs/agents-contract.md)) |
| `utils/` | MCP toolbox (user-scope server + script atoms) | `mcp/` server · `scripts/` atoms · own ADR trail in `utils/decisions/` |
| `decisions/` | ADR trail | |

## Lineage

Migrated from [`zyx1121/scriptorium`](https://github.com/zyx1121/scriptorium)@`c12e49334aedaae4598e08b3c2a89c6e02ad16d2`;
engine retired in 0.3.0 (last complete engine state: `45e89ae` / 0.2.7).
`utils/` absorbed from [`zyx1121/utils`](https://github.com/zyx1121/utils)@`7d5d12e`
in 0.4.0 (full history in the archived source repo).
