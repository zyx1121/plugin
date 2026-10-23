# Feature map example

A shortened map for a made-up web app, Notes. Copy the shape, not the content.

## `features/README.md`

```markdown
# Notes verification map

Read this index before driving the app, then use the matching feature file.

## Baseline

- Launch with `scripts/verify-up.sh` on the sandbox. It serves
  `http://127.0.0.1:4173` with `NOTES_DATA_DIR=/tmp/notes-verify-$RUN_ID`.
- Seed notes titled `Quarterly plan` and `Grocery list`.
- Run `scripts/verify-doctor.sh` and require the expected port, data dir and
  commit.
- Never drive an instance this run did not start.

## Conventions

- Start every recipe from the baseline unless it says otherwise.
- Prefer ARIA roles and accessible names over CSS selectors.
- Restore seeded data after a write. Never delete evidence in cleanup.

## Proof

- UI: an ARIA snapshot and a screenshot that shows the app.
- CLI: the command, stdout, stderr and exit code.
- Writes: a second, read-only view of the stored value.
- Name the feature file and entry point next to every artifact.

## Features

| File | Feature |
|---|---|
| [create-note.md](create-note.md) | Create a note from the sidebar or the CLI |
| [search.md](search.md) | Search notes by title and body |
```

## `features/create-note.md`

```markdown
# Create a note

## Sub-features

- New note from the sidebar button.
- New note from `notes new "<title>"`.

## How to get to it (user POV)

Open the app, press **New note** in the sidebar, type a title, press Enter.

## Driving it

1. `page.getByRole('button', { name: 'New note' }).click()`
2. `page.getByRole('textbox', { name: 'Title' }).fill('Verify 1')`
3. Press Enter.
4. Read back: `curl -s localhost:4173/api/notes | jq '.[].title'` contains
   `Verify 1`.

## Gotchas

- The sidebar list updates after a 300 ms debounce. Wait for the list item,
  not a fixed sleep.
```
