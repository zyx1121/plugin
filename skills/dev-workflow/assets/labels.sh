#!/usr/bin/env bash
# Create or update the house labels in the current repo (dev-workflow, backlog.md).
# --prune also deletes every label that is not a house label, which covers all
# of GitHub's defaults, including ones GitHub adds later. Deleting a label
# strips it from every issue, so prune only a new repo.
set -euo pipefail

house=()
label() {
  house+=("$1")
  gh label create "$1" --color "$2" --description "$3" --force
}

# Type: one per issue, the same word starts the PR title.
label feat     1f883d "New behavior"
label fix      d73a4a "Broken behavior"
label perf     0e8a16 "Faster or lighter, same behavior"
label docs     0075ca "Documentation only"
label refactor 8250df "Same behavior, better code"
label test     bfd4f2 "Tests only"
label chore    6e7781 "Tooling, deps, housekeeping"

# Priority: one per issue.
label P0 b60205 "Sprint fails without it"
label P1 d93f0b "Should land this sprint"
label P2 fbca04 "Nice to have"

# Size: one per issue, set at planning.
label size:S c2e0c6 "Half a day or less"
label size:M 7fd6a4 "About a day"
label size:L 2da44e "Two to three days; bigger must split"

label blocked 000000 "Waiting on something outside the repo"

if [[ "${1:-}" == "--prune" ]]; then
  # GitHub label names are case-insensitive.
  shopt -s nocasematch
  is_house() {
    local h
    for h in "${house[@]}"; do
      [[ "$1" == "$h" ]] && return 0
    done
    return 1
  }

  # Read the list once into a variable. Piping gh into `grep -q` lets grep exit
  # early, gh dies of SIGPIPE, and pipefail turns a match into a miss.
  existing=$(gh label list --limit 1000 --json name -q '.[].name')
  while IFS= read -r l; do
    [[ -n "$l" ]] || continue
    if ! is_house "$l"; then
      gh label delete "$l" --yes < /dev/null
    fi
  done <<< "$existing"
fi
