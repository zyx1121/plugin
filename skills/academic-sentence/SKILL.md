---
name: academic-sentence
description: "Sentence-level academic writing formulas for English and Traditional Chinese — 語序 / topic-stress position / nominalization / passive voice / parallelism / 歐化中文病灶 / AI 腔偵測. Use when polishing a single sentence, not restructuring a paper. Triggers on 'SVO 語序', '這句話怎麼寫', '被動語態要不要用', '這句中文西化了', '翻譯腔', '句子太長怎麼拆', '改這句話', 'sentence structure', 'nominalization', 'topic position', 'given-new', 'AI 腔', 'AI slop', '抓 AI 寫作痕跡'. NOT whole-paper / reviewer-comment revision — that's paper-revise. NOT slide content — that's winlab-pptx."
---

# academic-sentence:中英學術句子層級寫作公式

句子層級 checklist,章節架構歸 `paper-revise`。規則多半是傾向不是鐵律,多數附具名來源或真實論文驗證(有的連 Raft、GFS 都沒守)。查無具名來源的說法收在文末「反教條」,不當公式教。

## Workflow

1. 英文句用「英文」節,中文句用「中文」節;中英夾雜(WinLab 簡報 / 報告常見)兩節都過,分開處理
2. 改完核對三件事:主詞動詞有沒有黏近?句尾(stress position)是不是要讀者記住的新資訊?有沒有裸 this / it?
3. 規則衝突時(例如被動語態),回到「舊資訊在前、新資訊在後」判斷

---

## 英文

### 1. 主詞動詞不能拉開
讀者把主詞與動詞之間的材料當不重要的插入,不管它其實多重要;插得越長,讀者越久等不到動作。

> 病句:The smallest of the URF's (URFA6L), a 207-nucleotide reading frame overlapping … **has been identified** as the animal equivalent … (主詞跟動詞隔了 23 個字)

(source: Gopen & Swan, *The Science of Scientific Writing*, American Scientist 1990)

### 2. Topic Position / Stress Position
句首(topic position)放舊資訊與「這句的故事屬於誰」;句尾(stress position,逗號 / 句號前)放要讀者記住的新資訊。

> Bees disperse pollen. / Pollen is dispersed by bees.:同一事實,主角不同。段落講花粉的故事時,被動句才是對的選擇。

### 3. 名詞化陷阱(nominalization)
判斷法:找句子真正的角色(who)與動作(doing what),看是否被埋進抽象名詞(-tion / -ment / -ance / -ing)或 possessive。

> "there is an empirical contribution in this paper by providing new evidence" → "this paper contributes new evidence"
> "institutions through which political legitimation can be accomplished" → "institutions that legitimize violence"

(source: DeScioli & Pinker, *PS: Political Science & Politics*, 2021;概念出自 Joseph Williams, *Style: Lessons in Clarity and Grace*)

### 4. 主動 vs 被動:判準是 given-new,不是「盡量主動」
施動者是舊資訊、不重要、或本身太重(資訊量大)時,用被動把它挪到句尾。

> 反教條原文(Gopen & Swan):「None of these reader-expectation principles should be considered 'rules.' Slavish adherence to them will succeed no better than has slavish adherence to avoiding split infinitives or to using the active voice instead of the passive.」

### 5. This / It 要接名詞,但頂會論文自己也常違反
this 後接名詞(this trend / this approach),不單獨當代名詞用。

> Raft:「…but its structure is different from Paxos; **this** makes Raft more understandable…」(裸 this,違規)
> GFS:「**This** has led us to reexamine traditional choices…」(裸 this,違規)
> Jellyfish:「…and **this advantage** improves with scale.」(this + 名詞,合規)

賣點就是 understandability 的 Raft 都沒守:這是傾向,但要有意識地選,不是隨手打。

### 6. 平行結構
並列元素與 correlative 詞組(both...and / not only...but also / either...or)後接相同文法結構。

> 弱:Formerly, science was taught by the textbook method, while now the laboratory method is employed.
> 強:Formerly, science was taught by the textbook method; now it is taught by the laboratory method.

(source: Strunk & White, *The Elements of Style*, Rule 15)

### 7. 句子長度沒有字數鐵律
常見的「15–25 字」查無具名來源,且跟真實論文矛盾。

> Gopen & Swan 原文:「We have seen 10-word sentences that are virtually impenetrable and … 100-word sentences that flow effortlessly to their points of resolution. A sentence is too long when it has more viable candidates for stress positions than there are stress positions available.」

