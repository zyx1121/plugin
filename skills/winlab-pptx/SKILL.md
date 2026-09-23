---
name: winlab-pptx
description: "Loki 的唯一簡報 skill — 產 .pptx(NOT .key)涵蓋三類 deck:報告 / 技術簡報(lab talk / pitch / demo,英文高密度)、教學簡報(錄課 / 線上課程 / MOOC,中文低密度)、分鏡簡報(現場工作坊 / hands-on 課程,一頁一 beat 同圖差分)。Triggers on '做簡報', '做投影片', 'slide deck', 'presentation', 'powerpoint', 'pptx', '技術簡報', '實驗室簡報', 'lab talk', 'winlab slides', 'pptx 架構圖', '錄課', '教學簡報', '教學投影片', '線上課程投影片', '磨課師', 'MOOC', '工作坊簡報', 'hands-on 簡報', '分鏡簡報', 'workshop deck', '一頁一 beat', 'lessig', 'review 我的投影片', 'outline 一下', 'rewrite this deck'. NOT Markdown 成果報告 / 手冊 / runbook — 那是 project-docs."
---

# WinLab pptx

只產 `.pptx`(沒有 `.key` 路線)。引擎是 `python-pptx` 把內容填進 `template.pptx` 母片:版式、配色、字型、logo、footer 全鎖在母片,agent 只灌文字和設層級,不從零畫。架構圖用 pptx 原生 block+line(可編輯 shape,不是嵌圖)。

讀的順序 = 做的順序:§1 分類 → §2 共用底線 → §3A / §3B / §3C 擇一 → §4 落地引擎 → §5 Self-review。

黃金標準是 `assets/kilo-sense-talk.pptx`(老闆認可的報告 deck,source 在 iCloud `Projects/zyx1121/sense/`)。落地預設(layout、字型、字色、架構圖樣式)都從它抽出;拿不準時 render 它來對。

## §1 先分類:目的 → deck 類型

三類的密度、語言、標題、字級、節奏直接衝突,選錯整份走鐘。定了就只讀對應專章,§4 共用。

| | 報告 deck(技術簡報) | 教學 deck(教學簡報) | 分鏡 deck(工作坊簡報) |
|---|---|---|---|
| 場景 | lab talk / pitch / demo / 現場報告 | 錄課 / 線上課程影片 / MOOC | 現場工作坊 / hands-on(邊講邊操作) |
| 語言 | 投影片英文 | 投影片中文(面向學生) | 英文短標題 + 中文一句 caption |
| 密度 | 高,nested bullets 塞滿 | 低,一片一重點、≤6 行 | 極低,一頁一 beat、一句話 |
| 標題 | claim / dash 句型 | 知識點名稱即可 | 英文短語,是節奏器不是內容 |
| 頁數 | 正常 | 正常 | 傳統的 3–4 倍(翻頁即動畫) |
| 專章 | §3A | §3B | §3C |

教學 vs 分鏡的分界:錄影自播 = 教學,現場帶操作 = 分鏡。教學 deck 一頁撐 30–60 秒口白;分鏡 deck 一頁 ≤15 秒,節奏由翻頁製造。

母片是為報告 deck 做的(title 36 / body 24pt)。教學與分鏡 deck 的落地缺口見各章「落地限制」,別假裝母片預設就對。

## §2 共用底線:WinLab 官方規範

