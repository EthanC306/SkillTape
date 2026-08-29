// Curriculum read/write routes.
//
// The frontend views (LearnView, QuizView, FlashcardsView) were written against
// the shape of a topic module's default export, and they stay unchanged — so
// these handlers reassemble the flat SQL rows back into that exact nested shape.
// Anything optional in the module (code, figure, accept, flashcards) is OMITTED
// here rather than sent as null, so a fetched topic and an imported one are
// indistinguishable to the views.
import crypto from "node:crypto";
import { Router } from "express";
import db from "../db.js";
import { requireUser } from "../userScope.js";

const router = Router();

/** Drop null/undefined keys so optional fields are absent, not null. */
function compact(obj) {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v != null));
}

/** Rebuild the { src, alt, caption } figure from its three columns. */
function figureOf(row) {
  if (!row.figure_src) return undefined;
  return compact({
    src: row.figure_src,
    alt: row.figure_alt,
    caption: row.figure_caption,
  });
}

const listTopics = db.prepare(`
  SELECT topics.id, topics.course_id, topics.title, topics.subtitle, topics.show_chart, topics.exam_weight
  FROM topics JOIN courses ON courses.id = topics.course_id
  WHERE courses.owner_id IS NULL OR courses.owner_id = @userId
  ORDER BY courses.position, topics.position
`);

const getTopic = db.prepare(`
  SELECT id, course_id, title, subtitle, show_chart, exam_weight
  FROM topics WHERE id = ?
`);

const getCourse = db.prepare("SELECT id, owner_id FROM courses WHERE id = ?");
const isAdmin = db.prepare("SELECT is_admin FROM users WHERE id = ?");
const getNextTopicPosition = db.prepare(
  "SELECT COALESCE(MAX(position), -1) + 1 AS position FROM topics WHERE course_id = ?"
);
const insertTopic = db.prepare(`
  INSERT INTO topics (id, course_id, title, subtitle, show_chart, position, exam_weight)
  VALUES (@id, @course_id, @title, @subtitle, 0, @position, 1.0)
`);
const updateTopicMetadata = db.prepare(
  "UPDATE topics SET title = @title, subtitle = @subtitle WHERE id = @id"
);

const getCards = db.prepare(`
  SELECT heading, body, code, art, accept, figure_src, figure_alt, figure_caption
  FROM cards WHERE topic_id = ? ORDER BY position
`);

const getQuestions = db.prepare(`
  SELECT id, stable_id, revision, prompt, code, answer, explanation, tag,
         figure_src, figure_alt, figure_caption
  FROM questions WHERE topic_id = ? ORDER BY position
`);

const getChoices = db.prepare(
  "SELECT text FROM choices WHERE question_id = ? ORDER BY position"
);

// stable_id is aliased to `id` on the way out: it IS the card's id as far as
// every consumer is concerned, and the AUTOINCREMENT column of the same name is
// a private surrogate the client must never see (it changes on every save).
const getFlashcards = db.prepare(
  "SELECT stable_id AS id, front, back FROM flashcards WHERE topic_id = ? ORDER BY position"
);

// ROADMAP.md A4 — drill mode's item bank. Server/routes/drill.js is what
// actually queries these for a due-item queue; this is included in
// buildTopic() for parity with cards/questions/flashcards so a topic's
// content is fully described by one GET, and so a future authoring UI (A7)
// has something to read.
const getItems = db.prepare(`
  SELECT id, position, format, origin, prompt, expected, criteria, provenance,
         generation_meta, difficulty, verified_by_human, retired, choices,
         answer_index, time_budget_sec, extra_atoms
  FROM items WHERE topic_id = ? ORDER BY position
`);

