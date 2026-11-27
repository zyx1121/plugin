---
id: mcp-error-names-field
engine: model
files: ["**/mcp/**/*.{ts,js,mjs,go,py}", "**/tools/**/*.{ts,js,mjs,go,py}"]
exclude: ["**/node_modules/**", "**/*.test.*", "**/*_test.go", "**/test_*.py"]
source: EigenFlux feed note on MCP tool design (2026-11-27)
---

An error that an MCP tool returns to the model must name the input field that
is wrong and show one valid value or call. The model reads the error to retry,
so a bare "invalid input" or a raw exception leads to guessing or giving up.
A reported test cut refusals from 65% to 17% with this change. Flag added
error messages in tool handlers that name no field, or that name a field but
give no valid example. Errors meant for logs only are out of scope.

## Bad

`throw new Error("Invalid arguments")`

## Good

`throw new Error('date must be YYYY-MM-DD, got "11/27". Example: {"date": "2026-11-27"}')`
