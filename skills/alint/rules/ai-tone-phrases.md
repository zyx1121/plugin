---
id: ai-tone-phrases
engine: grep
files: ["**/*.{md,mdx,tsx,jsx,vue,svelte,html}"]
exclude: ["**/CHANGELOG.md", "**/node_modules/**", "**/skills/human-voice/**", "**/alint/rules/**"]
pattern: "值得一提的是|重點只有一句|總而言之|毋庸置疑|不可否認的是|扮演著?(關鍵|重要)的?角色|在這個.{0,8}的時代|讓我們一起|[Ii]t'?s worth noting|\bdelve into\b|[Ii]n today'?s (fast-paced|digital)|賦能|抓手|打通.{0,4}(任督二脈|閉環)|生態閉環|底層邏輯|顆粒度|\bleverage\b|\bsynerg(y|ies)\b|\bgame[- ]changer\b|\bseamless(ly)?\b|\bunlock the power\b"
source: skill human-voice; eLearning.winlab.tw#3 (2026-11-13)
---

Copy people read carries no stock AI phrases. These fixed openers announce a
point instead of making it, and a person almost never writes them. Buzzwords and stock
metaphors (賦能, 抓手, 底層邏輯, leverage, game-changer) count the same. Delete the
phrase and keep the sentence after it. The patterns that need judgment are in
the `human-voice` model rule.

## Bad

`值得一提的是，這個工具支援多人協作。`

## Good

`這個工具支援多人協作。`
