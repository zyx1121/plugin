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

## 4. Take the reader's seat

1. Start from a scene: one real sentence, one real task. Then what happened.
   Then the name of the concept. The term comes last.
2. Each section answers one question the reader already has ("Can it find my
   files?", "Will it break something?").
3. Say what can wait, and link to where it is explained. A term the article
   does not explain is a link, not a promise that "a later article covers
   it".
4. End with the one action that makes the practice better over time, not
   with a recap.

## 5. Name things

1. Name the subject. In headings, labels and the first mention in each
   paragraph, write the product's name, not "it".
2. Say who does what to what. "How Claude Code finishes a task", not "It
   runs a full lap".
3. A heading is a full plain sentence a person would say to a colleague.
4. One name for one thing, and proper nouns in their own casing.
5. Do not call the article by an internal label ("this log", "this entry").

## 6. Numbers are optional

Teach the idea first. A number stays only when the reader can tell in one
read what it proves. If a claim gets a number, the more important claims
beside it need theirs too, or none gets one. For a count that stays: state
the period and what was counted, remove duplicates, and count again before
publishing.

## 7. Emphasis is the article in brief

Read only the marked words. If they do not give the article's core, the
marks are wrong. Keep about one mark a section, on a whole claim, not on a
stray word. Bold, marks and term links each mean one thing; do not mix them
for decoration.

## 8. Review before showing it

1. For each sentence ask: who, does what, and why does the reader care? A
   sentence that cannot answer is rewritten or cut.
2. Read the marked words alone.
3. Check every fact against its source.
4. Run the `human-voice` checks for sentence shapes.
5. Look at the rendered page, not only the text: a line that breaks inside a
   phrase reads as a mistake.

A second model can draft alternatives from a brief. It only has the brief,
so the brief must carry the author's real practice. Its draft goes through
the same review.

## 9. When the author corrects the draft

A correction to one sentence is usually a rule for the whole article. Apply
it everywhere, then write it back here if it would hold for the next
article too.
