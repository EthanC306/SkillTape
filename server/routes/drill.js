// Drill mode and the exam simulator (A5): a due-item
// queue, the attempt log, an examWeight-sampled item set, and closed-book accuracy stats for the exam
// report's "vs. drill accuracy" comparison.


import { Router } from "express";
import db from "../db.js";
import { getSessionUser } from "../auth.js";
import {
  scheduleReview,
  previewRatings,
  getRetrievability,
  forgettingCurve,
  recomputeDue,
  normalizeSettings,
  isDuplicateReview,
  deriveGrade,
  dueBoundary,
  startOfDay,
  stateName,
  DEFAULT_SETTINGS,
  PARAMS_VERSION,
  State,
} from "../fsrs.js";
import { applyWriteCap } from "../../src/data/itemSchema.js";
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

const getItemForGrading = db.prepare(
  "SELECT id, format, prompt, expected, criteria, retired FROM items WHERE id = ?"
);

const getReviewState = db.prepare(
  "SELECT * FROM item_review_state WHERE user_id = ? AND item_id = ?"
);

const upsertReviewState = db.prepare(`
  INSERT INTO item_review_state
    (user_id, item_id, state, difficulty, stability, due_on, reps, lapses, leech,
     last_reviewed_at, elapsed_days, scheduled_days, learning_steps, last_grade)
  VALUES (@user_id, @item_id, @state, @difficulty, @stability, @due_on, @reps, @lapses, @leech,
          @last_reviewed_at, @elapsed_days, @scheduled_days, @learning_steps, @last_grade)
  ON CONFLICT(user_id, item_id) DO UPDATE SET
    state = excluded.state,
    difficulty = excluded.difficulty,
    stability = excluded.stability,
    due_on = excluded.due_on,
    reps = excluded.reps,
    lapses = excluded.lapses,
    leech = excluded.leech,
    last_reviewed_at = excluded.last_reviewed_at,
    elapsed_days = excluded.elapsed_days,
    scheduled_days = excluded.scheduled_days,
    learning_steps = excluded.learning_steps,
    last_grade = excluded.last_grade
`);

const insertItemAttempt = db.prepare(`
  INSERT INTO item_attempts
    (user_id, item_id, ts, mode, grade, seconds, tab_blurs, note, abandoned,
     state_before, stability_before, difficulty_before, elapsed_days, scheduled_days, params_version)
  VALUES
    (@user_id, @item_id, @ts, @mode, @grade, @seconds, @tab_blurs, @note, @abandoned,
     @state_before, @stability_before, @difficulty_before, @elapsed_days, @scheduled_days, @params_version)
`);

/** An abandoned or otherwise unscheduled attempt: logged, but the scheduler never saw it. */
function logUnscheduledAttempt(row) {
  insertItemAttempt.run({
    state_before: null,
    stability_before: null,
    difficulty_before: null,
    elapsed_days: null,
    scheduled_days: null,
    params_version: null,
    ...row,
  });
}

// ── Scheduler settings (Phase 6) ────────────────────────────────────────────

const getSettingsRow = db.prepare("SELECT * FROM scheduler_settings WHERE user_id = ?");
const upsertSettingsRow = db.prepare(`
  INSERT INTO scheduler_settings
    (user_id, request_retention, maximum_interval, daily_new_limit, enable_fuzz, updated_at)
  VALUES (@user_id, @request_retention, @maximum_interval, @daily_new_limit, @enable_fuzz, @updated_at)
  ON CONFLICT(user_id) DO UPDATE SET
    request_retention = excluded.request_retention,
    maximum_interval = excluded.maximum_interval,
    daily_new_limit = excluded.daily_new_limit,
    enable_fuzz = excluded.enable_fuzz,
    updated_at = excluded.updated_at
`);

/** This user's scheduler settings, defaulted and clamped. Never returns null. */
function settingsFor(userId) {
  return normalizeSettings(getSettingsRow.get(userId) ?? DEFAULT_SETTINGS);
}

