---
description: Format a pasted course-material section into a sources/ file (ROADMAP.md A7)
argument-hint: <course>/<kebab-name>  e.g. cpp/linked-lists-02.2
---

The user has pasted (or is about to paste) a section of course material —
lecture slides, a zyBooks section, a lab handout. Turn it into a
`sources/$ARGUMENTS.md` file per `sources/README.md`'s format. Read that file
first if you haven't already this session.

Steps:

1. If no course material has been pasted into the conversation yet, ask for
   it before doing anything else — this command has nothing to format
   without it.
2. Write `sources/$ARGUMENTS.md` with:
   - YAML frontmatter: `source_id` (derive from the path — must be unique
     across the whole `sources/` tree, check with `ls sources/*/*.md` and
     grep existing `source_id:` lines if unsure), `course`, `title`, `kind`
     (`zybooks | slides | lab | handout | webassign`), `citation`, `ingested`
     (today's date).
   - One `## Heading {#stable-anchor}` section per logical chunk of the
     source (roughly one per slide, or one per subsection of a longer
     document) — not one giant undivided block.
   - Body text **verbatim** — transcribe, don't paraphrase or summarize.
     Diagrams/figures get a short factual description of what they show,
     since an image can't be transcribed as text.
3. Anchor IDs are permanent once written — pick names you'd be comfortable
   never renaming (`#new-operator`, not `#section-3`).
4. Confirm `sources/` is gitignored for this file (it should be, via
   `sources/*` + `!sources/README.md` in `.gitignore`) — this is
   copyrighted material and must never be committed. Don't `git add` it.
5. Report the anchors you created, so the user (or a later `/extract` run)
   knows what's available to point items at.

This is deliberately manual, not scraped or bulk-automated — transcribing
the section is itself a first study pass (ROADMAP.md §7 rule 7). Don't try
to shortcut it by inventing content that wasn't actually in what was pasted.
