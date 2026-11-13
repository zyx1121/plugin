---
name: human-voice
description: "Make copy read as written by a person, not a model: product and promo pages, tutorials, lesson text, announcements and narration, in Chinese or English. Use when writing or reviewing copy people will read. Triggers on 'AI 感', 'AI 腔', 'AI slop', '真人感', '文案', '宣傳文案', '教學文案', '抓 AI 寫作痕跡', 'sounds like AI', 'human voice'. NOT single academic sentences; that's academic-sentence. NOT interface labels alone; that's the alint rule ui-copy-no-filler."
---

# human-voice

Copy sounds machine-written because of a few repeated sentence shapes, not
because of its facts. Remove the shapes, then add what a person would add:
a concrete scene, a plain rule, a direct "you".

## 1. Pick the register first

| Register | Where | Voice | Reference texts |
|---|---|---|---|
| Structural | Headings, buttons, navigation, transitions, outline captions | Plain nouns and verbs. No metaphor, no joke | The product's own UI |
| Product and promo | Landing pages, taglines, release posts | A noun or "subject + verb" heading, one concrete benefit per line | zeabur.com/zh-TW, notion.com/zh-tw, cursor.com |
| Tutorial and explanation | Lessons, docs that teach, talk narration | A teacher talking: a scene, an everyday comparison, "you" | 鳥哥的 Linux 私房菜, iThome 鐵人賽 articles |
| Academic | Papers, theses | Use `academic-sentence` | |

Metaphors belong in the tutorial register only. A heading or a transition
stays literal: 「了解內部運作」, not 「打開引擎蓋」.

## 2. Read references before writing

Fetch 2 or 3 real texts of the same register and language, and read them
before the first draft. Pull only the visible text:

```bash
pw run 'await page.goto(URL); return await page.$$eval("h1,h2,h3,p,li", els => els.map(e => e.innerText).filter(Boolean).slice(0, 60))'
```

Product docs are company voice. For a tutorial, a person's own article
(鳥哥, iThome) is the stronger reference.

## 3. Remove AI-tone patterns

Adapted from [slivenred/no-ai-slop-zh-TW](https://github.com/slivenred/no-ai-slop-zh-TW)
(MIT, itself adapted from petergyang/no-ai-slop), plus patterns found in
lesson copy on 2026-11-13.

| Pattern | Typical text | Fix |
|---|---|---|
| Not X, but Y | 「真正的問題不是 X,而是 Y。」 | Say Y. Keep at most 1 contrast per section |
| Negative list | 「不是 X,不是 Y,而是 Z。」 | Keep Z only |
| Announce, then colon | 「重點只有一句：…」「真正的關鍵是:…」 | Delete the announcement, keep the sentence |
| Throat clearing | 「值得一提的是……」 | Delete it |
| Fake insight | 「多數人都忽略了……」 | Delete it, or show who thinks so |
| Hollow analysis | 「彰顯團隊對創新的承諾」 | Say what was done, with a number |
| Inflated importance | 「寫下關鍵里程碑」 | Say it plainly |
| Vague source | 「研究顯示」「專家普遍認為」 | Name the study or the person, or delete |
| Fake strong verb | 「作為統一管理的核心樞紐」 | Say what it manages and how |
| Synonym rotation | 「代理、助理、工具」 for one thing | One name for one thing |
| Dramatic fragments | 「就這樣。真的。沒有別的。」 | Delete them |
| Mechanical triplets | 「更快、更準、更聰明」 | Keep one concrete difference |
| Stacked connectives | Every paragraph opens with 此外, 同時, 然而 | Delete the connective |
| False coverage | 「無論新手、專家或企業團隊,都能……」 | Name only the audience you checked |
| Unproven cause | 「進而提升效率並創造更高價值」 | Add evidence or delete the claim |
| Gloss on every term | 「終端機（terminal）」「shell（本課用的是 bash）」 | Gloss once, on first use, or link a glossary |
| Legal abstractions | 「不是不可偽造的證據」 | Describe the scene: who did what, where |
| Fake precision | 「先花兩秒確認」 | Drop the number unless it was measured |

## 4. Add what people add (tutorial register)

Quotes are from 鳥哥 ch.4 (linux.vbird.org/linux_basic/centos7/0160startlinux.php)
and iThome article 10381063.

1. The author as the example: 「以鳥哥為例，我輸入的就是第三章建立的dmtsai那個帳號啦！」
2. The learner's confusion, said out loud: 「很多初學者一開始到這裡都會拼命的問！啊我的鍵盤怎麼不能用...」
3. An everyday comparison: 「Terminal 是話筒，Shell 是總機。」
4. The rule, then the consequence: 「預設root的提示字元為 # ，而一般身份使用者的提示字元為 $ 。」
5. What can wait: 「這裡先有概念即可！」

A calm course does not need 啦 or XD on every line. It needs one scene and
one comparison per idea.

For product copy: the heading names the product or what it does, a subhead
is a noun, the body is one line of concrete benefits, buttons are 登入,
現在開始, 了解更多. No couplets, no personification, no quips.

## 5. Check before shipping

1. Count 不是…是 and 只是 in each section. More than 1 means rewrite.
2. Search for a colon after 重點, 關鍵 or 答案. Delete the announcement.
3. Find each group of 3. Keep it only if there really are 3 things.
4. Point to 1 concrete scene per idea in a tutorial. None means add one.
5. Read it aloud. If no person would say it to a colleague, rewrite it.

In a repo, run the `alint` skill: `ai-tone-phrases` (grep) catches the fixed
phrases and `human-voice` (model) judges the patterns above.
