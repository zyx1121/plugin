---
name: article
description: "Write a teaching article or blog post that teaches the author's practice in a textbook voice: what it says, in what order, and how to review it as a reader. Use when drafting, rewriting or reviewing an article, a lesson or a course note. Triggers on '寫文章', '寫下一篇', '寫一篇', 'blog', '教學文', '課程文', '改寫這篇', 'review 文案', 'write an article', 'write a post', 'next article'. NOT sentence shapes that sound machine-written; that's human-voice. NOT what a page shows or cuts; that's simple-first. NOT project reports or runbooks; that's project-docs."
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

## 2. Teach the author's practice, in a textbook voice

The content is the author's real practice. The voice is a textbook's: the
article teaches, and the author does not appear in it.

- No first person: no "I", "my" or "we". The subject is the reader, the
  tool or the practice.
- Each section is a principle, a method or a next step, and its heading
  says which.
- An example is introduced as an example ("For example: ..."), not as
  something the author once typed.
- The article shares how to work. It is not a data report: no usage
  statistics, and no notes on how something was counted.
- An opinion is written as an instruction with its reason, not as a
  feeling.

The draft that sounds reasonable is usually the common advice. The author's
real practice is often the opposite, and that is why the article is worth
reading.

1. Read the author's own rules first (CLAUDE.md, AGENTS.md, memory notes).
2. Sample what the author really typed: their messages in the transcripts,
   their commits, their notes. Use them as the source of each practice and
   of each example.
3. Check the direction of each rule against its source. "Ask only before
   what cannot be undone" is a rule about not interrupting the author. It is
   not a rule about safety. The same words carry both readings, and only the
   source says which.
4. Never invent an experience, a feeling, a duration or a count. If it was
   not said or measured, it is not in the article.
5. Mask host names, addresses and private services in quoted sentences.

## 3. Say where it differs from the usual advice

State the position plainly, once, near the top, as what to do and what to
skip: "Give the goal. Do not paste file contents. Do not ask for a check at
every step." The disagreement is the hook. Do not soften it into "it
depends".

Do not tell the story of a worse past self. Say how to do it and what it
gains.

## 4. Every claim carries its reason

A conclusion alone reads as a slogan. "Add only what is missing" tells the
reader what to do and gives them no way to agree. For each claim, write the
cause: what goes wrong without the practice, and why the practice prevents
it.

1. After each claim ask "why does the author think so?". The reason needs
   a source: the author's words, their rules file, a skill or a note. A
   reason that only sounds likely is an invented one. With no source, write
   the practice alone and ask the author.
2. Some practices have no reason worth teaching ("it was just fun"). Write
   the practice without one, and do not build a section on a motive the
   author never had. Leave a topic out when the author says so.
3. The ending holds the most important instruction on the subject, with
   its reason. It is the part the reader keeps, so it must not be a recap or a
   teaser for the next article.
4. A good reason often comes with what to do instead: "Read an open-source
   skill in full before installing it. Take what fits and rewrite it,
   because the agent already works by the rules of its own setup."

## 5. Take the reader's seat

1. Start from an example: one real sentence, one real task. Then what
   happens. Then the name of the concept. The term comes last.
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
4. Fill it with the author's real setup (files, names, versions), with
   private names masked.
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
5. A tool or product the author made is unknown to the reader. At its
   first mention in each article, say what it is in plain words and link
   to its page or repository. A bare name teaches nothing.
6. Do not call the article by an internal label ("this log", "this entry").

## 8. Numbers that teach stay, measurements go

Teach the idea first. A number stays when the reader needs it to follow
the step: a version, a limit, how many parts a thing has. Usage statistics
and measurements of the author's own work are left out, with the notes on
how they were counted.

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
