---
name: academic-sentence
description: "Sentence-level academic writing formulas for English and Traditional Chinese — 語序 / topic-stress position / nominalization / passive voice / parallelism / 歐化中文病灶. Use when polishing a single sentence, not restructuring a paper. Triggers on 'SVO 語序', '這句話怎麼寫', '被動語態要不要用', '這句中文西化了', '翻譯腔', '句子太長怎麼拆', '改這句話', 'sentence structure', 'nominalization', 'topic position', 'given-new'. NOT whole-paper / reviewer-comment revision — that's paper-revise. NOT slide content — that's winlab-pptx."
---

# academic-sentence — 中英學術句子層級寫作公式

一句話怎麼寫的 checklist,不談章節架構(那是 `paper-revise` 的地盤)。規則多半是「傾向」不是語法鐵律 —— 底下每條都附了真實頂會論文的驗證結果:有的規則連 Raft、GFS 自己都沒守。查不到具名來源的空泛說法(如「同段不能重複 however」「中文句子不超過 X 字」)不列入,避免把內容農場當公式教。

## Workflow

1. 先判斷語言:純英文句子用「英文」節;純中文句子用「中文」節;中英夾雜(WinLab 簡報/報告常見)兩節都過一遍,分開處理
2. 改完自我核對三件事:主詞動詞有沒有黏近?句尾(stress position)放的是不是你要讀者記住的新資訊?有沒有裸 this/it 沒接名詞?
3. 規則衝突時(例如被動語態該不該用),回到「舊資訊在前、新資訊在後」這條總原則做判斷,不要死守表面規則(見下方「反教條」)

---

## 英文

### 1. 主詞動詞不能拉開
讀者一律把插在主詞跟動詞之間的材料當「不重要的插入」處理,不管內容其實多重要。插得越長,讀者工作量越大——讀者需要動詞才知道主詞在「做什麼」。

> 病句:The smallest of the URF's (URFA6L), a 207-nucleotide reading frame overlapping … **has been identified** as the animal equivalent … (主詞跟動詞隔了 23 個字)

(source: Gopen & Swan, *The Science of Scientific Writing*, American Scientist 1990)

### 2. Topic Position / Stress Position
句首(topic position)放**舊資訊**+「這句話的故事屬於誰」;句尾(stress position,逗號/句號前)放**新資訊**,也就是你要讀者記住的東西。

> Bees disperse pollen. / Pollen is dispersed by bees. —— 同一件事實,故事主角不同;**被動語態本身不是問題**,段落講的是花粉的故事時,被動句反而是對的選擇。

### 3. 名詞化陷阱(nominalization)
句子真正的動作常被藏進名詞化的詞(-tion/-ment/-ance/-ing),讀者要先「復原」成動作才懂。判斷法:找句子真正的角色(who)跟真正的動作(doing what),看它們是不是被埋進抽象名詞或 possessive 裡。

> "there is an empirical contribution in this paper by providing new evidence" → "this paper contributes new evidence"
> "institutions through which political legitimation can be accomplished" → "institutions that legitimize violence"

(source: DeScioli & Pinker, *PS: Political Science & Politics*, 2021;概念出自 Joseph Williams, *Style: Lessons in Clarity and Grace*)

### 4. 主動 vs 被動 —— 具體判準,不是「盡量主動」
被動句該用在:動作施動者是舊資訊、不重要、或本身太重(資訊量大)時,把它挪到句尾。判準是 given-new,不是道德教條。

> 反教條原文(Gopen & Swan):「None of these reader-expectation principles should be considered 'rules.' Slavish adherence to them will succeed no better than has slavish adherence to avoiding split infinitives or to using the active voice instead of the passive.」

### 5. This / It 要接名詞,但頂會論文自己也常違反
規則:this 後面接名詞(this trend / this approach),不要單獨當代名詞用,否則讀者要回頭猜整句在指什麼。

> Raft:「…but its structure is different from Paxos; **this** makes Raft more understandable…」—— 裸 this,違規
> GFS:「**This** has led us to reexamine traditional choices…」—— 裸 this,違規
> Jellyfish:「…and **this advantage** improves with scale.」—— this + 名詞,合規

結論:連「整篇論文賣點就是 understandability」的 Raft 自己都沒守——這條是傾向,不是鐵律,但寫的時候該有意識地選,不是隨手打。

### 6. 平行結構
並列元素文法要對稱;correlative 詞組(both...and / not only...but also / either...or)後面必須接同樣的文法結構。