Source of truth 是 NYCU-WinLab/winlab-skills 的 `winlab-slides-guidelines`(https://github.com/NYCU-WinLab/winlab-skills,實驗室共識,RFC 2119)。以下是它的 MUST / MUST NOT,三類 deck 都守(例外見末),報告 deck 以此當 lab talk 驗收底線。官方更新就回來對齊。

- 標題:清楚表達該頁意圖、全 deck 唯一、直接對應主題;同主題一頁放不下用 `(1/2)` `(2/2)`。
- Context before detail:先背景 / 動機 / 問題,再細節 / 方法 / 數字,不一上來丟實作或結果。每主題照 situation → problem → decision → outcome 鋪,連續 slide 因果接得上。
- Make the point obvious:每頁 takeaway 一眼可見(claim 標題 / 粗體 / 色 / callout / 頂部一句結論),不埋進密集段落、表格 cell 或長 bullet 末。
- One topic, one slide:同主題的介紹 + 結論放同一頁;不把同內容拆多頁、不換標題重講、不把不相關主題塞一頁。
- Bullet 階層:層級關係清楚(§3A 的 L0–L3)。
- 縮寫:所有英文縮寫給全名,且在前段 slide 就給。
- 流程圖 / pipeline:附步驟描述(見 §4 架構圖)。

刻意偏離官方(其餘照守):

1. 官方 SHOULD「每 bullet ≤1 行」是單一密度;我們按類別分:報告 deck 高密度 nested(撐不過一行才拆下一層)、教學 deck ≤6 行、分鏡 deck 一句話。
2. 分鏡 deck 刻意違反「標題唯一」與「One topic, one slide」:同圖差分讓同標題 / 同主題跨數十頁,是節奏設計。報告 / 教學 deck 仍守。

## §3A 報告 deck(技術簡報)

投影片英文、高密度,整份是一條線。

### Cover

全用 `cover` layout,三件東西:

- Title:整份 deck 名稱(英文)
- 日期 `YYYY/M/D`(斜線,不是 ISO `YYYY-MM-DD`)→ spec `date`
- 中文姓名 詹詠翔(整份英文也一樣)→ spec `author`

機構 / footer(如 `NYCU CS`)是母片自帶,不寫進 spec。

### Outline

- 每條是幾個字的 section label,不是句子:`Plugin Structure` / `Components` / `Use Cases`,不寫 `What problem we are trying to solve`
- 一條 = 一個 section;section 內多張 slide 只限不同內容的展開(例:`Components` 對一張總表 + 每元件一張)
- 排列順序 = section 出場順序;`current` 指對當前 section

### Content slides

- Title = 這頁的 claim 或 dash 句型,例 `Skill — instructions Claude can load on demand`。`Background` / `Details` / `Discussion` 這種空殼分類名禁用。
- Body 多數用 nested bullets;N 項並排比較用 `two-col` 或架構圖;檔案 / 目錄結構用 ASCII tree(`├── └── │` 等寬)整段塞進一個 bullet 的 text。
- builder 沒有原生 table:N items × M dimensions 用 `two-col`(2 項)或畫成架構圖;真要表格就 render 後進 PowerPoint 手加,或擴 builder(TODO)。
- 命名編碼行為:元件 / 實驗組 / baseline 的名字說明行為(`lazy-wake` vs `eager-wake`),不用 `config1` / `Method A`;定了全 deck 一致。
- 資訊不裸奔:定義 / 公式 / 架構圖 / 數據圖後接一句「這代表…」;圖表由講者指認特徵(「注意 t=30 這裡驟降 = hibernation 觸發」);數字給參照系(`8GB → 4.8GB,同機多跑一倍 agent`),不裸給百分比。

#### Bullet hierarchy(L0–L3,寫進 `bullets[].level`)

| Level | 角色 | 範例 |
|-------|------|------|
| L0 | section header,以 `:` 結尾 | `File:` / `Trigger:` / `What it does:` |
| L1 | section 下的單一 item | `Claude picks based on description` |
| L2 | L1 的細分、選項、多步驟 | `` with frontmatter `name`, `description`, … `` |
| L3 | L2 的具體例子 / 列舉 | `GitHub, Linear, Notion, Slack, …` |

- 同層 bullets 是同類關係:都是並列 facts、alternatives 或 steps
- 一個 bullet 一件事;兩件就拆同層兩條,或拆 parent + children
- L0 句尾 `:`,L1+ 不加結尾標點
- 不必每張都用到 L2 / L3

### Story arc

- 每張內容頁的 takeaway 接到下一張的前提;從 outline 順著讀要跟播放順序對得起來
- 跨 section 前放一張 `section` divider
- 資訊排程照聽眾的認知順序,不照系統架構或開發時間;支線進不來就明講掛起「先記住有 X,§Y 會回來收」
- 重點預告放在內容之前(「這頁只要記住一件事」「接下來注意 X」);demo 前先說等下會看到什麼、該盯哪裡
- Old before new:句首擺前面已建立的資訊,句尾才帶新東西。例:上一張講完 `Transcript Store`,下一句從它接 `The store feeds the agent prompt`。
- 句子要有明確主詞:不寫 `It improves performance`,寫 `Caching cuts p99 latency by 40%`。代稱(`the store`、`ASR`、`this pipeline`)先有全名 / 定義才用;寧可重複明確名詞,也不換成模糊代稱。

### Slide copy(英文)

- 不用學術腔、不用 marketing 詞(`revolutionary` / `best-in-class` / `seamlessly`)
- 程式碼路徑 / 識別字 / config key 用 backtick:`` `agents/<name>.md` ``、`` `SessionStart` ``

### Speaker notes(`notes` 欄位,可選)

- 要寫就用中文(投影片英文、note 中文)
- 跟著 slide 的 bullet 順序,一條 bullet 一段
- 寫 why / source / example / 數字怎麼來,不是逐字念投影片
- Cover / outline / divider / 純 demo 頁可不寫;複雜論述頁建議寫
- 對外分享(export 給聽眾)前通常清掉

## §3B 教學 deck(教學簡報)

給錄製課程影片,面向學生、搭配 6–10 分鐘短影片(每支 = 1 個知識點 + 1–2 個小 Quiz;單元切分不在本 skill 範圍)。投影片中文。

### 五條規範

1. 一張儘量 1 個重點:最高原則,其他四條服務它。判準:口白能不能用一句「這頁要講的是 ___」講完。塞兩個就拆兩張。
2. 本文(不含標題)最多 6 行:一個 bullet 算一行,折行照算。超過就拆頁,不縮字硬塞。render QA 時逐張數。
3. 字級 36–60pt:標題往上限(~54–60pt),內文 ~36pt,36pt 是內文下限。
4. 關鍵詞上色 / 粗體:每張 1–2 個強調點,標太多等於沒標。
5. 用圖取代文字:概念關係用架構圖引擎、步驟用流程、數據用圖表,文字降到一句 caption。

### 落地限制

- 母片 body 鎖 24pt,低於 36pt 下限:改 builder 字級常數 / 另備教學母片,或 render 後進 PowerPoint 放大。不交 24pt 的教學 deck。
- builder 母片鎖字色 `#3297FC`,沒開放 inline 上色:關鍵詞進 PowerPoint 手動標,或擴 builder。
- TODO:template 補教學版式、builder 加字級覆寫與 inline run 上色。

## §3C 分鏡 deck(工作坊簡報)

給現場 hands-on 工作坊 / live 課程:講者在場、學員邊聽邊操作。翻頁本身就是動畫,頁數不是成本,單頁停留時間才是。一頁一個 beat、單頁 ≤15 秒,總頁數是傳統 deck 的 3–4 倍(225 頁 ≈ 傳統 60 頁的內容量)。師承 Lessig Method、高橋メソッド、assertion-evidence、Duarte 的 progressive disclosure。

黃金標準是 `Claude Code CLI 理念與實作`(MTK 課程 deck,iCloud `Projects/nycu-winlab/mediatek.winlab.tw/Claude Code CLI 理念與實作.pptx`)。

### 版式契約(每頁三段)

- 上:英文短標題(特大、粗黑),短語即可(`Assemble the Context` / `Too Bad!`),不用完整 claim 句
- 中:一張圖(架構差分圖 / terminal 截圖 / 迷因擇一);沒圖的純文字 beat 頁置中 1–3 短句
- 下:中文一句 caption。這行才是 deck 的 script,抽掉講者要能靠它自讀。每頁必寫、只寫一句、關鍵詞上色

### 視覺語意(全 deck 一致)

1. 雙色:藍 = 已知 / 背景,橘 = 當前焦點 / 新登場。每翻一頁只有橘色的位置在動;caption 關鍵詞同步用橘。
2. 虛線 = 容器邊界(Claude Code、Context),實心圓角框 = 元件。與 §4 diagram 的 zone 語意一致。
3. 概念 vs 實況分離:概念用白底手繪風方塊圖,實況用原色深底 terminal 截圖,交替出現,學員一眼分得出模型與真畫面。

### 節奏機制(組合使用)

1. 一頁一動作:把 build 動畫拆成獨立頁,一頁只推進一件事(一個元件登場、一條線亮起、一個問題拋出)。
2. 同圖差分:一張底圖跨數十頁,只換 highlight 與周邊小標籤。底圖元素位置永不移動(觀眾的空間記憶是資產),新元件在最初版就留好位。
3. 提問頁當鉤子:每 3–5 頁插一頁純提問(`What's in Context?` / `Why This Time?`),答案永遠不跟問題同頁。
4. 停頓點標時間:`Hands-on Time` 與 `Break` 頁標分鐘數(5 / 15 / 25 min);學員的操作指令逐字放在頁上。
5. 模板化重複:重複段落(如多個 checkpoint)走固定模板:痛點 → Good Idea → Goal → Steps → 驗證。

### 敘事邏輯

1. 現象先於術語:先讓學員看到行為(說嗨、它記得我),再問「裡面是什麼」;每個新概念由上一層的殘留疑問驅動(剝洋蔥)。
2. 單一 running example 貫穿:每個新機制都回到同一張迴圈圖重走一遍。比喻域儘量與練習域雙關(用圖書館比喻 Skills,練習題就是圖書館系統)。
3. 地圖圖開場、結尾合體:骨架用一張中心輻射地圖;每講完一個機制回地圖補一個四字定位(常駐指令 / 按需知識 / 外部能力…);結尾把補滿的地圖再放一次當總結頁。
4. 收在能力進化:結尾用第二人稱寫學員獲得的能力(「你已經不用一句一句交代了」),不重列名詞。

### 迷因

迷因是情緒標點,只放在「疑問」與「失望 / 轉折」的 beat 頁,一份 ≤5 張,不進技術圖。判準:抽掉迷因,該頁還成立。

### 維護代價

- 底圖沒鎖定前不要開始複製頁;改版時列出「所有含此圖的頁」逐頁改
- 幾乎不可轉印講義;要講義另出 §3B 式濃縮版

### 落地限制

builder 目前產不出分鏡 deck:(a) 無「大標 + 置中圖 + 底部 caption」版式;(b) diagram 鎖白底黑字,無 per-box 顏色 override,做不了藍 / 橘差分;(c) caption inline 上色未開放。現行做法:本章當內容與分鏡規範(outline / 每頁 beat / caption 全文照本章產出),落地進 Keynote / PowerPoint 手做;或擴 builder(TODO:`beat` layout + box `color` override + inline run 上色)。

## §4 落地引擎(報告 / 教學共用)

### Tooling

全在本 skill 目錄,`uv` 依 PEP 723 自動裝 `python-pptx`:

- `builder.py`:`uv run builder.py template.pptx <deck.json> <out.pptx>`
- `template.pptx`:WinLab 母片(layout 見下)
- `inspect_pptx.py` / `colors.py`:`uv run inspect_pptx.py <template> <deck>` 抽 layout / placeholder / 每頁結構;`uv run colors.py <pptx>` 抽 theme + master txStyles + 架構圖框真實字色。換母片時先跑,再對齊 builder 常數。
- `assets/example.json`:完整 spec 範例(封面 / outline / 內容頁 / 架構圖,含 cylinder + 分區),照抄改
- render QA:`soffice` + `pdftoppm`(已在 PATH)

### Workflow

1. 按 §1 分類,照專章列頁(cover → outline → sections → 內容 → 架構圖 → future / Q&A)
2. 照 `assets/example.json` 寫 `deck.json`
3. `uv run builder.py template.pptx deck.json out.pptx`
4. render QA,至少一輪 fix-verify:
   ```bash
   pkill -f soffice; soffice --headless "-env:UserInstallation=file:///tmp/osd-lo" \
     --convert-to pdf --outdir /tmp out.pptx
   pdftoppm -jpeg -r 110 /tmp/out.pdf /tmp/slide
   ```
   Read 每張 jpg,假設有問題:框內文字空 / 重疊 / 超框、連線穿過文字、框太擠、低對比、placeholder 殘留。教學 deck 另數本文行數(≤6)。改 spec 重跑,直到一輪掃不出新問題。
5. 交付 `out.pptx`

### 母片 layout 契約(template.pptx)

placeholder idx 是 dict key 不是位置,已固定在 builder(`LAYOUT` / `PH_*`):

| spec `layout` | 母片 layout 名 | placeholder |
|---|---|---|
| `cover` | `Title` | title=0, body=1(日期 `\n` 姓名) |
| `outline` / `content` / `diagram` | `Title & Bullets` | title=0, body=1 |
| `section` | `Section` | title=0 |
| `two-col` | `Two Columns` | title=0, body=1(左), 21(右) |
| `photo`(未實作) | `Title, Bullets & Photo` | title=0, body=1, picture=21 |

`photo` 只在 `LAYOUT` 表有對應,`RENDERERS` 沒有,spec 寫 `"layout": "photo"` 會 `KeyError`。要放圖就 build 完用 `python-pptx` 開 `out.pptx`,以 `Title, Bullets & Photo` layout 加一張 slide 再對 idx 21 `insert_picture`,或 `add_picture` 補一張滿版 slide。

#### 字型 / 字色(母片已鎖,spec 不用設)

master txStyles 寫死(= kilo-sense-talk 的真實值,`colors.py` 抽出):

- 字型 `Calibri`(title + body),覆蓋 theme fontScheme 的 Helvetica;實際渲染是 Calibri。
- 中文:Calibri 沒 CJK 字形,builder 對每個 run 補 East Asian 字型(`EA_FONT`,預設 `Microsoft JhengHei`),中文走 JhengHei、英數仍走 Calibri。Mac 上播要換就改 builder 頂部 `EA_FONT`(如 `PingFang TC`)。
- 標題 / 內文字色 `#3297FC`(亮藍),title 36pt / body 24pt,placeholder 文字繼承,builder 不另設。
- 架構圖框內字 builder 強制純黑(autoshape 不繼承 body style,預設白字)。
- theme `accent1 = #4F81BD`(較深的藍)用於架構圖框線 / 連線。

沒裝 Calibri 的 Mac 上 LibreOffice 預覽會 fallback 成別的無襯線,但檔案內就是 Calibri,到有 Office 的機器(老闆那邊 / Windows)就正確。別因預覽不像去改。要品牌化(WinLab 色 / logo)改 `template.pptx` 的 master txStyles + theme,builder 不動。

### Deck spec 格式

```jsonc
{ "slides": [
  { "layout": "cover",   "title": "...", "date": "2026/6/15", "author": "詹詠翔" },
  { "layout": "outline", "title": "Outline", "current": 3,
    "items": ["Motivation", "Architecture", "..."] },          // current = 粗體高亮的 index(0 起算)
  { "layout": "section", "title": "Hearing" },
  { "layout": "content", "title": "Hearing Pipeline",          // title = claim,禁空殼分類名
    "bullets": [ {"text": "System Audio Stream:", "level": 0}, // L0 句尾 `:`;可加 "bold": true
                 {"text": "Captures audio in real time", "level": 1} ] },
  { "layout": "two-col", "title": "...", "left": [...], "right": [...] },
  { "layout": "diagram", "title": "...", /* 見下 */ },
  { "layout": "content", "title": "...", "bullets": [...],
    "notes": "講者口白 → 原生 speaker notes",        // 任何 layout 都可加
    "cite": [ {"label": "Yao et al., ReAct (2022)",  // 底部小灰字出處列
               "url": "https://arxiv.org/abs/2210.03629"} ] }
]}
```

- `bullets[].level` 0–3 直接寫,bullet 也可以是純字串(= level 0)。
- `notes`(任何 layout)寫進原生 presenter notes,播放時只有講者看得到;逐字講稿型 deck 放整段口白。它跟 `diagram` 的 `note`(架構圖底部附註)是兩個欄位。
- `cite`(任何 layout)= `[{label, url}, …]`:內容框下方、頁尾上方渲染一行小灰字「來源:label｜label」,完整 `label: url` 自動 append 到該頁 notes。一頁 ≤3 條且 label 短,否則 word-wrap 擠到頁尾帶。diagram 頁底部已有 legend,不掛 `cite`(會撞)。

中文 deck 標點:英文 / 數字後半形(`ReAct: x`、`200 行`),中文 / 中文標點(含 `」』）`)後全形(`小結:` → `小結：`)。builder 不正規化,spec 寫對或後處理掃一遍(`(?<=[一-鿿」』）])[:,;!?]` → 全形)。

### 架構圖:兩條路線

| 路線 | 引擎 | 何時用 |
|---|---|---|
| native block+line(預設) | pptx 原生 shape | 簡單拓撲、要在 PPT 內逐塊編輯、品牌色一致 |
| D2 嵌圖 | `d2` CLI(auto-layout)→ PNG | 複雜拓撲、斜跨 / 多交叉連線;代價是 PPT 內不可逐塊編輯,改圖回 `.d2` 重 render |

D2 pipeline:寫 `.d2` → `d2 arch.d2 arch.svg && rsvg-convert -z 3 arch.svg -o arch.png`(homebrew `d2` + `librsvg`,3x DPI)→ 照上面 `photo` 段的後處理把 PNG 放進 deck。不直接 `d2 ... arch.png`:PNG export 走 playwright,d2 0.7.1 抓 driver 的 CDN 回 404(2026-09 實測),SVG 路線不受影響。native 引擎不 auto-route / auto-layout,這正是 D2 補的點。

#### `diagram`:block+line grid 引擎

```jsonc
{ "layout": "diagram", "title": "Agent Sense Architecture",
  "cols": 7, "rows": 7,                                   // 邏輯網格(預設 6×6);box 落在格點中心
  "boxes": [ {"id": "audio", "text": "System Audio\nStream", "col": 0, "row": 1},  // kind 預設 component
             {"id": "store", "text": "Transcript\nStore", "col": 4, "row": 1, "kind": "store"},
             {"id": "agent", "text": "Agent\n(Codex)", "col": 5, "row": 4, "kind": "external"} ],
  "edges": [ {"from": "audio", "to": "zh", "kind": "async"},        // kind 預設 flow
             {"from": "prompt", "to": "agent", "kind": "dep"} ],
  "zones": [ {"label": "Hearing", "boxes": ["audio", "store"]} ],   // 虛線邏輯邊界
  "note": "ASR: Automatic Speech Recognition" }            // 底部純文字附註(非 notation legend)
```

Notation 是語意驅動:只描述「是什麼種類 / 什麼關係」,builder 決定畫法並自動生 legend(理據:Moody *Physics of Notations* 視覺差異須編碼語意差異;C4 用到的 notation 要有 legend)。

box `kind` → 形狀(= 種類):

| kind | 形狀 | 語意 |
|---|---|---|
| `component`(預設) | 直角矩形 | 處理 / 模組 |
| `store` | 圓柱 | 儲存 / DB |
| `decision` | 菱形 | 分支 / 判斷 |
| `io` | 平行四邊形 | 輸入 / 輸出 |
| `external` | 圓角矩形 | 外部 actor / 系統邊界 |

edge `kind` → 線型 + 箭頭(= 關係強度,與形狀正交):

| kind | 線型 | 語意 |
|---|---|---|
| `flow`(預設) | 實線 + 實心箭頭 | 執行期資料流 / 同步呼叫 |
| `async` | 虛線 + 開放箭頭 | 異步 / 事件流 |
| `dep` | 點線 + 開放箭頭 | 依賴 / 配置(≠ async) |

其餘自動:連接點依幾何選、同行列直線否則肘線、`zones` 畫虛線邊界(label 右上)、底部 legend 只列這張用到的 kind,`note` 與 legend 並排。box 可覆寫 `w_cm` / `h_cm` / `font`(預設 3.53×1.75cm / 14pt,白底 accent1 框黑字)。

- 克制(符號種類 ≤6):不確定就全用 `component` + `flow`。形狀 / 線型亂給比全部一樣更糟,讀者會解讀一個不存在的意義。圓角 vs 直角不當意義用;要表「外部 / 邊界」就用 `external`(它進 legend)。
- 流程 / pipeline 類圖附步驟描述(WinLab 官方):edge 標序號,或 box text / `note` 寫清每步在做什麼。純拓撲圖免。
- 連線只連水平 / 垂直相鄰最乾淨;要斜跨就調 col/row 讓它們相鄰。

### 雷區(實測踩過)

- autoshape 預設字色是白的:builder 已對框文字強制純黑;自己加 shape 記得設 `font.color.rgb`。
- 非矩形 kind 的連接點會略偏:python-pptx connect 只認矩形 4 中點(idx 0/1/2/3)。`store` / `decision` 可接受;要精準的關鍵節點用 `component`。
- zone label 騎在容器右上頂線:該位置(容器右上、最上一排右側)不能擺 box,否則 label 被蓋。撞到就挪 box 的 col/row(example 裡 visual 故意下移一排)。
- soffice 並發會 lock:render 一定帶獨立 `-env:UserInstallation` profile,否則報 "source file could not be loaded"。
- 刪母片預建 slide 要連 relationship 一起 drop(`prs.part.drop_rel`),只移 `sldIdLst` 會留 orphan part 撞名壞檔。builder 已處理。
- 換母片:跑 `inspect_pptx.py` + `colors.py` 重抽 layout 名 / placeholder idx / 字色,改 builder 的 `LAYOUT` / `PH_*`。

## §5 Self-review(收尾前)

共通

- [ ] 類別(報告 / 教學 / 分鏡)沒選錯
- [ ] cover:title + 日期 `YYYY/M/D` + 詹詠翔
- [ ] §2 官方規範全過:標題唯一對題、context before detail、takeaway 一眼可見、同主題同頁、縮寫有全名、pipeline 附步驟
- [ ] 跑過 render QA 至少一輪,每張看過圖
- [ ] 架構圖每個 box / edge `kind` 對應真實語意差異,自動 legend 能解碼全圖
- [ ] Old before new、代稱先定義;命名編碼行為、支線有掛起宣告、數字有參照系、重點預告在內容之前
- [ ] 對外分享前清掉不需要的 speaker notes

報告 deck

- [ ] 投影片英文(cover 姓名除外)
- [ ] outline 每條是 section label;`current` 指對當前 section
- [ ] 內容頁 title 是 claim / dash 句型,不是空殼分類名
- [ ] bullet `level` 正確(L0 句尾 `:`,L1+ 不加),同層同類

教學 deck

- [ ] 投影片中文,每張 1 個重點(口白一句講得完)
- [ ] 本文 ≤6 行(折行照算)
- [ ] 內文 ≥36pt(不是母片預設 24pt)、標題 ≤60pt
- [ ] 每張 1–2 個關鍵詞上色 / 粗體;能用圖的地方沒堆字

分鏡 deck

- [ ] 每頁一個 beat(口白 ≤15 秒),每頁有中文一句 caption、連起來能自讀
- [ ] 藍 = 已知、橘 = 焦點,每頁只有橘在動;差分序列底圖位置全程沒動
- [ ] 提問頁與答案頁分開,每 3–5 頁一個鉤子;Hands-on / Break 標分鐘數、指令逐字在頁上
- [ ] 迷因 ≤5 張且抽掉不影響內容
- [ ] 地圖圖開場出現、逐段補標籤、結尾合體;結尾收在能力進化
