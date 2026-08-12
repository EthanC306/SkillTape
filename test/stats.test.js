// server/stats.js — the cross-surface aggregation behind Report's Stats tab
// (ROADMAP.md A11).
//
// The rules under test are the ones that decide whether a number on that tab is
// honest. Three of them are easy to get quietly wrong:
//
//   1. Hard (grade 1) counts as WRONG. Every other accuracy figure in the app
//      already draws the line at `grade >= 2`; if this module drew it anywhere
//      else, the Stats tab and the Overview tab would disagree about the same
//      attempt on the same screen.
//   2. First-try is per (item, SURFACE), not per item. Collapsing surfaces
//      would make whichever one you used second look like it was never touched.
//   3. A pre-surface closed-book row counts under Drill, never as a Legacy
//      column and never dropped (empty Stats was worse than imperfect label).
//
// Unlike most tests here this one imports nothing that touches SQLite —
// server/stats.js is math only, so no isolatedTestDb harness is needed.
import test from "node:test";
import assert from "node:assert/strict";

import {
  SURFACES,
  surfaceOfItemRow,
  isCorrectItemRow,
  isGradedItemRow,
  median,
  aggregate,
  firstTryOnly,
  normalizeItemRows,
  normalizeQuizRows,
  buildCells,
  buildActivity,
  dayKey,
  ACTIVITY_DAYS,
  RECENT_PER_CELL,
} from "../server/stats.js";

// ── surfaceOfItemRow ────────────────────────────────────────────────────────

test("an explicit surface wins", () => {
  assert.equal(surfaceOfItemRow({ surface: "practice", mode: "closed" }), "practice");
  assert.equal(surfaceOfItemRow({ surface: "drill", mode: "closed" }), "drill");
  assert.equal(surfaceOfItemRow({ surface: "exam", mode: "exam" }), "exam");
});

test("no surface + mode exam -> exam (recoverable: only ExamView ever wrote it)", () => {
  assert.equal(surfaceOfItemRow({ surface: null, mode: "exam" }), "exam");
});

test("no surface + mode closed -> drill (recovered, not dropped or Legacy)", () => {
  // DrillView and PracticeView both wrote mode:"closed" before the surface
  // column existed. Stats counts those under Drill so the report stays
  // populated without a fifth Legacy column; Practice only gets explicitly
  // labeled rows.
  assert.equal(surfaceOfItemRow({ surface: null, mode: "closed" }), "drill");
  assert.equal(surfaceOfItemRow({ mode: "closed" }), "drill");
  assert.equal(surfaceOfItemRow({ mode: "open" }), "drill");
});

test("an unrecognized surface string falls back rather than inventing a bucket", () => {
  // A future client sending something this build doesn't know about must not
  // create a fifth column the UI has no label for.
  assert.equal(surfaceOfItemRow({ surface: "kitchen", mode: "closed" }), null);
  assert.equal(surfaceOfItemRow({ surface: "kitchen", mode: "exam" }), "exam");
});

test("every non-null surface it can return is in SURFACES", () => {
  const produced = [
    surfaceOfItemRow({ surface: "drill", mode: "closed" }),
    surfaceOfItemRow({ surface: "practice", mode: "closed" }),
    surfaceOfItemRow({ surface: "exam", mode: "exam" }),
    surfaceOfItemRow({ surface: "quiz", mode: "closed" }),
    surfaceOfItemRow({ surface: null, mode: "closed" }),
  ];
  for (const s of produced) assert.ok(SURFACES.includes(s), `${s} missing from SURFACES`);
});

// ── isCorrectItemRow / isGradedItemRow ──────────────────────────────────────

test("grade 2 and 3 are correct; 0 and 1 are not", () => {
  assert.equal(isCorrectItemRow({ grade: 0 }), false); // Again
  assert.equal(isCorrectItemRow({ grade: 1 }), false); // Hard — deliberately wrong
  assert.equal(isCorrectItemRow({ grade: 2 }), true); // Good
  assert.equal(isCorrectItemRow({ grade: 3 }), true); // Easy
});