/**
 * Apply one graded review: schedule via FSRS, persist state, log the attempt.
 *
 * The two writes are ONE transaction. They were two loose statements before:
 * a crash between them left a card rescheduled with no log row, which is
 * exactly the gap the review log exists to not have.
 */
const applyReview = db.transaction(
  ({ userId, item, grade, ts, mode, seconds, tabBlurs, note, settings }) => {
    const existing = getReviewState.get(userId, item.id) ?? null;
    const next = scheduleReview(existing, item.format, grade, new Date(ts), settings);

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
      elapsed_days: next.elapsedDays,
      scheduled_days: next.scheduledDays,
      learning_steps: next.learningSteps,
      last_grade: grade,
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
      state_before: next.before.state,
      stability_before: next.before.stability,
      difficulty_before: next.before.difficulty,
      elapsed_days: next.before.elapsedDays,
      scheduled_days: next.scheduledDays,
      params_version: next.paramsVersion,
    });

    return next;
  }
);

/** `?tz=` is the client's Date.getTimezoneOffset(), so day boundaries are ITS day. See fsrs.js. */
function tzOffsetOf(req) {
  const tz = parseInt(req.query.tz, 10);
  return Number.isFinite(tz) && Math.abs(tz) <= 900 ? tz : undefined;
}

/**
 * Counted from the first-ever graded attempt per item rather than from
 * item_review_state, because a reset card is genuinely new again.
 */
const countNewToday = db.prepare(`
  SELECT COUNT(*) AS n FROM (
    SELECT item_id, MIN(ts) AS first_ts
    FROM item_attempts
    WHERE user_id = ? AND abandoned = 0 AND grade IS NOT NULL
    GROUP BY item_id
  ) WHERE first_ts >= ?
`);

