# kilo worker fleet

> Lives under `docs/` instead of `agents/` — Claude Code's plugin agent loader
> treats every `.md` file directly under `agents/` as a candidate agent
> (confirmed via `claude plugin details zyx@zyx`: a stray `README.md` there
> showed up as a phantom `README` agent in the component inventory). Keep
> `agents/` to real agent definitions only; this contract doc lives here.

實質開發 / survey / coding 的下放對象。**lead**(主會話 Kilo)拆解 + 統整 + 決策,**worker** 幹活,回**寫死格式的 contract**;lead 只吃 verdict + 索引,不吃 raw。下放準則見 `KILO.md` 的 `## 分派(Delegation)`。

> **為什麼 contract 寫死**:orchestrator 的 context 不能被 raw output(整包 diff / log / 檔案內容)灌爆。raw 留在 worker 自己的隔離 context、用完即棄;交回 lead 的只有結論 + 路徑。驗證本身也下放(派 `reviewer`),所以「每次回收都驗證」**不脹**主 context —— lead 永遠持 index + verdict,不持 raw(同 KILO.md「索引不抄 source of truth」)。

## 回報 contract(所有 worker 共用,不得自由發揮)

```
summary:      一句話結論
artifacts:    [動過 / 產出的檔路徑]      # 路徑,不貼內容
verification: 跑了什麼 + pass/fail + 關鍵輸出尾巴(非整包)
issues:       [卡點 / 需 lead 決策 / 已知缺口]
handoff:      下一步建議(可選)
```

各 worker 附加欄:

| worker | 附加欄 |
|--------|--------|
| `developer` | `diffstat`(`git diff --stat` 摘要,非全 diff) |
| `surveyor`  | `sources`(每條 finding 的依據:`檔:行` 或 URL) |
| `reviewer`  | `verdict: pass \| fail` + `blocking`(必修項清單) |
| `planner`   | `worklist`(每項:任務 + 建議 worker + 依賴 + 風險) |

## fleet

| agent | 職責 | 讀寫 |
|-------|------|------|
| `developer` | 實作 / coding / 修 bug | 讀寫 + worktree 隔離 |
| `surveyor`  | survey / 調研 / 摸現狀 / 選型比較 | read-only |
| `reviewer`  | 驗收回收物 / code review / 對抗查核 | read-only(+ 跑測試) |
| `planner`   | 拆模糊任務成 worklist / 設計實作策略 | read-only |

## 規矩

- **spawn 必注入 method**:lead 派 worker 時,prompt 末尾帶 method `SKILL.md` + 對應 asset 的 Read 指令(method skill 的 sub-agent 注入規則)。worker 開工前 Read、按 procedure 走。
- **守紅線**:close the loop(聲稱完成前驗證+貼證據)、fact-driven(歸因前先驗)、exhaust(放棄前走完)。
- **高風險自做**:auth / 權限 / migration / 對外 / destructive 不由 worker 拍板,回 `issues` 標 `需 lead 決策`。

## 載入方式

fleet 由本 plugin 的 `agents/` 直接載入(`zyx:<agent>` namespace),無另外 binding。維護 = 直接改 agent `.md` + PR。(自我演化管線已隨 engine 退役,見 `decisions/ADR-0003-retire-engine.md`。)
