---
name: article
description: "Write a teaching article or blog post as a concept note, a deep dive or a field note: what it says, in what order, in which voice, and how to review it as a reader, alone or with a second model as the writer. Use when drafting, rewriting or reviewing an article, a lesson or a course note. Triggers on '寫文章', '寫下一篇', '寫一篇', 'blog', '教學文', '課程文', '改寫這篇', 'review 文案', 'write an article', 'write a post', 'next article'. NOT sentence shapes that sound machine-written; that's human-voice. NOT what a page shows or cuts; that's simple-first. NOT project reports or runbooks; that's project-docs."
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

One article teaches one idea, along one line. When the sections answer
different questions (what a thing is, how to pick between things, how to
ship it), each question is its own article, and the first one keeps only
the choice and links to the rest. A point that belongs to a sibling
article moves there; it is not repeated.

## 2. Pick the kind, and write in its voice

Decide the kind before the outline. Each kind answers its own question, in
its own voice and order.

| Kind | The reader asks | Voice | Order |
|---|---|---|---|
| Concept note | What is it, and when do I use it? | No author: the subject is the reader, the tool or the agent | What it is, the problem it solves, when to use it, when not to |
| Deep dive | How does it work? | No author | The core in two sentences, the run in order, what follows from it, where it fails and how to check |
| Field note | Should I do what the author does? | First person | What I do, the mechanism it rests on, what it costs, when it fits and when it does not |

- A deep dive explains how the thing works: who does what, when, and where
  the data goes. It is not an experiment report. How the author confirmed a
  fact stays out of the article.
- A field note says "I" only for what the source states as the author's
  practice. A consequence of the mechanism is written as a consequence, not
  as "I chose" or "I accept".
- A part of the order that the sources cannot fill is left out, and the
  article is shorter. A cost, a motive or a failure case made up to fill
  the template is an invented fact.
- A concept note leaves protocols and internals to the deep dive it links.
- An example is introduced as an example ("For example: ..."), not as
  something the author once typed, unless the article is a field note.
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
5. Say the premise before the advice. Advice that picks one option only
   makes sense to a reader who knows the options exist. Open with what the
   reader may not know: what the tool does by default, which ways exist,
   what goes wrong without the practice. A thing nobody mentioned is a
   thing the reader does not know.
6. Read the draft as someone who has never seen the author's setup. Every
   fact the advice depends on is said in the article or linked from it. A
   term from another field or from a later article counts as unsaid.
7. A mechanism's name (a tool call, a context window, a token) reaches
   the reader in one of two ways: an article listed as "read first" covers
   it, or the article explains it in at most two sentences, with a link,
   where it first appears. A name used first and linked later fails.
8. Keep the article's history out of the article. The page shows the
   version and the date of the last change. What changed is a record for
   the author, kept in the data, not printed.

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
4. Fill it with the author's real setup (files, names), with private
   names masked. A version shown in a figure is a neutral example, not the
   real one.
5. A table of pairs is a lookup, not a lesson. Keep it static, at the end,
   where the reader checks what they learned.
6. Operate every choice in a real browser, at desktop and phone width,
   before showing it.

Pick the figure by what the reader does with the idea, and vary the kinds
across an article and across a series:

| The idea is | The reader | Kind |
|---|---|---|
| A choice between ways | Picks one and sees what it leads to | Choice |
| A quantity that grows | Moves it and watches the parts change | Dial |
| A run of messages | Replays it one event at a time | Trace |
| A judgement | Answers first, then reads why | Quiz |
| Parts and what passes between them | Reads it part by part | Drawing |
| Something to build | Reads it line by line | Pseudo code |

A rewrite keeps the figures. Place each one in the section it serves, and
let the paragraph before it say what the figure shows. Drop a figure only
when it no longer belongs to the article's idea.

An article may hold several figures when each one answers its own question.
When most figures in a series are one kind, the kind was picked by habit.

An interactive figure sits on the article's one idea, nowhere else. A price,
a limit, a default or any other reference detail gets one sentence, or
nothing. Before adding a section, ask whether the reader would miss it: a
section nobody would miss is cut whole, not kept without its figure.