/** Remaining new-item budget for today, given this user's daily limit. */
function newBudget(userId, settings, now, tzOffset) {
  const used = countNewToday.get(userId, startOfDay(now, tzOffset)).n;
  return Math.max(0, settings.dailyNewLimit - used);
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

function fallbackResult(itemId, reason = null) {
  return { itemId, grade: null, verdict: "ungraded", criteriaMet: [], rationale: null, gradedBy: "fallback", reason };
}

/**
 * Turn a grading failure into one sentence a user can act on, and carry it to
 * the results card (`reason` on each ungraded result).
 *
 * This exists because the UI used to say "Ollama didn't respond" for EVERY
 * fail-open path, including the one where Ollama responded immediately and
 * clearly to say the model wasn't pulled. The two cases have opposite fixes —
 * "start Ollama" vs "pull the model" — and a real session was spent chasing
 * the wrong one. G4's fail-open (docs/OLLAMA_GRADING.md) is about not
 * BLOCKING on a dead grader; it was never a reason to hide why.
 *
 * Exported for test/gradingFailureReason.test.js.
 *
 * @param {Error} err the error the grading call failed with
 * @param {{model: string, host: string}} ctx what that call was actually asking for
 * @returns {string} one plain sentence, safe to render as-is
 */
export function gradingFailureReason(err, { model, host }) {
  if (err instanceof OllamaBadResponseError) {
    return `${model} replied with something that wasn't valid JSON. Try again, or switch models in Settings.`;
  }
  if (err instanceof OllamaUnavailableError) {
    switch (err.code) {
      case "ECONNREFUSED":
      case "ENOTFOUND":
        return `Couldn't reach Ollama at ${host} — it doesn't look like it's running.`;
      case "TIMEOUT":
        // Distinguished from "down" on purpose: the usual cause is a cold model
        // load on a card that has to evict something first, and the fix is to
        // simply run it again, not to go restart a server that's already up.
        return `Ollama at ${host} didn't answer in time. ${model} may still be loading — try again.`;
      case "HTTP_404":
        // The exact failure that motivated this whole function: Ollama is up
        // and answering, it just doesn't have this model. Name the fix.
        return `Ollama at ${host} has no model named "${model}". Pull it first: ollama pull ${model}`;
      default:
        return err.detail
          ? `Ollama at ${host} rejected the request: ${err.detail}`
          : `Ollama at ${host} returned an error (${err.code}).`;
    }
  }
  return `Grading failed: ${err?.message ?? String(err)}`;
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
      const reason = gradingFailureReason(err, { model, host });
      // Logged as well as returned: the packaged app has no console, and this
      // is the line that says which of the fail-open causes actually fired.
      console.warn(`[grade-batch] failing open — ${reason}`);
      return res.json({
        modelUsed: model,
        // Also top-level: every item shares this one cause, and the client
        // shows it once above the results rather than N times.
        error: reason,
        results: items.map((it) => fallbackResult(it.itemId, reason)),
      });
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
      // A different failure from the ones above, and it says so: Ollama is up,
      // the model answered, and the answer just didn't fit the contract for
      // this item. Nothing to restart or pull — retrying, or a bigger model,
      // is the actual fix.
      return fallbackResult(
        it.itemId,
        `${model} returned an answer that didn't match this item's ${total} criteria. Try again, or switch models in Settings.`
      );
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
// Items eligible for drilling: verified, not retired, not suspended by this
// user, and either never reviewed by this user or due. Two separate kinds of
// exclusion share this WHERE clause and mean different things:
//   leeches (A8)  — excluded automatically after 3 lapses, because they need
//                   the leech-handoff triage flow, not more of the same
//                   rotation that already failed them 3 times.
//   suspensions   — excluded because the user explicitly said so from
//                   Practice's results screen ("I know this one"). Undone in
//                   one click by Reset deck, unlike a leech, which has to be
//                   triaged. /exam ignores both — an exam draws from the whole
//                   verified bank regardless of what you've parked.
//
// Ordering is Phase 2's, in three buckets: learning/relearning first (their
// steps are minutes and a stale one derails the rest of the session), then
// review items oldest-overdue-first, then new items capped by the daily limit.
// The daily cap is why this is two queries rather than one clever ORDER BY:
// a single LIMIT can't say "at most N of the third bucket".
//
// `?ahead=1` keeps the ordering but drops the due filter, so an empty queue
// pulls the next-soonest items instead of returning nothing.

// Every column the client needs, shared by both halves of the queue query.
const QUEUE_COLUMNS = `items.id, items.topic_id, items.position, items.format, items.origin,
        items.prompt, items.expected, items.criteria, items.provenance,
        items.difficulty, items.choices, items.answer_index, items.time_budget_sec,
        items.extra_atoms`;

const ELIGIBLE = `items.verified_by_human = 1
     AND items.retired = 0
     AND NOT EXISTS (SELECT 1 FROM item_suspensions s WHERE s.user_id = @userId AND s.item_id = items.id)`;

/**
 * THE definition of "due", shared by the queue and the counts so the number on
 * the button is the number of items the session serves. See dueBoundary() in
 * server/fsrs.js for why it has two halves.
 *
 * Learning and relearning cards (states 1 and 3) are on minute-scale steps and
 * respect the actual clock. Everything else is day-granular and counts as due
 * any time before the end of the caller's local day.
 *
 * Callers must bind both @nowMs and @dayEnd.
 */
const IS_DUE = `(CASE WHEN rs.state IN (1, 3) THEN rs.due_on <= @nowMs ELSE rs.due_on <= @dayEnd END)`;

const selectDueItems = db.prepare(`
  SELECT ${QUEUE_COLUMNS}, rs.*
  FROM items
  JOIN topics ON topics.id = items.topic_id
  JOIN item_review_state rs ON rs.item_id = items.id AND rs.user_id = @userId
  WHERE topics.course_id = @course AND ${ELIGIBLE}
    AND rs.leech = 0
    AND (@ahead = 1 OR ${IS_DUE})
  ORDER BY
    CASE WHEN rs.state IN (1, 3) THEN 0 ELSE 1 END ASC,
    rs.due_on ASC,
    items.position ASC
  LIMIT @limit
`);

const selectNewItems = db.prepare(`
  SELECT ${QUEUE_COLUMNS}
  FROM items
  JOIN topics ON topics.id = items.topic_id
  WHERE topics.course_id = @course AND ${ELIGIBLE}
    AND NOT EXISTS (
      SELECT 1 FROM item_review_state rs WHERE rs.user_id = @userId AND rs.item_id = items.id
    )
  ORDER BY items.position ASC
  LIMIT @limit
`);

/** One queue row -> the item the client drills, with its scheduling state and the four predicted intervals attached. */
function toQueueItem(r, now, settings) {
  const review = r.due_on == null ? null : r;
  return {
    ...rowToItem(r),
    review: review && {
      dueOn: review.due_on,
      reps: review.reps,
      lapses: review.lapses,
      leech: Boolean(review.leech),
      state: review.state,
      stateName: stateName(review.state),
      stability: review.stability,
      difficulty: review.difficulty,
      lastReviewedAt: review.last_reviewed_at,
      retrievability: getRetrievability(review, now, settings),
    },
    // The four intervals the grade bar renders, from one repeat() call per
    // item. The client never derives one.
    preview: previewRatings(review, r.format, now, settings),
  };
}

router.get("/queue", (req, res) => {
  const user = getSessionUser(req);
  const userId = user?.id ?? ANON_USER_ID;
  const course = req.query.course;
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), MAX_ITEMS);
  const ahead = req.query.ahead === "1" ? 1 : 0;

  if (!course) return res.status(400).json({ error: "course query param required" });

  const settings = settingsFor(userId);
  const now = new Date();
  const tz = tzOffsetOf(req);

  const due = selectDueItems.all({
    userId,
    course,
    ahead,
    nowMs: now.getTime(),
    dayEnd: dueBoundary(now, tz),
    limit,
  });

  // Review-ahead already has more than enough to show; don't also flood it with
  // new material the user didn't ask for.
  const newRoom = ahead ? 0 : Math.min(limit - due.length, newBudget(userId, settings, now, tz));
  const fresh = newRoom > 0 ? selectNewItems.all({ userId, course, limit: newRoom }) : [];

  res.json([...due, ...fresh].map((r) => toQueueItem(r, now, settings)));
});

