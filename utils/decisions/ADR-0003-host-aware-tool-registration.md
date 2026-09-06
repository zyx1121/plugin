# ADR-0003: Host-aware tool registration

Status: Accepted (2026-09-06)

## Context

The server registered all 69 tools on every host it started on. The toolbox is
machine-local by design, so most of those tools are not portable:

- 32 of them drive Calendar, Mail, Reminders, Safari, screencapture or Safari's
  cookie jar. On anything but macOS they can only fail.
- 16 `pve_*` tools are SSH round trips to a homelab host. Away from that
  network, or on a machine with no `pve` alias, every call is a timeout.
- Every Python atom runs under `uv`. Without it the failure is a spawn error,
  not a readable envelope.

The cost is paid twice. The caller spends a call to learn the tool does not work
here, and all 69 descriptions sit in every session's context whether or not the
host can run them. A tool that cannot run is worse than a missing tool: it looks
available.

## Decision

1. **Tools declare host requirements.** `ToolboxTool.requires` is a list of
   strings in a small DSL: `platform:<name>`, `binary:<name>` (resolved against
   the same augmented PATH the tools run with), `ssh:<alias>` (a BatchMode probe
   with a 3 s connect timeout), `env:<NAME>` (set and non-empty) and
   `file:<path>` (`~` expanded). One shared array per domain, declared next to
   the domain's `script` const.

2. **Only declared truth.** Requirements name hard host binaries, not pip
   dependencies that `uv` resolves per run. Ghostscript stays undeclared for
   `pdf` because only `pdf_compress` needs it, and Chrome stays undeclared for
   `md2slide` because `md2slide_init` and `--html-only` work without it. Hiding
   a whole domain over an optional binary trades one bad failure for a worse
   one.

3. **Probes are bounded, memoised and non-throwing.** Each check is capped at
   4 s and results are cached per requirement string, so all 16 `pve_*` tools
   cost one SSH round trip. A probe that throws or hangs marks its requirement
   failed. Startup can hide a tool; it can never fail.

4. **Unknown kinds fail closed.** A requirement the evaluator cannot parse hides
   the tool. A typo that silently registered everything would defeat the point.

5. **The startup split is logged and queryable.** stderr gets
   `[utils-mcp] registered N, hidden M (family: reason, ...)`, and the always-on
   `utils_capabilities` tool returns the same snapshot: host platform/hostname/
   arch, registered tool names, and every hidden tool with the requirements it
   failed. It declares no requirements and spawns nothing, so it survives on a
   host where every other domain is hidden.

6. **`UTILS_FORCE_PLATFORM` overrides the detected platform.** A test-only knob
   so the darwin/linux split can be exercised on one machine, documented in the
   MCP README.

## Consequences

- (+) A Linux host is offered 38 tools instead of 70, and the 32 it is not
  offered are the ones it could never run.
- (+) "Why is `safari_get_url` missing?" has an answer in one call rather than a
  guess, and the answer names the requirement.
- (+) Context spent on tool descriptions now scales with what the host can do.
- (−) The tool surface is no longer a constant. A client that caches the tool
  list across machines, or a test that asserts a fixed count, has to reckon with
  the host. The registry test asserts the declared toolset, and the split is
  tested against a stub host rather than the machine running CI.
- (−) Startup does real work: on a cold `ssh:pve` probe it costs up to 4 s
  before the first tool is registered. Bounded, but not free.
- (−) A requirement can drift from its script. Declared requirements are tested
  for shape and for the macOS families, not for truth; a script that grows a new
  binary dependency will still fail at call time.

## Verification

- 503 tests (up from 476): requirement kinds, unknown-kind fail-closed,
  memoisation, timeout and throwing-probe paths, and the registered/hidden split
  against a stub host.
- Live stdio client on macOS: `tools/list` returns 70 (69 original plus
  `utils_capabilities`), `hidden` empty.
- Live stdio client with `UTILS_FORCE_PLATFORM=linux`: `tools/list` returns 38,
  the six AppleScript/Safari-cookie domains are hidden, and
  `utils_capabilities` lists all 32 with `failed: ["platform:darwin"]`.
- Live stdio client with `UTILS_PVE_HOST` pointed at a nonexistent alias:
  `registered 54, hidden 16 (pve: ssh:utils-no-such-alias)`.
