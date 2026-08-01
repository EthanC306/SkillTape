// Drill mode routes (ROADMAP.md A4) and the exam simulator (A5): a due-item
// queue, the attempt log, JSON export/import (CORR §4.3 / D4), an
// examWeight-sampled item set, and closed-book accuracy stats for the exam
// report's "vs. drill accuracy" comparison.
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

/** One `items` row -> the item shape both /queue and /exam send to the client. */
function rowToItem(r) {
  return {
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
  };
}

/** Fisher-Yates. Never mutates the input. */
function shuffled(arr) {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

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
      ...rowToItem(r),
      review: r.due_on == null ? null : { dueOn: r.due_on, reps: r.reps, lapses: r.lapses, leech: Boolean(r.leech) },
    }))
  );
});

// GET /api/drill/exam?course=cpp&count=20&minutes=50
//
// A5: samples across topics by examWeight, mixed formats and topics (no
// grouping), no scheduling/due-date filter at all — an exam draws from
// everything verified, not just what's due, because a real exam doesn't
// care what your spaced-repetition schedule says is due today.
//
// Sampling: each topic's share of `count` is proportional to its
// examWeight among topics that actually have eligible items (topics with
// zero verified items can't be drawn from, so their weight doesn't get to
// starve the topics that can). Every eligible topic gets at least 1 item if
// `count` allows one. Not exact — rounding and per-topic item caps mean the
// total can land a little above or below `count` — "~N items" is the
// contract here, not an exact quota system.
router.get("/exam", (req, res) => {
  const course = req.query.course;
  if (!course) return res.status(400).json({ error: "course query param required" });
  const count = Math.min(Math.max(parseInt(req.query.count, 10) || 20, 1), 100);
  const minutes = Math.min(Math.max(parseInt(req.query.minutes, 10) || 50, 5), 240);

  const topics = db
    .prepare("SELECT id, title, exam_weight FROM topics WHERE course_id = ? ORDER BY position")
    .all(course);
  if (!topics.length) return res.status(400).json({ error: `no topics for course "${course}"` });

  const getEligibleItems = db.prepare(`
    SELECT id, topic_id, position, format, origin, prompt, expected, criteria, provenance,
           difficulty, choices, answer_index, time_budget_sec, extra_atoms
    FROM items WHERE topic_id = ? AND verified_by_human = 1 AND retired = 0
  `);

  const eligibleTopics = [];
  const poolByTopic = new Map();
  for (const t of topics) {
    const pool = getEligibleItems.all(t.id);
    if (pool.length) {
      eligibleTopics.push(t);
      poolByTopic.set(t.id, pool);
    }
  }

  if (!eligibleTopics.length) {
    return res.json({ items: [], topics: {}, minutes });
  }

  const weightSum = eligibleTopics.reduce((s, t) => s + t.exam_weight, 0);
  const sampled = [];
  const topicMeta = {};
  for (const t of eligibleTopics) {
    const pool = poolByTopic.get(t.id);
    const share = t.exam_weight / weightSum;
    const quota = Math.min(pool.length, Math.max(1, Math.round(share * count)));
    const picked = shuffled(pool).slice(0, quota);
    for (const r of picked) sampled.push({ ...rowToItem(r), topicTitle: t.title, examWeight: t.exam_weight });
    topicMeta[t.id] = { title: t.title, examWeight: t.exam_weight, sampled: picked.length, available: pool.length };
  }

  res.json({ items: shuffled(sampled), topics: topicMeta, minutes });
});

// GET /api/drill/stats?course=cpp — per-topic closed-book accuracy, for the
// exam report's "vs. drill accuracy" comparison (A5). "Accuracy" here is the
// same definition DrillView's grading uses for correctness: grade >= 2
// (Good/Easy) counts as a pass, matching how MCQ auto-grading maps
// correct/incorrect onto the same 0-3 scale (server/routes/drill.js's
// submitMcq-equivalent, POST /attempts).
router.get("/stats", (req, res) => {
  const user = getSessionUser(req);
  const userId = user?.id ?? ANON_USER_ID;
  const course = req.query.course;
  if (!course) return res.status(400).json({ error: "course query param required" });

  const rows = db
    .prepare(
      `SELECT items.topic_id AS topic_id,
              COUNT(*) AS attempts,
              SUM(CASE WHEN item_attempts.grade >= 2 THEN 1 ELSE 0 END) AS passes
       FROM item_attempts
       JOIN items ON items.id = item_attempts.item_id
       JOIN topics ON topics.id = items.topic_id
       WHERE topics.course_id = ? AND item_attempts.user_id = ? AND item_attempts.mode = 'closed'
         AND item_attempts.abandoned = 0 AND item_attempts.grade IS NOT NULL
       GROUP BY items.topic_id`
    )
    .all(course, userId);

  const stats = {};
  for (const r of rows) {
    stats[r.topic_id] = { attempts: r.attempts, accuracy: r.attempts ? r.passes / r.attempts : null };
  }
  res.json(stats);
});

