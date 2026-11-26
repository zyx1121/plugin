---
id: native-form-controls
engine: grep
files: ["**/*.{tsx,jsx}"]
exclude: ["components/ui/**", "**/components/ui/**", "**/*.test.*"]
pattern: "<(select|textarea)\b"
source: memory ui-design-system-everywhere (2026-11-21)
---

Pages use the design system's controls from `components/ui/`, not native
HTML ones. A native `<select>` or `<textarea>` skips the theme, the sizes
and the focus style. Import `Select` or `Textarea` from `components/ui/`;
add the component with shadcn when the repo lacks it.

## Bad

`<select value={recipe} onChange={...}>`

## Good

`<Select items={recipes} value={recipe} onValueChange={setRecipe}>`
