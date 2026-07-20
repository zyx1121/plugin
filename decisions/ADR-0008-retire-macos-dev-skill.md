# ADR-0008: Retire the macos-dev skill — headline entry point never existed

Status: Accepted (2026-07-20, Loki's call).

## Context

`skills/macos-dev` documented a from-terminal macOS Swift app workflow
(SwiftPM + Makefile bundle + codesign, HIG + Liquid Glass alignment) and
shipped a `template/` scaffold (Package.swift, Makefile, CI workflows,
Info.plist, AppDelegate/Coordinator/MenuBar sources, icon generator). A
2026-07-20 alignment audit (same pass that retired `skills/pve`, ADR-0007)
found its headline instruction was never real:

```bash
utils mac-app new <Name>   # stamp template/ 骨架 + 產 zyx icon + git init
```

`git log --all -p -- utils/scripts/` shows zero hits for `mac_app` or
`mac-app` in this repo's history — the scaffolder script was never
written. There is no `__APP__` placeholder substitution logic anywhere in
the tree; the only matches are the template's own literal files waiting
to be stamped. `bin/utils`, the dispatcher the skill assumed, does not
exist either (`bin/` holds only stale `scriptorium-*` `__pycache__`
files). Following the skill as written produces command-not-found, and
the only path forward is hand-copying `template/` and hand-editing
`__APP__` — the exact manual scaffolding the skill exists to avoid.

This had already fooled one prior review: commit #8
("drop dead mac_app_new MCP tool reference", 2026-07-10) correctly
removed a dead `mcp__utils__mac_app_new` reference but asserted "the CLI
atom is unchanged and stays the scaffolder entry point" — that claim was
never true, and the audit that produced #8 didn't catch it. The skill
also carried three memory pointers (`reference_macos_hardened_runtime_mic_entitlement`,
`reference_macos_lid_closed_keep_awake`, `reference_macos_remove_app_with_system_extension`)
that resolve to nothing in the current instance memory store.

Unlike the pve retirement, this isn't a fully drifted asset — the
domain content (TCC/entitlements, codesign/notarization, NSPanel,
CGEventTap, ScreenCaptureKit, Liquid Glass alignment) is real and was
last touched at 0.9.1 (2026-07-18), and `template/` itself is a
legitimate, well-formed skeleton. The break is scoped to the entry point
and the memory pointers. Building the missing scaffolder was one option;
Loki's call is to retire the skill instead rather than invest in it.

## Decision

Retire `skills/macos-dev` entirely, including `template/`. No
replacement machinery. A future from-terminal macOS app effort starts
fresh rather than resuming a skill built around a command that never
worked.

## Consequences

- **+** No more agent hits a fabricated `utils mac-app new` command and
  no more skill carries memory pointers to entries that don't exist.
- **-** The `template/` skeleton (SwiftPM layout, Makefile bundling
  pattern, CI workflows, house icon generator) is gone from the repo. If
  a future macOS project needs it, recover it from git history
  (`git show <commit>:skills/macos-dev/template/...` on the commit prior
  to this one, or the three sibling repos the skill named as blueprints:
  `zyx1121/Cappuccino`, `zyx1121/cursormon`, `zyx1121/quickvm`).
- **-** The house design-system decisions recorded in the skill's
  `CHARTER.md` (icon brand mark, HIG/Liquid Glass alignment calls) are no
  longer written down anywhere; the three named blueprint repos are the
  only remaining record.
