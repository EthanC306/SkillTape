// FSRS scheduling (ROADMAP.md A4, D10). The one module that imports ts-fsrs.
// Everything else deals in plain numbers and epoch-ms: no route, query, or
// component computes an interval itself.
//
// Math only, no SQL. routes/drill.js owns persistence. Keeping them apart is
// what lets test/scheduler.test.js drive every function below from a fixed
// clock with no database at all.
//
// D10: ship with ts-fsrs's default weights. Do NOT run its optimizer this
// semester, it wants ~1,000+ graded reviews to fit reliably and one student
// does not generate that in one term. PARAMS_VERSION is what will keep the two
// eras of logs apart when that day comes.
import {
  fsrs,
  createEmptyCard,
  generatorParameters,
  forgetting_curve,
  Rating,
  State,
  FSRSVersion,
} from "ts-fsrs";
import { FORMATS } from "../src/data/itemSchema.js";
import { GRADES, GRADE_LABELS, deriveGrade } from "../src/data/grading.js";

export { GRADES, GRADE_LABELS, deriveGrade };

/**
 * Stamped onto every review log row. Bump it whenever the weight vector
 * changes, so a later optimizer run can filter out reviews its own fitted
 * weights produced.
 *
 * Desired retention is deliberately not part of it. Retention changes the
 * interval derived from a stability, never the stability itself, so logs
 * across different retention settings are still one comparable population.
 */
export const PARAMS_VERSION = `${FSRSVersion}/default-w`;

export const DEFAULT_SETTINGS = {
  requestRetention: 0.9,
  maximumInterval: 36500,
  dailyNewLimit: 10,
  enableFuzz: true,
};

// Below ~0.70 the intervals get long enough that the forgetting curve is
// mostly guesswork; above ~0.97 they collapse toward daily.
export const RETENTION_MIN = 0.7;
export const RETENTION_MAX = 0.97;

/** Two identical grades this close together are one double-click, not two reviews. */
export const DOUBLE_SUBMIT_WINDOW_MS = 2000;

function clamp(n, lo, hi) {
  return Math.min(hi, Math.max(lo, n));
}

/**
 * Coerce anything (a settings row, a request body, undefined) into a complete
 * in-range settings object, so nothing downstream has to re-validate.
 * Accepts the snake_case DB row shape and the camelCase API shape alike.
 */
export function normalizeSettings(raw) {
  const s = raw ?? {};
  const retention = Number(s.requestRetention ?? s.request_retention);
  const maxInterval = Number(s.maximumInterval ?? s.maximum_interval);
  const newLimit = Number(s.dailyNewLimit ?? s.daily_new_limit);
  const fuzz = s.enableFuzz ?? s.enable_fuzz;

  const out = { ...DEFAULT_SETTINGS };
  if (Number.isFinite(retention)) {
    out.requestRetention = clamp(retention, RETENTION_MIN, RETENTION_MAX);
  }
  if (Number.isFinite(maxInterval)) {
    out.maximumInterval = clamp(Math.round(maxInterval), 1, 36500);
  }
  if (Number.isFinite(newLimit)) {
    out.dailyNewLimit = clamp(Math.round(newLimit), 0, 9999);
  }
  if (fuzz != null) {
    out.enableFuzz = Boolean(fuzz);
  }
  return out;
}

// Building an FSRS instance parses and clips the whole parameter set, so cache
// by the three fields that affect it. dailyNewLimit shapes the queue, not the
// scheduler, so it is not part of the key.
const instanceCache = new Map();

function schedulerFor(settings) {
  const s = normalizeSettings(settings);
  const key = `${s.requestRetention}|${s.maximumInterval}|${s.enableFuzz}`;

  let instance = instanceCache.get(key);
  if (!instance) {
    instance = fsrs(
      generatorParameters({
        request_retention: s.requestRetention,
        maximum_interval: s.maximumInterval,
        enable_fuzz: s.enableFuzz,
      })
    );
    instanceCache.set(key, instance);
  }
  return instance;
}

// Our self-grade is 0..3 (Again/Hard/Good/Easy), matching CORR §4.3's
// { grade /* 0-3 */ } attempt shape. FSRS's Rating enum is 1..4 over the same
// four buttons (Rating.Manual === 0 is not a grade a user can pick), so the
// mapping is exactly "+1" per A4's "Rating alignment" note.
export function gradeToRating(grade) {
  if (!Number.isInteger(grade) || grade < 0 || grade > 3) {
    throw new RangeError(`grade must be an integer 0..3, got ${grade}`);
  }
  return grade + 1;
}

