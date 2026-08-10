// plans/fsrs_ui.md Phase 2's verification step: drive the scheduler
// module from a fixed clock and assert the properties the UI is about to make
// claims about on screen.
//
// No database. server/fsrs.js is deliberately math-only, so every function
// below is called with a plain row object — which is also the point of the
// split: if these tests needed a DB, the boundary would be in the wrong place.
import test from "node:test";
import assert from "node:assert/strict";
import {
  previewRatings,
  scheduleReview,
  getRetrievability,
  forgettingCurve,
  recomputeDue,
  normalizeSettings,
  isDuplicateReview,
  dueBoundary,
  startOfDay,
  stateName,
  deriveGrade,
  DEFAULT_SETTINGS,
  PARAMS_VERSION,
  State,
} from "../server/fsrs.js";
import { FORMATS } from "../src/data/itemSchema.js";

const T0 = new Date("2026-08-10T12:00:00Z");
const FORMAT = FORMATS.RECALL;

/** Persist-and-reload, the way routes/drill.js does — outcome -> the next call's row. */
function rowFrom(outcome, grade) {
  return {
    state: outcome.state,
    stability: outcome.stability,
    difficulty: outcome.difficulty,
    due_on: outcome.dueOn,
    reps: outcome.reps,
    lapses: outcome.lapses,
    elapsed_days: outcome.elapsedDays,
    scheduled_days: outcome.scheduledDays,
    learning_steps: outcome.learningSteps,
    last_reviewed_at: outcome.lastReviewedAt,
    last_grade: grade,
  };
}

/** Review an item `grades` times in order, each time on its own due date. */
function drill(grades, settings = DEFAULT_SETTINGS) {
  let row = null;
  let at = T0;
  const history = [];
  for (const grade of grades) {
    const outcome = scheduleReview(row, FORMAT, grade, at, settings);
    history.push(outcome);
    row = rowFrom(outcome, grade);
    at = new Date(outcome.dueOn);
  }
  return { row, history };
}

test("four Good ratings produce a strictly increasing interval sequence", () => {
  const { history } = drill([2, 2, 2, 2]);
  const intervals = history.map((h) => h.intervalMinutes);
  for (let i = 1; i < intervals.length; i++) {
    assert.ok(
      intervals[i] > intervals[i - 1],
      `interval ${i} (${intervals[i]}) should exceed interval ${i - 1} (${intervals[i - 1]})`
    );
  }
});

test("stability compounds once a card is out of its learning steps", () => {
  // Not asserted across the whole run on purpose. The first two Goods walk the
  // 1m/10m learning steps and graduate the card on identical stability — the
  // short-term steps move the DUE DATE without claiming the memory got any
  // stronger. Compounding is a property of the review state, and asserting it
  // from rep 1 would be asserting something FSRS does not do.
  const { history } = drill([2, 2, 2, 2, 2]);
  const reviews = history.filter((h) => h.stateName === "review");
  assert.ok(reviews.length >= 3, "expected the card to graduate within five Goods");
  for (let i = 1; i < reviews.length; i++) {
    assert.ok(
      reviews[i].stability > reviews[i - 1].stability,
      `stability must grow at review ${i} (${reviews[i - 1].stability} -> ${reviews[i].stability})`
    );
  }
});

test("a lapse reduces stability and increments lapses", () => {
  const { row: strong } = drill([2, 2, 2]);
  assert.equal(strong.lapses, 0);

  const lapsed = scheduleReview(strong, FORMAT, 0, new Date(strong.due_on), DEFAULT_SETTINGS);
  assert.equal(lapsed.lapses, 1, "an Again must count as a lapse");
  assert.ok(
    lapsed.stability < strong.stability,
    `stability must fall on a lapse (${strong.stability} -> ${lapsed.stability})`
  );
  assert.equal(lapsed.stateName, "relearning");
});

