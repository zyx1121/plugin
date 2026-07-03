# zyx

A unified **Claude Code** plugin: one namespace (`zyx:*`) for engine, skills,
hooks, agents, and MCP instead of scattering capability across separate
plugin repos.

Claude Code gives you skills, hooks, and memory — but passive ones. The
engine tending them here follows the **scriptorium** office architecture:
four offices (Armarium, Scribe, Corrector, plus the `method` skill router)
make skills/hooks/memory **grow, sync across devices, and review themselves**
while keeping one agent identity across Claude Code installations. See
[`docs/CHARTER.md`](docs/CHARTER.md).

## Engine vs instance

This repo is the **engine** (public, no personal content). Your agent's
**instance** — `CANON.md`, `memory/`, your skills — lives in *your own*
private repo, located via `SCRIPTORIUM_HOME`.

## Install

Requires **Claude Code ≥ 2.1.186** (older versions reject the plugin's
root-relative `source`). Check with `claude --version`; `claude update` if needed.

```bash
# clone to a fixed local path
git clone https://github.com/zyx1121/plugin.git ~/.zyx-plugin

# add as a local marketplace, then install
claude plugin marketplace add ~/.zyx-plugin
claude plugin install zyx@zyx

# point at an instance, or scaffold and bind a fresh one
/scriptorium-init ~/my-agent
```

Local clone + local marketplace lets hook/script changes take effect on a
`git pull` (no reinstall); skill changes still need a plugin.json version
bump + `claude plugin update`. Installing directly off GitHub
(`claude plugin marketplace add zyx1121/plugin`) also works, at the cost of
that live-hook-edit convenience.

The bundled `utils` MCP server (`mcp/utils-launcher.sh`) requires
[`zyx1121/utils`](https://github.com/zyx1121/utils) checked out at `~/utils`
with `bun` available. On a machine without either (e.g. a minimal agent
runtime), the launcher exits immediately and the server simply doesn't
register — no install step is required to skip it.

## Privacy / observability

The engine is local-first and writes observation data into your private
instance under `SCRIPTORIUM_HOME/data/`. The event hook records Claude Code
lifecycle and Skill/Agent metadata + per-session delegation posture; the
script observer records non-noise script writes/runs so repeated patterns
can become candidate skills. For script writes it stores the path, a short
content hash, and up to the first 4096 characters as `content_preview`.

To disable both event and script observation on a machine, create
`~/.claude/scriptorium.local.md` with frontmatter:

```markdown
---
observe: off
---
```

On macOS, a Stop hook (`hooks/notify.py`) posts a system notification when
Claude Code finishes responding; other platforms no-op. Disable it with
`notify: off` in the same frontmatter.

Memory sync (`armarium/memory-sync.sh`) only commits `memory/` changes in your
instance repo. It uses the configured git upstream when available, otherwise it
falls back to the current branch on the first remote; non-git instances no-op.

## Layout

| Dir | Office | Role | Pieces |
|-----|--------|------|--------|
| `armarium/` | Armarium | persistence · sync · index · path map | `paths.py` · `memory-sync.sh` · `gen_memory_index.py` |
| `scribe/` | Scribe | observe signal → author new memory/skills | `events.py` (session/skill/method-route/delegation-ratio) · `observe.py` (scripts) |
| `corrector/` | Corrector | calibrate · consolidate existing (propose-only) | `skill_review.py` · `skills/dreaming` |
| `skills/` | — | engine skills + capability skills | engine: `method` · `dreaming` · `authoring` · `scriptorium-init`; capability: `pve` · `macos-dev` · `nextjs-dev` · `winlab-pptx` · `paper-revise` · `post` · `review` |
| `agents/` | — | worker fleet (subagent definitions) | `developer` · `surveyor` · `reviewer` · `planner` · `utils-promoter` (contract: [`docs/agents-contract.md`](docs/agents-contract.md)) |
| `hooks/` | — | wires offices to Claude Code lifecycle | `hooks.json` · `notify.py` |
| `mcp/` | — | bundled MCP servers | `utils-launcher.sh` (exposes `~/utils` script atoms; no-ops if `~/utils` is absent) |
| `bin/` | — | instance setup helpers | |

## Lineage

Migrated from [`zyx1121/scriptorium`](https://github.com/zyx1121/scriptorium)@`c12e49334aedaae4598e08b3c2a89c6e02ad16d2`.
