// FSRS scheduling (ROADMAP.md A4, D10) — a thin wrapper around `ts-fsrs` so
// the rest of the server deals in plain numbers/epoch-ms, not library Card
// objects or JS Dates.
//
// D10: ship with ts-fsrs's default parameter weights. Do NOT run its
// optimizer this semester — it wants ~1,000+ graded reviews to fit reliably,
// far more than one student generates in one term.
import { fsrs, createEmptyCard, generatorParameters, Rating, State } from "ts-fsrs";
import { FORMATS } from "../src/data/itemSchema.js";

const scheduler = fsrs(generatorParameters());

// Our self-grade is 0..3 (Again/Hard/Good/Easy), matching CORR §4.3's
// { grade /* 0-3 */ } attempt shape. FSRS's Rating enum is 1..4 over the same
// four buttons (Rating.Manual === 0 is not a real grade a user can pick) —
// the mapping is exactly "+1", per A4's "Rating alignment" note.
export function gradeToRating(grade) {
  if (!Number.isInteger(grade) || grade < 0 || grade > 3) {
    throw new RangeError(`grade must be an integer 0..3, got ${grade}`);
  }
  return grade + 1;
}

/** Build a ts-fsrs Card from a stored item_review_state row, or a fresh one if `row` is null. */
function cardFromRow(row) {
  if (!row) return createEmptyCard(new Date());
  return {
    due: new Date(row.due_on),
    stability: row.stability,
    difficulty: row.difficulty,
    elapsed_days: 0,
    scheduled_days: 0,
    reps: row.reps,
    lapses: row.lapses,
    learning_steps: 0,
    state: row.state,
    last_review: row.last_reviewed_at != null ? new Date(row.last_reviewed_at) : undefined,
  };
}

// D8: box-and-arrow diagram items are a known weak point ("Ethan's known weak
// point is holding pointer state in working memory"). Under FSRS the
// equivalent of the original spec's "double scheduler weight" is seeding a
// lower initial stability than the format default so the item resurfaces
// sooner, until real review history takes over on later reviews. Applied only
// once — the very first time an item is reviewed (reps: 0 on the way in) —
// never on subsequent reviews, where FSRS's own history-derived stability
// should stand on its own.
const DIAGRAM_FIRST_REVIEW_STABILITY_FACTOR = 0.5;

/**
 * Run one review through FSRS.
 *
 * @param {object|null} row   existing item_review_state row, or null if this
 *                             item has never been reviewed by this user
 * @param {string} format     itemSchema.js FORMATS value (for D8's diagram seeding)
 * @param {number} grade      0..3 self-grade
 * @param {Date} [now]
 * @returns {{state:number, difficulty:number, stability:number, dueOn:number,
 *            reps:number, lapses:number, leech:boolean, lastReviewedAt:number}}
 */
export function scheduleReview(row, format, grade, now = new Date()) {
  const isFirstReview = !row || row.reps === 0;
  const card = cardFromRow(row);
  const { card: next } = scheduler.next(card, now, gradeToRating(grade));

  let stability = next.stability;
  if (format === FORMATS.DIAGRAM && isFirstReview) {
    stability *= DIAGRAM_FIRST_REVIEW_STABILITY_FACTOR;
  }

  return {
    state: next.state,
    difficulty: next.difficulty,
    stability,
    dueOn: next.due.getTime(),
    reps: next.reps,
    lapses: next.lapses,
    // A8: "a leech means the item is broken, not you." Same trigger as the
    // original Leitner-box spec (lapses >= 3), just derived from FSRS's
    // review history instead of a box position (D10).
    leech: next.lapses >= 3,
    lastReviewedAt: now.getTime(),
  };
}

export { State, Rating };
