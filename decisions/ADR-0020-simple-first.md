# ADR-0020: Add simple-first

- Status: accepted
- Date: 2026-11-13

## Context

Loki stated the same product bar in several projects (AIntern, the WinLab
eLearning site, the portal rewrite): as clean as the Linear website or Apple
Notes, cut features before copy, 1 primary action per page, and walk the
sign-in, submit and back flows. The bar lived in chat messages and in
scattered feedback memories, so it loaded only when a memory happened to
match. Notes on design literature (Universal Principles of Design, Laws of
UX, NN/g, Apple HIG Writing, Linear Method) had no place where they changed
a decision.

## Decision

- New skill `simple-first`: the order of cuts, a 6-row page test, the three
  experiences (UX, DX, AX), the flows to walk, a table of principles with
  their boundaries, and rules learned from corrections.
- The skill carries its own growth rule: a general correction adds 1 line in
  the same PR, and a repeated correction becomes an alint rule, a component
  or an audit check.
- One alint rule: `one-primary-action` (model).
- `simple-first` and `human-voice` name each other in `NOT` clauses. Visual
  tokens stay in each site's `DESIGN.md` and in `task-web`.

## Consequences

- One place to add a rule about clutter, scope or flow.
- Sections 1 to 4 cannot be linted except for the primary action. They
  depend on the skill being loaded, so the description triggers broadly.
- The principles table can grow into a reading list. The 90-day rule in
  section 7 is the guard.