// GET /api/drill/report?course=cpp — the standing dashboard (A6).
//
// "Only one number predicts the exam: closed-book, first-try, timed accuracy
// per topic. Everything else is diagnostic" (ROADMAP.md A6) — so that number
// (`firstTryAccuracy`) drives `studyNextScore` and the weakest-topics
// ranking; format item-counts, median time, the open/closed delta, and leech
// count are surfaced per topic as the diagnostics, not the ranking signal.
//
// "First-try" means the earliest CLOSED, non-abandoned, graded attempt per
// item — computed in JS from the raw attempt rows rather than a bigger SQL
// query, since the same per-item first-attempt needs to feed three different
// aggregations (topic accuracy, format-level median seconds, open/closed
// delta) and the bank is nowhere near large enough for that to matter.
router.get("/report", (req, res) => {
  const user = getSessionUser(req);
  const userId = user?.id ?? ANON_USER_ID;
  const course = req.query.course;
  if (!course) return res.status(400).json({ error: "course query param required" });

  const topics = db
    .prepare("SELECT id, title, exam_weight FROM topics WHERE course_id = ? ORDER BY position")
    .all(course);
  if (!topics.length) return res.status(400).json({ error: `no topics for course "${course}"` });
  const topicIds = new Set(topics.map((t) => t.id));

  const items = db
    .prepare(
      `SELECT items.id, items.topic_id, items.format, items.verified_by_human, items.retired,
              items.prompt, items.expected, items.criteria, items.provenance
       FROM items JOIN topics ON topics.id = items.topic_id
       WHERE topics.course_id = ?`
    )
    .all(course);
  const itemById = new Map(items.map((it) => [it.id, it]));

  const reviewRows = db
    .prepare(
      `SELECT item_review_state.item_id, item_review_state.leech, item_review_state.lapses
       FROM item_review_state
       JOIN items ON items.id = item_review_state.item_id
       JOIN topics ON topics.id = items.topic_id
       WHERE topics.course_id = ? AND item_review_state.user_id = ?`
    )
    .all(course, userId);
  const reviewByItem = new Map(reviewRows.map((r) => [r.item_id, r]));

  const attempts = db
    .prepare(
      `SELECT item_attempts.item_id, item_attempts.ts, item_attempts.mode, item_attempts.grade, item_attempts.seconds
       FROM item_attempts
       JOIN items ON items.id = item_attempts.item_id
       JOIN topics ON topics.id = items.topic_id
       WHERE topics.course_id = ? AND item_attempts.user_id = ? AND item_attempts.abandoned = 0
             AND item_attempts.grade IS NOT NULL
       ORDER BY item_attempts.ts ASC`
    )
    .all(course, userId);

  // First graded, non-abandoned attempt per item, split by mode — the
  // earliest row per (item, mode) since `attempts` is already ts-ascending.
  const firstByItemMode = new Map(); // `${itemId}:${mode}` -> attempt
  for (const a of attempts) {
    const key = `${a.item_id}:${a.mode}`;
    if (!firstByItemMode.has(key)) firstByItemMode.set(key, a);
  }

  const formatSecondsClosed = {}; // format -> seconds[] (first-try closed only)
  const byTopic = new Map(topics.map((t) => [t.id, { topic: t, formats: {}, closedFirstTry: [], openFirstTry: [] }]));

  for (const it of items) {
    const bucket = byTopic.get(it.topic_id);
    const fmt = (bucket.formats[it.format] ??= { total: 0, verified: 0 });
    fmt.total += 1;
    if (it.verified_by_human && !it.retired) fmt.verified += 1;

    const closed = firstByItemMode.get(`${it.id}:closed`);
    if (closed) {
      bucket.closedFirstTry.push(closed.grade >= 2 ? 1 : 0);
      (formatSecondsClosed[it.format] ??= []).push(closed.seconds);
    }
    const open = firstByItemMode.get(`${it.id}:open`);
    if (open) bucket.openFirstTry.push(open.grade >= 2 ? 1 : 0);
  }

  function median(nums) {
    if (!nums.length) return null;
    const sorted = [...nums].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }
  function mean(nums) {
    return nums.length ? nums.reduce((s, n) => s + n, 0) / nums.length : null;
  }

  const topicReports = topics.map((t) => {
    const b = byTopic.get(t.id);
    const firstTryAccuracy = mean(b.closedFirstTry);
    const openAccuracy = mean(b.openFirstTry);
    const leechCount = items.filter((it) => it.topic_id === t.id && reviewByItem.get(it.id)?.leech).length;
    const verifiedItemCount = Object.values(b.formats).reduce((s, f) => s + f.verified, 0);
    // Unattempted topics rank as maximum priority (mastery 0) — nothing
    // demonstrated yet outranks something demonstrated shakily. That's also
    // true, and arguably more urgent, for a topic with NO verified items at
    // all — but "study this next" isn't actionable there (there's nothing to
    // drill yet), so the UI is expected to read verifiedItemCount and say
    // "migrate this topic first" rather than link straight into Drill.
    const mastery = firstTryAccuracy ?? 0;
    return {
      id: t.id,
      title: t.title,
      examWeight: t.exam_weight,
      formats: b.formats,
      verifiedItemCount,
      firstTryAccuracy,
      firstTryCount: b.closedFirstTry.length,
      openClosedDelta: openAccuracy != null && firstTryAccuracy != null ? openAccuracy - firstTryAccuracy : null,
      leechCount,
      meetsTarget: t.exam_weight >= 1.0 ? firstTryAccuracy != null && firstTryAccuracy >= 0.85 : null,
      studyNextScore: t.exam_weight * (1 - mastery),
    };
  });

  const formatMedianSeconds = {};
  for (const [fmt, secs] of Object.entries(formatSecondsClosed)) formatMedianSeconds[fmt] = median(secs);

  const weakest = [...topicReports]
    .filter((t) => t.firstTryCount > 0 || t.examWeight >= 1.0)
    .sort((a, b) => b.studyNextScore - a.studyNextScore)
    .slice(0, 3)
    .map((t) => t.id);

  // Leech detail (also what A8's "copy for tutor" handoff needs): full
  // content plus this user's complete attempt history for that item.
  const leeches = items
    .filter((it) => topicIds.has(it.topic_id) && reviewByItem.get(it.id)?.leech)
    .map((it) => {
      const t = topics.find((x) => x.id === it.topic_id);
      const history = attempts
        .filter((a) => a.item_id === it.id)
        .map((a) => ({ ts: a.ts, mode: a.mode, grade: a.grade, seconds: a.seconds }));
      return {
        itemId: it.id,
        topicId: it.topic_id,
        topicTitle: t?.title,
        format: it.format,
        prompt: it.prompt,
        expected: it.expected,
        criteria: it.criteria ? JSON.parse(it.criteria) : [],
        provenance: it.provenance ? JSON.parse(it.provenance) : null,
        lapses: reviewByItem.get(it.id)?.lapses ?? 0,
        history,
      };
    });

  res.json({ topics: topicReports, formatMedianSeconds, leeches, weakest });
});

// POST /api/drill/leeches/:itemId/reset — A8's "reset scheduling state"
// leech-handoff outcome: "concept landed, item is fine" — clear lapses/leech
// and drop the item back to a fresh, never-reviewed state so it re-enters
// normal rotation immediately instead of staying parked. Does NOT touch the
// item's content (prompt/expected/criteria) — "rewrite the item" and "split
// the fact" are content edits with no authoring UI yet (A7), so those two
// outcomes stay a direct file edit for now, same as verifiedByHuman today.
const deleteReviewState = db.prepare("DELETE FROM item_review_state WHERE user_id = ? AND item_id = ?");
router.post("/leeches/:itemId/reset", (req, res) => {
  const user = getSessionUser(req);
  const userId = user?.id ?? ANON_USER_ID;
  const itemId = req.params.itemId;

  const item = getItemForScheduling.get(itemId);
  if (!item) return res.status(400).json({ error: `itemId "${itemId}" does not exist` });

  // Deleting the row (rather than zeroing its fields) is equivalent to
  // "never reviewed" — the exact state a genuinely new item is in, and
  // /queue already treats a missing row as eligible immediately.
  deleteReviewState.run(userId, itemId);
  res.json({ ok: true });
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