test("difficulty does not fully recover after a lapse, so later intervals stay shorter", () => {
  // The claim the sandbox copy makes out loud: "one lapse costs you for a long
  // time". Two identical histories, one with a single Again in the middle.
  const clean = drill([2, 2, 2, 2, 2]);
  const lapsed = drill([2, 2, 0, 2, 2]);
  assert.ok(
    lapsed.row.difficulty > clean.row.difficulty,
    "the lapsed card must remain the more difficult of the two"
  );
  assert.ok(
    lapsed.row.stability < clean.row.stability,
    "and must still be behind on stability several reviews later"
  );
});

test("lapses >= 3 flags a leech", () => {
  // A lapse is the review -> relearning TRANSITION, not every Again: pressing
  // Again four times in a row on an already-relearning card is one lapse, and a
  // leech has to be earned by forgetting the item on three separate occasions.
  const { history } = drill([2, 2, 2, /* lapse, recover */ 0, 2, 0, 2, 0]);
  const lapseCounts = history.map((h) => h.lapses);
  assert.deepEqual(lapseCounts, [0, 0, 0, 1, 1, 2, 2, 3]);

  const last = history.at(-1);
  assert.equal(last.leech, true, "three lapses is the A8 leech trigger");
  assert.ok(history.slice(0, -1).every((h) => !h.leech), "and nothing before it trips the flag");
});

test("repeated Agains on a relearning card count as one lapse", () => {
  const { row } = drill([2, 2, 2]);
  let current = row;
  const seen = [];
  for (let i = 0; i < 4; i++) {
    const outcome = scheduleReview(current, FORMAT, 0, new Date(current.due_on), DEFAULT_SETTINGS);
    seen.push(outcome.lapses);
    current = rowFrom(outcome, 0);
  }
  assert.deepEqual(seen, [1, 1, 1, 1], "failing the same relearning card again is not a new lapse");
});

test("lowering desired retention lengthens the interval for the same card state", () => {
  const { row } = drill([2, 2, 2]);
  const at = new Date(row.due_on);
  const strict = scheduleReview(row, FORMAT, 2, at, { ...DEFAULT_SETTINGS, requestRetention: 0.95 });
  const loose = scheduleReview(row, FORMAT, 2, at, { ...DEFAULT_SETTINGS, requestRetention: 0.8 });

  assert.ok(
    loose.intervalMinutes > strict.intervalMinutes,
    `0.80 retention must schedule further out than 0.95 (${loose.intervalMinutes} vs ${strict.intervalMinutes})`
  );
  // Retention changes the interval derived from a stability, never the
  // stability itself — the distinction Phase 6's recompute depends on.
  assert.equal(strict.stability, loose.stability);
});

test("previewRatings agrees exactly with what scheduleReview then does", () => {
  // The whole grade bar rests on this: the interval printed under a button has
  // to be the interval you get for pressing it, fuzz included.
  for (const enableFuzz of [false, true]) {
    const settings = { ...DEFAULT_SETTINGS, enableFuzz };
    for (const history of [[], [2], [2, 2, 2], [2, 0, 2]]) {
      const { row } = history.length ? drill(history, settings) : { row: null };
      const at = row ? new Date(row.due_on) : T0;
      const preview = previewRatings(row, FORMAT, at, settings);
      for (const [grade, label] of [
        [0, "again"],
        [1, "hard"],
        [2, "good"],
        [3, "easy"],
      ]) {
        const applied = scheduleReview(row, FORMAT, grade, at, settings);
        assert.equal(
          preview[label].dueOn,
          applied.dueOn,
          `fuzz=${enableFuzz} history=[${history}] ${label}: preview due != applied due`
        );
        assert.equal(preview[label].stability, applied.stability, `${label}: stability`);
      }
    }
  }
});

test("previewRatings orders the four outcomes Again < Hard < Good < Easy", () => {
  const { row } = drill([2, 2, 2]);
  const p = previewRatings(row, FORMAT, new Date(row.due_on), DEFAULT_SETTINGS);
  assert.ok(p.again.intervalMinutes < p.hard.intervalMinutes);
  assert.ok(p.hard.intervalMinutes < p.good.intervalMinutes);
  assert.ok(p.good.intervalMinutes < p.easy.intervalMinutes);
});

