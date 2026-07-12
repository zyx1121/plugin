---
name: pve
description: "Use when user asks about VMs, virtual machines, PVE, Proxmox, port forwarding, the edge reverse proxy (Caddy / gateway / winlab-gateway), HTTPS certs for *.winlab.tw / *.zyx.tw, internal DNS / dnsmasq, *.internal hostnames, or wants to create/start/stop/list VMs or add a route. Triggers on 'VM', '虛擬機', 'PVE', 'port forward', '開機', '關機', '建 VM', 'gateway', '反代', '加路由', '新 subdomain', 'Caddy', 'internal DNS'."
---

# PVE — via `utils pve`

Atomic operations against the PVE host and the edge gateway through SSH aliases. The `utils pve` dispatcher wraps `qm` / `iptables` / `dnsmasq` / `Caddy` so agents don't have to memorise remote command surfaces.

**Inside a CC/Codex session, call the `mcp__utils__pve_*` tools directly** (`pve_list`, `pve_status`, `pve_start`, `pve_stop`, `pve_destroy`, `pve_clone`, `pve_create_ct`, `pve_forward`, `pve_dns`, `pve_caddy`) — typed params, no shell quoting. Destructive/confirm-gated ones (`pve_stop`, `pve_destroy`, `pve_clone`, `pve_create_ct`, `dns`/`caddy` remove or shrinking add) require `yes: true` since there's no TTY to confirm over MCP; omitting it fails closed instead of hanging. `pve_ssh` has no MCP tool (its subprocess inherits stdio, which the MCP executor forbids) — always use the CLI form below for it. The CLI examples below stay the reference for SSH sessions, scripts, and Noir.

