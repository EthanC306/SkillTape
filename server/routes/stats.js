/**
 * Cross-surface stats (ROADMAP.md A11) — the Report view's Stats tab.
 *
 * Its own route module rather than more of routes/drill.js for two reasons:
 * drill.js is already 1400+ lines, and this endpoint is the only place in the
 * app that reads BOTH attempt tables. Hanging it off /api/drill would say it
 * belongs to the drill subsystem, which is exactly the framing this feature
 * exists to break.
 *
 * All the rules live in server/stats.js (math, no SQL); this file is the SQL
 * and the HTTP shell, the same split fsrs.js has with drill.js.
 */
import { Router } from "express";
import db from "../db.js";
import { getSessionUser } from "../auth.js";
import {
  SURFACES,
  SURFACE_LABELS,
  ACTIVITY_DAYS,
  normalizeItemRows,
  normalizeQuizRows,
  buildCells,
  buildActivity,
} from "../stats.js";

const router = Router();

// item_attempts uses 0 for "no session"; `attempts` uses SQL NULL for the same
// thing. Two conventions for one idea, and this is the only endpoint that has
// to hold both at once — see the item_review_state comment in schema.sql for
// why the newer tables could not just use NULL.
const ANON_USER_ID = 0;

/** Same `?tz=` contract as /api/drill/queue: the client's getTimezoneOffset(). */
function tzOffsetOf(req) {
  const tz = parseInt(req.query.tz, 10);
  if (Number.isFinite(tz) && Math.abs(tz) <= 900) return tz;
  return 0;
}

const selectTopics = db.prepare(
  "SELECT id, title, exam_weight FROM topics WHERE course_id = ? ORDER BY position"
);

// Item-bank history (Drill / Practice / Exam). Joined through items so every
// row arrives already carrying its topic — the client filters by topic, not by
// item, and doing the lookup here keeps the response flat.
const selectItemAttempts = db.prepare(`
  SELECT items.topic_id, item_attempts.item_id, item_attempts.ts, item_attempts.mode,
         item_attempts.surface, item_attempts.grade, item_attempts.seconds,
         item_attempts.abandoned
  FROM item_attempts
  JOIN items  ON items.id = item_attempts.item_id
  JOIN topics ON topics.id = items.topic_id
  WHERE topics.course_id = ? AND item_attempts.user_id = ?
  ORDER BY item_attempts.ts ASC
`);

// Legacy Quiz history. `attempts.topic_id` is already the topic, so unlike the
// item query above there is nothing to join through; topics is joined only to
// scope the course.
//
// The user filter is written twice because the anonymous sentinel differs:
// a logged-in read wants `user_id = ?`, an anonymous one wants `IS NULL`, and
// SQLite will not match NULL with `=` no matter what is bound.
const selectQuizAttemptsForUser = db.prepare(`
  SELECT attempts.topic_id, attempts.question_stable_id, attempts.correct, attempts.created_at
  FROM attempts
  JOIN topics ON topics.id = attempts.topic_id
  WHERE topics.course_id = ? AND attempts.user_id = ?
  ORDER BY attempts.created_at ASC, attempts.position ASC
`);
const selectQuizAttemptsAnon = db.prepare(`
  SELECT attempts.topic_id, attempts.question_stable_id, attempts.correct, attempts.created_at
  FROM attempts
  JOIN topics ON topics.id = attempts.topic_id
  WHERE topics.course_id = ? AND attempts.user_id IS NULL
  ORDER BY attempts.created_at ASC, attempts.position ASC
`);

/**
 * GET /api/stats/summary?course=cpp&tz=-300
 *
 * The whole topic x surface cross-product in one response, both counting modes
 * per cell. Deliberately not paginated or filtered server-side: a course's
 * history is a few hundred rows, and shipping it whole is what lets the two
 * dropdowns re-slice instantly instead of round-tripping on every change.
 */
router.get("/summary", (req, res) => {
  const user = getSessionUser(req);
  const course = req.query.course;
  if (!course) return res.status(400).json({ error: "course query param required" });

  const topics = selectTopics.all(course);
  if (!topics.length) return res.status(400).json({ error: `no topics for course "${course}"` });

  const itemRows = selectItemAttempts.all(course, user?.id ?? ANON_USER_ID);
  let quizRows;
  if (user) {
    quizRows = selectQuizAttemptsForUser.all(course, user.id);
  } else {
    quizRows = selectQuizAttemptsAnon.all(course);
  }

  const entries = [...normalizeItemRows(itemRows), ...normalizeQuizRows(quizRows)];
  entries.sort((a, b) => a.ts - b.ts); // first-try dedupe below depends on this

  // Quiz history imported from localStorage has no question identity, so it can
  // never be deduped to a first try. Counted and reported rather than silently
  // dropped — the panel names the number so a small first-try quiz sample does
  // not read as "you have barely taken any quizzes".
  const unattributedQuizAttempts = quizRows.filter((r) => r.question_stable_id == null).length;

  res.json({
    course,
    topics: topics.map((t) => ({ id: t.id, title: t.title, examWeight: t.exam_weight })),
    surfaces: SURFACES,
    surfaceLabels: SURFACE_LABELS,
    cells: buildCells(entries),
    activityDays: ACTIVITY_DAYS,
    activity: buildActivity(entries, Date.now(), tzOffsetOf(req)),
    unattributedQuizAttempts,
  });
});

export default router;
