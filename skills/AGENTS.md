# skills/ — `description` frontmatter grammar

> 這份只管 `~/plugin/skills/*/SKILL.md` 的 **`description:` 欄位**寫法(routing 表面)。body 不在此限。
> `~/plugin` 是 `zyx1121/plugin` repo 的本地 clone,skills 是 version-pinned cache 部署;改完 commit + bump `.claude-plugin/plugin.json`/`marketplace.json` version、push、開 PR,merge 後跑 `claude plugin update zyx@zyx` 才生效。

## 為什麼

`description` 是 Claude 選 skill 的**唯一觸發面** —— routing 對 `name`+`description` 做 keyword/intent 比對。寫法不一致不影響「能不能載」,但影響「能不能穩定 route」+ 維護 diff 噪音。內容本來就夠精確,缺的只是機械層一致。

## Grammar(硬規範)

1. **整個 value 一律雙引號 YAML scalar 包**:`description: "..."`。不要裸 scalar、不要單引號 YAML。
2. **Trigger 字串用單引號** `'...'` —— 這樣外層雙引號永遠免 escape。
3. **Trigger list 分隔 = ASCII `, `**(逗號 + 空格)。
   - ⚠️ 中文 **prose** 內的全形 `，。、：` 維持全形(正確 orthography),**不要**改半形。規範只動「`Triggers on` 之後、引號字串之間」的分隔符。
4. **內容 = 能力句 + 觸發**(+ 必要時 pushy clause / 負 scope)。
   - **禁止把 workflow / 架構步驟塞進 description**。實測(obra/superpowers):description 一旦摘要 workflow,Claude 會「照 description 做」而跳過 skill body。步驟寫進 body。
5. **長度按 routing 成本分層**,全部 < 1024 char。trivial slash 指令 ~120 char、貴的 intent router(method / nextjs-dev)400–600 char。`/review` 的 `description-short`(<50)/`description-long`(>500)會抓。
6. **重疊 skill 互標負 scope 並指名替代**:`NOT X — 那是 <skill>`,**雙向都標**。例:journal cluster(daily / weekly / now / morning / catchup)彼此。

## 範本

```yaml
description: "<能力句,em-dash gloss 開頭> — <scope>. Use when <intent>. Triggers on '<t1>', '<t2>', '<中文觸發>'. [Skip / NOT <反例> — 那是 <other-skill>.]"
```

## 改完

`utils skill-lint ~/plugin/skills`(或 `/review` Section 2)→ 零 issue → commit + bump plugin version + push + PR。