真實案例:B4(SIGCOMM'13)摘要有一句 55 字長句,用 (i)/(ii)/(iii) 拆出 stress position,讀起來不費力。句長不是問題,結構才是。

### 8. 連接詞要精確,不是別重複
however / therefore / for example 選錯比不用還糟:讀者會去找一個不存在的邏輯關係。

### 9. 弱動詞 / 名詞化替換清單
`make assumption`→`assume`、`is a function of`→`depends on`、`utilizes`→`uses`、`there is/there are` 開頭句幾乎都能改寫成主詞+主動動詞。

(source: Schulzrinne, writing-style.html / writing-bugs.html)

---

## 中文

### 1. 話題優先,不是主詞優先(Li & Thompson, 1976)
中文是「話題(topic)+ 評論(comment)」結構,話題不必是文法主詞;英文規則 2 的 topic position 仍是文法主詞,這是根本差異。

> 「這件事,我不知道」:「這件事」是話題,不是「不知道」的邏輯主詞。

### 2. 意合 vs 形合
中文靠語境 / 邏輯串句(意合,parataxis),英文靠連接詞 / 關代(形合,hypotaxis)。硬加連接詞、把子句串成長句,是英式中文病灶的根源。

(source: 王力,《中國語法理論》1944;Nida, *Translating Meaning*, 1982)

### 3. 余光中〈怎樣改進英式中文?〉(1987)四大病灶
- **被字氾濫**:中文原有「遭、挨、受、由…所」等被動表達,英式中文只會用「被」。「他被人救起了」→「他獲救了」;「他被升為營長」→「他升為營長」
- **的字堆疊**:「參差的斑駁的黑影」→「參差而斑駁的黑影」
- **名詞化(萬能動詞+抽象名詞)**:「進行了詳細的研究」→「詳加研究」;「對社會作出了重大的貢獻」→「對社會貢獻很大」;「作為竹林七賢之一的劉伶以嗜酒聞名」→「劉伶是竹林七賢之一,以嗜酒聞名」
- **贅餘連接詞/複數標記**:「之一」「們」「與/及」不必要地模仿英文,例如「紅樓夢是中國文學的名著之一」→「紅樓夢是中國文學名著」

### 4. 中文被動語態實際規範
現代漢語有「被字句」(有標記)與「受事主語句 / 意念被動句」(無標記,如「杯子打破了」),後者更常用。死物受事、被動語意不言自明時直接刪「被」(「這裝置已被改良不少」→「這裝置已改良不少」)。

(source: 黃伯榮、廖序東《現代漢語》;CUHK 語文中心「歐化句子」教材)

### 5. AI 腔偵測(改稿時逐句掃過)

改編自 [slivenred/no-ai-slop-zh-TW](https://github.com/slivenred/no-ai-slop-zh-TW)(MIT,改編自 petergyang/no-ai-slop)。跟名詞化 / 被字氾濫重複的項目已收在第 3、4 條,這裡不重複列。

| 模式 | 常見寫法 | 怎麼改 |
|---|---|---|
| 二分轉折模板 | 「真正的問題不是 X,而是 Y。」 | 直接講 Y,不用套模板起手 |
| 清喉嚨式開場 | 「值得一提的是……」 | 刪,直接講重點 |
| 假洞見鋪陳 | 「多數人都忽略了……」 | 刪,除非能舉證多數人怎麼想 |
| 冒號揭曉 | 「真正的關鍵是:它會自己學習。」 | 併成一句直述句 |
| 空泛分析 | 「彰顯團隊對創新的承諾」 | 換成具體做了什麼、量化到什麼 |
| 重要性膨脹 | 「寫下關鍵里程碑」 | 降回平實敘述,除非證據夠格 |
| 模糊歸因 | 「研究顯示」「專家普遍認為」 | 點名研究 / 專家是誰,或刪掉 |
| 假強動詞 | 「作為統一管理的核心樞紐」 | 換成具體管什麼、怎麼管 |
| 同義詞輪替 | 同一個東西輪流叫「代理、助理、工具」 | 全文統一用同一個詞 |
| 否定排比 | 「不是 X,不是 Y,而是 Z。」 | 只保留真正要講的 Z |
| 戲劇化碎句 | 「就這樣。真的。沒有別的。」 | 刪,除非文章語氣本來就走這節奏 |
| 機械排比 | 「更快、更準、更聰明」 | 換成一個具體差異點,不湊三詞排比 |
| 連接詞堆疊 | 每段固定以「此外/同時/然而」開頭 | 刪連接詞,靠意合接續(見第 2 條) |
| 虛假全面性 | 「無論新手、專家或企業團隊,都能……」 | 只寫確實驗證過的對象 |
| 無證據因果 | 「進而提升效率並創造更高價值」 | 補證據,或刪掉因果宣稱 |

跟 Loki 的文案規範 `no-em-dash`(禁破折號)、`professional-register-copy`(結構性文案不用口語比喻)同一類:讀起來順但沒有實質內容的訊號,改稿時一起查。

### 6. 台大寫作教學中心構句四原則(蔡柏盈)
- 宜短不宜長,一逗到底是大忌
- 話題-陳述句型,話題轉移就另起新句
- 連接轉承詞別濫用,濫用會變「土石流」長句
- 避免句中肥大:不在主詞動詞間塞長成分。與英文規則 1 對上,是少數中英共通的規則。

---

## 反教條 / 查無不要信的規則

- 句子字數上限(英文「15–25 字」、中文「不超過 X 字」):查無具名來源;中文教學只有「宜短不宜長」的質性建議
- 同段重複 however 會讓論證變脆弱:查無具名學術來源,是內容農場產物
- 「予以」是贅詞:查無,公文用語表列它為規範用詞,沒人主張刪
- 「一律用主動語態」:Gopen & Swan 明講是死教條,判準是 given-new