test("abandoned and ungraded rows are excluded entirely", () => {
  // Seen, not answered. Scoring these as wrong would punish using the escape
  // hatch, which exists precisely so stopping early is cheap.
  assert.equal(isGradedItemRow({ grade: 3, abandoned: 1 }), false);
  assert.equal(isGradedItemRow({ grade: null, abandoned: 0 }), false);
  assert.equal(isGradedItemRow({ grade: 0, abandoned: 0 }), true);
});

// ── median ──────────────────────────────────────────────────────────────────

test("median: empty is null, odd takes the middle, even averages the pair", () => {
  assert.equal(median([]), null);
  assert.equal(median([5]), 5);
  assert.equal(median([3, 1, 2]), 2);
  assert.equal(median([1, 2, 3, 4]), 2.5);
});

test("median does not mutate its input", () => {
  const input = [3, 1, 2];
  median(input);
  assert.deepEqual(input, [3, 1, 2]);
});

// ── aggregate ───────────────────────────────────────────────────────────────

test("aggregate on nothing is zeroes and nulls, not NaN", () => {
  // The UI divides correct/attempts, so an empty bucket has to come back with a
  // countable zero rather than something that renders as NaN%.
  assert.deepEqual(aggregate([]), { attempts: 0, correct: 0, seconds: [], lastAt: null });
});

test("aggregate counts correct answers and keeps the latest timestamp", () => {
  const out = aggregate([
    { correct: true, seconds: 10, ts: 100 },
    { correct: false, seconds: 20, ts: 300 },
    { correct: true, seconds: 30, ts: 200 },
  ]);
  assert.equal(out.attempts, 3);
  assert.equal(out.correct, 2);
  assert.equal(out.lastAt, 300);
  assert.deepEqual(out.seconds, [10, 20, 30]);
});

test("aggregate ships raw durations, not a precomputed median", () => {
  // The headline covers whatever the dropdowns select, which can be any subset
  // of cells. A median cannot be rebuilt from per-cell medians, so the raw
  // values have to survive to the client. See server/stats.js.
  const out = aggregate([
    { correct: true, seconds: 5, ts: 1 },
    { correct: true, seconds: 45, ts: 2 },
  ]);
  assert.deepEqual(out.seconds, [5, 45]);
  assert.equal(median(out.seconds), 25);
});

test("untimed rows contribute no duration rather than a zero", () => {
  // Quiz has never recorded per-question timing. Counting those as 0s answers
  // would drag every mixed median toward zero and make the app look faster than
  // anyone has ever been.
  const out = aggregate([
    { correct: true, seconds: 10, ts: 1 },
    { correct: true, seconds: null, ts: 2 },
  ]);
  assert.equal(out.attempts, 2);
  assert.deepEqual(out.seconds, [10]);
});

// ── firstTryOnly ────────────────────────────────────────────────────────────

test("firstTryOnly keeps the earliest entry per key", () => {
  const kept = firstTryOnly(
    [
      { key: "a", ts: 1, correct: false },
      { key: "b", ts: 2, correct: true },
      { key: "a", ts: 3, correct: true }, // the retry — must not replace the miss
    ],
    (e) => e.key
  );
  assert.equal(kept.length, 2);
  assert.deepEqual(
    kept.map((e) => [e.key, e.correct]),
    [
      ["a", false],
      ["b", true],
    ]
  );
});

test("firstTryOnly drops entries with no key at all", () => {
  // Imported quiz history has no question identity, so it cannot be deduped.
  // Dropping it here is what /api/stats/summary reports as
  // unattributedQuizAttempts.
  const kept = firstTryOnly([{ key: null, ts: 1 }, { key: null, ts: 2 }, { key: "x", ts: 3 }], (e) => e.key);
  assert.equal(kept.length, 1);
  assert.equal(kept[0].key, "x");
});

