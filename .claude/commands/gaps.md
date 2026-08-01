---
description: Rank gaps/inbox.jsonl and say what to ingest/extract next (ROADMAP.md A8)
---

Read `gaps/inbox.jsonl` (one JSON object per line: `ts`, `topic_guess`,
`what_broke`, `source_hint`, `severity`). This file is appended to by the
separate tutor skill whenever something doesn't stick during a homework/study
conversation — this command doesn't write to it, only ranks what's already
there.

1. Parse every line. If the file is empty or missing, say so and stop —
   there's nothing to rank.
2. Group by `topic_guess`. Per A8: **"Repeated gap records on one topic are
   the strongest available signal about where the next exam will hurt."**
   A topic with 3 unrelated-looking gaps outranks a topic with 1 gap of
   `severity: "high"` — recurrence matters more than a single severity label.
3. Within a topic, cross-reference `docs/ROADMAP.md`'s A0 `examWeight`
   entries (`src/data/topics/<course>/<topic>.js`) if the topic already has
   one — a recurring gap on a high-`examWeight` topic is the highest
   priority in the whole inbox.
4. Report, ranked highest-priority first:
   - Topic, gap count, `severity` breakdown, `examWeight` if known.
   - A one-line synthesis of what's actually going wrong (not just a list of
     `what_broke` strings — look for the common thread across a topic's
     gaps, the way A0's dynamic-alloc write-up did for "new int(5) vs new
     int[5]" and "dangling pointer UB").
   - Which `source_hint` file(s) point at real content already in the repo
     vs. which suggest new source material needs to be pasted and run
     through `/ingest` first.
5. End with a single concrete next action: which topic to `/ingest` +
   `/extract` next, and why it outranks the others in the file right now.

Don't resolve or clear any gap records — this command only reads and reports.
Clearing/archiving handled gaps is a separate, not-yet-built step.
