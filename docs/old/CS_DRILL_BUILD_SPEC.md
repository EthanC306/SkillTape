# cs-drill — Build Spec

**Purpose:** A source-grounded quiz and spaced-repetition system for Ethan's course curriculum. Every question traces back to a verbatim excerpt from his own course materials (zyBooks, lecture slides, lab handouts, WebAssign problems). No facts originate from the model.

**Audience:** Claude Code. Feed this whole file as the project brief.

---

## 0. The problem this solves

Current grade breakdown in the course that triggered this:

| Component | Score | Conditions |
|---|---|---|
| Assignments | 129.04 / 130 (99.26%) | Open book, IDE, unlimited time |
| Labs | 90 / 90 (100%) | Open book, IDE, unlimited time |
| Quizzes | 17 / 20 (85%) | Open book, low stakes |
| **Midterm** | **36 / 68 (52.94%)** | **Closed book, timed, proctored** |

The knowledge is going in fine. It is not coming back out under closed-book, timed, no-compiler conditions. That single fact dictates every design decision below:

- **Production over recognition.** Multiple choice is capped at 15% of the bank. Recognizing a correct answer among four options is a different skill from producing it on a blank page, and it inflates confidence without moving exam performance.
- **Closed-book by default.** The drill loop hides all reference material and does not accept "let me look it up." Attempts are tagged by mode; only closed-book first-try accuracy counts toward mastery.
- **Timed pressure is a first-class feature**, not an add-on. Recall that takes 90 seconds is a fail on a 68-point exam.

---

## 1. Non-negotiable constraint: extraction, not invention

**Rule:** No claim, definition, rule, complexity result, or expected answer may originate outside the source materials. The model's job is to *transform* source text into question form and to *anchor* every item to its origin.

**Honest scoping of this constraint.** The question *stem* is necessarily new text — turning "A doubly linked list node stores pointers to both its successor and predecessor" into "What two pointers does a doubly linked list node store?" produces a sentence that does not appear in zyBooks. That is unavoidable and fine. What is enforceable, and what this spec enforces, is that:

1. Every **fact** and every **expected answer** is entailed by a stored verbatim excerpt.
2. Every item carries a resolvable pointer back to that excerpt so it can be checked in seconds.
3. No item enters the drill rotation until a human has flipped `verified_by_human: true`.

Automated validation catches structural violations. Human sign-off catches semantic ones. Both are required — treat any claim that the pipeline alone guarantees accuracy as false.

**Source handling.** Source files are Ethan's own purchased/licensed materials, extracted for personal study. Keep the repo private and do not commit source text to any public remote. `sources/` goes in `.gitignore` with a committed `sources/README.md` explaining the format.

---

## 2. Stack

Deliberately matched to what Ethan already ships:

- **Runtime:** Node 20+, ES modules
- **DB:** SQLite via `better-sqlite3` (same as Dining Tracker)
- **CLI:** `commander` + `@inquirer/prompts`
- **Validation:** `zod` for schemas
- **Tests:** `node:test` (no new framework)
- **Later phases only:** React + Vite dashboard; React Native after that

No ORM. No web server until Phase 8. The CLI is the product for the first six phases because it is the only interface that can credibly enforce closed-book conditions.

---

## 3. Repo layout

```
cs-drill/
├── curriculum.yaml              # topic tree, exam weights, source manifest
├── sources/                     # gitignored — raw course material
│   ├── README.md                # committed: format docs
│   ├── c++/
│   │   ├── zybooks-ch03-linked-lists.md
│   │   ├── slides-week05-big-three.md
│   │   └── lab03-doubly-linked.md
│   └── discrete/
│       ├── zybooks-ch02-logic.md
│       └── zybooks-ch05-induction.md
├── atoms/                       # extracted facts, one JSON per source file
├── items/                       # questions derived from atoms
├── db/
│   ├── schema.sql
│   └── drill.db                 # gitignored
├── src/
│   ├── cli.js
│   ├── extract/                 # source -> atoms
│   ├── generate/                # atoms -> items
│   ├── validate/                # anchor + entailment + coverage checks
│   ├── drill/                   # daily loop + Leitner scheduler
│   ├── exam/                    # timed closed-book simulation
│   └── report/                  # coverage + mastery reporting
├── .claude/
│   ├── skills/
│   │   ├── atom-extractor/SKILL.md
│   │   └── item-writer/SKILL.md
│   └── commands/
│       ├── ingest.md
│       └── audit.md
└── package.json
```

