# ADR-0005: Retire the method skill — process knowledge moves to guardrails + memory

Status: Accepted (2026-07-12, Loki's call).

## Context

The method skill (13 methodologies, a trigger-table router, and
failure-switching chains) was one-shot generated on 2026-07-03 as part of
the scriptorium-era institution and never revised afterwards — every asset
sits in a single commit (`git log --follow`).

A usage audit over session transcripts (matching real Read tool calls, not
raw string hits) showed extreme skew: source-first (278) and cove (252)
carried ~80% of traffic — largely because the now-retired dispatch doctrine
force-injected both into every worker prompt — while the tail went
essentially unused (cunningham 3, measure 7). Read counts also cannot
measure compliance: a loaded procedure is not a followed one.

Ecosystem evidence cuts both ways and is recorded honestly: methodology
skill collections are a mainstream form (obra/superpowers is pure process
skills at ~252k stars; Anthropic's skill docs endorse workflow/checklist
content; Chain-of-Verification, arXiv:2309.11495, shows ~+8.4pp from an
explicit verification procedure). But the highest-value procedures here —
verify before declaring done, primary sources over recall — already live
as always-loaded CLAUDE.md guardrails, which binds harder than on-demand
skill routing ever did.

## Decision

Retire `skills/method` entirely. The few checklists with real information
increment sink to agent memory (index-and-fetch):

- `feedback_stride_security_checklist` — STRIDE six-item review
- `feedback_strangler_migration_ladder` — 3-phase migration + traffic ladder + rollback
- `feedback_tidy_first_commit_split` — structure/behavior commit separation
- `feedback_debug_evidence_anchor` — evidence anchor; diagnosis→RCA escalation; measure-first perf

Worker agent definitions drop the "Read the injected method" step; dispatch
prompts carry goal/acceptance/contract only. Three memories tied to the
injection machinery were deleted; the diagnosis/rca split principle
survives inside `feedback_debug_evidence_anchor`.

## Consequences

- If a process-skill layer is ever wanted again, do not rebuild a 13-way
  trigger matrix: adopt the superpowers-style flat shape (small flat skills,
  semantic routing) — or simply install `obra/superpowers` to trial the idea
  at zero maintenance cost.
- `zyx:*` skills are domain skills only from here on (pve, macos-dev,
  winlab-pptx, …); generic epistemology belongs in guardrails or memory.
