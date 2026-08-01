# SkillTape — Integration Addendum

Replaces `cs-drill-integration.md`. That version was written before the codebase had been reviewed and assumed a CLI application, a SQLite database, and a separate `atoms/` layer — none of which exist. Delete the old file; nothing in it is worth keeping that isn't here.

This covers how SkillTape wires into what already exists: the Claude Code hooks and slash commands, and the OU Dining Tracker.

**What changed:** no CLI · no database · no `atoms/` layer · gap capture justified differently · leech handoff moves in-app · the SessionStart hook doesn't work as originally specced (§3) · no phase numbers.

---

## 0. The map

```
  sources/            (zyBooks prose, saved by hand, gitignored)
      │
      │  /extract  — Claude Code reads the source, writes items
      ▼
  src/data/topics/<course>/<topic>.js
      │                    ▲
      │                    │  reads for C++ house style
      │                    │
      │   references/cpp-conventions.md  ◀── single source of truth
      │                    │                          ▲
      │                    │                          │ reads
      │                    │                cpp-tutor skill
      │                    │                          ▲     │
      │                    │           gap records    │     │  leech handoff
      │                    │                          │     ▼
      ▼                                          gaps/inbox.jsonl
  npm run audit:bank  ──▶  structural check
      │
      ▼
  you verify  ──▶  verifiedByHuman: true
      │
      ▼
  React app: scheduler ──▶ drill mode ──▶ localStorage attempt log
```

Two rules hold this together:

1. **Sources supply content. The tutor supplies priorities.** The tutor logs what needs drilling; it never writes questions.
2. **Conventions live in one file.** Both the tutor skill and the extraction prompt read it. Neither keeps a private copy.

Note what the app is: a **reader**. It imports static topic files and records attempts. No API key, no backend, no generate button. All authoring is terminal work.

---

## 1. The tutor ↔ drill contract

### 1.1 Tutor identifies gaps, sources fill them

The highest-signal input to the bank is whatever just confused you in a tutoring session. But the tutor shouldn't write the questions.

**[CORRECTED]** The original reason given was that tutor-authored questions would "smuggle model-generated content into the bank." That reasoning is void — generated items are fine when grounded in a source excerpt. The real reason is narrower and better: **the tutor doesn't have the source text in front of it.** It would be recalling from training data rather than reformatting a sentence you supplied, and there'd be nothing to verify the answer against. Same conclusion, correct justification.

So the tutor emits a **gap record**. Append to :

```markdown
## Gap capture (SkillTape integration)

When Ethan gets something wrong, misremembers a mechanic, or says a
concept isn't sticking, append a gap record to
`~/SkillTape/gaps/inbox.jsonl` — one JSON object per line:

{
  "ts": "2026-07-26T14:22:00Z",
  "topic_guess": "c++.linked-lists.doubly",
  "what_broke": "Reversed the pointer-update order when inserting after
                 a node; lost the tail of the list.",
  "source_hint": "zyBooks Ch 3 insertion section, or Lab 3 handout",
  "severity": "high"
}

Write the record, mention in one line that you logged it, and move on.
Do NOT write a question, an expected answer, or a criteria checklist —
you are recording WHAT needs drilling, not the content that will drill
it. The content comes from Ethan's source materials, because those are
the only thing an answer can be checked against.
```

`/gaps` then reads that file, ranks by severity and repeat count, and tells you which source sections to save and extract next. Ingestion stays manual, extraction runs against real text, and the grounding rule holds.

Repeated gap records on one topic are the strongest available signal about where the next exam will hurt.

### 1.2 Drill failures go to the tutor

An item that has lapsed three or more times is a leech. Grinding it again is the wrong move — either the question is badly written or the concept never landed, and neither is fixed by repetition.

**[CORRECTED]** The original spec had `cs-drill explain <item-id> --copy`. There is no CLI. The in-app equivalent: a **"copy for tutor"** button on any flagged leech, which puts a formatted block on the clipboard — the prompt, `expected`, `criteria`, the source excerpt and citation, and the full attempt history with grades and times. Paste it into Claude Code; the tutor skill triggers on the C++ content by itself.

This lands on the tutor's existing "Verifying homework answers" protocol — step-by-step walkthrough, trace table, why the correct answer is correct, verdict table. That protocol was built for exactly this shape of problem.

After the walkthrough, three outcomes. Pick one and edit the topic file:

| Outcome | When | Action |
|---|---|---|
| Rewrite the item | Question was ambiguous | Edit `prompt` / `criteria`, reset box to 1 |
| Split the fact | Fact was too big — usual culprit when a `recall` item takes 45+ seconds | Retire it, write two narrower items |
| Reset to box 1 | Concept landed, item is fine | Clear `lapses`, drop the leech flag |

Build this after drill mode exists; there's no attempt history to hand over and no leeches to triage until the drill loop has been running a while.

---

## 2. Kill the convention duplication before it starts

Whatever writes `write`, `cloze`, and `error` items needs the course's C++ house style, or the items won't look like his exam questions. The tutor skill already documents that style in full. A second copy inside an extraction prompt guarantees the two drift, and drift means drill items that don't match what the exam expects.

Lift the tutor skill's "OU CS code conventions" section verbatim into:

```
~/SkillTape/references/cpp-conventions.md
```

C++11/14 only · `using DataType = ...` aliases · full getter/setter interface · the cursor traversal idiom · const-correctness · `nullptr` never `NULL` · `using namespace std;` · no `#include <string>` · includes limited to `<cstdlib> <iomanip> <iostream> <fstream>` · attached opening brace with the body indented on its own line · `} // main` and `#endif` closers.