/** Whole days between a row's last review and `now`. 0 for a never-reviewed item. */
function elapsedDaysOf(row, now) {
  if (!row?.last_reviewed_at) return 0;
  return Math.max(0, Math.floor((now.getTime() - row.last_reviewed_at) / 86400000));
}

/** Build a ts-fsrs Card from an item_review_state row, or a fresh one if `row` is null. */
function cardFromRow(row, now) {
  if (!row) return createEmptyCard(now);
  return {
    due: new Date(row.due_on),
    stability: row.stability,
    difficulty: row.difficulty,
    // ts-fsrs recomputes both from last_review on every call, so these are
    // inert going in. They are passed as real values anyway because rollback()
    // reads them back out.
    elapsed_days: elapsedDaysOf(row, now),
    scheduled_days: row.scheduled_days ?? 0,
    reps: row.reps,
    lapses: row.lapses,
    learning_steps: row.learning_steps ?? 0,
    state: row.state,
    last_review: row.last_reviewed_at != null ? new Date(row.last_reviewed_at) : undefined,
  };
}

export function stateName(state) {
  return (State[state] ?? "New").toLowerCase();
}

// D8: box-and-arrow diagram items are a known weak point ("Ethan's known weak
// point is holding pointer state in working memory"). Under FSRS the
// equivalent of the original spec's "double scheduler weight" is seeding a
// lower initial stability, so every interval derived from it afterwards is
// shorter until real history takes over. Applied only on the first review.
//
// This scales stability but leaves that review's due date where FSRS put it,
// so the item resurfaces sooner from the NEXT review onward, not this one.
// That is the shipped behaviour, left alone deliberately. What matters here is
// that preview and apply run the identical adjustment.
const DIAGRAM_FIRST_REVIEW_STABILITY_FACTOR = 0.5;

/**
 * One ts-fsrs RecordLogItem to the plain-numbers outcome the app uses. Shared
 * by previewRatings and scheduleReview so the two cannot disagree about what a
 * given rating does.
 */
function toOutcome({ card: next, log }, { row, format, grade, now }) {
  const isFirstReview = !row || row.reps === 0;

  let stability = next.stability;
  if (format === FORMATS.DIAGRAM && isFirstReview) {
    stability *= DIAGRAM_FIRST_REVIEW_STABILITY_FACTOR;
  }

  const dueOn = next.due.getTime();
  return {
    grade,
    label: GRADE_LABELS[grade],
    state: next.state,
    stateName: stateName(next.state),
    difficulty: next.difficulty,
    stability,
    dueOn,
    // Minutes, not days: FSRS learning steps are 1m/10m and scheduled_days is
    // 0 for both.
    intervalMinutes: Math.max(0, (dueOn - now.getTime()) / 60000),
    scheduledDays: next.scheduled_days,
    elapsedDays: log.elapsed_days,
    learningSteps: next.learning_steps ?? 0,
    reps: next.reps,
    lapses: next.lapses,
    // A8: "a leech means the item is broken, not you." Same trigger as the
    // original Leitner-box spec, derived from FSRS history instead of a box.
    leech: next.lapses >= 3,
    lastReviewedAt: now.getTime(),
  };
}

/**
 * What each of the four buttons would do, from a single repeat() call.
 *
 * The library returns all four at once. Calling it per rating would be four
 * times the work and, with fuzz on, four independently seeded results.
 */
export function previewRatings(row, format, now = new Date(), settings) {
  const card = cardFromRow(row, now);
  const log = schedulerFor(settings).repeat(card, now);

  const out = {};
  for (const grade of GRADES) {
    const key = GRADE_LABELS[grade].toLowerCase();
    out[key] = toOutcome(log[gradeToRating(grade)], { row, format, grade, now });
  }
  return out;
}

/**
 * Run one review through FSRS.
 *
 * Returns exactly what previewRatings promised for this grade at this instant:
 * both go through toOutcome, and ts-fsrs seeds fuzz from card state rather
 * than a global RNG, so the two agree even with fuzz enabled.
 */
export function scheduleReview(row, format, grade, now = new Date(), settings) {
  const card = cardFromRow(row, now);
  const item = schedulerFor(settings).next(card, now, gradeToRating(grade));
  const outcome = toOutcome(item, { row, format, grade, now });

  return {
    ...outcome,
    // The state the scheduler SAW, for the review log. Captured here because
    // this is the only place that knows what cardFromRow filled in for a
    // never-reviewed item.
    before: {
      state: card.state,
      stability: row ? row.stability : null,
      difficulty: row ? row.difficulty : null,
      elapsedDays: outcome.elapsedDays,
    },
    paramsVersion: PARAMS_VERSION,
  };
}