// `reviewable` is what the "Start review (N)" button shows, and it has to be
// the number GET /queue hands back for the same clock. Both read from IS_DUE
// and newBudget(); if they ever disagree, one of them stopped.
const countBuckets = db.prepare(`
  SELECT
    SUM(CASE WHEN rs.state IN (1, 3) AND ${IS_DUE} THEN 1 ELSE 0 END) AS learning,
    SUM(CASE WHEN rs.state NOT IN (1, 3) AND ${IS_DUE} THEN 1 ELSE 0 END) AS due,
    SUM(CASE WHEN NOT ${IS_DUE} THEN 1 ELSE 0 END) AS later,
    MIN(CASE WHEN NOT ${IS_DUE} THEN rs.due_on END) AS next_due_on
  FROM items
  JOIN topics ON topics.id = items.topic_id
  JOIN item_review_state rs ON rs.item_id = items.id AND rs.user_id = @userId
  WHERE topics.course_id = @course AND ${ELIGIBLE} AND rs.leech = 0
`);

const countNewAvailable = db.prepare(`
  SELECT COUNT(*) AS n
  FROM items
  JOIN topics ON topics.id = items.topic_id
  WHERE topics.course_id = @course AND ${ELIGIBLE}
    AND NOT EXISTS (
      SELECT 1 FROM item_review_state rs WHERE rs.user_id = @userId AND rs.item_id = items.id
    )
`);

// Per-topic, for the figure on each topic card. Counts due-or-new the same way
// the totals above do, so a card's number and the strip's number are the same
// arithmetic at two granularities.
const countByTopic = db.prepare(`
  SELECT items.topic_id AS topic_id,
    SUM(CASE WHEN rs.item_id IS NOT NULL AND rs.leech = 0 AND ${IS_DUE} THEN 1 ELSE 0 END) AS due,
    SUM(CASE WHEN rs.item_id IS NULL THEN 1 ELSE 0 END) AS fresh,
    SUM(CASE WHEN rs.leech = 1 THEN 1 ELSE 0 END) AS leeches,
    COUNT(*) AS total
  FROM items
  JOIN topics ON topics.id = items.topic_id
  LEFT JOIN item_review_state rs ON rs.item_id = items.id AND rs.user_id = @userId
  WHERE topics.course_id = @course AND ${ELIGIBLE}
  GROUP BY items.topic_id
`);

