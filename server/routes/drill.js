// Drill mode routes (ROADMAP.md A4): a due-item queue, the attempt log, and
// JSON export/import (CORR §4.3 / D4).
//
// Same anonymous-friendly stance as progress.js: this is a single-user app,
// so gating drilling on being logged in would just add friction. getSessionUser
// is the non-throwing lookup; ANON_USER_ID stands in for "no session" — see
// schema.sql's comment on item_review_state for why that has to be a real
// value (0) rather than SQL NULL.
import { Router } from "express";
import db from "../db.js";
import { getSessionUser } from "../auth.js";
import { scheduleReview } from "../fsrs.js";

const router = Router();
const ANON_USER_ID = 0;

const MAX_ITEMS = 200;
const MAX_STRING = 2000;

class BadRequest extends Error {}
function fail(message) {
  throw new BadRequest(message);
}

function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requiredString(value, where) {
  if (typeof value !== "string") fail(`${where} must be a string`);
  if (!value.trim()) fail(`${where} must not be blank`);
  if (value.length > MAX_STRING) fail(`${where} exceeds ${MAX_STRING} characters`);
  return value;
}

const VALID_MODES = new Set(["closed", "open", "exam"]);

// ── Queries ──────────────────────────────────────────────────────────────

const getItemForScheduling = db.prepare(
  "SELECT id, format, retired FROM items WHERE id = ?"
);

const getReviewState = db.prepare(
  "SELECT * FROM item_review_state WHERE user_id = ? AND item_id = ?"
);

const upsertReviewState = db.prepare(`
  INSERT INTO item_review_state
    (user_id, item_id, state, difficulty, stability, due_on, reps, lapses, leech, last_reviewed_at)
  VALUES (@user_id, @item_id, @state, @difficulty, @stability, @due_on, @reps, @lapses, @leech, @last_reviewed_at)
  ON CONFLICT(user_id, item_id) DO UPDATE SET
    state = excluded.state,
    difficulty = excluded.difficulty,
    stability = excluded.stability,
    due_on = excluded.due_on,
    reps = excluded.reps,
    lapses = excluded.lapses,
    leech = excluded.leech,
    last_reviewed_at = excluded.last_reviewed_at
`);

const insertItemAttempt = db.prepare(`
  INSERT INTO item_attempts (user_id, item_id, ts, mode, grade, seconds, tab_blurs, note, abandoned)
  VALUES (@user_id, @item_id, @ts, @mode, @grade, @seconds, @tab_blurs, @note, @abandoned)
`);

/** Apply one graded review: schedule via FSRS, persist state, log the attempt. Returns the new review row. */
function applyReview({ userId, item, grade, ts, mode, seconds, tabBlurs, note }) {
  const existing = getReviewState.get(userId, item.id) ?? null;
  const next = scheduleReview(existing, item.format, grade, new Date(ts));

  upsertReviewState.run({
    user_id: userId,
    item_id: item.id,
    state: next.state,
    difficulty: next.difficulty,
    stability: next.stability,
    due_on: next.dueOn,
    reps: next.reps,
    lapses: next.lapses,
    leech: next.leech ? 1 : 0,
    last_reviewed_at: next.lastReviewedAt,
  });

  insertItemAttempt.run({
    user_id: userId,
    item_id: item.id,
    ts,
    mode,
    grade,
    seconds,
    tab_blurs: tabBlurs,
    note: note ?? null,
    abandoned: 0,
  });

  return next;
}