test("a never-reviewed item previews without a row and reports no retrievability", () => {
  const p = previewRatings(null, FORMAT, T0, DEFAULT_SETTINGS);
  assert.equal(p.good.reps, 1, "the preview is of the state AFTER the review");
  assert.ok(p.easy.intervalMinutes > p.again.intervalMinutes);

  // Null, never 0: "never seen" and "certainly forgotten" must not render the same.
  assert.equal(getRetrievability(null, T0, DEFAULT_SETTINGS), null);
  assert.equal(forgettingCurve(null, T0, {}, DEFAULT_SETTINGS), null);
});

test("retrievability decays from 1 at the last review and is near target on the due date", () => {
  const { row } = drill([2, 2, 2]);
  const atReview = getRetrievability(row, new Date(row.last_reviewed_at), DEFAULT_SETTINGS);
  const atDue = getRetrievability(row, new Date(row.due_on), DEFAULT_SETTINGS);
  const later = getRetrievability(row, new Date(row.due_on + 30 * 86400000), DEFAULT_SETTINGS);

  assert.ok(atReview > 0.99, `recall right after reviewing should be ~1, got ${atReview}`);
  assert.ok(atDue < atReview, "recall must decay between the review and the due date");
  assert.ok(later < atDue, "and keep decaying past it");
  assert.ok(
    Math.abs(atDue - DEFAULT_SETTINGS.requestRetention) < 0.06,
    `due date should land near the 0.9 target, got ${atDue}`
  );
});

test("the forgetting curve is monotonically decreasing and spans the due date", () => {
  const { row } = drill([2, 2, 2]);
  const curve = forgettingCurve(row, new Date(row.due_on), {}, DEFAULT_SETTINGS);
  assert.ok(curve.points.length > 2);
  for (let i = 1; i < curve.points.length; i++) {
    assert.ok(
      curve.points[i].retrievability <= curve.points[i - 1].retrievability,
      `curve must not rise at sample ${i}`
    );
  }
  const dueOffsetDays = (row.due_on - row.last_reviewed_at) / 86400000;
  assert.ok(curve.horizonDays > dueOffsetDays, "the horizon must extend past the due date");
});

test("recomputeDue re-derives the due date from retention without touching stability", () => {
  const { row } = drill([2, 2, 2]);
  const original = row.due_on;

  const looser = recomputeDue(row, { ...DEFAULT_SETTINGS, requestRetention: 0.8 });
  const stricter = recomputeDue(row, { ...DEFAULT_SETTINGS, requestRetention: 0.95 });

  assert.ok(looser > original, "0.80 retention must push the due date later");
  assert.ok(stricter < original, "0.95 retention must pull it in");
  // It reads the row and returns a number; it must never mutate what it was given.
  assert.equal(row.due_on, original);
  assert.equal(row.stability, drill([2, 2, 2]).row.stability);
});

test("recomputeDue declines to touch cards that have no stability-derived interval", () => {
  assert.equal(recomputeDue(null, DEFAULT_SETTINGS), null);
  // A card mid-way through its learning steps is on a fixed 1m/10m schedule,
  // not one derived from stability — re-deriving it would invent an interval.
  const { row } = drill([2]);
  assert.equal(row.state, State.Learning);
  assert.equal(recomputeDue(row, DEFAULT_SETTINGS), null);
});

test("the double-submit guard catches a repeated grade and nothing else", () => {
  const { row } = drill([2, 2]);
  const justNow = new Date(row.last_reviewed_at + 500);

  assert.equal(isDuplicateReview(row, 2, justNow), true, "same grade, same instant");
  assert.equal(isDuplicateReview(row, 0, justNow), false, "a DIFFERENT grade is a real review");
  assert.equal(
    isDuplicateReview(row, 2, new Date(row.last_reviewed_at + 60_000)),
    false,
    "a minute later is a real review, not a double click"
  );
  assert.equal(isDuplicateReview(null, 2, justNow), false, "a never-reviewed item can't be a duplicate");
});