/** Assemble one topic row plus all its children into the module-shaped object. */
export function buildTopic(row) {
  const cards = getCards.all(row.id).map((c) =>
    compact({
      heading: c.heading,
      body: c.body,
      code: c.code,
      art: c.art,
      accept: c.accept ? JSON.parse(c.accept) : undefined,
      figure: figureOf(c),
    })
  );

  const questions = getQuestions.all(row.id).map((q) =>
    compact({
      // Real database id. LEGACY: it is an AUTOINCREMENT surrogate that gets
      // reassigned by every reseed, so it identifies nothing over time —
      // stableId below is what an attempt should be recorded against
      // (docs/STABLE_QUESTION_IDS.md). Still served because QuizView sends it
      // and progress.js still accepts it.
      id: q.id,
      // The authored id from the topic module ("bigo-q03") and the revision of
      // its graded content. These are what make a past attempt identifiable.
      stableId: q.stable_id,
      revision: q.revision,
      prompt: q.prompt,
      code: q.code,
      // pluck() would return scalars, but .all() keeps this readable.
      choices: getChoices.all(q.id).map((c) => c.text),
      answer: q.answer,
      explanation: q.explanation,
      tag: q.tag,
      figure: figureOf(q),
    })
  );

  const flashcards = getFlashcards.all(row.id);

  const items = getItems.all(row.id).map((it) =>
    compact({
      id: it.id,
      topicId: row.id,
      format: it.format,
      origin: it.origin,
      prompt: it.prompt,
      expected: it.expected,
      criteria: it.criteria ? JSON.parse(it.criteria) : [],
      provenance: it.provenance ? JSON.parse(it.provenance) : null,
      generationMeta: it.generation_meta ? JSON.parse(it.generation_meta) : undefined,
      difficulty: it.difficulty,
      verifiedByHuman: Boolean(it.verified_by_human),
      retired: Boolean(it.retired),
      choices: it.choices ? JSON.parse(it.choices) : undefined,
      answerIndex: it.answer_index ?? undefined,
      timeBudgetSec: it.time_budget_sec ?? undefined,
      extraAtoms: it.extra_atoms ? JSON.parse(it.extra_atoms) : undefined,
    })
  );

  return compact({
    id: row.id,
    title: row.title,
    subtitle: row.subtitle,
    course: row.course_id,
    showChart: Boolean(row.show_chart),
    examWeight: row.exam_weight,
    cards,
    questions,
    // Absent, not empty, when the topic ships no deck — TopicView keys the
    // Flashcards tab off `topic.flashcards?.length`.
    flashcards: flashcards.length ? flashcards : undefined,
    items: items.length ? items : undefined,
  });
}

// GET /api/topics — every topic, fully populated, in curriculum order.
//
// Deliberately NOT a light summary list: App.jsx's buildMasterSet does
// `picked.flatMap((t) => t.questions)` over the same array the topic list is
// rendered from, so a trimmed payload would break Master Set. The whole bank is
// well under a megabyte of JSON and was previously shipped in the JS bundle
// anyway, so one request is both simpler and no worse than what it replaces.
router.get("/", (req, res) => {
  if (req.userId == null) return res.json([]);
  res.json(listTopics.all({ userId: req.userId }).map(buildTopic));
});

// GET /api/topics/:id — one topic.
router.get("/:id", (req, res) => {
  if (req.userId == null) return res.status(404).json({ error: "topic not found" });
  const row = getTopic.get(req.params.id);
  if (!row) return res.status(404).json({ error: "topic not found" });
  const course = getCourse.get(row.course_id);
  if (course.owner_id != null && course.owner_id !== req.userId) {
    return res.status(404).json({ error: "topic not found" });
  }
  res.json(buildTopic(row));
});

// ─────────────────────────────── Writes ──────────────────────────────────
//
// Everything below treats the request body as hostile. The editor UI does its
// own checking, but that runs in a browser the user controls, so it is a
// convenience — this is the boundary that actually holds. Nothing reaches SQL
// until it has been through the validators, and every rejection is a 400 that
// names the offending index and field, because "invalid card" is unactionable
// from inside the editor.

// Bounds, not policy: a legitimate topic is nowhere near either of these. They
// exist so a looping or malformed client cannot quietly grow the database.
// (express.json's 2mb limit in index.js caps the payload; these cap the rows.)
const MAX_ITEMS = 200;
const MAX_STRING = 20000;

/** A rejected payload. The handlers convert this — and only this — into a 400. */
class BadRequest extends Error {}

function fail(message) {
  throw new BadRequest(message);
}

/** Required field: a non-blank string within the length cap. */
function requiredString(value, where) {
  if (typeof value !== "string") fail(`${where} must be a string`);
  if (!value.trim()) fail(`${where} must not be blank`);
  if (value.length > MAX_STRING) fail(`${where} exceeds ${MAX_STRING} characters`);
  return value;
}