> 弱:Formerly, science was taught by the textbook method, while now the laboratory method is employed.
> 強:Formerly, science was taught by the textbook method; now it is taught by the laboratory method.

(source: Strunk & White, *The Elements of Style*, Rule 15)

### 7. 句子長度沒有字數鐵律
業界常說 15–25 字,但沒有具名學術來源支持這個數字,且跟真實論文矛盾。

> Gopen & Swan 原文:「We have seen 10-word sentences that are virtually impenetrable and … 100-word sentences that flow effortlessly to their points of resolution. A sentence is too long when it has more viable candidates for stress positions than there are stress positions available.」

真實案例:B4(SIGCOMM'13)摘要有一句 55 字的長句,但用條列(i/ii/iii)拆解 stress position,讀起來不費力——句長不是問題,結構才是。

### 8. 連接詞要精確,不是別重複
however/therefore/for example 選錯比不用還糟——讀者會被誤導去找一個實際不存在的邏輯關係。「同段裡不能重複用 however」查無具名學術來源,只有內容農場文章,不要當規則用。

### 9. 弱動詞 / 名詞化替換清單
`make assumption`→`assume`、`is a function of`→`depends on`、`utilizes`→`uses`、`there is/there are` 開頭句幾乎都能改寫成主詞+主動動詞。

(source: Schulzrinne, writing-style.html / writing-bugs.html)

---

## 中文

### 1. 話題優先,不是主詞優先(Li & Thompson, 1976)
中文句子是「話題(topic)+ 評論(comment)」結構,話題**不必**是文法主詞——這跟英文的規則 2(topic position 仍必須是文法主詞)是根本差異。

> 「這件事,我不知道」——「這件事」是話題,不是「不知道」的邏輯主詞。

### 2. 意合 vs 形合
中文靠語境/邏輯自明串句(意合,parataxis),少用連接詞;英文靠連接詞/關代硬串長句(形合,hypotaxis)。模仿英文硬加連接詞、硬把子句串成長句,是「英式中文」病灶的根源。

(source: 王力,《中國語法理論》1944;Nida, *Translating Meaning*, 1982)

### 3. 余光中〈怎樣改進英式中文?〉(1987)四大病灶
- **被字氾濫**:中文原有「遭、挨、受、由…所」等被動表達,英式中文只會用「被」。「他被人救起了」→「他獲救了」;「他被升為營長」→「他升為營長」
- **的字堆疊**:「參差的斑駁的黑影」→「參差而斑駁的黑影」
- **名詞化(萬能動詞+抽象名詞)**:「進行了詳細的研究」→「詳加研究」;「對社會作出了重大的貢獻」→「對社會貢獻很大」;「作為竹林七賢之一的劉伶以嗜酒聞名」→「劉伶是竹林七賢之一,以嗜酒聞名」
- **贅餘連接詞/複數標記**:「之一」「們」「與/及」不必要地模仿英文,例如「紅樓夢是中國文學的名著之一」→「紅樓夢是中國文學名著」

### 4. 中文被動語態實際規範
現代漢語有兩種被動:「被字句」(有標記)跟「受事主語句/意念被動句」(無標記,如「杯子打破了」),**後者中文更常用**。死物受事、被動語意不言自明時,直接刪「被」不加標記(「這裝置已被改良不少」→「這裝置已改良不少」)。

(source: 黃伯榮、廖序東《現代漢語》;CUHK 語文中心「歐化句子」教材)

### 5. 台大寫作教學中心構句四原則(蔡柏盈)
- 宜短不宜長,一逗到底是大忌
- 話題-陳述句型,話題轉移就另起新句
- 連接轉承詞別濫用,濫用會變「土石流」長句
- **避免句中肥大**——不要在主詞動詞間塞長成分。這條跟英文規則 1(主詞動詞不能拉開)完全對上,是少數中英文共通的規則。

---

## 反教條 / 查無不要信的規則

- 中文句子長度量化規則(像英文的「不超過 25 字」)—— 查無,中文寫作教學只有「宜短不宜長」這種質性建議,別套用英文數字
- 同段裡重複用 however 會讓論證變脆弱 —— 查無具名學術來源,是內容農場產物
- 「予以」被學者批評成贅詞 —— 查無,公文用語表只列它是規範用詞,沒人主張刪
- 「一律用主動語態」—— Gopen & Swan 明講這是死教條,判準是 given-new 不是語態本身
