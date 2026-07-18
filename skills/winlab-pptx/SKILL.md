---
name: winlab-pptx
description: "Loki 的唯一簡報 skill — 產 .pptx(NOT .key)涵蓋兩類 deck:報告(lab talk / pitch / demo,英文高密度)與教學(錄課 / 線上課程 / MOOC,中文低密度)。引擎 = python-pptx 把 JSON spec 填進 WinLab 母片(template-first),含原生 block+line 架構圖。涵蓋內容規範(cover / outline / claim 標題 / L0–L3 bullet / 敘事連貫 / speaker notes)+ pptx 落地 + 自我檢查。Triggers on '做簡報', '做投影片', 'slide deck', 'presentation', 'powerpoint', 'pptx', '實驗室簡報', 'lab talk', 'winlab slides', 'pptx 架構圖', '錄課', '教學投影片', '線上課程投影片', '磨課師', 'MOOC', 'review 我的投影片', 'outline 一下', 'rewrite this deck'. NOT Markdown 成果報告 / 手冊 / runbook — 那是 project-docs."
---

# WinLab pptx — Loki 的唯一簡報 skill

產 **`.pptx`**(不再有 `.key` 路線)。引擎 = `python-pptx` 把內容填進 `template.pptx` 母片(template-first):**版式 / 配色 / 字型 / logo / footer 全鎖在母片裡,agent 只灌文字 + 設層級,不從零畫、不審美。** 架構圖用 pptx 原生 block+line(可編輯 shape,非嵌圖)。

這份 skill 自包含**全部**規範:怎麼把 deck 落地成 `.pptx`(tooling / 母片契約 / spec / 架構圖),以及兩類 deck 的內容規範(報告 / 教學)。沒有外部 skill 依賴。

**黃金標準** = `~/Desktop/kilo-sense-talk.pptx`(老闆認可的成品,報告 deck)。pptx 落地的所有預設(layout、字型、字色、架構圖樣式)都從它抽出對齊;拿不準時 render 它來對。

## 先分類:報告 deck vs 教學 deck

動手前先定這份 deck 是哪一類 —— 兩類的內容規範(密度 / 語言 / 標題 / 字級)直接衝突,選錯整份走鐘。**pptx 落地(tooling / 母片契約 / spec / 架構圖)兩類共用,內容規範分兩節。**

