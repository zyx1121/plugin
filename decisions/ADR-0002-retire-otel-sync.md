# ADR-0002: Retire otel_sync

Status: Accepted (2026-07-03).

## Context

`armarium/otel_sync.py` shipped agent signals (method-route, utils-usage,
proposals-staged) as OTLP/JSON logs to `vivarium-store`. Vivarium was
decommissioned 2026-07-03 — no OTLP downstream exists. Stop hook still ran
it every session, POSTing into the void (env-guarded no-op, but dead weight).

## Decision

Remove otel_sync entirely, not disable: `armarium/otel_sync.py`,
`armarium/test_otel_sync.py`, its `hooks.json` Stop entry, and the stale
mention in `scribe/observe.py`. No re-export target exists to migrate to; a
future obs redesign starts fresh, not from this code.

## Consequences

**+** One fewer Stop-hook step/session; no dead OTLP producer.
**+** Scribe/Corrector unaffected — verified: `grep -rn "otel_sync"` under
`scribe/`, `corrector/` returns nothing post-removal.
**-** No agent telemetry export until obs redesigned; `events.py`/
`observe.py` local logging untouched, remains source of truth.
