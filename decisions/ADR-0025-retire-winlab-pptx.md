# ADR-0025: Retire winlab-pptx, the lab skill takes over

- Status: accepted
- Date: 2026-11-27

## Context

`winlab-pptx` built WinLab decks from the lab master template. Its rules were
a copy of the lab skill `academic:slides-lint` in NYCU-WinLab/marketplace, so
the two drifted. The style, the template and the tokens belong to the lab,
not to one person. The only personal parts were the cover author default and
pointers to private example decks.

## Decision

- Move the tools (`builder.py`, `lint_tokens.py`, `restyle.py`, `rebase.py`,
  `inspect_pptx.py`, `colors.py`), `template.pptx`, `tokens.json` and
  `example.json` into the lab skill, renamed `academic:slides`
  (NYCU-WinLab/marketplace#30, academic 0.6.0).
- Delete `skills/winlab-pptx/` here.

Where each part went:

| winlab-pptx | academic:slides |
|---|---|
| Deck types, the 2 deviations from lab rules, workshop and management decks | `references/deck-types.md` |
| Visual focus, information resolution, What / Why / How trimming | `references/talk-design.md` |
| Report-deck rules (cover, outline, content, bullets, story, notes) | `references/rules.md`, already there; 5 missing rules added |
| Engine, layout contract, spec format, diagram engine, tokens, traps | `references/builder.md` |
| Self-review checklists | the checklist at the end of each reference file |
| Scripts, template, tokens, example spec | `scripts/` |

Dropped as personal: the author default, `assets/kilo-sense-talk.pptx` and
its private source paths, the no-dash title rule (it stays in the global
instructions) and the rule that speaker notes are in Chinese.

## Consequences

- 14 skills. Slide work routes to `academic:slides`; `academic-sentence` and
  `project-docs` point there in their negative scope.
- A machine without the lab `academic` plugin has no slide skill.
- Visual focus is advice in the lab skill, not a rule, because the lab
  consensus rules are a separate, agreed list.
- The builder output does not pass `lint_tokens.py`. NYCU-WinLab/marketplace
  tracks it in an issue filed with #30.
