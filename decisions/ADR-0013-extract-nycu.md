# ADR-0013: Extract NYCU into an independent plugin

Status: Accepted (2026-09-30, Loki's request).

## Context

Campus tools form a service domain independent of the monolith's macOS and
productivity tools. Portal and attendance share the SSO implementation; E3
uses a separate Moodle token; the timetable API is public. The marketplace
should distribute this domain without requiring the rest of zyx.

## Decision

Move all 21 tool definitions, four scripts, the portal helper and relevant
regressions to [zyx1121/nycu](https://github.com/zyx1121/nycu), installed as
`nycu@zyx1121` from the shared marketplace. Keep MCP as the interface, scripts
as implementation, and portable root manifests that generate Claude-compatible
manifests. Bundle the Bun MCP server; retain the existing uv script runtime.

Keep the tool names, schemas, annotations and confirmation gates. Host-aware
registration keeps 21 tools on macOS and 13 E3/timetable tools on Linux. No
extra manual skill or dependency on the old repo is introduced.

Use private ~/.config/nycu/portal.json and e3p.json (respect XDG_CONFIG_HOME).
The migration script moves legacy default files and keeps mode-0600 backups;
explicit config paths remain supported. New NYCU_* environment names take
precedence over their legacy UTILS_* counterparts. Runtime never falls back
to a legacy default after logout. Keep existing Keychain service names so
credential ownership and access remain stable.

Fix the existing E3 download error path that returned a token-bearing URL.
Only configured Moodle HTTPS pluginfile URLs and same-origin redirects may
receive the token. Login output also excludes the saved token.
Live validation exposed a pre-existing portal cache bug: `token timeout.` was
not treated as expired authentication. Refresh expired JWTs and retry that
known API/relay error once; repeated errors still fail rather than loop.

## Migration and consequences

- Install/configure the standalone plugin before updating zyx to 0.26.0.
- Full names move from plugin_zyx_utils to plugin_nycu_nycu; update explicit
  caller/permission references. The short tool names remain unchanged.
- Remove the moved code here, including the captured attendance fixture;
  standalone tests use synthetic data. The remaining utils surface is 45 tools.
- Campus network requirements and existing per-operation timeouts remain.
- First-time E3 credentials still require secure local setup, separate from
  portal credentials. Public timetable access requires neither.

Verification covers platform registration, isolated installed bundles, config
migration, MCP confirmation/error contracts, attendance parsing/target
selection and E3 token-safe downloads. Live checks are read-only: no real
attendance writes, logout or credential resets.