/**
 * Recall probability at a fractional number of days since the last review.
 *
 * forgetting_curve() rather than the instance's get_retrievability(), which
 * takes two Dates and floors the gap to whole days because whole days are what
 * FSRS schedules on. Plotted across a 5-day window that draws a staircase, not
 * a curve. Retrievability is only ever displayed, never fed back into a
 * scheduling decision, so the continuous form is both honest and the one the
 * stat tile and the chart can share without disagreeing at half a day.
 */
function retrievabilityAt(scheduler, stability, elapsedDays) {
  return forgetting_curve(scheduler.parameters.w[20], Math.max(0, elapsedDays), stability);
}

/**
 * 0..1, or null for an item never reviewed. Null rather than 0 because "never
 * seen" and "certainly forgotten" must not render the same.
 */
export function getRetrievability(row, now = new Date(), settings) {
  if (!row || row.last_reviewed_at == null || !row.stability) return null;
  const elapsedDays = (now.getTime() - row.last_reviewed_at) / 86400000;
  return retrievabilityAt(schedulerFor(settings), row.stability, elapsedDays);
}

/** The decay curve for one card, from its last review out to `horizonDays`. */
export function forgettingCurve(row, now = new Date(), { samples = 64 } = {}, settings) {
  if (!row || row.last_reviewed_at == null || !row.stability) return null;

  const scheduler = schedulerFor(settings);
  const lastReview = row.last_reviewed_at;

  // Well past the due date, so the crossing lands mid-chart with visible decay
  // either side of it. A horizon that stops near the due date puts the one
  // moment the chart exists to show hard against the right edge.
  const toDue = Math.max(1, (row.due_on - lastReview) / 86400000);
  const toNow = (now.getTime() - lastReview) / 86400000;
  const horizonDays = Math.max(toDue * 2.2, toNow * 1.15, 1);

  const points = [];
  for (let i = 0; i <= samples; i++) {
    const dayOffset = (horizonDays * i) / samples;
    points.push({
      dayOffset,
      retrievability: retrievabilityAt(scheduler, row.stability, dayOffset),
    });
  }
  return { points, horizonDays };
}

/**
 * The new due date for an already-scheduled card after desired retention
 * changed. Derived from the card's existing stability: the scheduler is not
 * re-run and stability is not touched, because nothing about the card's memory
 * changed, only the recall probability we let it decay to before asking again.
 *
 * Fuzz is forced off here whatever the setting says. Fuzz exists to stop cards
 * learned together from coming due together; re-rolling it would jitter every
 * due date in the collection for no reason.
 */
export function recomputeDue(row, settings) {
  if (!row || row.last_reviewed_at == null || !row.stability) return null;
  // Learning steps are fixed minutes, not derived from stability, so there is
  // nothing here to rederive.
  if (row.state !== State.Review) return null;

  const scheduler = schedulerFor({ ...normalizeSettings(settings), enableFuzz: false });
  const days = scheduler.next_interval(row.stability, elapsedDaysOf(row, new Date()));
  return row.last_reviewed_at + Math.round(days) * 86400000;
}

/**
 * A second identical grade inside the window is a double-click on the grade
 * button. Letting it through would double-count the rep and rederive the
 * interval from the already-advanced state.
 */
export function isDuplicateReview(row, grade, now = new Date()) {
  if (!row || row.last_reviewed_at == null) return false;
  if (now.getTime() - row.last_reviewed_at > DOUBLE_SUBMIT_WINDOW_MS) return false;
  return row.last_grade === grade;
}

/**
 * End of the caller's local day. Half of what "due" means; see IS_DUE in
 * routes/drill.js for the other half and for why there are two.
 *
 * tzOffsetMinutes is the client's Date.getTimezoneOffset(). It matters when
 * the server is not on the user's machine (Docker): without it the boundary
 * falls at midnight in the container's timezone, a day off. Falls back to
 * server-local, correct for Electron where both are the same machine.
 */
export function dueBoundary(now = new Date(), tzOffsetMinutes = now.getTimezoneOffset()) {
  const shifted = new Date(now.getTime() - tzOffsetMinutes * 60000);
  shifted.setUTCHours(23, 59, 59, 999);
  return shifted.getTime() + tzOffsetMinutes * 60000;
}

/** Start of the caller's local day, the window the daily new-item limit counts over. */
export function startOfDay(now = new Date(), tzOffsetMinutes = now.getTimezoneOffset()) {
  const shifted = new Date(now.getTime() - tzOffsetMinutes * 60000);
  shifted.setUTCHours(0, 0, 0, 0);
  return shifted.getTime() + tzOffsetMinutes * 60000;
}

export { State, Rating };
