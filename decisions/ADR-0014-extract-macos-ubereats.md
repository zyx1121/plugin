# ADR-0014: Extract macOS and Uber Eats

- Status: accepted
- Date: 2026-09-30
- Tracking: https://github.com/zyx1121/plugin/issues/60

## Context

The monolith still mixed local macOS app automation with an unrelated authenticated
Uber Eats API and ledger workflow. They have different platform, permission and
release requirements. today-mod also executed Calendar, Reminders and E3 scripts
by paths in this repository.

## Decision

Publish `zyx1121/macos` and `zyx1121/ubereats`, installed as `macos@zyx1121` and
`ubereats@zyx1121` from the shared marketplace in Codex and Claude Code. Each
repository owns its bundled MCP server, scripts, tests and release manifests.
The marketplace pins release commits and owns no implementation.

macos keeps the 28 Calendar, Reminders, Mail, Safari and screenshot tools.
Calendar and Reminders reads retain EventKit and their existing date format;
writes retain AppleScript. All tools require macOS. Screenshot results keep
the raw stream schema, including process startup failures.

ubereats keeps 4 tools and the existing cookie and output locations. Order,
receipt and ledger tools now register on Linux too, using the already supported
cookie-file authentication. Safari cookie export remains macOS-only. Ledger
updates and credential exports still require literal-true confirmation.

Update today-mod to resolve the currently installed macos and nycu plugin paths,
with separate explicit overrides and a legacy shared-directory override.
No copies or compatibility stubs remain in utils.

## Consequences

zyx 0.27.0 removes 32 tools and their implementation; utils retains 13 tools.
Short tool names and schemas are unchanged, but fully qualified provider names
change to `plugin_macos_macos` and `plugin_ubereats_ubereats`. Install the new
plugins and today-mod 0.3.0 before updating zyx and restarting the clients.
Existing Uber Eats cookies and ledger files remain in place. Output paths should
be absolute when callers need stable storage independent of the host's cwd.

Tests cover schemas, confirmation gates, host selection, isolated runtime bundles,
EventKit date compatibility and preservation of ledger settlement state.
Live validation reads minimal metadata only; it does not mutate apps, capture
the screen, update the ledger or export credentials.
