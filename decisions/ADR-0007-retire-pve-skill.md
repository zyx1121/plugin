# ADR-0007: Retire the pve skill — MCP schemas and code defaults are the interface

Status: Accepted (2026-07-20, Loki's call).

## Context

`skills/pve` was the agent-facing manual for PVE operations: an MCP
tool-name roster, a `utils pve` CLI reference, provisioning conventions,
and a field-lessons section. A 2026-07-20 alignment audit found every
layer except the field lessons wrong, retired, or redundant:

- **The MCP roster was fiction.** SKILL.md listed ten tool names of which
  nine never existed (`pve_list`, `pve_status`, `pve_start`, `pve_stop`,
  `pve_destroy`, `pve_clone`, `pve_forward`, `pve_dns`, `pve_caddy`); the
  toolbox has shipped the 16-tool naming (`pve_list_guests`,
  `pve_get_status`, guest verbs with `_guest`/`_vm` suffixes,
  forward/dns/caddy split into add/list/remove) since 0.4.0. The roster
  was added at 0.5.0 already wrong and survived four releases unnoticed —
  evidence that agents call tools from the MCP schemas, never from the
  skill. The confirm-gating prose drifted the same way: adds are
  `yes`-gated too (not just removes), and the forward pair gates on a
  separate `confirm` param the skill never mentioned.
- **The CLI reference documents a retired surface.** The `utils`
  dispatcher is gone (flagged as known debt in ADR-0004; `utils/README.md`:
  "The public interface is MCP … scripts are implementation atoms, not a
  supported human CLI surface"). Noir and other consumers register the
  MCP server directly.
- **The conventions restate code.** VMID = next free (≥100 VM / ≥200 CT),
  IP = `<subnet>.<VMID>`, SSH forward = `50000+VMID`, spoke isolation
  before first boot — all encoded as `pve.py` defaults and emitted in the
  tools' `next_steps` output.
- **The devices-inventory pointer is dead.** `~/.kilo/memory/MEMORY-COLD.md`
  no longer exists on the instance.

What remained uniquely valuable was the field-lessons section: hard-won
operational knowledge (Debian 13 CT journald credentials failure,
template live-state, swap traps, no Docker in LXC, gateway quirks) that
is not derivable from code or repo state.

## Decision

Retire `skills/pve` entirely. The interface contract after retirement:

- **Tool semantics** live in the MCP tool schemas and descriptions
  (`utils/mcp/src/tools/pve/index.ts`) — the layer agents actually read.
- **Conventions** live in `utils/scripts/pve.py` defaults and its
  `next_steps` output; code stays the single source of truth.
- **Field lessons** move to instance memory per the ADR-0005 precedent:
  a new `pve-guest-provisioning-lessons` entry carries the journald fix,
  template live-state, swap traps, LXC/Docker rule, and gateway quirks.
  Hairpin-NAT and tailnet-access lessons were already covered by existing
  entries (`pve-nat-persistence`, `lab-ssh-tailnet-routing`).
- **The Debian 13 journald override graduates from documentation to
  code**: a follow-up change bakes it into `create-ct` as a fixed
  provisioning step, after which the memory note shrinks to a pointer.

## Consequences

- **+** The entire misdocumentation class (stale rosters, retired CLI
  examples, dead pointers) dies with the file instead of needing a
  rolling fix.
- **+** One fewer skill to keep aligned; ADR-0004's known-debt note on
  `skills/pve/SKILL.md` is resolved by deletion.
- **-** Field lessons become instance-local (Kilo's memory on the Mac),
  not repo-versioned. Accepted: PVE ops are initiated from Kilo; Noir and
  CT agents consume the MCP directly and never loaded this skill.
- **-** Trigger routing ("建 VM", "port forward", "加路由") no longer
  preloads a manual; the always-listed MCP tools and their descriptions
  carry the routing. If a lesson proves to be needed at call time, it
  belongs in the relevant tool's description, not in a revived skill.
- The devices inventory itself is still missing (predates this ADR, out
  of scope): `reference_devices_inventory` exists in no current memory
  store and needs to be rebuilt or recovered.