test("day boundaries are computed in the caller's timezone, not the server's", () => {
  // 2026-08-10T02:30Z is still 2026-08-09 in UTC-5, and already 2026-08-10 in UTC.
  const at = new Date("2026-08-10T02:30:00Z");
  const utc = dueBoundary(at, 0);
  const utcMinus5 = dueBoundary(at, 300);

  assert.equal(new Date(utc).toISOString(), "2026-08-10T23:59:59.999Z");
  assert.equal(new Date(utcMinus5).toISOString(), "2026-08-10T04:59:59.999Z");
  assert.ok(utcMinus5 < utc, "the UTC-5 day ends first, in absolute terms, at this instant");

  assert.ok(startOfDay(at, 0) <= at.getTime() && at.getTime() <= utc);
  assert.ok(startOfDay(at, 300) <= at.getTime() && at.getTime() <= utcMinus5);
  assert.ok(dueBoundary(at, 300) - startOfDay(at, 300) === 86400000 - 1, "a local day is a day long");
});

test("settings are clamped into range rather than trusted", () => {
  assert.equal(normalizeSettings({ requestRetention: 0.5 }).requestRetention, 0.7);
  assert.equal(normalizeSettings({ requestRetention: 1.5 }).requestRetention, 0.97);
  assert.equal(normalizeSettings({ maximumInterval: -3 }).maximumInterval, 1);
  assert.equal(normalizeSettings({ dailyNewLimit: -1 }).dailyNewLimit, 0);
  assert.deepEqual(normalizeSettings(undefined), DEFAULT_SETTINGS);
  assert.deepEqual(normalizeSettings({}), DEFAULT_SETTINGS);
  // Accepts the snake_case DB row shape as readily as the camelCase API one.
  assert.equal(normalizeSettings({ request_retention: 0.85 }).requestRetention, 0.85);
  assert.equal(normalizeSettings({ enable_fuzz: 0 }).enableFuzz, false);
  // A garbage value falls back to the default instead of poisoning the scheduler.
  assert.equal(normalizeSettings({ requestRetention: "nonsense" }).requestRetention, 0.9);
});

test("every review carries the state the scheduler saw, and the params that produced it", () => {
  const first = scheduleReview(null, FORMAT, 2, T0, DEFAULT_SETTINGS);
  assert.equal(first.before.state, State.New);
  assert.equal(first.before.stability, null, "a first review has no prior stability to record");
  assert.equal(first.before.difficulty, null);
  assert.equal(first.paramsVersion, PARAMS_VERSION);

  const row = rowFrom(first, 2);
  const second = scheduleReview(row, FORMAT, 2, new Date(row.due_on), DEFAULT_SETTINGS);
  assert.equal(second.before.stability, first.stability, "the second review saw the first's output");
  assert.equal(second.before.difficulty, first.difficulty);
  assert.ok(second.before.elapsedDays >= 0);
});

test("diagram items are seeded with lower stability on their first review only", () => {
  const plain = scheduleReview(null, FORMATS.RECALL, 2, T0, DEFAULT_SETTINGS);
  const diagram = scheduleReview(null, FORMATS.DIAGRAM, 2, T0, DEFAULT_SETTINGS);
  assert.ok(diagram.stability < plain.stability, "D8 seeds diagrams lower");

  // Second review: FSRS's own history-derived stability stands on its own.
  const row = rowFrom(diagram, 2);
  const again = scheduleReview(row, FORMATS.DIAGRAM, 2, new Date(row.due_on), DEFAULT_SETTINGS);
  const control = scheduleReview(row, FORMATS.RECALL, 2, new Date(row.due_on), DEFAULT_SETTINGS);
  assert.equal(again.stability, control.stability, "the seeding must not reapply on later reviews");
});

test("deriveGrade is a two-way split with one measured middle", () => {
  assert.equal(deriveGrade({ correct: true }), 2);
  assert.equal(deriveGrade({ correct: false }), 0);
  assert.equal(deriveGrade({ correct: false, partial: true }), 1);
  // Correct wins outright — a partly-met rubric on a correct answer is still correct.
  assert.equal(deriveGrade({ correct: true, partial: true }), 2);
});

test("stateName maps every ts-fsrs State to the lowercase name the UI renders", () => {
  assert.equal(stateName(State.New), "new");
  assert.equal(stateName(State.Learning), "learning");
  assert.equal(stateName(State.Review), "review");
  assert.equal(stateName(State.Relearning), "relearning");
});