// Optional field. Absent and null both mean "no value" and normalize to NULL —
// the columns are nullable and buildTopic drops nulls again on the way out, so
// a round trip through the API leaves an omitted field omitted.
function optionalString(value, where) {
  if (value == null) return null;
  if (typeof value !== "string") fail(`${where} must be a string when present`);
  if (value.length > MAX_STRING) fail(`${where} exceeds ${MAX_STRING} characters`);
  return value;
}

function shortString(value, where, { required = false, max = 200 } = {}) {
  if (typeof value !== "string") fail(`${where} must be a string`);
  const clean = value.trim();
  if (required && !clean) fail(`${where} must not be blank`);
  if (clean.length > max) fail(`${where} exceeds ${max} characters`);
  return clean;
}

function topicSlug(title) {
  return title
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "deck";
}

const createTopic = db.transaction(({ courseId, title, subtitle }) => {
  const base = `${courseId}-${topicSlug(title)}`;
  let id = base;
  let suffix = 2;
  while (getTopic.get(id)) id = `${base}-${suffix++}`;
  insertTopic.run({
    id,
    course_id: courseId,
    title,
    subtitle: subtitle || null,
    position: getNextTopicPosition.get(courseId).position,
  });
  return getTopic.get(id);
});

// POST /api/topics — create an empty flashcard-capable topic in one course.
// Content is shared across accounts, so creation has the same admin boundary
// as editing an existing topic's cards or flashcards.
router.post("/", requireUser, (req, res) => {
  let courseId;
  let title;
  let subtitle;
  try {
    courseId = shortString(req.body?.course, "course", { required: true, max: 100 });
    title = shortString(req.body?.title, "title", { required: true });
    subtitle = shortString(req.body?.subtitle ?? "", "subtitle");
    const course = getCourse.get(courseId);
    if (!course || (course.owner_id != null && course.owner_id !== req.userId)) fail("course does not exist");
    if (course.owner_id == null && !isAdmin.get(req.userId)?.is_admin) {
      return res.status(403).json({ error: "this account may not edit course content" });
    }
  } catch (err) {
    if (err instanceof BadRequest) return res.status(400).json({ error: err.message });
    throw err;
  }

  const row = createTopic({ courseId, title, subtitle });
  res.status(201).json(buildTopic(row));
});

function requireTopicEditor(req, res, next) {
  const topic = getTopic.get(req.params.id);
  if (!topic) return res.status(404).json({ error: "topic not found" });
  const course = getCourse.get(topic.course_id);
  if (course.owner_id === req.userId || isAdmin.get(req.userId)?.is_admin) return next();
  return res.status(403).json({ error: "this account may not edit course content" });
}

router.patch("/:id", requireUser, requireTopicEditor, (req, res) => {
  let title;
  let subtitle;
  try {
    title = shortString(req.body?.title, "title", { required: true });
    subtitle = shortString(req.body?.subtitle ?? "", "subtitle");
  } catch (err) {
    if (err instanceof BadRequest) return res.status(400).json({ error: err.message });
    throw err;
  }
  updateTopicMetadata.run({ id: req.params.id, title, subtitle: subtitle || null });
  res.json(buildTopic(getTopic.get(req.params.id)));
});

/** Arrays are objects and null is an object; neither is a usable record. */
function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** The named body key must be present, an array, and a bounded one. */
function requireArray(body, key) {
  // req.body is undefined, not {}, when the request carried no JSON body.
  const items = body?.[key];
  if (!Array.isArray(items)) fail(`body must contain a "${key}" array`);
  if (items.length > MAX_ITEMS) {
    fail(`${key} may contain at most ${MAX_ITEMS} items (got ${items.length})`);
  }
  return items;
}

// Fill Mode's synonym map (AUTHORING §3.3): bold-text key → accepted answers.
// Validated deeper than "is an object" because fill.js iterates the values as
// arrays of strings; a stray shape would throw at grading time, in the browser,
// long after the save that caused it.
function acceptJson(accept, where) {
  if (accept == null) return null;
  if (!isPlainObject(accept)) fail(`${where} must be an object`);
  for (const [key, alternatives] of Object.entries(accept)) {
    if (!Array.isArray(alternatives)) {
      fail(`${where}["${key}"] must be an array of strings`);
    }
    alternatives.forEach((alt, i) =>
      requiredString(alt, `${where}["${key}"][${i}]`)
    );
  }
  return JSON.stringify(accept);
}

