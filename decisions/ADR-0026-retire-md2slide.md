# ADR-0026: Retire the md2slide tools

- Status: accepted
- Date: 2026-11-27

## Context

`md2slide_init` and `md2slide_build` turned Markdown into slides. Slide work
now goes through one route: the lab skill `academic:slides` builds `.pptx`
from the lab master template (ADR-0025). A second route with its own look
gave decks that did not follow the lab rules.

## Decision

- Delete `utils/mcp/src/tools/md2slide/` and `utils/scripts/md2slide.py`.
- The `utils` server keeps 3 domains: `gmaps`, `pdf` and `utils`.

## Consequences

- 11 tools. README files, the tool tests and the promoter agent no longer
  name `md2slide`.
- `utils/decisions/ADR-0003` keeps its text as history. Its `md2slide`
  example no longer exists.
- Markdown to slides has no tool. Write a deck spec for `academic:slides`.
