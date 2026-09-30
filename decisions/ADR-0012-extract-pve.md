# ADR-0012: Extract PVE into an independent plugin

Status: Accepted (2026-09-30, Loki's request).

## Context

PVE infrastructure operations do not depend on the monolith's productivity
skills or other local tools. FDE needs these operations as a composable
provider, while the shared marketplace should own discovery rather than code.
The existing 16 tools and working SSH operations should survive the split.

## Decision

Move the PVE MCP schemas, script, required helpers and regression tests to
[zyx1121/pve](https://github.com/zyx1121/pve), versioned independently and
installed as `pve@zyx1121` from [zyx1121/marketplace](https://github.com/zyx1121/marketplace).
Portable root manifests generate Claude Code compatibility manifests; the
bundled MCP server supports both Codex and Claude Code without a runtime
dependency on this repo. Keep Bun + uv to avoid changing infrastructure logic.

Preserve all 16 tool names, input/output schemas and confirmation fields.
Keep MCP as the agent interface and scripts as implementation. Do not revive
the drift-prone PVE skill retired in ADR-0007. Caddy, port forwarding and
internal dnsmasq remain with PVE because provisioning shares their lifecycle.

Move machine-specific defaults to a private `~/.config/pve/config.json`
(or XDG_CONFIG_HOME / PVE_CONFIG_PATH). Accept PVE_* environment overrides,
then legacy UTILS_PVE_* overrides, then profile values. SSH credentials stay
in SSH config; gateway secrets stay remote. A missing profile fails before SSH.

## Migration and consequences

- Install and configure the standalone plugin before updating zyx to 0.25.0.
- Remove the old PVE implementation and registry entries here, leaving 66
  utils tools and one provider for PVE.
- Full MCP names change from `mcp__plugin_zyx_utils__pve_*` to the host's
  `plugin_pve_pve` namespace. Update explicit permissions/hooks/callers.
- Old direct imports of utils/scripts/pve.py must use the standalone package.
- PVE releases no longer require releasing unrelated zyx skills or tools.
- Keep historical ADRs as records; their old source paths now refer to the
  implementation before extraction.

Validation includes original argv/output and NAT-persistence regressions,
a standalone bundle test without node_modules, config precedence/failure
checks, and read-only live guest, forwarding, DNS and Caddy queries.
No real infrastructure writes are part of extraction verification.