// Flatten the optional { src, alt, caption } figure into three columns —
// same shape seed.js writes, so seeded and edited rows are indistinguishable.
function figureCols(figure, where) {
  if (figure == null) return { figure_src: null, figure_alt: null, figure_caption: null };
  if (!isPlainObject(figure)) fail(`${where} must be an object`);
  return {
    // src is what figureOf() keys on when rebuilding, so a figure without one
    // would silently vanish on the next read.
    figure_src: requiredString(figure.src, `${where}.src`),
    figure_alt: optionalString(figure.alt, `${where}.alt`),
    figure_caption: optionalString(figure.caption, `${where}.caption`),
  };
}

/** One client card → one bound-parameter object for insertCard. */
function cardRow(card, i) {
  const where = `cards[${i}]`;
  if (!isPlainObject(card)) fail(`${where} must be an object`);
  return {
    position: i, // array order IS the stored order; nothing else carries it
    heading: requiredString(card.heading, `${where}.heading`),
    body: optionalString(card.body, `${where}.body`),
    code: optionalString(card.code, `${where}.code`),
    art: optionalString(card.art, `${where}.art`),
    accept: acceptJson(card.accept, `${where}.accept`),
    ...figureCols(card.figure, `${where}.figure`),
  };
}

// A flashcard id is opaque, but not arbitrary: it ends up as a React key, and
// it is the obvious thing for a future feature (scheduling a deck, linking a
// card from a note) to put in a URL or a foreign key. Keeping it to this set
// means none of those later uses has to think about escaping.
const ID_PATTERN = /^[A-Za-z0-9._:-]{1,200}$/;

/**
 * The card's permanent name.
 *
 * Minted here only as a fallback. Normally the EDITOR mints it, at the instant
 * "+ Add flashcard" is clicked, and sends it with the save — so the id exists
 * before the card has ever been written down, and the row that lands in SQLite
 * is already wearing the identity the UI has been using all along. The fallback
 * covers the other writers: seeded decks, an older client, a curl.
 *
 * No topic id in the string. A card's identity should not become a lie the day
 * something moves it to another topic.
 */
function mintFlashcardId() {
  return `fc-${crypto.randomUUID()}`;
}

/** One client flashcard → one bound-parameter object for insertFlashcard. */
function flashcardRow(card, i) {
  const where = `flashcards[${i}]`;
  if (!isPlainObject(card)) fail(`${where} must be an object`);
  // Absent id = a card being added for the first time. Present id = a card the
  // client already knows, and it MUST survive the round trip untouched: this is
  // the whole point of the column, and regenerating it here would quietly make
  // every save a delete-and-recreate again.
  if (card.id != null && (typeof card.id !== "string" || !ID_PATTERN.test(card.id))) {
    fail(`${where}.id must be 1-200 characters of A-Z a-z 0-9 . _ : or -`);
  }
  return {
    position: i,
    stable_id: card.id ?? mintFlashcardId(),
    front: requiredString(card.front, `${where}.front`),
    back: requiredString(card.back, `${where}.back`),
  };
}

/**
 * Two ways a payload's ids can be wrong in a way a per-card check cannot see.
 * Both are 400s rather than something to paper over, because both mean the
 * client has lost track of which card is which — and silently reassigning an id
 * to "fix" it would destroy exactly the identity this is all here to protect.
 */
const flashcardOwner = db.prepare("SELECT topic_id FROM flashcards WHERE stable_id = ?");

function checkFlashcardIds(rows, topicId) {
  const seen = new Map();
  rows.forEach((row, i) => {
    // Duplicated within this payload — the unique index would reject it anyway,
    // but as an opaque SQLite constraint error rather than a usable message.
    if (seen.has(row.stable_id)) {
      fail(`flashcards[${i}].id duplicates flashcards[${seen.get(row.stable_id)}].id`);
    }
    seen.set(row.stable_id, i);

    // Already in use by a DIFFERENT topic. The save clears only this topic's
    // rows, so the insert would collide with one it never deleted.
    const owner = flashcardOwner.get(row.stable_id);
    if (owner && owner.topic_id !== topicId) {
      fail(`flashcards[${i}].id already belongs to topic "${owner.topic_id}"`);
    }
  });
}

const clearCards = db.prepare("DELETE FROM cards WHERE topic_id = ?");
const clearFlashcards = db.prepare("DELETE FROM flashcards WHERE topic_id = ?");

