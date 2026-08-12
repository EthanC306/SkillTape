/**
 * Cross-surface accuracy aggregation (ROADMAP.md A11). Math only, no SQL.
 *
 * Same split as fsrs.js vs routes/drill.js: this module takes plain row objects
 * and returns plain numbers, so every rule below is unit-testable without a
 * database (test/stats.test.js).
 *
 * The problem it solves: SkillTape records study history in two tables that
 * were never designed to be read together.
 *
 *   attempts       — legacy Quiz (MCQ). One row per question answered,
 *                    `correct` 0/1, keyed by question_stable_id.
 *   item_attempts  — Drill / Practice / Exam. One row per item reviewed,
 *                    `grade` 0..3, keyed by item_id.
 *
 * "How am I doing on linked lists?" has no answer while those stay apart, so
 * this module puts both on one axis: a SURFACE (which screen) and a boolean
 * (did I get it right).
 */

/**
 * The four study screens, in display order.
 *
 * Pre-`surface` closed-book rows (Drill and Practice both wrote `mode: "closed"`
 * with nothing to tell them apart) are counted under Drill rather than shown as
 * a fifth column: a "Legacy" bucket next to Exam is noise, and dropping those
 * rows emptied the Stats tab for anyone whose history predates the column.
 * Drill is the older closed-book screen, so that is where the recovered history
 * lands; Practice only counts rows that carry an explicit `surface: "practice"`.
 * New attempts always send a surface and land in the right column.
 */
export const SURFACES = ["exam", "drill", "practice", "quiz"];

/** Human labels for the mode dropdown. Kept here so server and UI can't drift. */
export const SURFACE_LABELS = {
  exam: "Exam",
  drill: "Drill",
  practice: "Practice",
  quiz: "MCQ",
};

/** How many days of per-day activity the summary carries. */
export const ACTIVITY_DAYS = 30;

/**
 * How many recent outcomes each cell carries, for the detail view's run of
 * red/green squares. Capped because this ships one array per populated cell:
 * the point is "how has this been going lately", which twenty answers show and
 * two hundred would only make slower to send.
 */
export const RECENT_PER_CELL = 20;

/**
 * Which bucket an item_attempts row belongs to, or null when it cannot be
 * attributed to a screen.
 *
 * `surface` is authoritative when present. When it is not, the row predates the
 * column: an exam row is still recoverable (nothing but ExamView ever wrote
 * `mode: "exam"`, and db.js backfilled those anyway). Pre-surface closed-book
 * rows land under Drill — see the SURFACES comment for why that, and not a
 * fifth bucket or a silent drop. An unrecognized surface string returns null
 * (except exam mode, which remains recoverable) so it cannot invent a column
 * the UI has no label for.
 */
export function surfaceOfItemRow(row) {
  if (row.surface) {
    if (SURFACES.includes(row.surface)) return row.surface;
    if (row.mode === "exam") return "exam";
    return null;
  }
  if (row.mode === "exam") return "exam";
  if (row.mode === "closed" || row.mode === "open") return "drill";
  return null;
}

/**
 * The one correctness rule, applied to both tables.
 *
 * For graded items that is `grade >= 2` — Good or Easy. Hard (1) counts as
 * WRONG, which is the pass line already used by /api/drill/stats and
 * /api/drill/report; moving it here would make this panel disagree with the
 * Overview tab about the same attempt.
 *
 * Quiz rows carry a boolean instead of a grade, and a correct MCQ is exactly a
 * Good: one thing asked, one thing produced, right or not.
 */
export function isCorrectItemRow(row) {
  return row.grade >= 2;
}

/**
 * Rows that count at all. An abandoned row ("End drill" mid-item, or an exam
 * question the timer never reached) records that the item was SEEN, not that it
 * was answered — scoring it as wrong would punish stopping early, which is the
 * escape hatch working as designed.
 */
export function isGradedItemRow(row) {
  return !row.abandoned && row.grade != null;
}

