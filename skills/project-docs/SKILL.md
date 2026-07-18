---
name: project-docs
description: "Loki 的專案 Markdown 文件 skill — 成果報告、簡介、設備設定手冊、操作 runbook、週報的完整風格系統:共用外殼、alert 語意文法、四種類型骨架,GitHub alerts 版(非 HackMD containers),含 HackMD→GitHub 轉換對照。Use when 為專案寫或 review Markdown 文件,或把舊 HackMD 文件轉 GitHub 版。Triggers on '成果報告', '寫報告', 'REPORT.md', '實驗報告', '設備手冊', '操作手冊', 'runbook', '操作流程文件', '週報', '日報', '交接文件', 'github alert'. NOT 簡報 / slides — 那是 winlab-pptx. NOT 論文 — 那是 paper-revise / academic-sentence."
---

# project-docs — 專案 Markdown 文件風格系統

專案文件(報告、手冊、runbook)的完整風格系統。範本來源 = `mmWave-Project_M12` 文件家族(iCloud PARA `Projects/mmWave-Project_M12/md/`,12 份);已驗證成品 = `wise-ntust/coding-gateway` `REPORT.md`。

**渲染目標 = GitHub**:alert 用 GitHub alerts(`> [!NOTE]` 等五型),架構圖用 mermaid,圖片用 repo 相對路徑。舊範本是 HackMD containers — 轉換對照見下;只有文件明確要貼回 HackMD 時才用 HackMD 語法,預設一律 GitHub。

## 先分類:這份文件是哪一型