const insertCard = db.prepare(`
  INSERT INTO cards (topic_id, position, heading, body, code, art, accept,
                     figure_src, figure_alt, figure_caption)
  VALUES (@topic_id, @position, @heading, @body, @code, @art, @accept,
          @figure_src, @figure_alt, @figure_caption)
`);

const insertFlashcard = db.prepare(`
  INSERT INTO flashcards (topic_id, position, front, back, stable_id, origin)
  VALUES (@topic_id, @position, @front, @back, @stable_id, @origin)
`);

const existingFlashcardOrigins = db.prepare(
  "SELECT stable_id, origin FROM flashcards WHERE topic_id = ?"
);

// Replace-wholesale rather than diff, matching seed.js: the volume is a handful
// of rows and the alternative is reconciling client-side edits against row ids
// the client never sees. Wrapped in db.transaction so the delete and the
// inserts commit together — a failure mid-insert rolls the DELETE back too,
// and the topic keeps the content it had. Never a half-empty topic.
const replaceCards = db.transaction((topicId, rows) => {
  clearCards.run(topicId);
  rows.forEach((row) => insertCard.run({ topic_id: topicId, ...row }));
});

// Still replace-wholesale, but `origin` has to be carried across the gap by
// hand. The DELETE takes it with the row, and re-deriving it afterwards is
// impossible — so read it first, keyed by the one thing that survives, and put
// it back. A card the topic has never seen before is 'user': it was typed into
// Edit Mode, which makes this row the only copy of it that exists anywhere, and
// seed.js has to know to leave it alone.
const replaceFlashcards = db.transaction((topicId, rows) => {
  const origins = new Map(
    existingFlashcardOrigins.all(topicId).map((r) => [r.stable_id, r.origin])
  );
  clearFlashcards.run(topicId);
  rows.forEach((row) =>
    insertFlashcard.run({
      topic_id: topicId,
      origin: origins.get(row.stable_id) ?? "user",
      ...row,
    })
  );
});

// Validate the whole payload up front, then write. Doing it in this order means
// a bad request never opens a transaction at all, so the rollback guarantee is
// a backstop for SQL-level failures rather than the everyday path.
//
// The catch is narrowed to BadRequest: anything else is a genuine server fault
// and belongs in index.js's error handler as a 500, not disguised as a 400.
// `checkAll` is the optional whole-payload pass, for the rules no single item
// can be judged against on its own (flashcard id collisions). It runs inside
// the same try, so it gets the same BadRequest → 400 treatment.
function replaceChildren(req, res, key, toRow, replace, checkAll) {
  const row = getTopic.get(req.params.id);
  if (!row) return res.status(404).json({ error: "topic not found" });

  let rows;
  try {
    rows = requireArray(req.body, key).map((item, i) => toRow(item, i));
    checkAll?.(rows, row.id);
  } catch (err) {
    if (err instanceof BadRequest) return res.status(400).json({ error: err.message });
    throw err;
  }

  replace(row.id, rows);
  // Respond with the rebuilt topic, not an echo of the request: the client's
  // next render then uses canonical server state, including the normalization
  // above (dropped nulls, reindexed positions).
  res.json(buildTopic(row));
}

// PUT /api/topics/:id/cards — replace the topic's Learn-mode cards.
//
// requireADMIN, not merely requireAuth. Cards are shared content: every account
// on the install reads these rows. This route used to check only that you were
// logged in, and since signup is open, that meant anyone who could create an
// account could delete the curriculum for everyone — confirmed by sending
// {"cards": []} from a throwaway account and emptying a topic.
//
// The GET routes above stay open, and per-user writes elsewhere stay on
// requireUser. This gate is specifically about changing what OTHERS read.
router.put("/:id/cards", requireUser, requireTopicEditor, (req, res) =>
  replaceChildren(req, res, "cards", cardRow, replaceCards)
);

// PUT /api/topics/:id/flashcards — replace the topic's deck. An empty array is
// a legal payload: it is how the editor deletes a deck, and buildTopic turns
// zero rows back into an absent `flashcards` key.
//
// Each card carries its own `id` in and back out again. Send a card's id to
// edit or reorder it; omit it to add a new one and be told what it is called.
router.put("/:id/flashcards", requireUser, requireTopicEditor, (req, res) =>
  replaceChildren(req, res, "flashcards", flashcardRow, replaceFlashcards, checkFlashcardIds)
);

export default router;
