---
name: paper-revise
description: "Academic paper revision checklist for IEEE / ACM conference papers — terminology consistency, abbreviation expansion, structural forward-references, over-claim avoidance, reviewer mindset patterns. Use when revising a paper against reviewer or advisor comments. Triggers on '/paper-revise', '改 reviewer comments', '回應審稿意見', '老師說要改 paper', 'revise paper', 'paper revision checklist', '改 paper'. NOT sentence-level SVO / nominalization / passive-voice deep rules — that's academic-sentence."
---

# /paper-revise — academic paper review checklist

收到 reviewer / 指導老師的意見後改 paper 用。IEEE / ACM conference 風格底色：動手前先用下面 10 條 self-audit，動完再對一次。

Reviewer 通常是 copy-editor + structural editor 混合：wording 精確、學術慣例、全文一致（含圖的視覺一致）是三大主軸；內容層面多用問句而非斷言（見 §9）。

## Workflow

1. 抽 reviewer comments：PDF annotation 用 `uvx pdfannots <pdf>` 一次抽全部（highlight / sticky-note / strike-through）。抽出的文字與位置會失真（reading-order 重組）：句子可能亂序（看似 paper bug，其實原始 `.tex` 正確）、strikethrough 範圍跨錯字（看似 reviewer 自相矛盾）、極淡的標記可能漏看。判斷 reviewer 意圖前先 Read PDF 視覺頁面，以視覺標記為準。
2. 逐條 verdict：`✓ 已 cover / ⚠ 部分 cover / ✗ 未 cover / N/A`。
3. 依 10 條 checklist self-audit：reviewer 沒明示的同類問題往往散在其他段落。
4. 改完重編譯 LaTeX，確認頁數與 cross-ref 沒壞。
5. 回信條列改了什麼：分塊、跟 reviewer 原 comment 對齊、設計判斷附理由。只回應 reviewer 真正標的 comment；自己處理過程的 artifact（如 pdfannots 亂序句）不寫進回信，對方沒這個 context，講了只會困惑、還暴露內部流程。

---

## 1. 全文一致性（最大宗）

- 對比詞統一：「未改前的版本」整篇挑一個（`existing` / `original` / `baseline` / `current`）
- 設計版本詞統一：`proposed` / `improved` / `new` / `revised` 擇一
- Section / subsection heading 同型（全動名詞或全名詞短語）
- 縮寫定義格式全文同一種
- keyword list / index terms / category list 的順序規則一致

## 2. 縮寫

- IEEE Style Manual：首次出現用「全名 (縮寫)」
- Title / Abstract / 主文各區獨立看，不能假設「上面定義過」
- 同個縮寫不能在不同段落用兩種 expansion
- 全篇只出現一次就直接寫全名，不引入縮寫（例：`Fixed Satellite Service (FSS)` 之後再也沒出現 FSS，reviewer 會逐個抓）
- 首次出現可能藏在專名裡：`AFC DUT Test Harness` 的 DUT 就算首次出現，定義放這裡。專名無法用「全名 (縮寫)」時改用「縮寫 (全名)」變通（`AFC DUT (device under test) Test Harness`），後面再用縮寫

## 3. 學術寫作慣例

- 口語詞換正式詞（lab → laboratory）
- 弱動詞換強動詞（address → overcome / tackle / resolve）
- 沒語境的 `actual` / `real-world` 拿掉
- 避免被動式自我指涉（`is reported` / `are presented`：研究自己 report 給自己看？）
- Introduction 結尾要有 "The remainder of this paper is organized as follows…"
- Reference 按文中首次出現順序排
- 不能全是 standards / vendor / regulator docs，要有 peer-reviewed paper

## 4. 反模糊指代

- `the X` 沒指明哪個時補形容詞（`the proposed X` / `the existing X`）
- 縮寫式 / 暗示式表達（如 `update by edit`）要展開
- `X that follows`：follows 什麼、哪個 section，要交代

## 5. 內容分層

- Abstract 砍枝節：數據、列表、廠牌挪後文，不要 `(A, B, C, D)` 在 abstract
- Caption 一句概括，細節寫在 prose
- 長句用句號拆，避免 `; in parallel` / `; on the other hand` 連接

## 6. 結構引導

- Section 開頭有「we propose X to Y」/「this section presents Z」
- Background 預告後面要動的元件（讓讀者提早抓到 paper 攻擊面）
- 純括號圖表 reference（`(Fig. 1)`）IEEE 少見，改 `As illustrated in Fig. 1, ...`

## 7. over-specificity / over-claim

- 廠牌 / 工具 / 實作細節不寫進 contribution claim；例子可以 specific（`e.g., XXX`），claim 要抽象
- 圖與圖之間的共同元件要長一樣，免得讀者以為同一個東西變了

## 8. 前後呼應 / 重複

- Title 跟 Conclusion 呼應；Conclusion 用「測 X 驗證 Y、測 Z 證明 W」對應 contribution
- 同份資訊不重複出現（caption vs 內文、abstract vs conclusion）

## 9. Reviewer 的問句 vs 斷言

- 問句（「這邊是不是該用 X？」「這個詞想表達什麼？」）是 reviewer 不想 dictate、要 author 自己判斷，不是她不確定。對策：評估選項後挑一個 + 給理由，不能無視。
- 設計判斷型問題（圖該不該改、Section 該不該重排）：「保留 + 內文加一句 disambig」通常比動圖或動架構便宜且精準。
- 斷言式的字面替換（`X → Y`）要先驗語法。照字面套可能出錯：`With the opening of` → `To open` 主詞錯位；刪定冠詞 `the` 不合文法。抓底層意圖（去名詞化、減冗字），用語法正確的方式達成（改寫句子，或用所有格 `WFA's` 取代 `the`）。
- reviewer 要外觀一致時可能跟專名大寫 / hyphen 規則衝突：選破壞最小的方向統一（複合形容詞去 hyphen `DUT-side` → `DUT side` 比給名詞片語加 hyphen 自然；流程圖 node 全用 sentence case），不要為了跟她解釋規則而抗拒統一。

## 10. 不把 extension 寫成 generality

Contribution 講「extensible / vendor-neutral / any X」但只 demo 一個 X，reviewer 會抓 N=1。

- 要嘛收 claim（`validated on one instrument`），要嘛 frame 成「provide the extension point + reference implementation」而不是「prove generality」
- Abstract 與 Conclusion 收 claim 要對稱，一邊改一邊不改會被抓頭尾不一致
- N=1 / 過 claim 是高風險區，提早收比硬撐安全

---

## Anti-pattern

- 把 reviewer comment 當逐條 to-do 做完就收，漏掉散在別處的同類問題
- 改到 overflow（例如 5 頁上限）：改完重編譯驗頁數；真的 overflow 時，從 reviewer 也要求精簡的地方收字（如 conclusion 重複 eval 數據）+ §5，不砍 reviewer 要求新增的實質內容
- 為了處理 comment 加入 paper 框架外的新概念，等於給下一輪 reviewer 新的 attack surface
- 用 generic reviewer agent 做 cross-check 卻沒限定範圍，它會用 top-tier venue 標準抓出超出 reviewer scope 的新問題。prompt 要寫明「只 verify 對齊原 comments，不擴展 scope」
