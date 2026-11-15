# ADR-0022: Add article

- Status: accepted
- Date: 2026-11-15

## Context

Loki started a series of teaching articles about his Claude Code setup. The
first article went through 16 rounds of correction in one day. The
corrections were about what the article says: no stated purpose, textbook
advice in place of the author's real practice, a rule written in the wrong
direction, numbers that proved nothing, vague subjects, and emphasis that
did not carry the gist. `human-voice` covers sentence shapes, so it caught
none of them.

## Decision

- New skill `article`: fix the spirit first, write the author's practice
  from their own rules and messages, state where it differs from the usual
  advice, take the reader's seat, name things, treat numbers as optional,
  make emphasis the article in brief, and review before showing.
- The skill carries its own growth rule: a correction that would hold for
  the next article is written back in the same PR.
- `article` and `human-voice` name each other in `NOT` clauses. `article`
  decides what is said and in what order; `human-voice` decides how a
  sentence sounds.
- Where a site stores its articles and how it marks emphasis stay in that
  site's own documents.

## Consequences

- Writing or reviewing an article loads the content rules before the first
  draft, not after the author rejects it.
- The skill count is 15.
