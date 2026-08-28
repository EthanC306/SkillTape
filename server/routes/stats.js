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
import { requireUser } from "../userScope.js";
import {
  SURFACES,
  SURFACE_LABELS,
  ACTIVITY_DAYS,
  normalizeItemRows,
  normalizeQuizRows,
  buildCells,
  buildActivity,
} from "../stats.js";
import {
  buildSessions,
  buildSessionRowGroups,
  normalizeSessionRows,
  isDerivedKey,
  parseDerivedKey,
} from "../sessions.js";

const router = Router();

// There is no anonymous sentinel any more. `req.userId` is a real account id
// or null, and every query below binds it directly — `user_id = NULL` matches
// nothing, so a logged-out read returns an empty-but-correctly-shaped payload
// out of the same builders that shape a populated one. See server/userScope.js.

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
// Written ONCE now. This used to be two statements — one binding `user_id = ?`
// and one hard-coding `user_id IS NULL` — because the anonymous reader had to
// match the NULL sentinel that POST /api/attempts wrote. Both the sentinel and
// the anonymous reader are gone: there is no unowned attempt to find, so the
// `IS NULL` variant would now only ever return rows that should not exist.
const selectQuizAttempts = db.prepare(`
  SELECT attempts.topic_id, attempts.question_stable_id, attempts.correct, attempts.created_at
  FROM attempts
  JOIN topics ON topics.id = attempts.topic_id
  WHERE topics.course_id = ? AND attempts.user_id = ?
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
  const course = req.query.course;
  if (!course) return res.status(400).json({ error: "course query param required" });

  const topics = selectTopics.all(course);
  if (!topics.length) return res.status(400).json({ error: `no topics for course "${course}"` });

  // `topics` above is CONTENT and stays populated for everyone — the grid still
  // draws its rows and the course still lists its topics when logged out. Only
  // the history is scoped, so the panel renders as an empty grid rather than as
  // a missing one.
  const itemRows = selectItemAttempts.all(course, req.userId);
  const quizRows = selectQuizAttempts.all(course, req.userId);

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

// ── Session view ────────────────────────────────────────────────────────────
//
// The Stats tab's other reading of the same history: not "how am I doing on
// this topic in this mode" but "what happened in that sitting". Only
// item_attempts participates — the legacy MCQ quiz has its own run_id grouping
// and its own history UI (HistoryModal), and folding two different notions of
// "a run" into one list would make the score column mean two things.
//
// `item_attempts.id` rides along in both queries as the row identity: the list
// partitions light rows, and the detail refetches exactly the ids of one
// partition. Matching on the primary key rather than on (item_id, ts) means the
// two queries cannot disagree about which row is which.
const selectSessionRows = db.prepare(`
  SELECT item_attempts.id, items.topic_id, item_attempts.item_id, item_attempts.ts,
         item_attempts.mode, item_attempts.surface, item_attempts.session_id,
         item_attempts.grade, item_attempts.seconds, item_attempts.abandoned
  FROM item_attempts
  JOIN items  ON items.id = item_attempts.item_id
  JOIN topics ON topics.id = items.topic_id
  WHERE topics.course_id = ? AND item_attempts.user_id = ?
  ORDER BY item_attempts.ts ASC
`);

/**
 * GET /api/stats/sessions?course=cpp
 *
 * Summaries only — date, mode, score, grade histogram. The per-question detail
 * is a separate request because it carries full prompt and answer text for
 * every attempt, which is an order of magnitude larger than this and grows
 * without bound. That is a deliberate departure from /summary's
 * ship-it-all-and-slice-client-side stance, which works there precisely because
 * the payload is bounded.
 */
router.get("/sessions", (req, res) => {
  const course = req.query.course;
  if (!course) return res.status(400).json({ error: "course query param required" });

  const rows = selectSessionRows.all(course, req.userId);
  res.json({
    course,
    surfaceLabels: SURFACE_LABELS,
    sessions: buildSessions(normalizeSessionRows(rows)),
  });
});

/**
 * GET /api/stats/sessions/:key?course=cpp
 *
 * One sitting's questions, in the order they were answered, each with what was
 * asked, what was answered, what the right answer was, and the grade.
 *
 * `course` is required even though the key alone would find a tagged session:
 * derived keys are only unique within the partition they came from, so both
 * kinds resolve through the same course-scoped partition. One code path for two
 * key kinds is worth one redundant query param.
 */
router.get("/sessions/:key", (req, res) => {
  const course = req.query.course;
  if (!course) return res.status(400).json({ error: "course query param required" });

  const key = req.params.key;
  if (isDerivedKey(key) && !parseDerivedKey(key)) {
    return res.status(400).json({ error: "malformed session key" });
  }

  // Logged out this matches no rows, so no group is ever found and the route
  // 404s below — a sitting that belongs to nobody is not a sitting you can open.
  const light = normalizeSessionRows(selectSessionRows.all(course, req.userId));
  const group = buildSessionRowGroups(light).find((g) => g.key === key);
  // A key from a page left open while the underlying rows changed. 404 rather
  // than an empty session, so the client can say "this session no longer
  // exists" instead of "this session had no questions".
  if (!group) return res.status(404).json({ error: "no such session" });

  const ids = group.rows.map((r) => r.attemptId);
  const placeholders = ids.map(() => "?").join(",");
  const detail = db
    .prepare(
      `SELECT item_attempts.id, item_attempts.ts, item_attempts.grade, item_attempts.seconds,
              item_attempts.abandoned, item_attempts.note, item_attempts.answer_choice,
              items.id AS item_id, items.format, items.prompt, items.expected,
              items.criteria, items.choices, items.answer_index,
              topics.id AS topic_id, topics.title AS topic_title
       FROM item_attempts
       JOIN items  ON items.id = item_attempts.item_id
       JOIN topics ON topics.id = items.topic_id
       WHERE item_attempts.id IN (${placeholders})`
    )
    .all(...ids);

  // Re-order to the partition's order (answered order); SQL rows are unordered
  // and an IN clause does not preserve the list it was given.
  const byId = new Map(detail.map((r) => [r.id, r]));

  res.json({
    key: group.key,
    surface: group.surface,
    derived: group.derived,
    surfaceLabels: SURFACE_LABELS,
    questions: group.rows
      .map((r) => byId.get(r.attemptId))
      .filter(Boolean)
      .map((r) => ({
        attemptId: r.id,
        ts: r.ts,
        topicId: r.topic_id,
        topicTitle: r.topic_title,
        itemId: r.item_id,
        format: r.format,
        prompt: r.prompt,
        expected: r.expected,
        // JSON columns, parsed here so the client never has to know they were
        // stored as text. A malformed value degrades to null rather than
        // failing the whole session — one unreadable item should not blank a
        // twenty-question report.
        criteria: parseJsonColumn(r.criteria),
        choices: parseJsonColumn(r.choices),
        answerIndex: r.answer_index,
        grade: r.grade,
        seconds: r.seconds,
        abandoned: Boolean(r.abandoned),
        // The two halves of "your answer": free text for written formats, an
        // option index for MCQ. Both null on rows written before the session
        // view existed, which the client renders as "not recorded" rather than
        // as an empty answer — a question you never answered and one whose
        // answer was never stored are opposite facts.
        note: r.note,
        answerChoice: r.answer_choice,
      })),
  });
});

function parseJsonColumn(value) {
  if (value == null) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

// ── Report view mode ────────────────────────────────────────────────────────
//
// Which of the two readings the Stats tab opens in. Server-side rather than
// localStorage — see the ui_settings comment in schema.sql.

const VALID_REPORT_VIEWS = new Set(["grid", "sessions"]);

const getUiSettings = db.prepare("SELECT report_view FROM ui_settings WHERE user_id = ?");
const upsertReportView = db.prepare(`
  INSERT INTO ui_settings (user_id, report_view, updated_at)
  VALUES (@user_id, @report_view, @updated_at)
  ON CONFLICT(user_id) DO UPDATE SET
    report_view = excluded.report_view,
    updated_at  = excluded.updated_at
`);

router.get("/view", (req, res) => {
  // Null userId finds no row, so this falls through to the same "grid" default
  // a brand-new account gets. A read, so it stays open rather than 401ing.
  const row = getUiSettings.get(req.userId);
  // Unknown stored values fall back rather than being served as-is: the column
  // is deliberately unconstrained (schema.sql) so an older client cannot wedge
  // the panel on a value it has no branch for.
  const view = VALID_REPORT_VIEWS.has(row?.report_view) ? row.report_view : "grid";
  res.json({ view });
});

// requireUser: a stored preference needs an account to belong to. Without it
// this wrote to the shared user_id = 0 row, so one logged-out visitor toggling
// the Report view changed it for every other logged-out visitor.
router.put("/view", requireUser, (req, res) => {
  const view = req.body?.view;
  if (!VALID_REPORT_VIEWS.has(view)) {
    return res.status(400).json({ error: `view must be one of ${[...VALID_REPORT_VIEWS].join(", ")}` });
  }
  upsertReportView.run({
    user_id: req.userId,
    report_view: view,
    updated_at: Date.now(),
  });
  res.json({ view });
});

export default router;
