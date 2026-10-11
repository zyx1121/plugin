# ADR-0016: Workers grade claims with the Admiralty Code

- Status: accepted
- Date: 2026-10-11

## Context

The lead acts on worker reports without reading the sources again. A report
states an observation and a guess in the same voice. Two failures came from
that:

- `gh pr checks --watch` printed nothing before the checks registered, and the
  lead read the silence as a pass. carrel merged twice on red (2026-10-06).
- A WebFetch summary of a PDF invented numbers, and the lead quoted them.

Loki picked the Admiralty Code (NATO source and credibility grades) as the fix
and asked for it as its own skill repo, `zyx1121/admiralty-code`.

## Decision

- `surveyor` and `reviewer` preload the skill through the `skills` field:
  `admiralty-code:admiralty-code`. A test on 2026-10-11 showed that this
  cross-plugin name resolves in a subagent.
- `surveyor` grades each finding and names the weakest grade in `summary`.
  Findings graded 3 to 6 go to `issues` with the check that would make them
  stronger.
- `reviewer` grades `verification` and `blocking`. A high-risk claim passes
  only at `A2` (run by the reviewer) or `A3` (code path traced). A developer
  report alone cannot be `A`.
- The skill stays in its own repo, and `zyx` does not declare a plugin
  dependency on it. A cross-marketplace dependency needs an allowlist in the
  root marketplace, or the plugin fails to load.
- `planner` and `developer` do not preload the skill. The planner makes no
  factual claims, and the lead writes code itself.

## Consequences

- **+** The lead sees which claims rest on its own run and which rest on a
  summary, and checks the weak ones first.
- **+** The reviewer rule "run it or trace it" is now visible in each line.
- **-** A machine without the `admiralty-code` plugin skips the preload with a
  debug warning. `surveyor` keeps a 1-line fallback rule for that case.
- **-** Reports get 4 characters longer for each claim.