Teach the general mechanism, not one vendor's version of it. A field name,
a price, a time limit or a default that belongs to one provider is not a
fact about the mechanism. Before writing, survey how at least three
providers or tools do it, from their own documentation. Write what they
share as the mechanism. Write what differs as "some providers", and name a
vendor only as an example. An article about one product says so in its
title, and still says which parts other tools share.

Say what is official and what is self-built. For every tool, command or
mechanism, state whether the product ships it, or the author made it, and
name the built-in feature that is closest. Check the official documentation
before writing either half. An illustrative design is labelled as one.

A practice the author made (a skill, a convention, a checklist) is told as
sharing: what it holds, how it is used, and how a reader with other needs
and tastes would change it. Do not present it as the standard.

A technical mechanism is taught at the depth a systems course would give
it, so the reader could build a small one:

1. Start from the problem it solves, then show one run of it, then name it.
2. Draw its model: the parts and what passes between them (an architecture
   or a flow), nothing decorative.
3. Give about ten lines of pseudo code with a comment on each step, only
   where the reader would build from it. A quantity that grows, a run of
   messages or a judgement call is not code: draw it as what it is.
4. State one trade-off and when the mechanism fails.
5. List the primary sources (the specification, the official docs, the
   paper) with links, and fetch each one before citing it. State the
   revision when a specification changed between versions.

## 7. Name things

1. Name the subject. In labels and in the first mention in each
   paragraph, write the product's name, not "it". Do not force the name
   into every heading.
2. Say who does what to what. "How Claude Code finishes a task", not "It
   runs a full lap".
3. A heading is a full plain sentence a person would say to a colleague:
   the section's conclusion, or the question it answers. No label in front
   of it ("Principle:", "Method:").
4. One name for one thing, and proper nouns in their own casing.
5. A tool or product the author made is unknown to the reader. At its
   first mention in each article, say what it is in plain words and link
   to its page or repository. A bare name teaches nothing.
6. Do not call the article by an internal label ("this log", "this entry"),
   and do not mention how it was written ("the old article", "the source").
7. The title, the summary and the headings are plain text: no code marks
   and no links. An article does not link to its own term.

## 8. Nothing that goes stale

The article must still hold a year from now. Leave out dates, version
numbers, model names, trial counts, usage statistics and measurements of
the author's own work, with the notes on how they were counted.

A number stays when it is the subject of the step: how many parts a thing
has, or an example version in a lesson about versions.

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
6. Use only the markup the page renders. A table or a list the page cannot
   draw shows up as raw symbols. Search every rendered page for leftover
   markup, after any entry animation has finished.

## 11. Write with a second model

A second model can write the draft, and can design the lesson: ask it how
to teach the idea, not only how to word it. It only has the brief.

1. The brief carries everything: the rules, the kind, the facts, what the
   reader has already read, the terms that can be linked and their exact
   names, and the figures to keep. The facts are the only source.
2. The writer lists what it left out for lack of facts. Read that list: it
   is the research still to do.
3. Check each draft by script first: stale patterns, names to mask, link
   names, terms explained at first use, figures placed, words about the
   writing process, markup the page cannot draw.
4. A different model gates each draft against its brief. It scores the
   draft, quotes every claim the facts do not support, and gives
   instructions that quote the sentence to change.
5. The script's findings and the gate's go back to the writer for one
   revision. Then confirm by script that each quoted claim is gone.

A writer model has habits. Name them in the brief:

- It fills a part of the template with an invented motive or cost.
- It leaves the figures out.
- It says the core sentence in the opening, the middle and the ending.
- It mentions the brief or the article it rewrites.

## 12. When the author corrects the draft

A correction to one sentence is usually a rule for the whole article, and a
fault found in one article is usually in its siblings too. Apply it
everywhere, check the other articles in the series, then write it back here
if it would hold for the next article too.

## 13. Article pages

- An article page is plain prose: a few H2 topics, then per item 1 bold
  verdict sentence, 1 link and 1 paragraph of 2 to 3 sentences. No cards,
  badges, stat tiles or rating words.
- Use precise terms, and give every number its baseline.
- Use the narrow reading column (40rem). A full-width line is too long.