/** Median of a numeric array, or null when empty. Same helper shape as drill.js's. */
export function median(nums) {
  if (!nums.length) return null;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2) return sorted[mid];
  return (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * One bucket of attempts -> the numbers a tile or table cell shows.
 *
 * Accuracy is deliberately NOT computed here. The UI needs `attempts` and
 * `correct` separately anyway (to say "56% (10/18)" and to sum cells across a
 * row without averaging averages), and a null-when-empty ratio computed in
 * three places is three chances to divide by zero.
 *
 * `seconds` ships as the RAW durations rather than a precomputed median, for
 * the same reason `correct` ships as a count. The UI's headline covers whatever
 * the two dropdowns currently select, which can be any subset of cells, and a
 * median cannot be re-derived from per-cell medians — averaging those would
 * produce a number that is not the median of anything. Concatenating the raw
 * arrays gives the real one. It is affordable because it is bounded by the
 * user's own attempt count, and only timed rows contribute: quiz has never
 * recorded per-question timing, so quiz cells carry an empty array and drop out
 * of the calculation instead of being counted as zero-second answers.
 */
export function aggregate(entries) {
  let correct = 0;
  let lastAt = null;
  const seconds = [];

  for (const e of entries) {
    if (e.correct) correct += 1;
    if (lastAt == null || e.ts > lastAt) lastAt = e.ts;
    if (e.seconds != null) seconds.push(e.seconds);
  }

  return { attempts: entries.length, correct, seconds, lastAt };
}

/**
 * Keep only the first attempt per key, input assumed ordered oldest-first.
 *
 * "First-try" is per (item, surface), not per item: getting something right in
 * Practice and then again in Drill is two separate first tries, and collapsing
 * them would make whichever surface you happened to use second look like it was
 * never attempted.
 */
export function firstTryOnly(entries, keyOf) {
  const seen = new Set();
  const out = [];
  for (const e of entries) {
    const key = keyOf(e);
    // A quiz row with no stable id cannot be deduped — see normalizeQuizRows.
    if (key == null) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(e);
  }
  return out;
}

/**
 * item_attempts rows -> the neutral entry shape everything below consumes.
 * Ungraded and abandoned rows are dropped here, once, rather than re-checked
 * at every call site. Pre-surface closed-book rows survive via surfaceOfItemRow
 * (counted under Drill).
 */
export function normalizeItemRows(rows) {
  const out = [];
  for (const r of rows) {
    if (!isGradedItemRow(r)) continue;
    const surface = surfaceOfItemRow(r);
    if (!surface) continue;
    out.push({
      topicId: r.topic_id,
      surface,
      key: r.item_id,
      correct: isCorrectItemRow(r),
      seconds: r.seconds,
      ts: r.ts,
    });
  }
  return out;
}

/**
 * attempts rows -> the same neutral shape, all under the "quiz" surface.
 *
 * `key` is question_stable_id and may be null: history imported from the old
 * localStorage bank recorded booleans with no question identity at all
 * (src/hooks/useProgress.js), and docs/STABLE_QUESTION_IDS.md is explicit that
 * no later change can recover it. Those rows are real attempts and count in the
 * all-attempts view; they simply cannot participate in first-try, which is why
 * the summary reports how many there are instead of quietly shrinking.
 *
 * Quiz has never recorded per-question timing, so `seconds` is null throughout
 * and every quiz median comes out null by aggregate()'s all-or-nothing rule.
 */
export function normalizeQuizRows(rows) {
  return rows.map((r) => ({
    topicId: r.topic_id,
    surface: "quiz",
    key: r.question_stable_id ?? null,
    correct: Boolean(r.correct),
    seconds: null,
    ts: r.created_at,
  }));
}

/** Group entries by `${topicId} ${surface}`, the cell coordinate. */
function cellKey(topicId, surface) {
  return `${topicId} ${surface}`;
}

/**
 * The whole topic x surface cross-product, both counting modes per cell.
 *
 * Only cells with at least one attempt are emitted. The client renders the full
 * grid from its own topic and surface lists, so shipping empty cells would just
 * be padding a response with zeroes it can infer.
 */
export function buildCells(entries) {
  const byCell = new Map();
  for (const e of entries) {
    const k = cellKey(e.topicId, e.surface);
    let bucket = byCell.get(k);
    if (!bucket) {
      bucket = { topicId: e.topicId, surface: e.surface, entries: [] };
      byCell.set(k, bucket);
    }
    bucket.entries.push(e);
  }

  const cells = [];
  for (const bucket of byCell.values()) {
    const all = aggregate(bucket.entries);
    // Deduped within the cell, so the surface is already fixed and the item id
    // alone is a sufficient key.
    const firstTry = aggregate(firstTryOnly(bucket.entries, (e) => e.key));
    // Oldest-first within the tail, so the UI can draw it left-to-right as
    // time moving forward without reversing it first.
    const recent = bucket.entries.slice(-RECENT_PER_CELL).map((e) => e.correct);
    cells.push({ topicId: bucket.topicId, surface: bucket.surface, all, firstTry, recent, lastAt: all.lastAt });
  }

  cells.sort((a, b) => {
    if (a.topicId !== b.topicId) return a.topicId < b.topicId ? -1 : 1;
    return SURFACES.indexOf(a.surface) - SURFACES.indexOf(b.surface);
  });
  return cells;
}

/** Local YYYY-MM-DD for an epoch-ms timestamp. */
export function dayKey(ts, tzOffsetMinutes = 0) {
  const shifted = new Date(ts - tzOffsetMinutes * 60_000);
  const y = shifted.getUTCFullYear();
  const m = String(shifted.getUTCMonth() + 1).padStart(2, "0");
  const d = String(shifted.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Per (day, topic, surface) counts for the last ACTIVITY_DAYS days.
 *
 * Keyed by topic as well as surface so the strip can honour BOTH dropdowns. One
 * that silently ignored the topic filter would sit under a panel scoped to a
 * single topic while reporting the whole course, and a chart that disagrees
 * with the numbers directly above it is worse than no chart.
 *
 * Days with no study are omitted rather than zero-filled — the client draws a
 * fixed 30-slot strip and fills gaps itself, so it already knows which days are
 * missing, and emitting them would only pad the array.
 *
 * `tzOffsetMinutes` is the client's getTimezoneOffset(), for the same reason
 * /api/drill/queue takes one: under Docker the server's midnight and the user's
 * midnight are not the same instant, and an activity strip that disagrees with
 * the calendar on screen is worse than no strip.
 */
export function buildActivity(entries, now = Date.now(), tzOffsetMinutes = 0) {
  const cutoff = now - ACTIVITY_DAYS * 24 * 60 * 60 * 1000;
  const byKey = new Map();

  for (const e of entries) {
    if (e.ts < cutoff) continue;
    const day = dayKey(e.ts, tzOffsetMinutes);
    const k = `${day} ${e.topicId} ${e.surface}`;
    let row = byKey.get(k);
    if (!row) {
      row = { day, topicId: e.topicId, surface: e.surface, attempts: 0, correct: 0 };
      byKey.set(k, row);
    }
    row.attempts += 1;
    if (e.correct) row.correct += 1;
  }

  return [...byKey.values()].sort((a, b) => {
    if (a.day !== b.day) return a.day < b.day ? -1 : 1;
    if (a.topicId !== b.topicId) return a.topicId < b.topicId ? -1 : 1;
    return SURFACES.indexOf(a.surface) - SURFACES.indexOf(b.surface);
  });
}