router.get("/counts", (req, res) => {
  const user = getSessionUser(req);
  const userId = user?.id ?? ANON_USER_ID;
  const course = req.query.course;
  if (!course) return res.status(400).json({ error: "course query param required" });

  const settings = settingsFor(userId);
  const now = new Date();
  const tz = tzOffsetOf(req);
  const args = { userId, course, nowMs: now.getTime(), dayEnd: dueBoundary(now, tz) };

  const b = countBuckets.get(args);
  // Its own argument object: better-sqlite3 rejects a named parameter the
  // statement doesn't use, and this query has no @boundary in it.
  const newAvailable = countNewAvailable.get({ userId, course }).n;
  const budget = newBudget(userId, settings, now, tz);
  const fresh = Math.min(newAvailable, budget);

  // Kept as two separate figures rather than one summed "due" per topic: the
  // new-item budget is global, so a per-topic total that folded it in would
  // count the same handful of new items once per topic and never add up to the
  // strip's number.
  const byTopic = {};
  for (const r of countByTopic.all(args)) {
    byTopic[r.topic_id] = { due: r.due, fresh: r.fresh, leeches: r.leeches, total: r.total };
  }

  res.json({
    due: b.due ?? 0,
    learning: b.learning ?? 0,
    new: fresh,
    newAvailable,
    newBudget: budget,
    later: b.later ?? 0,
    nextDueOn: b.next_due_on ?? null,
    reviewable: (b.due ?? 0) + (b.learning ?? 0) + fresh,
    byTopic,
  });
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


  const items = applyWriteCap(shuffled(sampled));

  
  if (items.length !== sampled.length) {
    for (const id of Object.keys(topicMeta)) topicMeta[id].sampled = 0;
    for (const it of items) topicMeta[it.topicId].sampled++;
  }

  res.json({ items, topics: topicMeta, minutes });
});


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


// ── Scheduler settings + simulation (Phases 6 and 7) ────────────────────────

/** The four FSRS inputs, plus the read-only facts the settings panel displays alongside them. */
router.get("/settings", (req, res) => {
  const user = getSessionUser(req);
  const userId = user?.id ?? ANON_USER_ID;
  res.json({ ...settingsFor(userId), paramsVersion: PARAMS_VERSION });
});

const countScheduledReviewCards = db.prepare(
  `SELECT COUNT(*) AS n FROM item_review_state
   WHERE user_id = ? AND state = ${State.Review} AND last_reviewed_at IS NOT NULL`
);

const updateDueOn = db.prepare(
  "UPDATE item_review_state SET due_on = ? WHERE user_id = ? AND item_id = ?"
);

const selectReviewCards = db.prepare(
  `SELECT * FROM item_review_state
   WHERE user_id = ? AND state = ${State.Review} AND last_reviewed_at IS NOT NULL`
);

/**
 * Changing desired retention re-derives `due` for every card already in
 * `review` from its existing stability. The scheduler is not re-run and no
 * stability is touched, so this is not a review and writes nothing to the log.
 *
 * One transaction: a half-applied change leaves the collection split between
 * two schedules with no way to tell which cards got which.
 */
const recomputeAllDue = db.transaction((userId, settings) => {
  let changed = 0;
  for (const row of selectReviewCards.all(userId)) {
    const due = recomputeDue(row, settings);
    if (due != null && due !== row.due_on) {
      updateDueOn.run(due, userId, row.item_id);
      changed++;
    }
  }
  return changed;
});

