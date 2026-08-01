// Quiz progress routes.
//
// Storage shape (server/schema.sql `attempts`) is ONE ROW PER ITEM ANSWERED,
// not one per quiz run — see the comment above that table for why (leech
// detection and per-item scheduling need per-item rows; a per-run shape can't
// be un-collapsed later). `run_id` groups the rows of a single sitting back
// together so the UI's older {best, total, runs, history} shape is still
// derivable — GET below does exactly that derivation, in SQL.
//
// Like topics.js, the request body is treated as hostile: the quiz UI does
// its own bookkeeping, but that runs in a browser the user controls, so this
// is the boundary that actually holds.
import { Router } from "express";
import db from "../db.js";
import { getSessionUser } from "../auth.js";

const router = Router();

// Same bounds philosophy as topics.js: nowhere near a legitimate quiz run,
// just a backstop against a looping or malformed client.
const MAX_ITEMS = 200;
const MAX_STRING = 200;

/** A rejected payload. The handler converts this — and only this — into a 400. */
class BadRequest extends Error {}

function fail(message) {
  throw new BadRequest(message);
}

function requiredString(value, where) {
  if (typeof value !== "string") fail(`${where} must be a string`);
  if (!value.trim()) fail(`${where} must not be blank`);
  if (value.length > MAX_STRING) fail(`${where} exceeds ${MAX_STRING} characters`);
  return value;
}

function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireArray(body, key) {
  const items = body?.[key];
  if (!Array.isArray(items)) fail(`body must contain a "${key}" array`);
  if (items.length === 0) fail(`"${key}" must not be empty`);
  if (items.length > MAX_ITEMS) {
    fail(`${key} may contain at most ${MAX_ITEMS} items (got ${items.length})`);
  }
  return items;
}

const getTopic = db.prepare("SELECT id FROM topics WHERE id = ?");

/**
 * One client result → one bound-parameter object for insertAttempt.
 *
 * questionId is nullable: Master Set runs aren't persisted at all today (see
 * MasterQuizView, whose onFinish is a deliberate no-op), but the one-time
 * localStorage importer (useProgress.js) reconstructs old history that was
 * never stored with question ids — only booleans — so it has no id to send.
 * `attempts.question_id` is `ON DELETE SET NULL` for exactly this case.
 */
function resultRow(item, i) {
  const where = `results[${i}]`;
  if (!isPlainObject(item)) fail(`${where} must be an object`);
  const { questionId, correct } = item;
  if (questionId != null && !Number.isInteger(questionId)) {
    fail(`${where}.questionId must be an integer or null`);
  }
  if (typeof correct !== "boolean") fail(`${where}.correct must be a boolean`);
  return { position: i, question_id: questionId ?? null, correct: correct ? 1 : 0 };
}

const insertAttempt = db.prepare(`
  INSERT INTO attempts (user_id, run_id, topic_id, question_id, position, correct, created_at)
  VALUES (@user_id, @run_id, @topic_id, @question_id, @position, @correct, @created_at)
`);

// One transaction per run: every row of a sitting commits together, so a
// failure partway through never leaves a half-recorded quiz in the history.
const insertRun = db.transaction((topicId, runId, userId, rows) => {
  const createdAt = Date.now(); // one timestamp for the whole sitting
  for (const row of rows) {
    insertAttempt.run({
      user_id: userId,
      run_id: runId,
      topic_id: topicId,
      question_id: row.question_id,
      position: row.position,
      correct: row.correct,
      created_at: createdAt,
    });
  }
});

// POST /api/attempts — record one finished quiz run.
// Body: { topicId, runId, results: [{ questionId, correct }, ...] }
//
// Deliberately NOT behind requireAuth — quiz-taking stays anonymous-friendly
// (this is a single-user app; gating results on login would just add friction
// for no benefit). Instead, getSessionUser is the non-throwing lookup: if a
// valid session cookie happens to be present, its rows get a user_id; if not,
// user_id stays NULL exactly as before auth existed.
router.post("/attempts", (req, res) => {
  const user = getSessionUser(req);

  let topicId, runId, rows;
  try {
    topicId = requiredString(req.body?.topicId, "topicId");
    runId = requiredString(req.body?.runId, "runId");
    rows = requireArray(req.body, "results").map(resultRow);
  } catch (err) {
    if (err instanceof BadRequest) return res.status(400).json({ error: err.message });
    throw err;
  }

  // topic_id is a FK — check up front so a bad id is a clean 400 instead of a
  // SQLite constraint violation surfacing as a 500.
  if (!getTopic.get(topicId)) {
    return res.status(400).json({ error: `topicId "${topicId}" does not exist` });
  }

  insertRun(topicId, runId, user?.id ?? null, rows);
  res.status(201).json({ ok: true });
});

// GET /api/progress — every topic's quiz history, aggregated from `attempts`.
//
// Shape must match what useProgress.js used to build from localStorage, since
// Home.jsx, HistoryModal.jsx, and TopicView.jsx all read it and were not
// changed: { [topicId]: { best, total, runs, history } } where
//   best    — highest correct-count across all runs for that topic
//   total   — item count of the MOST RECENT run (mirrors the old localStorage
//             code, which overwrote `total` on every recordRun call rather
//             than tracking a max — Home.jsx divides best/total for a percent,
//             so this only drifts from "correct" if a topic's question count
//             changes between edits, same as it always could)
//   runs    — number of distinct run_ids (sittings), not rows
//   history — last 50 runs, oldest first, each { correct, total, results, date }
//             where `results` is an array of booleans in answered order —
//             HistoryModal just checks truthiness per entry to color a bar.
router.get("/progress", (req, res) => {
  // One row per run (COUNT/SUM/MIN done in SQL, not by looping in JS), then
  // grouped into per-topic history below. Ordered oldest-first so the final
  // `.slice(-50)` keeps the most recent runs, same as the old `.slice(-50)`
  // in useProgress.js appending each new run to the end of the array.
  const runs = db
    .prepare(
      `SELECT topic_id, run_id, COUNT(*) AS total, SUM(correct) AS correct,
              MIN(created_at) AS date, MIN(id) AS first_id
       FROM attempts
       GROUP BY run_id, topic_id
       ORDER BY date ASC, first_id ASC`
    )
    .all();

  // Per-run ordered results, keyed by run_id — the booleans HistoryModal draws.
  const resultRows = db
    .prepare("SELECT run_id, correct FROM attempts ORDER BY run_id, position")
    .all();
  const resultsByRun = new Map();
  for (const r of resultRows) {
    if (!resultsByRun.has(r.run_id)) resultsByRun.set(r.run_id, []);
    resultsByRun.get(r.run_id).push(Boolean(r.correct));
  }

  const progress = {};
  for (const run of runs) {
    const p = (progress[run.topic_id] ??= { best: 0, total: 0, runs: 0, history: [] });
    p.best = Math.max(p.best, run.correct);
    p.total = run.total; // last write wins — runs are in ascending date order
    p.runs += 1;
    p.history.push({
      correct: run.correct,
      total: run.total,
      results: resultsByRun.get(run.run_id) ?? [],
      date: run.date,
    });
  }
  for (const topicId in progress) {
    progress[topicId].history = progress[topicId].history.slice(-50);
  }

  res.json(progress);
});

export default router;
