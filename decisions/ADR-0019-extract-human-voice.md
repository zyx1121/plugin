# ADR-0019: Extract human-voice from academic-sentence

- Status: accepted
- Date: 2026-11-13

## Context

The AI-tone table lived in `academic-sentence`, section 5. That skill only
routes on academic sentences, so product pages, lesson text and
announcements never loaded it. A review of the WinLab eLearning lesson copy
(HsiuyaTsao/eLearning.winlab.tw#3) found the same patterns there, plus new
ones, and Loki asked for one check that covers all copy.

## Decision

- New skill `human-voice`: picks the register (structural, product, tutorial,
  academic), lists the AI-tone patterns, lists what human tutorial writers do
  instead, and gives a 5-step check.
- The AI-tone table moves out of `academic-sentence`. Section 5 there now
  points to `human-voice`. The two skills name each other in `NOT` clauses.
- Two alint rules: `ai-tone-phrases` (grep, fixed stock phrases with few
  false positives, so it can block in CI) and `human-voice` (model, the
  patterns that need judgment).

## Consequences

- One table, one place to add a pattern.
- The grep rule blocks a PR on a stock phrase. A legitimate quote of such a
  phrase needs an `exclude` glob or a repo override.
- The positive half (a scene, a comparison) cannot be linted. It lives only
  in the skill.