// ── normalize ───────────────────────────────────────────────────────────────

test("normalizeItemRows drops abandoned/ungraded and maps the rest", () => {
  const out = normalizeItemRows([
    { topic_id: "t", item_id: "i1", ts: 1, mode: "closed", surface: "drill", grade: 2, seconds: 9, abandoned: 0 },
    { topic_id: "t", item_id: "i2", ts: 2, mode: "closed", surface: "drill", grade: 3, seconds: 4, abandoned: 1 },
    { topic_id: "t", item_id: "i3", ts: 3, mode: "closed", surface: null, grade: null, seconds: 0, abandoned: 0 },
  ]);
  assert.equal(out.length, 1);
  assert.deepEqual(out[0], { topicId: "t", surface: "drill", key: "i1", correct: true, seconds: 9, ts: 1 });
});

test("normalizeItemRows recovers pre-surface closed rows under drill", () => {
  const out = normalizeItemRows([
    { topic_id: "t", item_id: "i1", ts: 1, mode: "closed", surface: null, grade: 2, seconds: 9, abandoned: 0 },
    { topic_id: "t", item_id: "i2", ts: 2, mode: "exam", surface: null, grade: 3, seconds: 4, abandoned: 0 },
  ]);
  assert.equal(out.length, 2);
  assert.equal(out[0].surface, "drill");
  assert.equal(out[0].key, "i1");
  assert.equal(out[1].surface, "exam");
  assert.equal(out[1].key, "i2");
});

test("normalizeQuizRows maps booleans and preserves a null question id", () => {
  const out = normalizeQuizRows([
    { topic_id: "t", question_stable_id: "t-q01", correct: 1, created_at: 50 },
    { topic_id: "t", question_stable_id: null, correct: 0, created_at: 60 },
  ]);
  assert.deepEqual(out[0], { topicId: "t", surface: "quiz", key: "t-q01", correct: true, seconds: null, ts: 50 });
  assert.equal(out[1].key, null);
  assert.equal(out[1].correct, false);
  // Quiz has never recorded per-question timing.
  assert.equal(out[1].seconds, null);
});

// ── buildCells ──────────────────────────────────────────────────────────────

test("buildCells splits one topic across surfaces instead of pooling them", () => {
  const entries = [
    { topicId: "ll", surface: "drill", key: "i1", correct: true, seconds: 5, ts: 1 },
    { topicId: "ll", surface: "practice", key: "i1", correct: false, seconds: 5, ts: 2 },
    { topicId: "ll", surface: "quiz", key: "q1", correct: true, seconds: null, ts: 3 },
  ];
  const cells = buildCells(entries);
  assert.equal(cells.length, 3);
  const bySurface = Object.fromEntries(cells.map((c) => [c.surface, c]));
  assert.equal(bySurface.drill.all.correct, 1);
  assert.equal(bySurface.practice.all.correct, 0);
  assert.equal(bySurface.quiz.all.attempts, 1);
});

test("first-try is per surface: the same item answered on two screens is two first tries", () => {
  // The rule the whole tab hangs on. If the dedupe key ignored surface, the
  // practice row below would vanish and Practice would read as never attempted.
  const cells = buildCells([
    { topicId: "ll", surface: "drill", key: "i1", correct: false, seconds: 5, ts: 1 },
    { topicId: "ll", surface: "practice", key: "i1", correct: true, seconds: 5, ts: 2 },
  ]);
  const bySurface = Object.fromEntries(cells.map((c) => [c.surface, c]));
  assert.equal(bySurface.drill.firstTry.attempts, 1);
  assert.equal(bySurface.drill.firstTry.correct, 0);
  assert.equal(bySurface.practice.firstTry.attempts, 1);
  assert.equal(bySurface.practice.firstTry.correct, 1);
});