// GET /api/drill/queue?course=cpp&limit=20
//
// Items eligible for drilling: verified, not retired, and either never
// reviewed by this user or due. Leeches (A8) are excluded from the normal
// queue on purpose — they need the leech-handoff triage flow, not more of
// the same rotation that already failed them 3 times.
//
// New items (no review row) sort first — COALESCE(due_on, 0) treats "never
// reviewed" as maximally overdue. Fine at this bank's size; if the bank grows
// enough that new-item flooding becomes a real problem, that's a
// new-cards-per-day cap to add later, not a reason to hold this back now.
router.get("/queue", (req, res) => {
  const user = getSessionUser(req);
  const userId = user?.id ?? ANON_USER_ID;
  const course = req.query.course;
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), MAX_ITEMS);

  if (!course) return res.status(400).json({ error: "course query param required" });

  const rows = db
    .prepare(
      `SELECT items.id, items.topic_id, items.position, items.format, items.origin,
              items.prompt, items.expected, items.criteria, items.provenance,
              items.difficulty, items.choices, items.answer_index, items.time_budget_sec,
              items.extra_atoms,
              rs.due_on, rs.reps, rs.lapses, rs.leech
       FROM items
       JOIN topics ON topics.id = items.topic_id
       LEFT JOIN item_review_state rs ON rs.item_id = items.id AND rs.user_id = ?
       WHERE topics.course_id = ?
         AND items.verified_by_human = 1
         AND items.retired = 0
         AND (rs.item_id IS NULL OR (rs.leech = 0 AND rs.due_on <= ?))
       ORDER BY COALESCE(rs.due_on, 0) ASC, items.position ASC
       LIMIT ?`
    )
    .all(userId, course, Date.now(), limit);

  res.json(
    rows.map((r) => ({
      id: r.id,
      topicId: r.topic_id,
      format: r.format,
      origin: r.origin,
      prompt: r.prompt,
      expected: r.expected,
      criteria: r.criteria ? JSON.parse(r.criteria) : [],
      provenance: r.provenance ? JSON.parse(r.provenance) : null,
      difficulty: r.difficulty,
      choices: r.choices ? JSON.parse(r.choices) : undefined,
      answerIndex: r.answer_index ?? undefined,
      timeBudgetSec: r.time_budget_sec ?? undefined,
      extraAtoms: r.extra_atoms ? JSON.parse(r.extra_atoms) : undefined,
      review: r.due_on == null ? null : { dueOn: r.due_on, reps: r.reps, lapses: r.lapses, leech: Boolean(r.leech) },
    }))
  );
});

// POST /api/drill/attempts — record one graded (or abandoned) drill attempt.
// Body: { itemId, mode, grade, seconds, tabBlurs, note, abandoned }
//   grade is required and 0..3 unless abandoned is true, in which case it's
//   ignored (the A4 "End drill" escape hatch — the attempt is logged but
//   doesn't move the scheduler, since no real self-assessment happened).
router.post("/attempts", (req, res) => {
  const user = getSessionUser(req);
  const userId = user?.id ?? ANON_USER_ID;
  const body = req.body ?? {};

  let itemId, mode, seconds, tabBlurs, note, abandoned, grade;
  try {
    itemId = requiredString(body.itemId, "itemId");
    mode = requiredString(body.mode, "mode");
    if (!VALID_MODES.has(mode)) fail(`mode must be one of ${[...VALID_MODES].join(", ")}`);
    if (!Number.isInteger(body.seconds) || body.seconds < 0) fail("seconds must be a non-negative integer");
    seconds = body.seconds;
    tabBlurs = Number.isInteger(body.tabBlurs) && body.tabBlurs >= 0 ? body.tabBlurs : 0;
    note = body.note != null ? requiredString(body.note, "note") : null;
    abandoned = Boolean(body.abandoned);
    if (!abandoned) {
      if (!Number.isInteger(body.grade) || body.grade < 0 || body.grade > 3) {
        fail("grade must be an integer 0..3");
      }
      grade = body.grade;
    }
  } catch (err) {
    if (err instanceof BadRequest) return res.status(400).json({ error: err.message });
    throw err;
  }

  const item = getItemForScheduling.get(itemId);
  if (!item) return res.status(400).json({ error: `itemId "${itemId}" does not exist` });
  if (item.retired) return res.status(400).json({ error: `item "${itemId}" is retired` });

  const ts = Date.now();

  if (abandoned) {
    insertItemAttempt.run({
      user_id: userId,
      item_id: itemId,
      ts,
      mode,
      grade: null,
      seconds,
      tab_blurs: tabBlurs,
      note,
      abandoned: 1,
    });
    return res.status(201).json({ ok: true, review: null });
  }

  const review = applyReview({ userId, item, grade, ts, mode, seconds, tabBlurs, note });
  res.status(201).json({
    ok: true,
    review: {
      dueOn: review.dueOn,
      reps: review.reps,
      lapses: review.lapses,
      leech: review.leech,
    },
  });
});