---

## 4. Source file format

Every file in `sources/` is markdown with YAML frontmatter. Anchors are stable heading IDs — items point at these, so **never renumber or delete a heading once items reference it.**

```markdown
---
source_id: zybooks-c++-ch03
course: c++
title: "Linked Lists"
kind: zybooks            # zybooks | slides | lab | handout | webassign
citation: "zyBooks, Data Structures Essentials, Ch. 3"
ingested: 2026-07-26
---

## 3.2 Node structure {#s3-2}

A node in a singly linked list contains a data element and a pointer
to the next node in the list. The last node's next pointer is null.

## 3.5 Insertion after a node {#s3-5}

Inserting after node X requires setting the new node's next pointer to
X's next pointer, then setting X's next pointer to the new node. The
order matters: reversing these steps loses the remainder of the list.
```

**Ingestion is manual and that is intentional.** Ethan pastes or exports the section he is currently studying. No scraping, no bulk automation — partly because it keeps sources legitimate, mostly because the act of transcribing the section is itself the first pass of studying it.

---

## 5. Data model

`db/schema.sql`:

```sql
CREATE TABLE topics (
  id            TEXT PRIMARY KEY,     -- 'c++.linked-lists.doubly'
  course        TEXT NOT NULL,
  parent_id     TEXT REFERENCES topics(id),
  title         TEXT NOT NULL,
  exam_weight   REAL DEFAULT 1.0      -- from curriculum.yaml
);

CREATE TABLE atoms (
  id            TEXT PRIMARY KEY,     -- 'a-0001'
  topic_id      TEXT NOT NULL REFERENCES topics(id),
  kind          TEXT NOT NULL,        -- definition|rule|mechanism|complexity
                                      -- |syntax|pitfall|theorem|notation
  claim         TEXT NOT NULL,        -- one atomic fact, <=2 sentences
  source_id     TEXT NOT NULL,
  source_anchor TEXT NOT NULL,        -- '#s3-5'
  excerpt       TEXT NOT NULL,        -- VERBATIM from source, >=1 sentence
  verified      INTEGER DEFAULT 0,    -- human sign-off
  created_at    TEXT NOT NULL
);

CREATE TABLE items (
  id            TEXT PRIMARY KEY,
  atom_id       TEXT NOT NULL REFERENCES atoms(id),
  extra_atoms   TEXT,                 -- JSON array, compare-format only
  format        TEXT NOT NULL,        -- see §6
  prompt        TEXT NOT NULL,
  expected      TEXT NOT NULL,
  criteria      TEXT NOT NULL,        -- JSON array of must-hit points
  difficulty    INTEGER DEFAULT 2,    -- 1-3
  verified      INTEGER DEFAULT 0,
  retired       INTEGER DEFAULT 0
);

CREATE TABLE attempts (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id       TEXT NOT NULL REFERENCES items(id),
  ts            TEXT NOT NULL,
  mode          TEXT NOT NULL,        -- closed|open|exam
  grade         INTEGER NOT NULL,     -- 0 blank, 1 wrong, 2 partial, 3 clean
  seconds       INTEGER NOT NULL,
  note          TEXT
);

CREATE TABLE schedule (
  item_id       TEXT PRIMARY KEY REFERENCES items(id),
  box           INTEGER NOT NULL DEFAULT 1,   -- Leitner 1-5
  due_on        TEXT NOT NULL,
  lapses        INTEGER NOT NULL DEFAULT 0,
  leech         INTEGER NOT NULL DEFAULT 0
);
```

**Atomicity rule for `atoms`:** one fact per row. "A doubly linked list node has `next` and `prev` pointers, and insertion is O(1) given a pointer to the position" is two atoms. If the claim contains "and" joining two independently testable assertions, split it. This is what makes multi-fact drilling per topic possible — three atoms per subtopic yields three angles of attack instead of one bloated question.

---

## 6. Item formats

