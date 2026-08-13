/**
 * Grouping the attempt log back into SITTINGS. Math only, no SQL.
 *
 * Same split as server/stats.js vs routes/stats.js: this module takes plain row
 * objects and returns plain objects, so every rule below is unit-testable
 * without a database (test/sessions.test.js).
 *
 * The problem it solves: `item_attempts` is one row per item reviewed, with no
 * notion of "the drill I did on Tuesday morning". The Stats tab's grid answers
 * "how am I doing on this topic in this mode" and structurally cannot answer
 * "what happened in that sitting" — so this module reconstructs the sitting.
 *
 * TWO SOURCES OF TRUTH, in priority order:
 *
 *   1. `session_id` — a UUID the client minted when the screen opened and sent
 *      with every attempt. EXACT. Rows sharing one are one sitting, full stop,
 *      no matter how far apart their timestamps are.
 *   2. Timestamp clustering — for rows written before that column existed, and
 *      only those. A gap larger than SESSION_GAP_MS starts a new sitting.
 *      This is a HEURISTIC and the sessions it produces are flagged
 *      `derived: true` so the UI can say so rather than presenting a guess in
 *      the same voice as a fact.
 *
 * The two never mix: a tagged row is never pulled into a clustered group by
 * being close to it in time, and clustering only ever runs over the untagged
 * remainder. Otherwise a single old row landing mid-drill would absorb that
 * drill's exact boundary into a heuristic one.
 */

import { surfaceOfItemRow, isCorrectItemRow, isGradedItemRow } from "./stats.js";

/**
 * How long a pause has to be before it reads as "I stopped and came back
 * later" rather than "I got a coffee".
 *
 * Only ever applied to UNTAGGED rows — anything written since the client
 * started tagging sittings is grouped exactly and never sees this number.
 *
 * Thirty minutes is a deliberate middle: short enough that a morning and an
 * evening drill stay separate, long enough to survive a real interruption
 * mid-session. It cannot be right in every case, which is the honest reason
 * derived sessions are labeled as approximate in the UI.
 */
export const SESSION_GAP_MS = 30 * 60 * 1000;

/** Grade histogram index -> label, matching src/data/grading.js GRADE_LABELS. */
export const GRADE_COUNT = 4;

/**
 * The key that identifies one session to the detail endpoint.
 *
 * Tagged sessions use the client's id directly. Derived sessions have no
 * identity of their own, so they get a synthetic one built from the facts that
 * define them — surface and first timestamp — which is enough to re-find the
 * same cluster on a later request, since re-running this function over the same
 * rows always produces the same partition.
 *
 * The `gap:` prefix is what tells the detail endpoint which of the two lookups
 * to run, and it cannot collide with a UUID.
 */
export function derivedKey(surface, firstTs) {
  return `gap:${surface}:${firstTs}`;
}

/** True when a key came from derivedKey rather than a client-minted UUID. */
export function isDerivedKey(key) {
  return typeof key === "string" && key.startsWith("gap:");
}

/**
 * Parse a derived key back into its parts, or null when it isn't one.
 * Returns `{ surface, firstTs }`. Rejects malformed input rather than throwing:
 * the key arrives from a URL and a bad one is a 404, not a 500.
 */
export function parseDerivedKey(key) {
  if (!isDerivedKey(key)) return null;
  const rest = key.slice("gap:".length);
  const sep = rest.lastIndexOf(":");
  if (sep <= 0) return null;
  const surface = rest.slice(0, sep);
  const firstTs = Number(rest.slice(sep + 1));
  if (!surface || !Number.isFinite(firstTs)) return null;
  return { surface, firstTs };
}

/**
 * Summarize one sitting's rows into the shape the session LIST renders.
 *
 * `graded` is the denominator, not `attempts`: an abandoned row (an exam
 * question the timer never reached, a drill ended mid-item) records that the
 * item was seen, not that it was answered. Counting those as wrong would make
 * stopping early look like failing, which is the same rule server/stats.js
 * already applies — imported from there rather than restated so the two cannot
 * drift into disagreeing about the same attempt.
 */
function summarize(key, surface, rows, derived) {
  const grades = new Array(GRADE_COUNT).fill(0);
  let graded = 0;
  let correct = 0;
  let seconds = 0;
  const topicIds = new Set();

  for (const row of rows) {
    if (row.topicId != null) topicIds.add(row.topicId);
    seconds += row.seconds ?? 0;
    if (!isGradedItemRow(row)) continue;
    graded++;
    if (isCorrectItemRow(row)) correct++;
    if (row.grade >= 0 && row.grade < GRADE_COUNT) grades[row.grade]++;
  }

  return {
    key,
    surface,
    derived,
    startedAt: rows[0].ts,
    endedAt: rows[rows.length - 1].ts,
    // Wall-clock span is meaningless for Practice and Exam, which post every
    // attempt at once when you finish — every row lands within the same second.
    // Summed per-item `seconds` is the figure that means the same thing on all
    // three screens.
    seconds,
    attempts: rows.length,
    graded,
    correct,
    grades,
    topicIds: [...topicIds],
  };
}