// GET /api/drill/export — the current user's full item-attempt log as JSON.
// D4: "build the JSON export regardless" — cheap insurance against the one
// SQLite file this app's whole history lives in (docs/PRODUCTION_READINESS.md §2.4).
router.get("/export", (req, res) => {
  const user = getSessionUser(req);
  const userId = user?.id ?? ANON_USER_ID;

  const rows = db
    .prepare(
      `SELECT item_id, ts, mode, grade, seconds, tab_blurs, note, abandoned
       FROM item_attempts WHERE user_id = ? ORDER BY ts ASC`
    )
    .all(userId);

  res.json({
    exportedAt: Date.now(),
    attempts: rows.map((r) => ({
      itemId: r.item_id,
      ts: r.ts,
      mode: r.mode,
      grade: r.grade,
      seconds: r.seconds,
      tabBlurs: r.tab_blurs,
      note: r.note,
      abandoned: Boolean(r.abandoned),
    })),
  });
});

// POST /api/drill/import — re-ingest a previously exported attempt log.
// Body: { attempts: [{ itemId, ts, mode, grade, seconds, tabBlurs, note, abandoned }, ...] }
//
// Deliberately simple, not robust (same stance as useProgress.js's
// importLocalHistory): replays the attempts in timestamp order through the
// real scheduler so item_review_state ends up where it would have if this
// history had happened on this install, then logs each row. No dedup against
// attempts already present — re-importing the same file twice double-counts.
// That's an acceptable cost for "restore my history onto a fresh install",
// which is the actual use case this exists for.
router.post("/import", (req, res) => {
  const user = getSessionUser(req);
  const userId = user?.id ?? ANON_USER_ID;

  let rows;
  try {
    const raw = req.body?.attempts;
    if (!Array.isArray(raw)) fail('body must contain an "attempts" array');
    if (raw.length > 5000) fail("attempts array too large (max 5000 per import)");
    rows = raw.map((a, i) => {
      const where = `attempts[${i}]`;
      if (!isPlainObject(a)) fail(`${where} must be an object`);
      const itemId = requiredString(a.itemId, `${where}.itemId`);
      if (!Number.isInteger(a.ts)) fail(`${where}.ts must be an epoch-ms integer`);
      const mode = requiredString(a.mode, `${where}.mode`);
      if (!VALID_MODES.has(mode)) fail(`${where}.mode must be one of ${[...VALID_MODES].join(", ")}`);
      const abandoned = Boolean(a.abandoned);
      let grade = null;
      if (!abandoned) {
        if (!Number.isInteger(a.grade) || a.grade < 0 || a.grade > 3) {
          fail(`${where}.grade must be an integer 0..3`);
        }
        grade = a.grade;
      }
      if (!Number.isInteger(a.seconds) || a.seconds < 0) fail(`${where}.seconds must be a non-negative integer`);
      const tabBlurs = Number.isInteger(a.tabBlurs) && a.tabBlurs >= 0 ? a.tabBlurs : 0;
      return { itemId, ts: a.ts, mode, grade, seconds: a.seconds, tabBlurs, note: a.note ?? null, abandoned };
    });
  } catch (err) {
    if (err instanceof BadRequest) return res.status(400).json({ error: err.message });
    throw err;
  }

  rows.sort((a, b) => a.ts - b.ts);

  const itemCache = new Map();
  const imported = db.transaction(() => {
    let count = 0;
    for (const row of rows) {
      let item = itemCache.get(row.itemId);
      if (item === undefined) {
        item = getItemForScheduling.get(row.itemId) ?? null;
        itemCache.set(row.itemId, item);
      }
      if (!item) continue; // unknown item id — skip rather than fail the whole import

      if (row.abandoned || row.grade == null) {
        insertItemAttempt.run({
          user_id: userId,
          item_id: row.itemId,
          ts: row.ts,
          mode: row.mode,
          grade: null,
          seconds: row.seconds,
          tab_blurs: row.tabBlurs,
          note: row.note,
          abandoned: 1,
        });
      } else {
        applyReview({
          userId,
          item,
          grade: row.grade,
          ts: row.ts,
          mode: row.mode,
          seconds: row.seconds,
          tabBlurs: row.tabBlurs,
          note: row.note,
        });
      }
      count++;
    }
    return count;
  })();

  res.status(201).json({ ok: true, imported });
});

export default router;
