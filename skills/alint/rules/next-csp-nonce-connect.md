---
id: next-csp-nonce-connect
engine: grep
files: ["**/*.{ts,js,mjs,conf}", "**/Caddyfile", "**/nginx*"]
exclude: ["**/node_modules/**", "**/*.test.*"]
pattern: "^(?=.*script-src)(?!.*nonce-.*connect-src)(?!.*connect-src.*nonce-)"
source: memory model-markdown-image-exfil
---

A Content-Security-Policy that sets `script-src` also sets a `nonce-` source
there and a `connect-src` list. Without the nonce, inline scripts need
`'unsafe-inline'`. Without `connect-src`, injected code can send data to any
host with `fetch`. This check reads one line, so keep the policy string on
one line or build it from a joined array.

## Bad

`const csp = "default-src 'self'; script-src 'self' 'unsafe-inline'"`

## Good

`const csp = "default-src 'self'; script-src 'self' 'nonce-${nonce}'; connect-src 'self'"`
