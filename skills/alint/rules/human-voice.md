---
id: human-voice
engine: model
files: ["**/*.{md,mdx,html}", "**/content/**/*.json"]
exclude: ["**/CHANGELOG.md", "**/node_modules/**", "**/skills/**", "**/alint/rules/**", "**/AGENTS.md", "**/CLAUDE.md"]
source: skill human-voice; eLearning.winlab.tw#3 (2026-11-13)
---

Prose for people (docs, lessons, landing pages) must not read as
machine-written. Flag added paragraphs with more than one "不是 X，是 Y" or
"not X but Y" contrast, an announcement before a colon (重點是：, 關鍵是：),
a group of 3 that is not really 3 things, one thing called by rotating
names, or a tutorial idea with no concrete scene. Skill, agent and rule
instructions are out of scope.

## Bad

`終端機只是一個輸入框，真正執行指令的是 shell。重點只有一句：指令在 VM 上跑，不是在你的電腦上。`

## Good

`你連上 VM 之後，打的每個指令都在 VM 上跑。終端機像電話的話筒，你在這頭講，事情在另一頭發生。`
