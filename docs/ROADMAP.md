# SkillTape — Roadmap

Everything through A11 shipped between 2026-08-01 and 2026-08-11: the item
schema, `sources/`, drill mode, FSRS scheduling, the exam simulator, reporting,
and cross-surface stats. That work is done and no longer tracked here. Read the
git history if you need the reasoning behind any of it.

What follows is only what is still open.

---

## 1. Content — the real bottleneck

The app is finished enough that the limit is now items, not features.

Current bank: **433 live items, 327 verified for rotation, 699 audit errors.**

### Topics with no items

| Course | Topic | Weight | Blocked on |
| --- | --- | --- | --- |
| cpp | `bigo` | 1.0 | no source material |
| cpp | `cstrings` | 1.0 | no source material |
| cpp | `containers` | 1.0 | no source material |
| discrete | all 10 topics | unset | no source material (only images in `sources/epp/`) |
| spring | `spring-vocabulary` | unset | no source material |

Nothing was fabricated for these, which is correct under standing rule 1. Each
one unblocks the moment you supply lecture material for it. The C++ three are
the highest value, since they carry real exam weight.

### The 699 audit errors

These are legacy `questions`-format content that predates `itemSchema.js`. They
are not a regression — per CORR §5.4 the failure *is* the work queue. The 17
`cpp` topics with items are clean; the errors live in the un-migrated remainder.

Decide whether you care. If the legacy quiz content is still useful as-is, the
errors are noise and the audit should allowlist it. If you want it in rotation,
it needs migrating.

### Calibration

`examWeight` is set on all 17 `cpp` topics but was never point-derived — no
graded midterm was available, so it came from a 2-of-9 diagnostic plus
self-report. `discrete` and `spring` have none at all. Revisit with real exam
numbers whenever any exist.

---

## 2. Known gaps in shipped features

- **Master Set records nothing.** `MasterQuizView` passes `onFinish={() => {}}`.
  Open question underneath it: what `topic_id` does a mixed-topic run belong to?
- **Quiz history is invisible in first-try mode.** Every quiz row currently in
  the database predates stable question ids. New answers carry ids and will fill
  in on their own.
- **Leech handoff is 1 of 3.** "Copy for tutor" and "reset scheduling state"
  work. "Rewrite the item" and "split the fact" need a content editor that
  doesn't exist — currently a direct file edit.
- **Quiz answers don't feed FSRS.** Deliberate: legacy `questions` aren't
  `items`, and the `<topic>-mcq-NN` twins aren't a guaranteed-stable mapping.
- **No progress or streak tracking.** Each wants its own plan.

---

## 3. Open decisions

| # | Question | Recommendation |
| --- | --- | --- |
| D3 | React Native? | **Skip.** A phone is the worst device for closed-book recall. Reconsider only as a read-only client. |
| D4 | SessionStart nudge | **Drop the hook.** The JSON export already shipped covers the useful half. |
| D7 | "Topic" or "module"? | Harmless today, schema-wide rename later. Decide before writing any migration. |
| D9 | Platform questions | Supabase vs. alternative · auth model · demo mode · hosted API vs. Ollama · where the backend lives. All gate the platform track and nothing else. |

---

## 4. Platform track (multi-user)

Parked. Track A was chosen first and Track A is essentially done, so this is
now genuinely available if you want it — but it is a different project
(accounts, hosting, migrations, a security gate) rather than a continuation of
this one. Nothing forces the choice.

---

## 5. Standing rules

These constrain any future work regardless of what you pick up.

1. **Verifiability over authorship.** Every fact and expected answer must be entailed by a stored verbatim excerpt, carry a resolvable pointer back to it, and pass human sign-off before entering rotation. Model-generated items are legal; unverified items are not.
2. **Automated validation catches structure; humans catch semantics.** A clean `audit:bank` proves shape, never correctness.
3. **Production over recognition.** Selection questions get paired with an open-ended version of the same question; production formats keep the bulk of every topic.
4. **Closed-book by default.** Only closed-book first-try accuracy counts toward mastery.
5. **Timed pressure is a first-class feature**, not an add-on.
6. **Atomicity.** One fact per item. Split anything joining two testable assertions with "and."
7. **Manual ingestion, deliberately.** Transcribing the section is the first pass of studying it.
8. **Sources stay private.** `sources/` is gitignored. Never commit source text to a public remote.
9. **Keep the repos separate.** What transfers is the shape, not the code.

---

## 6. Operating protocol

The habit the whole system exists to support:

- **Daily, 20 min:** drill. Closed book. No IDE, no notes, no second monitor.
- **After every lab/HW:** ingest the section that caused friction; extract 3–5 items from the specific thing that confused you. Confusion is the highest-signal source of items.
- **Weekly:** a 40-minute exam sim, and a batch review of unverified items. Reading an item against its excerpt is itself a study rep.
- **Two weeks pre-exam:** daily full-length sims, with the coverage report driving what gets ingested next.