// How many cards a retention change would move. Lets the UI name the number
// in its confirmation before anything is written.
router.get("/settings/impact", (req, res) => {
  const user = getSessionUser(req);
  const userId = user?.id ?? ANON_USER_ID;
  res.json({ scheduledCards: countScheduledReviewCards.get(userId).n });
});

router.put("/settings", (req, res) => {
  const user = getSessionUser(req);
  const userId = user?.id ?? ANON_USER_ID;
  const previous = settingsFor(userId);
  const next = normalizeSettings({ ...previous, ...(req.body ?? {}) });

  upsertSettingsRow.run({
    user_id: userId,
    request_retention: next.requestRetention,
    maximum_interval: next.maximumInterval,
    daily_new_limit: next.dailyNewLimit,
    enable_fuzz: next.enableFuzz ? 1 : 0,
    updated_at: Date.now(),
  });

  // Only retention and the interval ceiling change an already-derived due date.
  // The new-item limit and fuzz apply from the next review onward, so touching
  // every card's due date over either of them would be pure churn.
  const affectsDueDates =
    next.requestRetention !== previous.requestRetention ||
    next.maximumInterval !== previous.maximumInterval;
  const rescheduled = affectsDueDates ? recomputeAllDue(userId, next) : 0;

  res.json({ ...next, paramsVersion: PARAMS_VERSION, rescheduled });
});

/**
 * The scheduler sandbox. Stateless and side-effect free: no session, no DB
 * read, no DB write. Takes a card, optionally applies a grade, returns what
 * FSRS makes of it.
 *
 * That is what lets FsrsLab hold its own card in React state without any code
 * outside fsrs.js computing an interval. It does what Drill does, it just has
 * nowhere to save it.
 */
router.post("/simulate", (req, res) => {
  const body = req.body ?? {};
  const settings = normalizeSettings(body.settings);
  const format = typeof body.format === "string" ? body.format : "recall";

  const nowMs = Number.isFinite(body.now) ? body.now : Date.now();
  const now = new Date(nowMs);

  let card = isPlainObject(body.card) ? body.card : null;
  let applied = null;

  if (body.grade != null) {
    if (!Number.isInteger(body.grade) || body.grade < 0 || body.grade > 3) {
      return res.status(400).json({ error: "grade must be an integer 0..3" });
    }
    applied = scheduleReview(card, format, body.grade, now, settings);
    card = {
      state: applied.state,
      stability: applied.stability,
      difficulty: applied.difficulty,
      due_on: applied.dueOn,
      reps: applied.reps,
      lapses: applied.lapses,
      elapsed_days: applied.elapsedDays,
      scheduled_days: applied.scheduledDays,
      learning_steps: applied.learningSteps,
      last_reviewed_at: applied.lastReviewedAt,
      last_grade: body.grade,
    };
  }

  res.json({
    card,
    applied,
    preview: previewRatings(card, format, now, settings),
    retrievability: getRetrievability(card, now, settings),
    curve: forgettingCurve(card, now, {}, settings),
    settings,
  });
});

// Forget one card back to new. Deletes the scheduling state and nothing else:
// the log is append-only, and having got this item wrong four times is still
// true after you decide to start it over.
const deleteReviewState = db.prepare("DELETE FROM item_review_state WHERE user_id = ? AND item_id = ?");

router.post("/items/:itemId/reset", (req, res) => {
  const user = getSessionUser(req);
  const userId = user?.id ?? ANON_USER_ID;
  const itemId = req.params.itemId;
  if (!getItemForScheduling.get(itemId)) {
    return res.status(400).json({ error: `itemId "${itemId}" does not exist` });
  }
  res.json({ ok: true, cleared: deleteReviewState.run(userId, itemId).changes });
});

router.post("/leeches/:itemId/reset", (req, res) => {
  const user = getSessionUser(req);
  const userId = user?.id ?? ANON_USER_ID;
  const itemId = req.params.itemId;

  const item = getItemForScheduling.get(itemId);
  if (!item) return res.status(400).json({ error: `itemId "${itemId}" does not exist` });


  deleteReviewState.run(userId, itemId);
  res.json({ ok: true });
});