Then both the tutor skill and `.claude/commands/extract.md` reference it:

```markdown
Read `~/SkillTape/references/cpp-conventions.md` before writing any
C++. It is the single source of truth for course style. If Ethan's
pasted code or slides differ, the local materials win.
```

One file to update when the instructor does something unexpected.

---

## 3. Claude Code wiring

### ⚠️ The SessionStart hook doesn't work as specced

The original version ran `node src/cli.js due --brief` to print `7 due · 2 leeches` on every session start. **That can't work.** Your attempt log lives in the browser's `localStorage`, and a Node process has no access to it. This isn't a path fix — it's a real architectural constraint of keeping the personal track backend-free.

Three options, in order of how much they cost:

1. **Drop the hook.** All reporting lives in the app, where the data is. Nothing lost except the passive nudge.
2. **Export, then read.** Drill mode writes `progress-export.json` on session end; you move it into the repo; the hook reads it. Stale by up to a day, which is fine for a reminder. Costs an export button you want anyway as backup insurance against a cleared cache.
3. **Move the attempt log out of the browser.** Correct long-term, but it means a backend, which is the platform track.

Pick 1 now, revisit if the nudge turns out to matter. If you go with 2, the hook is:

```json
{
  "hooks": {
    "SessionStart": [{
      "hooks": [{
        "type": "command",
        "command": "cd ~/SkillTape && node scripts/dueBrief.js 2>/dev/null || true"
      }]
    }]
  }
}
```

The `|| true` matters regardless: a broken study tool must never block a coding session.

### Slash commands

`.claude/commands/` in the SkillTape repo:

| Command | Does | Status |
|---|---|---|
| `/ingest <file>` | Formats a pasted section into frontmatter + `{#anchor}` headings under `sources/` | Write this first |
| `/extract <source> <topic-file>` | Reads the source, appends items with provenance and `verifiedByHuman: false` | The main one |
| `/gap` | Logs a gap record for whatever just went wrong | After the tutor edit |
| `/gaps` | Ranks the inbox, says what to ingest next | After `/gap` |
| `/audit` | Runs `npm run audit:bank` | Now — it's a one-liner |

**[CORRECTED]** `/drill` is gone. Drilling happens in the app, closed-book, with the timer and the hidden navigation. A terminal can't hide your browser.

### Notification integration

Reuse the existing notification setup for exactly two events and no others: **drill queue non-empty** (once, morning) and **no drill session in 3+ days**. Anything more becomes noise and gets ignored inside a week.

Depends on option 2 above — with option 1 there's no process outside the browser that knows the queue is non-empty.

---

## 4. Reusing the Dining Tracker

**[CORRECTED]** The original section listed `better-sqlite3` access-layer patterns, Express wiring, and migration runners as things to copy. None of that applies — the personal track has no database and no server. It's all platform-track material, relevant if and when you get to Supabase.

What still holds:

- **Keep the repos separate.** The Dining Tracker is being pushed to production-ready with a multi-branch plan in flight. Bolting an unrelated study tool onto it destabilizes that work for zero benefit.
- **The `attempts` shape rhymes with the macro-tracking work.** Many small timestamped rows, aggregated on read. Whatever you learned there about that shape transfers.
- **Skip React Native.** A phone is the worst possible device for closed-book recall practice — the drill loop needs a keyboard and no adjacent browser tab.

---

## 5. Start here: reverse-engineer the midterm

Still the most valuable step in this document, and it involves no code.

You have the graded midterm. That's 68 points of ground truth on two things the system otherwise has to guess: **how the instructor weights topics**, and **exactly where you lost points.** Nothing in the bank is better calibrated than that.

1. For each midterm question, record the topic and the points available.
2. Sum by topic. Those ratios become each topic's `examWeight`.
3. For every question you lost points on, log a gap record with `severity: "high"`.
4. Save and extract those source sections first.

**[CORRECTED]** The weights were specced into a `curriculum.yaml`. There is no such file. They go on the topic objects in `src/data/topics/<course>/<topic>.js`, or on the course entries in `src/data/courses.js` — wherever you'd rather read them from. One number per topic.

Result: weights calibrated to the real exam, and a first extraction batch aimed at the 32 points you dropped rather than at whatever chapter you happen to open.

The final will weight topics differently — later material, and cumulative or not depending on the syllabus — so revisit once you know its structure. But the midterm distribution beats a uniform guess by a wide margin.

---

## 6. Where this sits in the build order

**[CORRECTED]** The original inserted "Phase 0," "Phase 2.5," and "Phase 5.5" into a numbering scheme that has since been retired. Three schemes were live at once and the same number meant unrelated work. Only `PLAN_PLATFORMIZE.md` numbering survives.

This work belongs to the **personal track**, which runs alongside the platform roadmap rather than inside it — it needs no auth, no database, and no CMS:

1. Tally the midterm (§5). No code.
2. Finish naming, config trio, `npm install`.
3. `itemSchema.js` + `auditBank.js`, run the audit, read the failures.
4. Migrate one topic by hand — one you lost midterm points on.
5. Attempt log + scheduler + drill mode. Ships as one unit or none of it works.
6. Extract the conventions file (§2) and add `/extract` before scaling past one topic.
7. Gap capture (§1.1), then the leech handoff (§1.2) once there's history to hand over.

The platform track — `PLAN_PLATFORMIZE.md` Phases 1 through 6, auth through sharing — is unchanged and unblocked by any of this.