> **Real infrastructure (host IPs, SSH port, VMID range, subnet, VM list) lives in the instance memory `reference_devices_inventory`** (grep `~/.kilo/memory/MEMORY-COLD.md` for the fetch path — it's a cold-index entry, not always-loaded). This skill documents the command shape only. SSH aliases (`pve`, `gateway`, plus one per VM) are the source of truth — `utils pve` refuses to operate without them.

## Read commands

```bash
utils pve list                     # all guests: QEMU VMs + LXC containers + status (table on TTY, JSON in pipes)
utils pve status <name>            # config + state for one guest
utils pve ssh <name> [cmd]         # SSH via alias; refuses if alias missing
```

`list` / `status` / `start` / `stop` / `destroy` are **guest-type-aware** — they resolve a name/VMID against both `qm list` (VMs) and `pct list` (LXC containers) and dispatch the right CLI (`qm` vs `pct`). The `type` field (`qm` | `lxc`) is in the JSON. `clone` is VM-only (clones the QEMU template). `ssh` requires the name to match a `Host` entry in `~/.ssh/config` — alias missing is treated as a real error, not a UX bug.

## Write commands

```bash
utils pve start <name>
utils pve stop <name> [-y]
utils pve destroy <name> [-y]                  # cascades: VM + forwards/DNS/Caddy/SSH alias/known_hosts
utils pve clone <name> [--ip 10.10.10.42] [--vmid 113] [--cores 4] [--ram 4096] [--disk 100] [--no-forward] [--no-isolate]
utils pve forward 8443:10.10.10.42:443         # add
utils pve forward --action list
utils pve forward --action del --line 3
utils pve dns parser.internal 10.10.10.42 [--dry-run] [-y]   # add (default action)
utils pve dns parser.internal --action remove [-y]
utils pve dns --action list
utils pve caddy parser.zyx.tw 10.10.10.42:8080               # simple add (default action)
utils pve caddy "a.zyx.tw,*.a.zyx.tw" 10.10.10.42:80 --tls "/etc/caddy/certs/a/fullchain.pem /etc/caddy/certs/a/privkey.pem"
echo '@ws path /ws*
handle @ws { reverse_proxy localhost:8080 }
handle { reverse_proxy localhost:3000 }' | utils pve caddy parser.zyx.tw --body -   # path routing / handle blocks
utils pve caddy parser.zyx.tw 10.10.10.42:8080 --dry-run     # render + caddy validate on a scratch copy, write nothing
utils pve caddy parser.zyx.tw --action remove [-y]
utils pve caddy --action list                                # per-block detail: domains / upstreams / tls / routed
```

`stop`, `destroy`, `clone`, `dns`, and `caddy --action remove` are confirmation-gated unless `--yes` is passed. `dns` add also supports `--dry-run`; `caddy add` supports `--dry-run` too (renders + `caddy validate`s on a scratch copy, writes nothing). `forward del` runs immediately — double-check before invoking.

**`caddy add` is an upsert with safety rails.** Simple form (`domain upstream` [+ `--tls "CERT KEY"` or `--tls internal`]) covers the common reverse-proxy + cert case; for path matchers, `handle` blocks, websockets, headers, or anything richer use `--body` (verbatim block body, `-` reads stdin) — never drop to raw `ssh gateway` to hand-edit the Caddyfile. An existing domain is **updated in place** by default (`--on-exists update|skip|fail`); the write goes through `caddy fmt` + `caddy validate` on a scratch copy and an atomic swap, with a `.utils.bak` and reload-rollback if a validated config still fails to reload (e.g. an unreadable cert path). Replacing a multi-host block with fewer hostnames prompts before dropping the rest (TTY) — pass every hostname in the domain arg, or `--yes`.

## Decision rules

- **Never bypass the dispatcher with hardcoded IP/port.** If `ssh <name>` fails, the alias is missing — fix the alias, don't write a raw `ssh -p ... user@<ip>` workaround.
- **Defaults come from env vars** (`UTILS_PVE_HOST`, `UTILS_PVE_GATEWAY`, `UTILS_PVE_TEMPLATE`, `UTILS_PVE_GATEWAY_IP`, `UTILS_PVE_GATEWAY_DNS`, `UTILS_PVE_GATEWAY_CADDY`, `UTILS_PVE_CADDY_RELOAD`, `UTILS_PVE_BRIDGE`, `UTILS_PVE_FW_GROUP`). Loki's conventions are the fallback; other operators set their own.
- **Gateway is a native LXC** (Caddy + dnsmasq under systemd, ex-docker). `caddy add/remove` reloads via `UTILS_PVE_CADDY_RELOAD` (default `sudo systemctl reload caddy`); `dns add/remove` chmod 644s the hosts file so dnsmasq (dropped privileges) can read it.
- **New VMs are isolated by default.** `clone` puts the VM on `UTILS_PVE_BRIDGE` (default `vnet10`, a PVE SDN VNet) and applies `firewall=1` + the `UTILS_PVE_FW_GROUP` security group (default `spoke`) **before first boot** — it comes up fenced off from its peers, never momentarily open. `spoke` is egress-only: a VM can reach the subnet gateway + DNS + internet but **not** other VMs (hub-and-spoke; the edge gateway is the hub and is not isolated). Pass `--no-isolate` for a VM that legitimately needs east-west reach. Inbound stays open (`policy_in ACCEPT`) so the SSH forward and reverse-proxy reach keep working.
- **Isolation has a one-time host prerequisite** (not done by `clone`): the PVE firewall master switch + the `spoke` group must exist in `/etc/pve/firewall/cluster.fw`, and the internal network must be the SDN VNet with SNAT (PVE-managed NAT — hand-rolled `iptables MASQUERADE` is incompatible with per-VM firewall, the firewall bridge breaks it). Set `UTILS_PVE_FW_GROUP=""` to disable isolation entirely on hosts without this setup.
- **Run the provisioning chain directly from the main agent — no sub-agent.** clone → DNS → forward → SSH alias edit → smoke test is 4-5 commands; spawning another agent for that is pure overhead. This dispatcher is already the abstraction layer.
- **Stop / destroy / forward del / dns remove / caddy remove** are destructive. Confirm with the user, even when the agent has free rein on safe ops.
- **`destroy` cascades by design.** After purging the VM it sweeps every related ref it can find by VM IP: matching `iptables` PREROUTING rules, dnsmasq hosts records, Caddy domain blocks whose `reverse_proxy` upstream resolves to that IP, the `Host <name>` entry in local `~/.ssh/config` (standalone block or name inside a shared `Host a b c` list), the per-VM firewall config `/etc/pve/firewall/<vmid>.fw`, and finally local `~/.ssh/known_hosts` (by VM name, IP, and the `[pve-host]:port` entry if a `:22` forward existed). The pre-confirm plan shows the full cascade list — read it before saying yes. Anything not found is skipped silently.
- **VMID / IP / SSH port are bound by convention — compute, don't ask.** Default assignment when the user just gives a name (+ optional RAM / disk):
  - **VMID** = next free ID `≥100` (smallest gap, not `max+1`). Run `utils pve list` first to see allocated IDs.
  - **IP** = `10.10.10.<VMID>` — last octet always equals VMID.
  - **External SSH forward** = `50<VMID>:22` (PVE host `:50<vmid>` → VM `:22`).

  State the assignment in one glance-able line ("parser → VMID 42 / IP 10.10.10.42 / SSH 50042"); don't break it into separate questions. Only override when the user explicitly names a different value.

## Field lessons (hard-won — check here before debugging)

Each of these cost a real outage or a wasted debugging round. Deeper context lives in the instance memory (grep the memory index for the keyword).

- **`pct shutdown` exit code is unreliable on unprivileged LXC.** It can exit 1 with `container did not stop` while the container finishes halting moments later. Never chain `pct shutdown X && pct start Y` — the false failure short-circuits and leaves both guests stopped. Poll `pct status` until `stopped`, or use a hard `pct stop` when graceful shutdown isn't required (`utils pve stop` already does the hard variant).
- **A VM can't reach the lab's own public IP (hairpin NAT).** A spoke VM curling a public hostname that resolves to the lab IP times out. It's not the spoke firewall — the ingress DNAT only matches the WAN interface. Fix once at the boundary with a NAT reflection rule (`iptables -t nat -A PREROUTING -i <internal-bridge> -d <lab-public-ip>/32 -p tcp --dport 443 -j DNAT --to <gateway-internal-ip>:443`), persisted via netfilter-persistent (`iptables-restore --test` first). Port 443 is already reflected on this host; add other ports the same way. Don't fall back to per-hostname split-horizon DNS.
- **Fresh Debian 13 CTs boot with a dead journald** (`status=243/CREDENTIALS`; every `journalctl -u X` says `-- No entries --` even though the service runs). Root cause: trixie's `ImportCredential=journal.*` can't be set up in an unprivileged mount namespace. Run this as a fixed provisioning step right after `create-ct`:

  ```bash
  sudo mkdir -p /etc/systemd/system/systemd-journald.service.d
  printf '[Service]\nImportCredential=\n' | sudo tee /etc/systemd/system/systemd-journald.service.d/override.conf
  sudo systemctl daemon-reload && sudo systemctl restart systemd-journald
  ```

  Services already running before the fix need a `systemctl restart` to start landing in the journal.
- **Templates are live state on the host, not in git.** The VM clone source (`UTILS_PVE_TEMPLATE`) carries a cloud-init vendor snippet (apt mirror + 4G swap + swappiness 10 + qemu-guest-agent) — inspect with `qm config <vmid>`. The CT default template gets its apt mirror patched in code post-create. The two mirror mechanisms are different — don't fix one by editing the other.
- **Swap traps.** VMs default to 4G swap via the snippet. Kubernetes/k3s nodes must stay swapless — kubelet's `fail-swap-on` is only checked at startup, so `swapon` today means the node dies on its next restart unless `fail-swap-on=false` is set first. LXC swappiness is host-level only: `sysctl vm.swappiness` inside any CT silently edits the **host** value, and `/etc/sysctl.d` inside the CT is inert.
- **No Docker inside LXC.** Install services natively in the CT (the gateway's Caddy + dnsmasq is the model) or run Docker inside a VM. Stateful / multi-container stacks (Postgres, docker-compose) always get a VM.
- **Off-network access:** the SSH aliases go through public-IP port forwards, so away from a network that can reach the lab IP they all time out. Bring up Tailscale and jump through the PVE host (`ssh -J`); addresses live in the devices-inventory memory.
- **`caddy` add/validate rejects with `API token '' appears invalid`:** the gateway env file isn't being loaded into the scratch validate — check `UTILS_PVE_GATEWAY_ENV` points at the gateway's `.env` (the atom sources it so `{env.*}` in `tls dns` blocks resolve). Don't hand-edit the Caddyfile over this.
- **The gateway CT has no `curl`.** Verify routes from your own machine or another guest, not from the gateway itself.

## When to consult the devices inventory

If the user asks about a *specific* host or VM by role ("the auth VM", "the AFC machine", "what IP is the gateway?"), grep `~/.kilo/memory/MEMORY-COLD.md` for `reference_devices_inventory` and fetch that memory — it has the live mapping. This skill stays infrastructure-agnostic on purpose.

## Common patterns

**Provision new VM end-to-end** (main agent runs the whole chain — no sub-agent):

```bash
utils pve list                                         # peek next free VMID ≥100 (say 42)
utils pve clone parser --cores 4 --ram 8192 --disk 100 # auto: VMID 42, IP 10.10.10.42, forward 50042→.42:22
utils pve dns parser.internal 10.10.10.42              # internal .internal resolution
# edit ~/.ssh/config per the clone output's ssh_alias_block + ssh_alias_note
ssh -o StrictHostKeyChecking=accept-new parser echo ok # smoke test (first-run host key accept)
```

`clone` derives `--ip` from `<subnet>.<VMID>` when omitted, auto-adds the `50<VMID>:22` forward, and bakes in east-west isolation (bridge + `firewall=1` + `spoke` group). Pass `--no-forward` if the VM shouldn't have external SSH, `--no-isolate` if it needs to reach other VMs. The output's `ssh_alias_block` and `ssh_alias_note` fields tell you exactly what to add to `~/.ssh/config`.

**Expose a VM service externally:**

```bash
utils pve forward 8443:10.10.10.42:443           # raw L4 port forward via PVE host
utils pve caddy parser.zyx.tw 10.10.10.42:8080   # HTTPS termination + reverse proxy via gateway
```

**Quick survey:**

```bash
utils pve list
utils pve status parser
utils pve dns --action list
utils pve caddy --action list
```

**Rebuild a VM from scratch (same VMID + IP):**

```bash
utils pve destroy bro -y                                # cascades VM + forwards + DNS + Caddy + SSH alias
utils pve clone bro --vmid 113 --cores 4 --ram 8192 --disk 100   # auto IP .113 + forward 50113→.113:22
utils pve dns bro.internal 10.10.10.113
utils pve caddy bro.zyx.tw 10.10.10.113:8080            # only if it had a Caddy route
ssh -o StrictHostKeyChecking=accept-new bro echo ok     # smoke test
```

`destroy` now wipes refs along with the VM. Reuse the same IP + VMID and you only re-create whatever routes the new VM actually needs — no leftover ghost rules from the old one.
