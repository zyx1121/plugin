---
name: article
description: "Write a teaching article or blog post in the author's own voice: what it says, in what order, and how to review it as a reader. Use when drafting, rewriting or reviewing an article, a lesson or a course note. Triggers on '寫文章', '寫下一篇', '寫一篇', 'blog', '教學文', '課程文', '改寫這篇', 'review 文案', 'write an article', 'write a post', 'next article'. NOT sentence shapes that sound machine-written; that's human-voice. NOT what a page shows or cuts; that's simple-first. NOT project reports or runbooks; that's project-docs."
---

# article

An article is finished when a stranger reads it once and changes how they
work. Most drafts fail before the first sentence: nobody decided what the
reader should believe at the end. Decide that, then write only what serves
it.

## 1. Fix the spirit before the outline

Write one sentence: what the reader believes or does differently after
reading. If the author has not said it, ask. Every section must serve that
sentence. A section that only reports something is cut.

Example: "The reader trusts Claude Code enough to hand over a whole task."
With that sentence fixed, a section of usage counts has no place, and a
section on what the tool can do by itself does.

## 2. Write the author's practice, not the textbook's

The draft that sounds reasonable is usually the common advice. The author's
real practice is often the opposite, and that is why the article is worth
reading.

1. Read the author's own rules first (CLAUDE.md, AGENTS.md, memory notes).
2. Sample what the author really typed: their messages in the transcripts,
   their commits, their notes. Quote sentences they wrote.
3. Check the direction of each rule against its source. "Ask only before
   what cannot be undone" is a rule about not interrupting the author. It is
   not a rule about safety. The same words carry both readings, and only the
   source says which.
4. Never invent an experience, a feeling, a duration or a count. If it was
   not said or measured, it is not in the article.
5. Mask host names, addresses and private services in quoted sentences.

## 3. Say where it differs from the usual advice

State the author's position plainly, once, near the top, as what the author
does and does not do: "I do not write long prompts. I do not paste file
contents. I do not let it ask me at every step." The disagreement is the
hook. Do not soften it into "it depends".

Do not tell the story of a worse past self ("I used to..., then I
learned..."). Say how to do it and what it gains.

## 4. Every claim carries its reason

A conclusion alone reads as a slogan. "Add only what is missing" tells the
reader what to do and gives them no way to agree. For each claim, write the
cause in the author's terms: what the author saw, and why that led to this
practice.

1. After each claim ask "why does the author think so?". If the answer is
   not on the page, find it in the author's words or ask. Do not make one up.
2. The ending holds the author's deepest opinion on the subject, with its
   reason. It is the part the reader keeps, so it must not be a recap or a
   teaser for the next article.
3. A good reason often comes with what the author does instead: "I do not
   install every open-source skill I see. I read it, take what fits and
   rewrite it as mine, because my agent and I already have our own habits."

## 5. Take the reader's seat

1. Start from a scene: one real sentence, one real task. Then what happened.
   Then the name of the concept. The term comes last.
2. Each section answers one question the reader already has ("Can it find my
   files?", "Will it break something?").
3. Say what can wait, and link to where it is explained. A term the article
   does not explain is a link, not a promise that "a later article covers
   it".
4. End with the one action that makes the practice better over time, not
   with a recap.

## 6. Teach a mechanism, then let the reader operate it

Naming a thing and saying when to pick it does not teach it. For each
mechanism the article introduces, say what it is, how it works, how it
differs from the obvious alternative ("the service already has an API, so
why this?") and what it saves. Check each of those facts in the official
documentation before writing it, and write no saving nobody measured.

A figure earns its place when the reader changes one condition and sees a
consequence the paragraph could not show. A figure that only highlights
what the text already says is decoration: remove it.

1. Order each section as scene, question, figure, reasons, name. Ask the
   question the figure answers just before it, so the reader predicts first.
2. One control a figure. Each choice changes the content, not only a color.
3. It never plays by itself: what changes on screen is the reader's doing.
4. Fill it with the author's real setup (files, counts, versions), counted
   that day, and say when it was counted.
5. A table of pairs is a lookup, not a lesson. Keep it static, at the end,
   where the reader checks what they learned.
6. Operate every choice in a real browser, at desktop and phone width,
   before showing it.

## 7. Name things

1. Name the subject. In headings, labels and the first mention in each
   paragraph, write the product's name, not "it".
2. Say who does what to what. "How Claude Code finishes a task", not "It
   runs a full lap".
3. A heading is a full plain sentence a person would say to a colleague.
4. One name for one thing, and proper nouns in their own casing.
5. Do not call the article by an internal label ("this log", "this entry").

## 8. Numbers are optional

Teach the idea first. A number stays only when the reader can tell in one
read what it proves. If a claim gets a number, the more important claims
beside it need theirs too, or none gets one. For a count that stays: state
the period and what was counted, remove duplicates, and count again before
publishing.

## 9. Emphasis is the article in brief

Read only the marked words. If they do not give the article's core, the
marks are wrong. Keep about one mark a section, on a whole claim, not on a
stray word. Bold, marks and term links each mean one thing; do not mix them
for decoration.

## 10. Review before showing it

1. For each sentence ask: who, does what, and why does the reader care? A
   sentence that cannot answer is rewritten or cut.
2. Read the marked words alone.
3. Check every fact against its source.
4. Run the `human-voice` checks for sentence shapes.
5. Look at the rendered page, not only the text: a line that breaks inside a
   phrase reads as a mistake.

A second model can draft alternatives from a brief, and can design the
lesson: ask it how to teach the idea, not how to word it. It only has the
brief, so the brief must carry the author's real practice and the checked
facts. Its draft goes through the same review.

## 11. When the author corrects the draft

A correction to one sentence is usually a rule for the whole article, and a
fault found in one article is usually in its siblings too. Apply it
everywhere, check the other articles in the series, then write it back here
if it would hold for the next article too.
