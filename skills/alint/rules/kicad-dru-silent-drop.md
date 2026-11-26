---
id: kicad-dru-silent-drop
engine: grep
files: ["**/*.kicad_dru"]
pattern: "\((min|max|opt)\s+-?[\d.]+\s*deg\b|\b[AB]\.Parent\.|\$\{"
source: memory pcb-flow-survey; reproduced on KiCad 10.0.8 in zyx1121/pcb kit/tests (2026-11-26)
---

KiCad 10 drops a whole custom rules file without a message when one rule has
an angle with a `deg` unit, a `.Parent.` property in a condition, or a text
variable. DRC then passes on the board defaults. Write the bare angle, use
`memberOfFootprint()`, and run the `rules` gate of the pcb plugin.

## Bad

`(constraint track_angle (min 89deg))` and `(condition "A.Parent.Reference == 'U5'")`

## Good

`(constraint track_angle (min 89))` and `(condition "A.memberOfFootprint('U5')")`