/**
 * Raw `item_attempts` rows -> the shape this module consumes.
 *
 * Deliberately NOT stats.js's normalizeItemRows, which drops abandoned and
 * ungraded rows on the way in. A session has to keep them: an exam question the
 * timer never reached is part of that sitting, and the detail view lists it as
 * "not reached". Dropping it would make a 20-question exam you got halfway
 * through look like a 10-question exam.
 */
export function normalizeSessionRows(rows) {
  return rows.map((r) => ({
    attemptId: r.id,
    topicId: r.topic_id,
    itemId: r.item_id,
    ts: r.ts,
    mode: r.mode,
    surface: r.surface,
    sessionId: r.session_id,
    grade: r.grade,
    seconds: r.seconds,
    abandoned: r.abandoned,
  }));
}

/**
 * Partition attempt rows into sessions, newest first.
 *
 * Expects rows shaped `{ ts, surface, mode, sessionId, grade, seconds,
 * abandoned, topicId }` — the same normalized shape server/stats.js consumes,
 * plus `sessionId`. Rows that cannot be attributed to a screen are dropped, for
 * the same reason stats.js drops them: a session with no mode has no place in a
 * per-mode list.
 *
 * Rows need not arrive sorted; this sorts what it needs.
 */
export function buildSessions(rows) {
  const sessions = buildSessionRowGroups(rows).map((g) =>
    summarize(g.key, g.surface, g.rows, g.derived)
  );
  // Newest first — the list's whole premise is "what did I just do".
  sessions.sort((a, b) => b.startedAt - a.startedAt);
  return sessions;
}

/**
 * The rows belonging to one derived session, in answer order.
 *
 * Re-runs the same clustering over the same surface's untagged rows and returns
 * the cluster that starts at `firstTs`. Deriving twice rather than caching the
 * partition keeps this stateless and guarantees the detail view and the list
 * agree by construction — they run identical code over identical input.
 *
 * Returns an empty array when no cluster starts exactly there, which is what a
 * stale key from an old page looks like.
 */
export function derivedSessionRows(rows, surface, firstTs) {
  const match = buildSessionRowGroups(rows).find(
    (g) => g.derived && g.surface === surface && g.rows[0].ts === firstTs
  );
  return match ? match.rows : [];
}

/**
 * The rows belonging to one tagged session, in answer order.
 * Trivial next to the derived case, and kept beside it so callers do not have
 * to know which kind of key they were handed.
 */
export function taggedSessionRows(rows, sessionId) {
  return rows.filter((r) => r.sessionId === sessionId).sort((a, b) => a.ts - b.ts);
}

/**
 * The same partition buildSessions produces, but carrying each group's ROWS
 * instead of a summary. The list endpoint wants summaries and the detail
 * endpoint wants rows; both must partition identically, so the partitioning
 * lives here once and buildSessions is a projection of it.
 */
export function buildSessionRowGroups(rows) {
  const bySurface = new Map();
  for (const row of rows) {
    const surface = surfaceOfItemRow(row);
    if (!surface) continue;
    if (!bySurface.has(surface)) bySurface.set(surface, []);
    bySurface.get(surface).push({ ...row, surface });
  }

  const groups = [];
  for (const [surface, surfaceRows] of bySurface) {
    const tagged = new Map();
    const untagged = [];
    for (const row of surfaceRows) {
      if (row.sessionId) {
        if (!tagged.has(row.sessionId)) tagged.set(row.sessionId, []);
        tagged.get(row.sessionId).push(row);
      } else {
        untagged.push(row);
      }
    }
    for (const [id, group] of tagged) {
      group.sort((a, b) => a.ts - b.ts);
      groups.push({ key: id, surface, derived: false, rows: group });
    }
    untagged.sort((a, b) => a.ts - b.ts);
    let current = [];
    for (const row of untagged) {
      if (current.length && row.ts - current[current.length - 1].ts > SESSION_GAP_MS) {
        groups.push({ key: derivedKey(surface, current[0].ts), surface, derived: true, rows: current });
        current = [];
      }
      current.push(row);
    }
    if (current.length) {
      groups.push({ key: derivedKey(surface, current[0].ts), surface, derived: true, rows: current });
    }
  }
  return groups;
}