const listSuspensions = db.prepare("SELECT item_id FROM item_suspensions WHERE user_id = ? ORDER BY suspended_at DESC");
const insertSuspension = db.prepare(
  "INSERT OR IGNORE INTO item_suspensions (user_id, item_id, suspended_at) VALUES (?, ?, ?)"
);
const deleteSuspension = db.prepare("DELETE FROM item_suspensions WHERE user_id = ? AND item_id = ?");
const deleteAllSuspensions = db.prepare("DELETE FROM item_suspensions WHERE user_id = ?");


const insertSuspensions = db.transaction((userId, itemIds, ts) => {
  let inserted = 0;
  for (const id of itemIds) inserted += insertSuspension.run(userId, id, ts).changes;
  return inserted;
});

router.get("/suspensions", (req, res) => {
  const user = getSessionUser(req);
  const userId = user?.id ?? ANON_USER_ID;
  res.json({ itemIds: listSuspensions.all(userId).map((r) => r.item_id) });
});

router.post("/suspensions", (req, res) => {
  const user = getSessionUser(req);
  const userId = user?.id ?? ANON_USER_ID;
  const body = req.body ?? {};

  let itemIds;
  try {
    if (!Array.isArray(body.itemIds)) fail('body must contain an "itemIds" array');
    if (body.itemIds.length === 0) fail("itemIds must not be empty");
    if (body.itemIds.length > MAX_ITEMS) fail(`itemIds may contain at most ${MAX_ITEMS} (got ${body.itemIds.length})`);
    itemIds = body.itemIds.map((id, i) => requiredString(id, `itemIds[${i}]`));
    for (const id of itemIds) {
      if (!getItemForScheduling.get(id)) fail(`itemId "${id}" does not exist`);
    }
  } catch (err) {
    if (err instanceof BadRequest) return res.status(400).json({ error: err.message });
    throw err;
  }


  const count = insertSuspensions(userId, itemIds, Date.now());
  res.json({ ok: true, count });
});


router.delete("/suspensions/:itemId", (req, res) => {
  const user = getSessionUser(req);
  const userId = user?.id ?? ANON_USER_ID;
  deleteSuspension.run(userId, req.params.itemId);
  res.json({ ok: true });
});


router.delete("/suspensions", (req, res) => {
  const user = getSessionUser(req);
  const userId = user?.id ?? ANON_USER_ID;
  res.json({ cleared: deleteAllSuspensions.run(userId).changes });
});


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
    logUnscheduledAttempt({
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

  // A double-clicked grade button, or a request retried after a flaky
  // response, must not count as two reps: the second would derive its interval
  // from the state the first just advanced to, roughly squaring it. Answered
  // 200 rather than 4xx because from the client's side the review did happen.
  const existing = getReviewState.get(userId, itemId) ?? null;
  if (isDuplicateReview(existing, grade, new Date(ts))) {
    return res.status(200).json({
      ok: true,
      duplicate: true,
      review: {
        dueOn: existing.due_on,
        reps: existing.reps,
        lapses: existing.lapses,
        leech: Boolean(existing.leech),
      },
    });
  }

  const settings = settingsFor(userId);
  const review = applyReview({ userId, item, grade, ts, mode, seconds, tabBlurs, note, settings });
  res.status(201).json({
    ok: true,
    review: {
      dueOn: review.dueOn,
      reps: review.reps,
      lapses: review.lapses,
      leech: review.leech,
      state: review.state,
      stateName: review.stateName,
      stability: review.stability,
      difficulty: review.difficulty,
      // What the interval actually turned out to be, so the session summary
      // reports the scheduler's answer rather than re-deriving one client-side.
      intervalMinutes: review.intervalMinutes,
      scheduledDays: review.scheduledDays,
    },
  });
});


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
  const settings = settingsFor(userId);
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
        logUnscheduledAttempt({
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
          settings,
        });
      }
      count++;
    }
    return count;
  })();

  res.status(201).json({ ok: true, imported });
});

export default router;
