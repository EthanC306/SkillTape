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
import {
  chatJSON,
  listModels,
  resolveHost,
  DEFAULT_MODEL,
  OllamaUnavailableError,
  OllamaBadResponseError,
  OllamaHostNotAllowedError,
} from "../ollama.js";

const router = Router();
const ANON_USER_ID = 0;

const MAX_ITEMS = 200;
const MAX_STRING = 2000;
const MAX_GRADE_BATCH_ITEMS = 12;

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

/** Validates POST /grade-batch's `items` array. Reuses this file's existing string/object checks. */
function requireArrayOfAnswers(items) {
  if (!Array.isArray(items)) fail('body must contain an "items" array');
  if (items.length === 0) fail("items must not be empty");
  if (items.length > MAX_GRADE_BATCH_ITEMS) {
    fail(`items may contain at most ${MAX_GRADE_BATCH_ITEMS} (got ${items.length})`);
  }
  return items.map((it, i) => {
    const where = `items[${i}]`;
    if (!isPlainObject(it)) fail(`${where} must be an object`);
    const itemId = requiredString(it.itemId, `${where}.itemId`);
    if (typeof it.answer !== "string") fail(`${where}.answer must be a string`);
    if (it.answer.length > MAX_STRING) fail(`${where}.answer exceeds ${MAX_STRING} characters`);
    return { itemId, answer: it.answer };
  });
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

// Separate from getItemForScheduling on purpose — that query is also used by
// /leeches/:itemId/reset, /attempts, and /import, none of which need the
// extra columns. Practice mode's grading route looks the rubric up here by
// itemId rather than trusting anything the client sends, same stance as
// every other route in this file.
const getItemForGrading = db.prepare(
  "SELECT id, format, prompt, expected, criteria, retired FROM items WHERE id = ?"
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

// ── Practice mode grading (Ollama) ──────────────────────────────────────
//
// Grading happens server-side only (server/ollama.js) — the browser never
// talks to Ollama directly, same "only src/api/client.js knows HTTP exists"
// boundary the rest of this app follows.

// Small local models grade free text badly by default: confident, specific,
// wrong. This prompt exists to counter that failure mode specifically, not
// just to describe the task. Every rule below is here because a 7B model was
// observed breaking it against this bank's own items:
//   - Evidence BEFORE verdict, per criterion. Asking for a bare boolean lets
//     the model commit to a verdict with no intermediate reasoning tokens;
//     asking for {criterion, searched_for, met} in that key order forces it
//     to name the span it's judging before it judges, which is where the
//     accuracy actually comes from in JSON-mode generation.
//   - And make that span load-bearing, not decorative: met:false is only
//     allowed with a real quote from the student's answer attached, and "I
//     can't produce the quote" resolves to met:true. A model asked to
//     justify an omission it invented tends to notice it can't, which
//     catches far more false negatives than a bare "be lenient" does.
//     Observed: without an explicit ban, the model quotes the *reference
//     answer* here instead, which satisfies the rule vacuously and defeats
//     the whole mechanism — hence the "student's own words" rule, stated
//     twice, and "no relevant content" as the single sanctioned escape.
//   - Judge each span against the criterion, never against the reference
//     answer's phrasing. Both remaining failures in testing were the model
//     marking a claim unmet because the student wrote NULL for nullptr or
//     said it informally — it had found the right words and rejected them
//     for not matching the reference's vocabulary. The worked example is
//     deliberately from a different topic than anything in this bank, so
//     it teaches the equivalence rule rather than one item's answer.
//   - Echo the criterion, and state criteriaCount in the payload. The
//     response validation below drops any item whose criteria array doesn't
//     match the rubric length; merging two related criteria into one entry
//     was the most common way a 7B response got rejected outright.
//   - Bias uncertain judgments toward met:true. The deterministic scoring
//     below already treats partial coverage more gently than a wrong answer
//     (criteriaToGrade), so a wrongly-generous "met" costs little; a
//     wrongly-strict "unmet" is what turns a correct answer into
//     "incorrect" — the exact bug this prompt is tuned against.
//
// The criteria array is the reference answer already decomposed into its
// distinct required claims, by the human who authored the item — so the
// model never does that decomposition itself, and can't quietly grade
// against a stricter rubric than the one the results card shows the user.
const GRADE_SYSTEM_PROMPT =
  "You grade one or more student answers for a closed-book CS study app. For each item you are given the prompt, the reference answer, a rubric of criteria, and the student's own answer. Each criterion is one distinct required claim, already decomposed for you by a human — judge exactly those criteria, never claims you decomposed yourself.\n\n" +
  "Ground every judgment ONLY in the reference answer and criteria given to you — never in outside knowledge of the topic. You are not the authority on the subject; the reference answer is. Do not require a detail, number, or range the reference answer itself never states. If the student's answer names a constant, variable, or identifier from the prompt (e.g. CAPACITY, N), assume it holds whatever value makes the answer correct unless the reference explicitly contradicts it — do not penalize for not restating it literally.\n\n" +
  "GRADING PROCEDURE — for each criterion, in this order:\n" +
  "1. Copy the criterion verbatim into criterion.\n" +
  "2. Scan the whole student answer for the span that comes closest to satisfying it, and copy that span word-for-word into searched_for. Copy the shortest span that bears on the criterion — a phrase or a clause, not the student's whole answer.\n" +
  "3. Only then set met, judged from the span you just copied.\n\n" +
  "HARD RULES:\n" +
  "- searched_for must be text copied out of studentAnswer. NEVER put the reference answer, the item prompt, or the criterion itself there — quoting anything other than the student's own words is always wrong and makes your verdict invalid.\n" +
  "- Set met:false only when searched_for holds a real span of the student's answer that you have read and found lacking. If the student's answer says nothing at all on the subject of that criterion, write exactly \"no relevant content\" in searched_for; that is the only case in which searched_for may hold anything other than the student's own words.\n" +
  "- Judge that span against THIS CRITERION ONLY. The reference answer is background, never a template the student has to match: never withhold met because the span words the claim differently than the reference does, and never require a detail the criterion itself does not ask for.\n" +
  "- The criterion is satisfied if the span conveys the same idea in ANY wording: synonyms (NULL for nullptr, link or address for pointer, struct or record for node), equivalent notation, informal phrasing, a more technical restatement, or a worked example that only holds if the claim is true. met:false is the burden-of-proof verdict — set it only if the span, read as generously as it can honestly be read, still cannot be expressing the criterion's claim.\n" +
  "- WORKED EXAMPLE of that rule. Criterion: \"States that lookup by index is constant time\". Span: \"you can jump straight to any slot, doesn't matter how big it is\". Verdict: met:true — the student never wrote \"constant time\" or \"O(1)\", but the span asserts exactly that fact in their own words. Judge every criterion this way.\n" +
  "- Before writing met:false, read the span in searched_for once more, on its own. If that span already asserts the criterion's claim — even partially, even in different words — set met:true. Contradicting your own quoted span is the worst error you can make here.\n" +
  "- If you are genuinely unsure whether a criterion is satisfied, set met:true — do not guess unmet.\n" +
  "- Only treat something as wrong if it contradicts the reference answer. If the student states something the reference does not cover, and the reference does not contradict it, treat it as extra credit, not an error.\n" +
  "- If the student's answer is correct under a standard interpretation the reference answer does not use, set met:true and note the framing difference in the rationale instead of penalizing it.\n" +
  "- Extra detail, caveats, and alternate interpretations never lower a grade.\n" +
  "- met must agree with what you say in the rationale: if the rationale credits the student with something, the criterion covering it is met:true.\n\n" +
  "Then write a rationale: 1-2 sentences addressed directly to the student in the second person, naming what was right or missing. Do not restate the question.\n\n" +
  "Respond with ONLY this JSON shape, one entry per item given, using the same itemIds. criteria must hold exactly criteriaCount entries, one per criterion, in the order given — never merge two criteria into one entry, skip one, or reorder them: " +
  '{"results":[{"itemId":"...","criteria":[{"criterion":"...","searched_for":"...","met":true},{"criterion":"...","searched_for":"...","met":false}],"rationale":"..."}]}';

/** Deterministic criteria-met -> 0-3 grade, matching DrillView.jsx's own UI copy ("3 of 4 = Good, not Easy"). Computed here, never trusted from the model. Exported for test/criteriaToGrade.test.js. */
export function criteriaToGrade(met, total) {
  if (total === 0) return null;
  if (met === total) return 3;
  if (met >= Math.ceil(total * 0.75)) return 2;
  if (met > 0) return 1;
  return 0;
}

/** grade >= 2 ("correct") matches /stats' existing "grade >= 2 (Good/Easy) counts as a pass" convention. */
function gradeToVerdict(grade) {
  if (grade == null) return "ungraded";
  return grade >= 2 ? "correct" : grade === 1 ? "partial" : "incorrect";
}

function fallbackResult(itemId) {
  return { itemId, grade: null, verdict: "ungraded", criteriaMet: [], rationale: null, gradedBy: "fallback" };
}

// POST /api/drill/grade-batch — grade up to MAX_GRADE_BATCH_ITEMS free-text
// Practice answers in one call to the configured local Ollama model.
// Body: { items: [{ itemId, answer }], model?, host? }
//
// Stateless: no DB writes here. Practice logs the resulting grades through
// the existing, unmodified POST /api/drill/attempts, exactly like a
// self-graded Drill/Exam item would — server/fsrs.js's scheduleReview takes
// a bare 0-3 int and has no idea where it came from.
//
// Fails open at two levels, both required so one bad chunk or one malformed
// item never blocks the rest of a Practice session: if Ollama is
// unreachable or never returns usable JSON even after chatJSON's internal
// retry, every item in the request falls back to "ungraded". If the
// response parses but is missing an item, or that item's criteriaMet length
// doesn't match its real criteria count, only THAT item falls back — its
// siblings still grade normally.
router.post("/grade-batch", async (req, res) => {
  const body = req.body ?? {};

  let requested;
  try {
    requested = requireArrayOfAnswers(body.items);
  } catch (err) {
    if (err instanceof BadRequest) return res.status(400).json({ error: err.message });
    throw err;
  }

  // Not fail-open like the Ollama errors below: a host outside the
  // allowlist (server/ollama.js) is a bad request or an SSRF probe, not an
  // outage, and answering it with a plausible "ungraded" would hand the
  // caller a working oracle anyway.
  let host;
  try {
    host = resolveHost(body.host);
  } catch (err) {
    if (err instanceof OllamaHostNotAllowedError) return res.status(400).json({ error: err.message });
    throw err;
  }
  const model = typeof body.model === "string" && body.model.trim() ? body.model.trim() : DEFAULT_MODEL;

  const items = [];
  for (const { itemId, answer } of requested) {
    const row = getItemForGrading.get(itemId);
    if (!row) return res.status(400).json({ error: `itemId "${itemId}" does not exist` });
    if (row.retired) return res.status(400).json({ error: `item "${itemId}" is retired` });
    if (row.format === "mcq") {
      return res
        .status(400)
        .json({ error: `item "${itemId}" is mcq — grade it client-side, it never needs this route` });
    }
    items.push({
      itemId,
      answer,
      prompt: row.prompt,
      expected: row.expected,
      criteria: row.criteria ? JSON.parse(row.criteria) : [],
    });
  }

  const criteriaCountById = new Map(items.map((it) => [it.itemId, it.criteria.length]));

  let parsed;
  try {
    parsed = await chatJSON({
      host,
      model,
      system: GRADE_SYSTEM_PROMPT,
      user: JSON.stringify(
        items.map((it) => ({
          itemId: it.itemId,
          prompt: it.prompt,
          expected: it.expected,
          criteria: it.criteria,
          // Stated explicitly, not left implicit in criteria.length: the
          // one-entry-per-criterion contract the response validation below
          // enforces is the single most common way a 7B model's output gets
          // rejected (it merges two related criteria into one entry), and a
          // number it can echo holds it to the count far better than the
          // array alone does.
          criteriaCount: it.criteria.length,
          studentAnswer: it.answer,
        }))
      ),
      // Observed directly against this machine's RTX 2070 Super: a cold
      // model load (not yet resident in VRAM, or evicted after
      // OLLAMA_GRADING.md's keep_alive window) can take 20s+ on its own,
      // before a single token of the actual response. chatJSON's 30s
      // default is tuned for an already-warm model; grading needs more
      // headroom for the first call of a session.
      timeoutMs: 60000,
      // Grading isn't creative — chatJSON's 0.15 default is for general use,
      // this call wants the same criteria judged the same way every time.
      temperature: 0,
    });
  } catch (err) {
    if (err instanceof OllamaUnavailableError || err instanceof OllamaBadResponseError) {
      return res.json({ modelUsed: model, results: items.map((it) => fallbackResult(it.itemId)) });
    }
    throw err;
  }

  const byId = new Map();
  if (Array.isArray(parsed?.results)) {
    for (const r of parsed.results) {
      if (r && typeof r.itemId === "string") byId.set(r.itemId, r);
    }
  }

  const results = items.map((it) => {
    const total = criteriaCountById.get(it.itemId) ?? 0;
    const r = byId.get(it.itemId);
    // criteria is [{ criterion, searched_for, met }, ...] — the "evidence
    // first" shape the prompt asks for, forcing the model to quote the span
    // it's judging before committing to the boolean. criteriaMet (sent to
    // the client, and used for the deterministic grade below) is just the
    // extracted booleans; the echoed criterion and the quote are reasoning
    // scaffolding, server-side only, never shown. Nothing here validates
    // that a met:false actually carries a student quote — the quote's job is
    // to change what the model generates next, and a wrongly-graded item is
    // already a recoverable one-attempt error (docs/OLLAMA_GRADING.md §3).
    const criteriaArr = Array.isArray(r?.criteria) ? r.criteria : null;
    if (!r || !criteriaArr || criteriaArr.length !== total) {
      return fallbackResult(it.itemId);
    }
    const criteriaMet = criteriaArr.map((c) => Boolean(c?.met));
    const met = criteriaMet.filter(Boolean).length;
    const grade = criteriaToGrade(met, total);
    return {
      itemId: it.itemId,
      grade,
      verdict: gradeToVerdict(grade),
      criteriaMet,
      rationale: typeof r.rationale === "string" ? r.rationale : null,
      gradedBy: "ollama",
    };
  });

  res.json({ modelUsed: model, results });
});

// GET /api/drill/ollama-status?host=&model= — reachability + whether `model`
// is pulled, for SettingsMenu's "test connection" button. Always 200, even
// when Ollama is unreachable: this is a status probe, not a failed request,
// and src/api/client.js's api() throws on any non-2xx — a 4xx/5xx here would
// force the ordinary "not running yet" case into a try/catch instead of a
// plain `reachable: false` field.
router.get("/ollama-status", async (req, res) => {
  const model =
    typeof req.query.model === "string" && req.query.model.trim() ? req.query.model.trim() : DEFAULT_MODEL;
  try {
    // Inside the try on purpose: a disallowed host is reported through the
    // same always-200 shape rather than as a thrown 400, flagged with
    // hostAllowed:false so SettingsMenu can say "that host isn't allowed"
    // instead of the misleading "Ollama unreachable".
    const host = resolveHost(req.query.host);
    const models = await listModels({ host });
    res.json({ reachable: true, hostAllowed: true, models, modelAvailable: models.includes(model) });
  } catch (err) {
    if (err instanceof OllamaHostNotAllowedError) {
      return res.json({ reachable: false, hostAllowed: false, models: [], modelAvailable: false, error: err.message });
    }
    if (err instanceof OllamaUnavailableError) {
      return res.json({ reachable: false, hostAllowed: true, models: [], modelAvailable: false, error: err.message });
    }
    throw err;
  }
});

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
