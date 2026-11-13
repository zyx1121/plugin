---
name: simple-first
description: "Keep a product as clean as the Linear site or Apple Notes: simple goal, simple architecture, simple design, simple implementation, judged by user, developer and agent experience. Use when planning, building or reviewing any app, page, flow or feature, before the first screen is drawn and again before it ships. Triggers on 'build an app', 'new page', 'new feature', 'redesign', 'UX review', 'too cluttered', '做個 app', '做個網站', '新頁面', '新功能', '改版', '太亂', '太複雜', '砍功能', 'UX', 'DX', 'AX'. NOT wording and tone; that's human-voice. NOT tokens, fonts and corners; that's the site's DESIGN.md or task-web."
---

# simple-first

The bar is the Linear website and Apple Notes. Four things stay simple: the
goal, the architecture, the design and the implementation. A page that needs
a tagline, a hint or a secondary label to be understood has a layout problem.
Fix the layout.

This skill decides what exists on a page. Wording belongs to `human-voice`.
Tokens, fonts and corners belong to the site's `DESIGN.md` or `task-web`.

## 1. Before building

1. Write the goal in 1 line: who does what on this page.
2. List the features. Cut features first, copy second.
3. Name the 1 primary action of each page.
4. Keep the number of blocks the owner set. A cross-cutting need (permission,
   validation) becomes a field or a rule in the data contract, not a new
   block.
5. Before an upgrade beyond the request ("more professional", "more
   complete"), report 3 numbers: lines, new dependencies, and how many times
   the real data needs it.

## 2. The page test

Check each page in this order. Stop and fix at the first failure.

| # | Test | Fix |
|---|---|---|
| 1 | In 3 seconds, the first screen shows what this is | Move the thing itself to the top. Do not add a sentence that explains it |
| 2 | 1 primary action | Demote the others to quiet buttons, or fold them |
| 3 | Secondary entries are folded | A menu, a "More" control, a tab or a row that expands |
| 4 | No tagline, no hint text, no secondary label | Delete it. If the page breaks, change the layout |
| 5 | Nothing written for developers | Show the intent and "failed". Raw errors go to the log. Host names, group paths and commit hashes are developer text too |
| 6 | Same thing, same place as on sibling pages | Compare with the other pages of the site and align |

When the three experiences conflict, the 3 second test for the user wins.
Developer and agent experience come after it.

## 3. Three experiences

Every decision improves at least 1 of them and harms none.

| Experience | Who | Checks |
|---|---|---|
| UX | The person on the page | The page test above. A response within 400 ms, or a skeleton or a stream. Undo instead of a confirm dialog, except for actions that cannot be undone. At phone width nothing scrolls sideways and every tap target is at least 40px tall |
| DX | The next developer | Fewer files, fewer dependencies, 1 source for tokens. A feature that is cut deletes its code. No abstraction for a single caller |
| AX | An agent that operates the product | Every action in the interface has a tool or an API. Controls have a role and a label, so a text snapshot is enough to operate the page. Names are stable. An error says the cause and the fix in text |

## 4. Walk the flows

A page is not done until these flows run in a real browser, at 1280 and 390
wide:

1. Sign in, from a signed-out state.
2. Submit, the primary action, with real input.
3. Back, from every page to where the person came from.
4. The empty state and the failed state of the primary action.

Report what you did and what you saw for each one. A flow that needs an
explanation on screen to complete goes back to section 2.

## 5. Review an existing product

A review is a list of claims. Each claim needs evidence before it reaches
the owner.

1. Walk every page in a real browser, signed in, at 1280 and 390 wide. Use
   more than 1 role when roles see different pages.
2. Collect numbers per page: screens of scroll, controls, sideways overflow,
   tap targets under 40px, load time.
3. Confirm each finding a second way before listing it. Read the code, or
   measure again after the page settles.
4. Report the findings that did not survive, next to the ones that did.
5. Fix in small batches, 1 pull request each. Measure the same numbers after
   each batch.

Measurements lie in known ways. Check these before a claim:

| Signal | What it can hide | Confirm with |
|---|---|---|
| Many buttons in a header | 1 filled button and quiet ones is already 1 primary action | The style of each button |
| A control with no text | The page was measured during its entry animation | A second measurement after it settles |
| A slow page | A cold cache on the first request | The second and third request |
| An empty page | The test environment lacks a credential | The same page in production |
| A long list | Listing everything is the purpose of the page | What people do there: scan, or look up |

Show layout options as images made from the real page. Change the live DOM
in the browser and take a screenshot, so fonts, spacing and data are real.
Build only the option the owner picks.

## 6. Principles and their boundaries

Use these to argue a cut. Each has a boundary: apply it only inside it.

| Principle | Rule | Boundary | Source |
|---|---|---|---|
| Progressive disclosure | Show what the current task needs. Fold low-frequency actions | A folded action that people need daily is a hidden action. A list people scan in full stays whole | NN/g, Progressive Disclosure |
| Signal to noise | Remove entries unrelated to the current goal | Status that changes what the person does next is signal | Lidwell, Universal Principles of Design |
| Ockham's razor | Among options with the same effect, take the simplest | Only among options with the same effect | Lidwell |
| Feature creep | Set a stopping point before building | Unclear needs can justify 1 flexible part | Lidwell |
| Tesler's law | Complexity moves, it does not vanish. Move it to the system | A setting the person must own stays with the person | Laws of UX |
| Doherty threshold | Answer within 400 ms, or show progress | Long jobs need a result people can come back to, not a spinner | Laws of UX |
| Forgiveness | Undo beats confirm | Actions that cannot be undone confirm, and state the consequence | Lidwell |
| Inverted pyramid | The most important thing comes first | Tutorials follow the order of the steps | Lidwell |
| Desire line | Read logs for the path people take, and build that path | Ignore it where the short path is unsafe | Lidwell |
| Plain interface writing | Buttons are verbs. A label names the thing | Errors and empty states may add 1 short line with the next action | Apple HIG, Writing. GOV.UK content design |
| Decide, then build | Scope down, ship, then improve | Does not excuse skipping section 4 | Linear Method |

## 7. Rules learned from corrections

General rules only. Each came from a real correction.

- An element copied from another site's skeleton needs an owner. Remove it
  when nobody asked for it.
- The sign-in screen holds a title and 1 button, centered in the viewport.
- A row expands only when the detail differs from the summary.
- Statistics live on a statistics page, not beside the task.
- Before drawing layout options, ask which blocks are fixed.
- A long list of equal items gets more columns as the screen widens, before
  anything is folded. Keep the groups the owner made.
- A second row of tabs with 4 pages or fewer is one level too many. Promote
  the pages to the main navigation, or merge a small page into its sibling
  as a section. Keep the old address as a redirect.
- A history list opens on the recent part, with 1 button for the rest. A
  filter still searches all of it.
- Several values of 1 filter are 1 select, not a row of links.
- Enlarge a tap target with padding and an equal negative margin, so the row
  keeps its height.

## 8. Grow this skill

This file changes when it fails. Do not wait to be asked.

1. A correction about clutter, scope or flow arrives. Decide: general, or
   about 1 project.
2. About 1 project: write it in that repo's `DESIGN.md` or `AGENTS.md`.
3. General: add 1 line to section 7, in the same PR as the fix.
4. The same correction a second time: prose failed. Turn it into an alint
   rule, a component or an audit check, and delete the prose line.
5. New literature enters section 6 only with a boundary and a source. A
   principle that changed no decision in 90 days leaves the table.

6. After a review, add what the measurements got wrong to the table in
   section 5.

Keep the file general. No site names, no component names, no case details.