test("a retry within one surface counts in all-attempts but not first-try", () => {
  const [cell] = buildCells([
    { topicId: "ll", surface: "drill", key: "i1", correct: false, seconds: 5, ts: 1 },
    { topicId: "ll", surface: "drill", key: "i1", correct: true, seconds: 5, ts: 2 },
  ]);
  assert.deepEqual([cell.all.attempts, cell.all.correct], [2, 1]);
  // First-try remembers the miss — that is the point of the distinction.
  assert.deepEqual([cell.firstTry.attempts, cell.firstTry.correct], [1, 0]);
});

test("unattributed quiz rows count in all-attempts but not first-try", () => {
  const [cell] = buildCells([
    { topicId: "ll", surface: "quiz", key: null, correct: true, seconds: null, ts: 1 },
    { topicId: "ll", surface: "quiz", key: null, correct: false, seconds: null, ts: 2 },
  ]);
  assert.equal(cell.all.attempts, 2);
  assert.equal(cell.firstTry.attempts, 0);
});

test("cells carry a recent run capped at RECENT_PER_CELL, oldest first", () => {
  const entries = [];
  for (let i = 0; i < RECENT_PER_CELL + 5; i++) {
    entries.push({ topicId: "ll", surface: "drill", key: `i${i}`, correct: i % 2 === 0, seconds: 1, ts: i });
  }
  const [cell] = buildCells(entries);
  assert.equal(cell.recent.length, RECENT_PER_CELL);
  // The tail, not the head: "how has this been going lately".
  assert.equal(cell.recent.at(-1), entries.at(-1).correct);
  assert.equal(cell.recent[0], entries.at(-RECENT_PER_CELL).correct);
});

test("buildCells emits nothing for a bank with no history", () => {
  assert.deepEqual(buildCells([]), []);
});

// ── activity ────────────────────────────────────────────────────────────────

test("dayKey shifts by the client's offset, not the server's", () => {
  // 2026-08-11T02:00:00Z is still 2026-08-10 in a UTC-5 zone (offset 300).
  const ts = Date.UTC(2026, 7, 11, 2, 0, 0);
  assert.equal(dayKey(ts, 0), "2026-08-11");
  assert.equal(dayKey(ts, 300), "2026-08-10");
});

test("buildActivity buckets by day and surface, and drops anything past the window", () => {
  const now = Date.UTC(2026, 7, 11, 12, 0, 0);
  const day = 24 * 60 * 60 * 1000;
  const rows = buildActivity(
    [
      { topicId: "ll", surface: "drill", correct: true, ts: now - day },
      { topicId: "ll", surface: "drill", correct: false, ts: now - day },
      { topicId: "ll", surface: "quiz", correct: true, ts: now - day },
      { topicId: "ll", surface: "drill", correct: true, ts: now - (ACTIVITY_DAYS + 3) * day }, // too old
    ],
    now,
    0
  );
  assert.equal(rows.length, 2);
  const drill = rows.find((r) => r.surface === "drill");
  assert.deepEqual([drill.attempts, drill.correct], [2, 1]);
  assert.equal(rows.find((r) => r.surface === "quiz").attempts, 1);
});

test("buildActivity keys by topic too, so the strip can honour the topic filter", () => {
  // Without a topicId on the row the strip would report course-wide activity
  // beneath a panel scoped to one topic.
  const now = Date.UTC(2026, 7, 11, 12, 0, 0);
  const rows = buildActivity(
    [
      { topicId: "ll", surface: "drill", correct: true, ts: now - 1000 },
      { topicId: "stacks", surface: "drill", correct: false, ts: now - 1000 },
    ],
    now,
    0
  );
  assert.equal(rows.length, 2);
  assert.deepEqual(
    rows.map((r) => r.topicId).sort(),
    ["ll", "stacks"]
  );
});

test("buildActivity omits empty days rather than zero-filling them", () => {
  // The client draws a fixed 30-slot strip and fills the gaps itself, so
  // shipping zeroes here would only make the response bigger.
  assert.deepEqual(buildActivity([], Date.now(), 0), []);
});
