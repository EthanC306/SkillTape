# sources/

Verbatim course material — zyBook sections, lecture slides, lab handouts —
transcribed by hand so items can carry a `provenance` pointer to real text.
This directory is gitignored (see `.gitignore`); this README is the one
exception, committed so the format doesn't have to be re-explained per topic.

**Never commit anything else in this directory.** It's copyrighted course
material and stays local only.

## File format

One file per source section, at `sources/<course>/<kebab-name>.md`:

```markdown
---
source_id: cs2401-slides-02.1-dynamic-alloc
course: cpp
title: "Dynamic Allocation"
kind: slides            # zybooks | slides | lab | handout | webassign
citation: "Nasseef Abukamail, CS 2401 (Ohio University), Lecture Deck 02.1"
ingested: 2026-08-01
---

## Section Heading {#stable-anchor}

Verbatim text from the source, transcribed as-is — not paraphrased,
not summarized. Diagrams/figures get a short factual description
instead of an image.
```

## Rules

1. **Verbatim, not paraphrased.** The whole point is that an item's
   `provenance.excerpt` can be checked against this file later. A paraphrase
   defeats that.
2. **`{#anchor}` IDs are permanent once referenced.** Never renumber or
   delete one after an item points to it — add a new anchor instead of
   repurposing an old one.
3. **Manual ingestion, deliberately.** No scraping, no bulk automation.
   Transcribing the section is itself a first study pass (`ROADMAP.md` §7
   rule 7).
4. **`source_id` is stable and unique** across the whole `sources/` tree —
   items reference it directly.

See `docs/ROADMAP.md` §4 A3 and `docs/old/CS_DRILL_BUILD_SPEC.md` §4 for the
full rationale.
