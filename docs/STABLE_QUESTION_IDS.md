# Stable question ids make MCQ results identifiable across reseeds

*Status: **done**, 2026-08-10. Written 2026-08-09.*

*Implemented as specified. Two deviations, both noted inline below: `questions.stable_id`
gets its UNIQUE constraint from a separate index rather than the column declaration (SQLite's
`ALTER TABLE` cannot add a UNIQUE column, so an existing database could not otherwise get it),
and `--reset` prunes rather than wipes (§3). The one-off codemod ran and was deleted; the
regression test in "Verification" below lives on as [test/seedStability.test.js](../test/seedStability.test.js).*

## Context

**The goal.** Be able to look at the quiz history and say *which specific MCQs* were answered
correctly and which were missed — so questions that were gotten right can be rewritten harder,
while the ones missed are left intact for another attempt.

**Why it doesn't work today.** The plumbing is all there and correct:
[QuizView.jsx:48](../src/components/QuizView.jsx#L48) sends `{ questionId: q.id ?? null, correct }`,
[useProgress.js:119](../src/hooks/useProgress.js#L119) forwards it,
[progress.js](../server/routes/progress.js) validates and inserts it, and
[topics.js:88](../server/routes/topics.js#L88) exposes the real row id to the frontend.
Yet all 38 rows in `attempts` have `question_id IS NULL`.

Two causes:

1. Three of the four existing runs came from the one-time localStorage importer
   ([useProgress.js:61](../src/hooks/useProgress.js#L61)), which sends `null` by design.
   Nothing to fix — that history genuinely has no ids.
2. **The real bug:** `questions.id` is `INTEGER AUTOINCREMENT`, and
   [seed.js:46,165](../server/seed.js#L46) does `DELETE FROM questions WHERE topic_id = ?`
   then re-inserts. `attempts.question_id` is declared `ON DELETE SET NULL`
   ([schema.sql:118](../server/schema.sql#L118)). **Every `npm run db:seed` silently erases the
   question id on every past attempt.** With near-daily content edits, no MCQ history can ever
   survive.

**This is a solved problem in this codebase.** `items` hit the identical bug and was fixed —
see the long comment at [seed.js:71-87](../server/seed.js#L71-L87) ("a plain reseed used to destroy
all FSRS scheduling, the entire attempt log... Editing one prompt cost you your whole study
history"). The fix was a stable authored TEXT id plus UPSERT-and-prune instead of
delete-and-reinsert. This plan applies that exact pattern to `questions`.

**Scope decision.** This is the tactical track, deliberately chosen over finishing the
`items[]` migration (13 of 26 topics done; all 9 `discrete` topics have zero items). It fixes all
26 topics at once, leaves `QuizView` untouched, and does not block the migration later.

## Design

**Stable id format:** `<topic-id>-q<NN>`, e.g. `bigo-q03`, `discrete-1-4-graphs-q11` — mirroring the
existing item convention (`doubly-linked-lists-02`).

**Authored, not derived.** The id lives in the topic module file next to the question, exactly as
`items[].id` does. A derived-from-position id would be free but would silently reassign every id
below any question inserted mid-deck — which is precisely what the "rewrite them harder" workflow
will do constantly. Authoring it is the whole point.

**Revisions.** Questions keep their id forever; a `revision` integer bumps when the graded content
changes. Each attempt records the revision it was answered at, so a correct answer from before a
rewrite is distinguishable from one after it, and a question's full lineage stays visible under one id.

Revision is **computed at seed time, not hand-maintained**: hash the graded fields
(`prompt`, `code`, `choices`, `answer`), compare to the stored hash, and bump only on change.
Hand-maintaining a counter across 303 questions would be forgotten immediately. `explanation`, `tag`
and `figure` are excluded — cosmetic edits shouldn't invalidate history.

## Changes

### 1. Schema — [server/schema.sql](../server/schema.sql)

`questions`: add `stable_id TEXT UNIQUE`, `revision INTEGER NOT NULL DEFAULT 1`,
`content_hash TEXT`.

*As built:* the column is declared plain `stable_id TEXT` and the constraint arrives as a separate
`CREATE UNIQUE INDEX` in [db.js](../server/db.js). SQLite's `ALTER TABLE` refuses to add a UNIQUE
column, so an already-existing database could not get it any other way; declaring it inline in
`schema.sql` would have left new and old installs structurally different. A unique index satisfies
both things that need one — the FK from `attempts` and the `ON CONFLICT(stable_id)` upsert target.

`attempts`: add `question_stable_id TEXT REFERENCES questions(stable_id) ON DELETE SET NULL` and
`question_revision INTEGER`. Index on `(question_stable_id, created_at)`.

Keep the integer `questions.id` as the internal PK — `choices.question_id` points at it and there's
no reason to churn that. Leave the old `attempts.question_id` column in place; it's NULL on every
existing row and dropping a column in SQLite means a table rebuild for zero benefit.

Note the schema file is run on every boot as create-or-noop, so these are `ALTER TABLE` statements
guarded to be idempotent (see how [db.js](../server/db.js) applies the file).

### 2. Author the ids — one-off codemod over `src/data/topics/**/*.js`

303 questions across 26 topic modules. A throwaway script under `scripts/` walks each module,
assigns `id: "<topic-id>-q<NN>"` by current position, and writes it back into the source file. Then
delete the script — this runs exactly once, and thereafter ids are authored by hand like item ids.

Document the field in [docs/AUTHORING.md](AUTHORING.md) alongside the existing §2.1 "this id is
stable forever" language, which already exists for `topics.id` and says exactly the right thing.

### 3. Seeding — [server/seed.js](../server/seed.js)

The load-bearing change. Follow `upsertItem` / `deleteMissingItems`
([seed.js:88-128](../server/seed.js#L88-L128)) line for line:

- Replace `clearQuestions` with `upsertQuestion` using `ON CONFLICT(stable_id) DO UPDATE`.
- Compute `content_hash` over the graded fields; bump `revision` only when it differs from the
  stored hash.
- Add `deleteMissingQuestions(topicId, keepIds)` mirroring `deleteMissingItems` — a question deleted
  from a topic module should genuinely disappear.
- Choices still get replaced wholesale per question (`DELETE FROM choices WHERE question_id = ?`
  then re-insert). Nothing references a choice row, so that stays safe.
- Extend the `-- NOT clearQuestions` comment the way [seed.js:168](../server/seed.js#L168)
  documents the items case, so nobody reintroduces the delete.
- **`--reset` must be updated too** — [seed.js:144](../server/seed.js#L144) wipes `questions`
  wholesale and would reintroduce the exact bug on any reset run.

  *As built:* it turned out worse than the plan assumed. `--reset` also ran `DELETE FROM topics`,
  and `attempts.topic_id` and `items.topic_id` are both `ON DELETE CASCADE` — so a reset already
  destroyed the entire attempt log, every FSRS schedule and every suspension, not just the question
  ids. It now **prunes**: rows whose ids are no longer in the curriculum are deleted (correctly —
  that history describes content that no longer exists), everything still authored keeps its
  identity. Net content state after a reset is byte-identical to a fresh seed, which is what
  Verification §3 asks for. To truly start from nothing, delete `db/skilltape.db`.

### 4. API — [server/routes/topics.js](../server/routes/topics.js) and [server/routes/progress.js](../server/routes/progress.js)

- `topics.js`: expose `stableId` and `revision` on each served question alongside the existing `id`.
- `progress.js`: accept `{ questionStableId, questionRevision, correct }` in the POST body, validated
  with the existing `requiredString` / `BadRequest` helpers already in that file. Keep accepting the
  old `questionId` shape so the localStorage importer path keeps working.
- Add `GET /api/questions/stats` (or extend `/api/progress`) returning per-question
  `{ stableId, revision, attempts, correct, lastAnsweredAt }` — **this endpoint is the actual
  deliverable**, the thing that answers "which ones did I get right." Aggregate in SQL, the way the
  existing `/api/progress` handler does rather than looping in JS.

### 5. Client — [src/components/QuizView.jsx](../src/components/QuizView.jsx) and [src/hooks/useProgress.js](../src/hooks/useProgress.js)

Minimal. `QuizView.next()` carries `stableId` and `revision` into `runResults`; `recordRun` puts them
in the POST body. The existing `?? null` fallbacks stay — the schema is nullable for exactly the
legacy case.

Do **not** change the `{ best, total, runs, history }` shape `/api/progress` returns. `Home.jsx`,
`HistoryModal.jsx` and `TopicView.jsx` all read it and should not need touching.

## Verification

1. `npm test` — existing suite green, especially anything under [test/](../test) touching seed or
   progress.
2. **The regression test that matters** — the whole point of the change:
   - `npm run db:seed`
   - Take a quiz in the app; confirm via `node -e` against `db/skilltape.db` that
     `attempts.question_stable_id` is populated (not NULL) and revision is recorded.
   - Edit a question's prompt in its topic module, `npm run db:seed` again.
   - Re-query: **the attempt rows still carry their `question_stable_id`**, and the edited question's
     `revision` incremented from 1 to 2 while every untouched question stayed at 1.
   - This is the exact sequence that destroys history today.
3. `npm run db:seed -- --reset` then reseed — confirm ids are reassigned identically (they're
   authored, so they must be byte-identical across a reset).
4. `GET /api/questions/stats` returns a correct/incorrect breakdown per question id, cross-checked
   by hand against the quiz just taken.
5. `node scripts/auditBank.js` — confirm the new fields don't trip the bank audit.

## Follow-on (not this plan)

Once ids are stable, the workflow this exists to serve: query `/api/questions/stats` for everything
answered correctly, rewrite those harder in the topic modules (revision auto-bumps), leave the missed
ones untouched, reseed. History survives, and the before/after of each rewrite stays visible.