Generate these quotas per topic. The distribution is the point — it is weighted toward blank-page production because that is what the midterm tested.

| Format | Target share | What it drills |
|---|---|---|
| `recall` | 25% | Cold definition/rule/theorem statement, blank page |
| `write` | 20% | Produce a function or proof from a spec, no IDE, no reference |
| `trace` | 15% | Given code or an algorithm, produce output / final state |
| `error` | 10% | Broken code or invalid proof step — locate it and name the violated rule |
| `cloze` | 10% | One load-bearing token blanked in a skeleton (`->` vs `.`, quantifier order) |
| `compare` | 10% | Two adjacent concepts — state the discriminating difference |
| `complexity` | 5% | Big-O plus the justification, not just the letter |
| `mcq` | **≤5%** | Only where the source itself is genuinely a selection task |

**Format rules:**
- `write` items must specify a time budget in the prompt (e.g. "8 minutes, no compiler").
- `trace` items must have a single unambiguous expected answer.
- `diagram` variant of `write`: prompt asks for a box-and-arrow drawing; `expected` holds an ASCII reference. Self-graded against the reference. Ethan's known weak point is holding pointer state in working memory — these carry double weight in the scheduler.
- `compare` is the only format permitted to reference multiple atoms, via `extra_atoms`.

---

## 7. Validation — `npm run audit`

Must exit non-zero on any of these:

1. **Missing anchor.** Any atom lacking `source_id`, `source_anchor`, or `excerpt`.
2. **Dead anchor.** `source_anchor` does not resolve to a heading in the named source file.
3. **Excerpt drift.** Stored `excerpt` is not a verbatim substring of the current source file. Catches source edits silently invalidating items.
4. **Orphan item.** `atom_id` does not exist.
5. **Novel-token tripwire.** Content words in `expected` that appear in neither the atom's `excerpt` nor its `claim`, excluding a stopword list and a per-course allowlist (`O(n)`, `nullptr`, `∀`, etc.). Prints them for review. This is a *heuristic*, not a proof — it flags candidates for human eyes, and a clean run does not mean the item is correct.
6. **Unverified in rotation.** Any item with `verified = 0` that has a `schedule` row.
7. **Coverage gap.** Any topic with `exam_weight >= 1.0` and fewer than 3 verified atoms.

Report format: grouped by severity, with file:anchor for each finding.

---

## 8. Build phases

Each phase is one branch, one PR, with its own tests. Do not start a phase before the prior one's audit passes clean.

### Phase 1 — Scaffold
`package.json`, `schema.sql`, `curriculum.yaml` loader, DB init, `cs-drill --help`. Seed `curriculum.yaml` with the c++ and Discrete Structures topic trees.
**Done when:** `npm run init` creates a valid DB and `npm run audit` passes on an empty bank.

### Phase 2 — Ingest + pilot
Source parser (frontmatter + anchored sections). Then hand-build 8 atoms and 8 items for one section — `sources/c++/lab03-doubly-linked.md` — entirely by hand, no model generation.
**Done when:** the pilot section round-trips through validation and one item can be drilled end to end. This phase exists to prove the schema before scaling it.

### Phase 3 — Atom extractor skill
`.claude/skills/atom-extractor/SKILL.md`. Reads one source file, emits `atoms/<source_id>.json`. Hard requirements in the skill body: verbatim excerpt required; split conjunctions; never state a fact absent from the section; when the source is ambiguous, emit `"needs_review": true` with the ambiguity described rather than resolving it.
**Done when:** run against the pilot section, the extractor's output overlaps ≥70% with the hand-built atoms, and every discrepancy is explainable.

### Phase 4 — Item writer skill
`.claude/skills/item-writer/SKILL.md`. Atoms → items, honoring §6 quotas. Must emit `criteria` as a checklist so self-grading isn't vibes. conventions: `nullptr`, `using namespace std;`, no `#include <string>`, attached opening brace, `} // main`.
**Done when:** 40+ items across 3 sections, audit clean, quota distribution within 5% of target.

### Phase 5 — Drill loop + scheduler
Leitner 5-box: correct → advance a box, wrong → back to box 1, `lapses++`. Intervals 1/2/4/8/16 days. `lapses >= 3` sets `leech = 1` and pulls the item from rotation for triage.