| | 報告 deck | 教學 deck |
|---|---|---|
| 場景 | lab talk / pitch / demo / 現場報告 | 錄課 / 線上課程影片 / MOOC |
| 語言 | 投影片**英文** | 投影片**中文**(面向學生) |
| 密度 | **高** — nested bullets 塞滿,資訊密集 | **低** — 一片一重點、≤6 行 |
| 標題 | claim / dash 句型 | 知識點名稱即可 |
| 字級 | 母片鎖死(title 36 / body 24pt) | 要大(內文 ≥36 / 標題 ≤60pt)— **與母片衝突,見下** |
| 規範節 | [§內容規範 A — 報告 deck](#內容規範-a--報告-deck) | [§內容規範 B — 教學 deck](#內容規範-b--教學-deck) |

> **母片是為報告 deck 做的。** `template.pptx` 字級鎖 title 36 / body 24pt,符合報告 deck;教學 deck 要 ≥36pt 內文 + inline 關鍵詞上色,**現行母片不支援**(見 §教學 deck 的落地限制)。教學 deck 要嘛改 builder 字級常數 / 另備教學母片,要嘛 render 後進 PowerPoint 手調 —— 別假裝母片預設就對。

## WinLab 官方規範(MUST · 對齊 NYCU-WinLab)

內容規範的 **source of truth = NYCU-WinLab/winlab-skills 的 `winlab-slides-guidelines`**(https://github.com/NYCU-WinLab/winlab-skills,實驗室共識,RFC 2119)。下面是它的 MUST / MUST NOT —— **兩類 deck 都必守**(bullet 密度例外,見末);報告 deck 尤其是 lab talk 的驗收底線。官方那份更新就回來對齊,別自己漂走。

- **標題** — MUST 清楚表達該頁意圖、MUST **唯一不重複**、MUST 直接對應主題;同一主題跨多頁放不下時用 `(1/2)` `(2/2)`。
- **Context before detail** — MUST 先給背景 / 動機 / 問題,再進細節 / 方法 / 數字;MUST NOT 一上來就丟實作或結果。每主題照 **situation → problem → decision → outcome** 鋪,連續 slide 因果接得上(= §報告 deck 的 old before new)。
- **Make the point obvious** — MUST 讓每頁 takeaway 視覺 / 結構一眼可見(claim 標題 / 粗體 / 色 / callout / 頂部一句結論);MUST NOT 把結論埋進密集段落、表格 cell 或長 bullet 末。掃一眼認不出主旨 = 這頁失敗。
- **One topic, one slide** — MUST 把同主題的「介紹 + 結論」放**同一頁**;MUST NOT 同內容拆多頁、MUST NOT 同主題換標題重講、MUST NOT 不相關主題塞一頁。目標是主題內聚,不是頁數多寡。
- **Bullet 階層** — MUST 讓 bullet 之間的層級關係清楚(= 報告 deck 的 L0–L3,同層同類)。
- **縮寫** — MUST 所有英文縮寫給全名、SHOULD 在前段 slide 就給。
- **流程圖 / pipeline** — MUST 附步驟描述(見 §架構圖)。

> **唯一刻意偏離官方**:官方 SHOULD「每 bullet ≤1 行」是單一通用密度;我們按 deck 類別分 —— 報告 deck 高密度 nested(撐不過一行才拆下一層)、教學 deck ≤6 行。其餘照守。

## Tooling

全在本 skill 目錄,`uv` 自動裝 `python-pptx`(PEP 723,免手動 pip):

- **`builder.py`** — `uv run builder.py template.pptx <deck.json> <out.pptx>`,把 spec 渲染成 deck。
- **`template.pptx`** — WinLab 母片(5 layout,見下)。
- **`inspect_pptx.py`** / **`colors.py`** — `uv run inspect_pptx.py <template> <deck>` 抽 layout/placeholder/每頁結構;`uv run colors.py <pptx>` 抽 theme + master txStyles + 架構圖框真實字色。**換母片時先跑,再對齊 builder 常數。**
- **`assets/example.json`** — 完整 spec 範例(封面 / outline / 內容頁 / 架構圖,含 cylinder + 分區),照抄改。
- **render QA** — `soffice` + `pdftoppm`(都已在 PATH)。

## Workflow

1. **分類 + 規劃** — 先定報告 / 教學(見上),再按對應內容規範的 story arc 列頁(cover → outline → sections → 內容 → 架構圖 → future / Q&A)。
2. **寫 spec** — 一份 `deck.json`(格式見下;照 `assets/example.json`)。
3. **build** — `uv run builder.py template.pptx deck.json out.pptx`
4. **render QA(必做,至少一輪 fix-verify)**:
   ```bash
   pkill -f soffice; soffice --headless "-env:UserInstallation=file:///tmp/osd-lo" \
     --convert-to pdf --outdir /tmp out.pptx
   pdftoppm -jpeg -r 110 /tmp/out.pdf /tmp/slide
   ```
   逐張看圖(Read 每張 jpg),**假設有問題**:框內文字空 / 重疊 / 超框、連線穿過文字、框太擠、低對比、placeholder 殘留。教學 deck 另數每張本文行數(≤6)。改 spec 重跑,直到一輪掃不出新問題。架構圖尤其要看。
5. 交付 `out.pptx`。

## 母片 layout 契約(template.pptx)

`prs.slide_layouts` 名稱 + placeholder idx(idx 是 **dict key 不是位置**,已固定在 builder):

| spec `layout` | 母片 layout 名 | placeholder |
|---|---|---|
| `cover` | `Title` | title=0, body=1(日期 `\n` 姓名) |
| `outline` / `content` / `diagram` | `Title & Bullets` | title=0, body=1 |
| `section` | `Section` | title=0 |
| `photo` | `Title, Bullets & Photo` | title=0, body=1, picture=21 |
| `two-col` | `Two Columns` | title=0, body=1(左), 21(右) |

### 字型 / 字色 — 母片已鎖,spec 不用設

`template.pptx` 的 master txStyles 直接寫死(= kilo-sense-talk 的真實值,`colors.py` 抽出):

- **字型 `Calibri`**(title + body 都是),**覆蓋** theme 的 fontScheme(Helvetica)—— 別被 theme 騙,實際渲染是 Calibri。
- **中文內容(教學 deck)**:Calibri 沒 CJK 字形,builder 對**每個 run 自動補 East Asian 字型**(`EA_FONT` 常數,預設 `Microsoft JhengHei`)→ 中文走 JhengHei、英文/數字仍走 Calibri,品牌不動。要換(如 Mac 上播改 `PingFang TC`)改 builder 頂部 `EA_FONT` 一個常數即可。
- **字色標題 / 內文 `#3297FC`(亮藍)**,title 36pt / body 24pt。所有 placeholder 文字**繼承**它,builder 不另設。
- 架構圖框內字 builder 強制**純黑**(autoshape 不繼承 body style,預設會是白字 → 白底看不到)。
- theme 的 `accent1 = #4F81BD`(較深的藍)→ 架構圖框線 / 連線用這個。

> Calibri 是微軟字體,**沒裝它的 Mac 上 LibreOffice 預覽會 fallback** 成別的無襯線 —— 但**檔案內就是 Calibri**,到有 Office 的機器(老闆那邊 / Windows)就正確。別因為 render 預覽不像就去改。
> 要真正品牌化(WinLab 色 / logo)→ 改 `template.pptx` 的 master txStyles 顏色 + theme,builder 完全不動。

## Deck spec 格式

```jsonc
{ "slides": [
  { "layout": "cover",   "title": "...", "date": "2026/6/15", "author": "詹詠翔" },
  { "layout": "outline", "title": "Outline", "current": 3,
    "items": ["Motivation", "Architecture", "..."] },          // current = 高亮(粗體)第幾條
  { "layout": "section", "title": "Hearing" },
  { "layout": "content", "title": "Hearing Pipeline",          // title = claim,禁空殼分類名
    "bullets": [ {"text": "System Audio Stream:", "level": 0}, // L0 句尾 `:`
                 {"text": "Captures audio in real time", "level": 1} ] },
  { "layout": "two-col", "title": "...", "left": [...], "right": [...] },
  { "layout": "diagram", "title": "...", /* 見下 */ },
  { "layout": "content", "title": "...", "bullets": [...],
    "notes": "講者口白 → 原生 speaker notes",        // 任何 layout 都可加
    "cite": [ {"label": "Yao et al., ReAct (2022)",  // 底部小灰字出處列
               "url": "https://arxiv.org/abs/2210.03629"} ] }
]}
```

`bullets[].level` = **0–3 直接寫**(pptx 存得了 paragraph level)。這是 pptx 相對 Keynote 的勝點 —— Keynote 的 L0-L3 只能進 GUI 按 Tab,**這裡程式化一次到位**。

**`notes`(任何 layout 可選)** = 原生 presenter notes(`slide.notes_slide`),builder 寫進去,簡報播放時只有講者看得到。**注意**:這跟 `diagram` 的 `note`(架構圖底部 legend 附註)是兩個不同欄位,別搞混。教學/逐字講稿型 deck 用 `notes` 放整段口白。

**`cite`(任何 layout 可選)** = `[{label, url}, …]`,builder 在內容框下方、頁尾上方渲染一行小灰字「來源:label｜label」,並把完整 `label: url` 自動 append 到該頁 speaker notes(投影片只露短 label,連結留給講者)。一頁建議 ≤3 條(label 短),否則灰字列會 word-wrap 擠到頁尾帶。diagram 頁底部已有 legend,不要再掛 `cite`(會撞)。

> **中文 deck 標點**:英文/數字後半形(`ReAct: x`、`200 行`),中文/中文標點(含 `」』）`)後全形(`小結:` → `小結：`)。builder 不自動正規化,要在 spec 寫對或用後處理腳本掃一遍(`(?<=[一-鿿」』）])[:,;!?]` → 全形)。

## 敘事層(報告 / 教學共用)

四條跨類技巧,疊在官方 MUST 之上(出處:2026-07 對影視解說頻道「哇薩比抓馬」三支影片逐字稿的手法分析 — 解說型創作者把理解成本壓到極低的做法,轉譯到簡報場景):

1. **命名編碼設計** — 元件 / 實驗組 / baseline 的名字本身要說明行為:`lazy-wake` vs `eager-wake`,不是 `config1` / `Method A`。每次提到名字都在免費重申設計;名字定了全 deck 一致,別中途換代稱。
2. **資訊排程** — 頁序照聽眾的認知順序,不照系統架構 / 開發時間順序。支線進不來就明講掛起:「這裡先記住有 X,§Y 會回來收」— 聽眾不該自己猜哪條線之後會回收(= forward reference 的主動版)。
3. **資訊不裸奔** — 定義 / 公式 / spec / 架構圖 / 數據圖後面必接一句「這代表…」;圖表由講者指認特徵(「注意 t=30 這裡驟降 = hibernation 觸發」),不是放上去讓聽眾自己看。數字成對出現 — 給參照系(`8GB → 4.8GB,同機多跑一倍 agent`),不裸給百分比。
4. **重點放事件之前** — 導遊式預告:「這頁只要記住一件事:…」「接下來注意 X」放在內容**之前**;講完才總結 = 聽眾已經用錯誤的注意力分配看完了。demo 前先說等下會看到什麼、該盯哪裡。

## 內容規範 A — 報告 deck

投影片**英文**、高密度。整份 deck 是一條線,不是 random walk。

### Cover

三件東西,全用 `cover` layout:

- Title — 整份 deck 名稱(英文)
- 日期 `YYYY/M/D`(斜線格式,不是 ISO `YYYY-MM-DD`)→ spec `date`
- 中文姓名 **詹詠翔**(即使整份英文,cover 簽名仍中文)→ spec `author`

機構 / footer(如 `NYCU CS`)是母片自帶,不寫進 spec。

### Outline

切 section,讓聽眾先看到整份骨架。

- 每條用幾個字代表一個 section,**不是句子**
- 一個 outline 條目 = 一個 section,section 內可有多張 slide,但**只限不同內容的展開**(例如 `Components` 對到一張總表 + 每元件一張);同一主題的介紹 + 結論放**同一頁**,別同內容拆頁、別換標題重講(WinLab 官方 One topic, one slide)
- 排列順序 = 後面 section 出場順序;`current` 指對當前 section
- 範例:`Plugin Structure` / `Components` / `Use Cases`。不寫成 `What problem we are trying to solve`。

### Content slides

- **Title = 這頁的 claim 或 dash 句型。** 例 `Skill — instructions Claude can load on demand`。`Background` / `Details` / `Discussion` 這種空殼分類名禁用。
- **Body 用 nested bullets 表達層級**(多數情況);N 項並排比較用 `two-col` 或架構圖;檔案結構用 ASCII tree 塞進 bullet text。
- 由上到下要有 narrative:claim → evidence → implication,不是 random walk。

#### Bullet hierarchy(L0–L3,`bullets[].level` 直接寫)

| Level | 角色 | 範例 |
|-------|------|------|
| L0 | section header,以 `:` 結尾 | `File:` / `Trigger:` / `What it does:` |
| L1 | section 下的單一 item | `Claude picks based on description` |
| L2 | L1 的細分、選項、多步驟 | `` with frontmatter `name`, `description`, … `` |
| L3 | L2 的具體例子 / 列舉 | `GitHub, Linear, Notion, Slack, …` |

- 同一 nest level 的 bullets 必須是相同高度的關聯 — 都是並列 facts、並列 alternatives、並列 steps
- 一個 bullet 一件事。塞兩件就拆兩個 bullet(同層)或拆 parent + children(下層)
- L0 句尾用 `:`,L1+ 不用結尾標點
- 不需要每張都用到 L2 / L3 — 階層服務內容,不是裝飾

#### Body patterns

三種 body 寫法,看 content 性質選:

1. **Nested bullets**(最常用)— 用 L0–L3 階層,`bullets[].level` 寫好。
2. **ASCII tree** — 講檔案 / 目錄結構,用純文字 `├── └── │`(等寬對齊),整段塞進一個 bullet 的 text。
   ```
   my-plugin/
   ├── .claude-plugin/
   │   └── plugin.json
   ├── agents/
   │   └── <name>.md
   └── .mcp.json
   ```
3. **N 項比較** — builder **未實作原生 table**;N items × M dimensions 的比較用 `two-col`(2 項)或直接畫成架構圖。真要表格 render 後進 PowerPoint 手加,或擴 builder(TODO)。

### Story arc + 敘事連貫

整份是一條線:

- 每張內容頁的 takeaway 接到下一張的前提
- 跨 section 前補一張 `section` divider 告訴聽眾 "now we shift to X"
- 從 outline 順著讀,跟實際播放的 section 順序對得起來

**old before new**(句與句、bullet 與 bullet):現在這句一定 base 在前面已經講完的東西上,聽眾的注意力永遠有落腳點。

- **主詞 / 動詞 / 受詞完整。** 不寫 `It improves performance`,寫 `Caching cuts p99 latency by 40%`。
- **old before new。** 句首擺前一句已建立的舊資訊,句尾才放這句要帶進來的新東西;新概念永遠掛在已知錨點上,不憑空冒出。例:上一張講完 `Transcript Store`,下一句就從它接 `The store feeds the agent prompt`。
- **代稱先定義後使用。** 縮寫 / 代稱(`the store`、`it`、`ASR`、`this pipeline`)第一次出現要先是全名 / 定義,建立 referent 後才用代稱指它。聽眾不知道代稱指誰 = 斷線。
- **重複 > 模糊。** 為了銜接清楚,重提前面講過的詞沒關係 — 寧可重複明確名詞,也別為了「不重複」改用模糊代稱或跳接。

### Writing — slide copy(英文)

- Simple, clear, explicit。不用學術腔、不用 marketing 詞(`revolutionary` / `best-in-class` / `seamlessly`)
- 短句優於長句;一條 bullet 撐不過一行就拆下一層
- 縮寫第一次出現附全稱(slide title 或 L0 bullet)
- 程式碼路徑 / 識別字 / config key 用 backtick 包:`` `agents/<name>.md` ``、`` `SessionStart` ``
- 例外:cover 的姓名用中文(詹詠翔)

### Speaker notes(中文,可選)— `notes` 欄位

需要時才寫,不是每張都要:

- **要寫就用中文。** 投影片英文、note 中文,分工明確
- Note 跟著 slide 上的 bullet 順序,一條 bullet 一段 note
- Note 解釋 why / source / example / 數字怎麼來,**不是逐字念投影片**
- 投影片是主角,note 是 backup line — 投影片站不住,再多 note 也救不回來
- Cover / outline / divider / 純 demo 頁可不寫;複雜論述頁建議寫
- 對外分享前(export 給聽眾)通常清掉 — note 是給講者自己看的

## 內容規範 B — 教學 deck

給**錄製課程影片**用,面向學生、搭配 6–10 分鐘短影片。規範跟報告 deck **剛好相反**:報告追資訊密度,教學追**低密度、一片一重點、好錄好懂**,且投影片**中文**。

### 五條規範(每條 = 規範 + 怎麼落地)

1. **一張投影片儘量 1 個重點** — 最高原則,其他四條都服務它。一支影片只講一個知識點,投影片跟著一片一概念。塞兩個就拆兩張。判準:這張口白能不能用一句「這頁要講的是 ___」講完。
2. **6 行為限** — 硬上限,本文(不含標題)最多 6 行。一個 bullet 算一行,折行照算(短句優先)。超過就拆頁,不縮字硬塞。落地:render QA 數每張本文換行數對照。
3. **字級 36–60pt** — 字要大,手機 / 小螢幕也看得清。標題往上限(~54–60pt)、內文往下限(~36pt),36pt 是內文下限。**落地限制:母片 body 鎖 24pt(報告用)< 36pt 下限** → 教學 deck 要嘛改 builder 字級常數 / 另備教學母片,要嘛 render 後進 PowerPoint 放大;別交 24pt 的教學 deck。(TODO:template 補教學版式 / builder 加字級覆寫。)
4. **關鍵詞做重點提示** — 每張把該強調的詞用顏色 / 粗體標出,不要整頁同灰度。一張通常 1–2 個強調點,標太多等於沒標。**落地限制:builder 母片鎖字色 `#3297FC`、未開放 inline 上色** → 進 PowerPoint 手動標,或擴 builder(TODO)。
5. **用圖取代文字** — 能用圖 / 示意 / 流程 / 截圖講清楚的就別堆字。概念關係用架構圖引擎(箭頭 / 方塊)、步驟用流程、數據用圖表;圖進來通常自然滿足「6 行」「一片一重點」。文字降到一句 caption。

### 影片切分脈絡(背景,不展開)

投影片要「一片一重點、低密度」是被**影片怎麼切**反過來驅動的:每單元影片 6–10 分鐘 = 1 個知識點 + 1–2 個小 Quiz。設計時心裡放著「這是哪支影片、哪個知識點」即可;單元切分本身不在本 skill 範圍。

## 架構圖:兩條路線(先選)

| 路線 | 引擎 | 何時用 |
|---|---|---|
| **native block+line**(預設,見下) | pptx 原生 shape | 簡單拓撲、要在 PPT 內可逐塊編輯、品牌色一致 |
| **D2 嵌圖** | 裸 `d2` CLI(auto-layout)→ 嵌 PNG | 複雜拓撲、斜跨/多交叉連線、要最漂亮;代價:PPT 內不可逐塊編輯,改圖回去改 `.d2` 重 render |

D2 嵌圖 pipeline:寫 `.d2` source → `d2 --scale 3 arch.d2 arch.png`(homebrew `d2`,auto-layout + 3x 高 DPI;PNG export 走 playwright,首跑會抓 headless browser)→ 用 `photo` layout 把 PNG 塞進 picture placeholder(idx 21),或收尾用 `python-pptx` 的 `add_picture` 補一張滿版 diagram slide。**native block+line 的「python-pptx 不 auto-route / auto-layout」限制(見下「限制」)正是 D2 補的點** —— 連線自動避讓、不用手調 col/row。

### 架構圖(`diagram`)— block+line grid 引擎

```jsonc
{ "layout": "diagram", "title": "Agent Sense Architecture",
  "cols": 7, "rows": 7,                                   // 邏輯網格;box 落在格點中心
  "boxes": [ {"id": "audio", "text": "System Audio\nStream", "col": 0, "row": 1},  // kind 預設 component
             {"id": "store", "text": "Transcript\nStore", "col": 4, "row": 1, "kind": "store"},
             {"id": "agent", "text": "Agent\n(Codex)", "col": 5, "row": 4, "kind": "external"} ],
  "edges": [ {"from": "audio", "to": "zh", "kind": "async"},        // kind 預設 flow
             {"from": "prompt", "to": "agent", "kind": "dep"} ],
  "zones": [ {"label": "Hearing", "boxes": ["audio", "store"]} ],   // 虛線邏輯邊界
  "note": "ASR: Automatic Speech Recognition" }            // 底部純文字附註(非 notation legend)
```

**notation 是語意驅動的,不是手選**(理據:Moody *Physics of Notations* — 視覺差異必須編碼語意差異,否則是噪音 symbol excess;C4 — 用到的 notation 必須有 legend)。**你只描述「是什麼種類 / 什麼關係」,builder 決定畫成什麼樣 + 自動生 legend。**

box `kind` → 形狀(形狀 = 種類):

| kind | 形狀 | 語意 |
|---|---|---|
| `component`(預設) | 直角矩形 | 處理 / 模組 |
| `store` | 圓柱 | 儲存 / DB |
| `decision` | 菱形 | 分支 / 判斷 |
| `io` | 平行四邊形 | 輸入 / 輸出 |
| `external` | 圓角矩形 | 外部 actor / 系統邊界 |

edge `kind` → 線型 + 箭頭(線型 = 關係強度,正交於形狀):

| kind | 線型 | 語意 |
|---|---|---|
| `flow`(預設) | 實線 + 實心箭頭 | 執行期資料流 / 同步呼叫 |
| `async` | 虛線 + 開放箭頭 | 異步 / 事件流 |
| `dep` | 點線 + 開放箭頭 | 依賴 / 配置(≠ async) |

其餘自動:連接點依幾何選(右中→左中等)、同行列自動直線否則肘線、`zones` 畫**虛線邏輯邊界**(label 右上)、**底部自動生 notation legend**(只列這張用到的 kind)。`note` 是純文字附註(縮寫展開等),跟 legend 並排。box `w_cm`/`h_cm`/`font` 可覆寫(預設 3.53×1.75cm / 14pt,白底 accent1 框 黑字)。

- **克制**(Moody Graphic Economy,符號種類 ≤6):不確定就全用 `component` + `flow`。kind 只在「真的有這個語意差異」時才用 —— **形狀/線型亂給比全部一樣更糟**,讀者會去解讀一個不存在的意義。
- **流程 / pipeline 類圖 MUST 附步驟描述**(WinLab 官方):有先後 / 時序的圖,別只有箭頭 —— 用 edge 標序號、或每個 box text / `note` 寫清楚那一步在做什麼。純拓撲圖(無時序)免。
- **限制**:python-pptx 不 auto-route / auto-layout。連線只連水平/垂直相鄰最乾淨;要斜跨的調 box 的 col/row 讓它們相鄰。

## 雷區(實測踩過)

- **autoshape 預設字色是白的** → builder 已對框文字強制純黑(對齊標準答案);自己加 shape 記得 `font.color.rgb`。
- **cylinder / 非矩形 kind 的連接點會略偏** —— python-pptx connect 只認矩形 4 中點(idx 0/1/2/3)。`store`/`decision` 可接受;要連線精準的關鍵節點用 `component`(矩形)。
- **圓角 vs 直角不編碼語意** —— 形狀差異只表「種類」(kind),`component` 一律直角;別把圓角直角當意義用,讀者不解碼 = Moody symbol excess。需要表「外部/邊界」就用 `external`(它的圓角已進 legend、可解碼)。
- **zone label 騎在容器右上頂線** → 確保該位置(容器右上、最上一排的右側)沒擺 box,否則 label 被蓋。撞到就把那顆 box 的 col/row 讓開(見 example:visual 故意下移一排)。
- **soffice 並發會 lock** → render 一定帶獨立 `-env:UserInstallation` profile,否則 "source file could not be loaded"。
- **刪母片預建 slide** 要連 relationship 一起 drop(`prs.part.drop_rel`),只移 `sldIdLst` 會留 orphan part 撞名壞檔。builder 已處理。
- **換母片** → 跑 `inspect_pptx.py` + `colors.py` 重抽 layout 名 / placeholder idx / 字色,改 builder 的 `LAYOUT`/`PH_*`。

## Self-review(收尾前)

**共通**

- [ ] 先確定這份是報告 / 教學,規範沒選錯
- [ ] cover:title + 日期 `YYYY/M/D` + 中文姓名 詹詠翔
- [ ] 內容頁 title 不是空殼分類名(`Background` / `Details`)
- [ ] **官方 MUST**:標題唯一不重複、直接對應該頁主題;同主題跨多頁用 (1/2)(2/2)
- [ ] **官方 MUST**:進細節 / 數字 / 結果前先給 context(背景 / 動機 / 問題)
- [ ] **官方 MUST**:每頁 takeaway 一眼可見,沒埋進密集段落 / 表格 cell / 長 bullet 末
- [ ] **官方 MUST**:同主題介紹 + 結論同頁,沒同內容拆頁、沒換標題重講
- [ ] **官方 MUST**:流程 / pipeline 圖附步驟描述
- [ ] **跑過 render QA 至少一輪**,每張看過圖、無空框 / 穿線 / 超框 / placeholder 殘留
- [ ] 架構圖每個 box / edge `kind` 對應**真實**語意差異(非裝飾);看自動 legend 能解碼全圖
- [ ] 縮寫第一次出現有全稱(或進 legend)
- [ ] 每句 base 在前面講完的東西上(old before new);代稱出現前已先定義
- [ ] 命名編碼行為(無 `config1` / `Method A` 式名稱),全 deck 一致
- [ ] 支線有掛起宣告;定義 / 圖 / 數字後面接了「這代表…」,數字有參照系
- [ ] 每頁重點預告在內容之前(講完才總結 = 太晚)
- [ ] 對外分享前清掉不需要的 speaker notes

**報告 deck 專屬**

- [ ] 投影片英文(cover 姓名除外)
- [ ] outline 每條是 section label 不是句子;`current` 指對當前 section
- [ ] 內容頁 title 是 claim / dash 句型
- [ ] bullet `level` 階層正確(L0 句尾 `:`,L1+ 不加);同層同類

**教學 deck 專屬**

- [ ] 投影片中文(面向學生),不是英文 pitch 風
- [ ] 每張只有 1 個重點(口白一句講得完)
- [ ] 本文 ≤6 行(折行照算)
- [ ] 內文字級 ≥36pt(別交母片預設 24pt 的)、標題 ≤60pt
- [ ] 每張 1–2 個關鍵詞用顏色 / 粗體標出
- [ ] 能用圖的地方沒堆成純文字