| 類型 | 用途 | 骨架 |
|---|---|---|
| **成果報告** | 專案/計畫的完整成果(含實驗數據) | [§骨架 1](#1-成果報告reportmd-型) |
| **簡介 / 總覽** | 文件家族的系列入口,只到流程不含結果 | [§骨架 2](#2-簡介--總覽系列入口) |
| **設備設定手冊** | 單一設備/元件的設定,可獨立重現 | [§骨架 3](#3-設備設定手冊) |
| **操作 runbook** | 端到端操作流程,每步截圖 | [§骨架 4](#4-操作-runbook) |
| **週報 / 日報** | 進度回報 | [§骨架 5](#5-週報--日報衍生型) |

## 共用外殼(每份文件固定)

1. H1 = 文件標題
2. `# 前言` + `> [!NOTE]` 系列導覽:編號清單列出整個文件家族與**建議閱讀順序**,當前文件用**粗斜體**標示 — 讓每份文件都能當入口
3. 全域 context 圖(完整拓樸 / 系統架構)緊接前言,每份文件都重複放
4. 結尾 `## Reference` — `> [!WARNING]` 包連結清單
5. 不放 `[TOC]`(GitHub 內建 heading menu);要折疊長區塊用 `<details><summary>`

## Alert 語意文法(顏色 = 語意,全家族一致)

| Alert | 語意 | 舊 HackMD 對應 |
|---|---|---|
| `> [!NOTE]` | 目的宣告(`***目的:...***`)、meta 資訊、系列導覽 | `:::info` |
| `> [!TIP]` | 解說、「為什麼」補充、正面結果、建議 | `:::success` |
| `> [!IMPORTANT]` | 最關鍵 takeaway、每個實驗的一句結論、報告總結論 | `:::danger`(正面關鍵) |
| `> [!WARNING]` | 注意事項、限制、例外、誠實邊界、Reference | `:::warning` |
| `> [!CAUTION]` | 陷阱、危險操作、safety gate、會燒時間的坑、問題紀錄 Q&A | `:::danger`(負面警示) |

HackMD 的 `:::danger` 一框兩用(關鍵結論 + 陷阱);GitHub 五型把它拆開 — **結論用 IMPORTANT、坑用 CAUTION**,選型看語意不是機械轉換。

GitHub alerts 的硬限制:

- Alert **不能巢狀**在 list / blockquote 裡;同型 alert 不要連續疊
- 第一行固定 render 成 Note / Tip / … **不能自訂標題** — 要標題就在 alert 前放一行粗體
- **表格與 mermaid 放 alert 外面**;alert 內放 prose、list、inline code、code block

## HackMD → GitHub 轉換對照(轉舊文件用)

| HackMD | GitHub |
|---|---|
| `:::info` / `:::success` / `:::warning` | `> [!NOTE]` / `> [!TIP]` / `> [!WARNING]` |
| `:::danger` | 語意拆分:`> [!IMPORTANT]` 或 `> [!CAUTION]` |
| `:::spoiler 標題` | `<details><summary>標題</summary>…</details>` |
| `[TOC]` | 刪(GitHub 內建 heading menu) |
| `![](url =70%x)` | `<img src="…" width="70%">` |
| `[color=#ff0000]` 等色彩標記 | 刪,改粗體文字標籤(**更改前** / **更改後**) |
| `###### tags:` | 刪 |
| `https://hackmd.io/_uploads/…` 圖床 | 圖片 commit 進 repo(如 `docs/report/figures/`),相對路徑引用 |
| HackMD 文件互連 | repo 內相對路徑 `./` 連結 |

## 四種類型骨架

### 1. 成果報告(REPORT.md 型)

前言文件地圖 → 專案簡介 → 各部分「設計 → 測試 → 實驗結果」 → 完整重現操作段 → 誠實邊界 → 結論 / 未來工作。

- **專案簡介**:研究目的敘事(問題 → 為什麼難 → 缺的拼圖,TIP 說故事)+ 核心想法(IMPORTANT)+ 比較表 + 系統架構 mermaid
- **每個實驗固定節奏**:目的(NOTE)→ 拓樸(mermaid)→ 流程 → 結果表(**粗體標優勝欄**)→ 一句關鍵結論(IMPORTANT)→ 建議(TIP)
- **誠實邊界段**(WARNING):明講哪些東西沒驗證到 / 無法證明 — 這段是可信度來源,不可省
- 結論 = 關鍵成果彙總(IMPORTANT);未來工作 = 編號清單

### 2. 簡介 / 總覽(系列入口)

研究目的 → 研究方法(分大部分,各配架構圖)→ 設備設置(每設備照片 + 一句定位)→ 實驗場域 → 實驗說明(**只到流程,結果留給報告**)。

### 3. 設備設定手冊

五段不變式:**使用設備 → 要完成的內容 → 具體步驟 → 實際操作步驟 → 問題紀錄**。

- **使用設備**:照片 + 清單(含數量、OS 版本)
- **要完成的內容**:做什麼 + 為什麼(觀察到什麼問題所以要做)
- **具體步驟**:編號摘要(先讓讀者看到全貌)
- **實際操作步驟**:`**Step1:**` 粗體 + 指令 code block + 截圖;對比截圖用 **更改前** / **更改後** 標籤
- **問題紀錄**:預答讀者(口試 / 老師)會問的 Q&A,每題一個 CAUTION,問題粗體、答案引用塊 — 把會被問的東西先寫掉

### 4. 操作 runbook

同手冊五段,差異在密度:**每一步都有截圖**,連失敗畫面都放(「沒裝套件會看到這個」)、互動式安裝畫面逐格截。

### 5. 週報 / 日報(衍生型)

- `# 前言` — NOTE(本期期間 + 上期 / 專案主文件連結)
- `## 本期完成` — 清單,每項附 PR / commit / 文件連結;關鍵成果一句 IMPORTANT
- `## 卡住的問題` — CAUTION(問題 + **已嘗試的方向** — 老師最想看的段)
- `## 下期計畫` — 編號清單
- `## 備註` — WARNING(如環境變動、風險)

## 內容慣例(全類型)

- **操作段落一律「完整重現版」**:逐步、真實跑過的指令、含 safety gate(CAUTION)與「看起來像失敗其實不是」的坑 — 不是摘要 + 連結
- mermaid 架構圖用 `classDef` 色塊標核心模組 / 改動點
- 語言:繁體中文,技術名詞保留英文;偏好軟硬全景
- 疑難排解只收「真的燒過時間的」,每個坑:症狀 → 原因 → 解法
- **命名編碼行為**:元件 / 實驗組 / 分支的名字本身要說明用途(`lazy-wake` vs `eager-wake`),不是 `config1` / `方法A`;名字全文件家族一致
- **數字錨定**:結果數字必給參照系 — 不寫「省 40% 記憶體」,寫「8GB → 4.8GB,同機多跑一倍 agent」;比較表的 baseline 欄就是錨
- **掛起宣告**:長文件的支線明講「這裡先記住有 X,§Y 會回來收」,別讓讀者自己猜哪條線會回收
- **警示放事件之前**:CAUTION / 前置檢查一律放在會踩的步驟之前(讀者邊做邊讀,事後補充 = 已經踩完);危險操作的前置檢查(如燒錄前先驗硬體狀態)獨立成 CAUTION,寫明 GOOD / BAD 輸出長什麼樣

## 自我檢查

- [ ] 前言有系列導覽,當前文件粗斜體?
- [ ] Alert 選型符合語意文法(結論 IMPORTANT、坑 CAUTION,沒有混用)?
- [ ] 表格 / mermaid 都在 alert 外?
- [ ] 每個實驗有一句 IMPORTANT 結論?結果表粗體標優勝欄?
- [ ] 操作段是完整重現版(指令真實跑過)?
- [ ] 數字有參照系(沒有裸百分比)?
- [ ] CAUTION 都在對應步驟之前,不是事後補充?
- [ ] 報告有誠實邊界段?
- [ ] 沒有殘留 HackMD 語法(`:::`、`[TOC]`、`=70%x`、`[color=…]`)?
- [ ] 圖片是 repo 相對路徑,已 commit?