CLI: `cs-drill today` → due items, one at a time, reference material hidden, per-item timer, free-text answer, then reveal `expected` + `criteria` for self-grade 0–3. Records mode `closed` by default; `--open` is available but tagged and excluded from mastery.
**Done when:** a 20-minute session runs without friction and `attempts` records correctly.

### Phase 6 — Exam simulator
`cs-drill exam --minutes 50 --weight-by exam` — samples across topics by `exam_weight`, mixed formats, no feedback until the end, hard timer, mode `exam`. Ends with a per-topic score report and a comparison to closed-book drill accuracy.
**Done when:** it produces a report Ethan can compare directly against a real exam breakdown.

### Phase 7 — Coverage + mastery reporting
`cs-drill report` → topics × formats grid, verified atom counts, closed-book first-try accuracy per topic, leech list, and a ranked "study these next" list = `exam_weight × (1 − mastery)`.
**Done when:** the report names the three weakest topics and they match Ethan's intuition. If they don't, investigate before trusting it.

### Phase 8 — Optional web dashboard
React + Vite reading the same SQLite via a thin Express layer. Charts only — the drill loop stays in the CLI. React Native after, if it earns its place.

---

## 9. Metrics that matter

Only one number predicts the exam: **closed-book, first-try, timed accuracy per topic.** Everything else is diagnostic.

- Target ≥85% closed-book on every topic with `exam_weight >= 1.0` before an exam.
- Median time-to-answer per format. If `recall` items take over 45 seconds, the atom is too big — split it.
- Leech count. A leech means the *item* or *atom* is broken, not that Ethan is. Rewrite it; don't grind it.
- Open-vs-closed delta per topic. A large gap is the exact failure mode from §0, localized to a topic.

---

## 10. Operating protocol

- **Daily, 20 min:** `cs-drill today`. Closed book. No IDE, no notes, no second monitor.
- **After every lab/HW:** ingest the section that caused friction, extract 3–5 atoms from the specific thing that confused you. Confusion is the highest-signal source of atoms in the system.
- **Weekly:** `cs-drill exam --minutes 40`.
- **Two weeks pre-exam:** daily exam sims at full length, coverage report driving what gets ingested next.
- **Verification pass:** batch-review unverified items weekly. Reading an item against its excerpt is itself a study rep, so this isn't overhead.

---

## 11. Kickoff prompt for Claude Code

```
Read cs-drill-build-spec.md in full before writing any code.

Build Phase 1 only. Do not start Phase 2.

Deliverables:
- package.json (Node 20+, ESM, better-sqlite3, commander,
  @inquirer/prompts, zod)
- db/schema.sql exactly as specified in §5
- curriculum.yaml with topic trees for c++ (pointers, dynamic arrays,
  the Bag class, singly linked lists, doubly linked lists, the Big Three,
  recursion) and Discrete Structures (propositional logic, logical
  equivalence, quantifiers, direct proof, induction), each subtopic
  carrying an exam_weight
- src/cli.js with `init`, `audit`, and `--help`
- src/validate/ implementing all seven checks from §7
- tests for the validator using node:test, including deliberately
  malformed fixtures for each check
- sources/README.md documenting the §4 format
- .gitignore covering sources/, db/*.db

Constraints:
- No atoms or items in this phase. Empty bank, clean audit.
- Do not invent schema fields. If something in the spec is
  underspecified, stop and ask rather than choosing for me.

When done: show me the audit output on an empty DB and the test results.
```

---

## 12. Design decisions worth revisiting later

Flagging these now so they're deliberate choices rather than accidents:

- **Leitner over SM-2.** Simpler, debuggable, adequate for one semester. Revisit only if the box intervals visibly mismatch actual retention.
- **Self-grading.** The alternative is model-graded free text, which reintroduces exactly the generation risk §1 forbids. Self-grading against an explicit `criteria` checklist is honest and fast. Risk: grade inflation on partial answers. Mitigation: the checklist is a checklist — hit 3 of 4 points, that's a 2, not a 3.
- **Manual ingestion.** Slower than automation, and the slowness is doing work.
- **CLI-first.** A web UI makes it trivially easy to peek at another tab. The terminal doesn't.
