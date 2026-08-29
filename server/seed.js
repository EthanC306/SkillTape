// Loads src/data/ into the database.
//
// The topic modules stay in git as the authored source of truth; this script
// is the one-way bridge from those files into SQLite. Node can import them
// directly because they are pure data with no app imports (AUTHORING.md §1) —
// the same trick scripts/auditBank.js already uses, and the reason §7 makes
// the `.js` extension mandatory on curriculum.js's imports.
//
//   npm run db:seed              # insert/update, keep existing rows
//   npm run db:seed -- --reset   # also drop content the curriculum no longer has
//
// Re-runnable, and — the part that is easy to get wrong — HISTORY-PRESERVING.
// Questions and items are upserted by their authored id and pruned afterward,
// never deleted and re-inserted, so a reseed leaves quiz attempts, FSRS
// schedules and suspensions pointing at the same content they always did. Both
// of those started out as delete-and-reinsert and both silently destroyed
// history until it was noticed; see upsertQuestion and upsertItem below before
// changing either. Attempts and users are never written here at all.
import { createHash } from "node:crypto";
import db from "./db.js";
import curriculum from "../src/data/curriculum.js";
import { COURSES } from "../src/data/courses.js";

const reset = process.argv.includes("--reset");

const upsertCourse = db.prepare(`
  INSERT INTO courses (id, title, subtitle, position) VALUES (?, ?, ?, ?)
  ON CONFLICT(id) DO UPDATE SET title = excluded.title,
                                subtitle = excluded.subtitle,
                                position = excluded.position
`);

const upsertTopic = db.prepare(`
  INSERT INTO topics (id, course_id, title, subtitle, show_chart, position, exam_weight)
  VALUES (?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(id) DO UPDATE SET course_id   = excluded.course_id,
                                title       = excluded.title,
                                subtitle    = excluded.subtitle,
                                show_chart  = excluded.show_chart,
                                position    = excluded.position,
                                exam_weight = excluded.exam_weight
`);

// Cards and flashcards are replaced wholesale per topic — simpler and more
// predictable than diffing, and the volume is trivial (~176 cards). Safe for
// these two because nothing references them: no per-user state hangs off a
// card or a flashcard.
//
// `questions` and `items` are the exceptions and must NOT be cleared this way
// — see upsertQuestion and deleteMissingItems below.
const clearCards = db.prepare("DELETE FROM cards WHERE topic_id = ?");
// Flashcards are the exception to the paragraph above: something DOES hang off
// them now, namely the deck the user typed in Edit Mode. `origin = 'authored'`
// narrows the wipe to the rows this file put there in the first place, so a
// reseed replaces the curriculum's cards and leaves the user's alone.
//
// This is not hypothetical. calcII-derivatives ships `flashcards: []` and a
// Learn card that says "Hit Edit above, then switch to the Flashcards tab to
// add terms" — its entire deck is user-authored by design, and the old
// unqualified DELETE took all of it on every `npm run db:seed`.
const clearAuthoredFlashcards = db.prepare(
  "DELETE FROM flashcards WHERE topic_id = ? AND origin = 'authored'"
);

const insertCard = db.prepare(`
  INSERT INTO cards (topic_id, position, heading, body, code, art, accept,
                     figure_src, figure_alt, figure_caption)
  VALUES (@topic_id, @position, @heading, @body, @code, @art, @accept,
          @figure_src, @figure_alt, @figure_caption)
`);

// questions (docs/STABLE_QUESTION_IDS.md): the same UPSERT treatment items got
// below, and for the same reason. `questions.id` is AUTOINCREMENT, so the old
// `DELETE FROM questions WHERE topic_id = ?` handed every re-inserted question
// a brand new integer id — and `attempts.question_id` is `ON DELETE SET NULL`,
// so every past attempt silently lost the record of WHICH question it answered
// on every single reseed. With near-daily content edits no MCQ history could
// ever survive; all 38 attempt rows in the author's database had already been
// wiped clean this way before the bug was found.
//
// ON CONFLICT(stable_id) keeps the row alive while refreshing every content
// column, so `attempts.question_stable_id` keeps pointing at a live question
// across any number of reseeds. Do not reintroduce the delete.
const upsertQuestion = db.prepare(`
  INSERT INTO questions (stable_id, revision, content_hash, topic_id, position,
                         prompt, code, answer, explanation, tag,
                         figure_src, figure_alt, figure_caption)
  VALUES (@stable_id, @revision, @content_hash, @topic_id, @position,
          @prompt, @code, @answer, @explanation, @tag,
          @figure_src, @figure_alt, @figure_caption)
  ON CONFLICT(stable_id) DO UPDATE SET revision       = excluded.revision,
                                       content_hash   = excluded.content_hash,
                                       topic_id       = excluded.topic_id,
                                       position       = excluded.position,
                                       prompt         = excluded.prompt,
                                       code           = excluded.code,
                                       answer         = excluded.answer,
                                       explanation    = excluded.explanation,
                                       tag            = excluded.tag,
                                       figure_src     = excluded.figure_src,
                                       figure_alt     = excluded.figure_alt,
                                       figure_caption = excluded.figure_caption
  RETURNING id
`);

const getQuestionMeta = db.prepare(
  "SELECT revision, content_hash FROM questions WHERE stable_id = ?"
);

/**
 * Fingerprint of the GRADED content only.
 *
 * `explanation`, `tag` and `figure` are deliberately excluded: fixing a typo in
 * an explanation cannot change whether a past answer was right, so it must not
 * invalidate that question's history. Anything in here, by contrast, means the
 * learner is now facing a different question under the same id.
 *
 * Array form, not an object, so the hash doesn't depend on key order.
 */
function contentHash(q) {
  return createHash("sha256")
    .update(JSON.stringify([q.prompt, q.code ?? null, q.choices, q.answer]))
    .digest("hex");
}

/**
 * The revision this question should be stored at, and whether that's a bump.
 *
 * Computed here rather than hand-maintained in the topic modules — a counter
 * spread across 300 questions would be forgotten the first time someone edited
 * one in a hurry, and a wrong revision is worse than none.
 */
function revisionFor(stableId, hash) {
  const prev = getQuestionMeta.get(stableId);
  if (!prev) return { revision: 1, bumped: false };
  // A stored row with no hash predates content hashing; adopt the hash it
  // should have had rather than inventing a revision bump nothing justifies.
  if (prev.content_hash == null) return { revision: prev.revision, bumped: false };
  if (prev.content_hash === hash) return { revision: prev.revision, bumped: false };
  return { revision: prev.revision + 1, bumped: true };
}

/**
 * The other half of the upsert, mirroring deleteMissingItems: a question
 * deleted from a topic module genuinely disappears.
 *
 * `stable_id IS NULL OR ...` is load-bearing, and not only as a NULL-safety
 * dance around SQL's three-valued `NOT IN`. Rows without a stable id are the
 * pre-STABLE_QUESTION_IDS ones: nothing can ever match them to an authored
 * question again, so they are unreachable duplicates the moment their
 * replacement is upserted, and this is the sweep that clears them out.
 */
function deleteMissingQuestions(topicId, keepIds) {
  const placeholders = keepIds.map(() => "?").join(", ");
  return db
    .prepare(
      keepIds.length
        ? `DELETE FROM questions
           WHERE topic_id = ? AND (stable_id IS NULL OR stable_id NOT IN (${placeholders}))`
        : "DELETE FROM questions WHERE topic_id = ?"
    )
    .run(topicId, ...keepIds).changes;
}

// Choices stay replace-wholesale, keyed off the question's integer id: nothing
// references a choice row, so re-creating them costs nothing and avoids
// diffing four strings.
const clearChoices = db.prepare("DELETE FROM choices WHERE question_id = ?");

const insertChoice = db.prepare(
  "INSERT INTO choices (question_id, position, text) VALUES (?, ?, ?)"
);

// The authored stable id is derived, not random, so that re-seeding the same
// module reproduces the same ids rather than minting a fresh set every run —
// the identity has to be a property of the authored deck, not of when it was
// last imported. Topic modules don't declare flashcard ids today, so position
// is all there is to key on; if a deck is reordered in the module, the ids
// follow the slots. That is acceptable precisely because nothing references a
// flashcard id yet, and it is why the marker is spelled `-a` — a user-authored
// card gets an opaque `fc-<uuid>` from routes/topics.js and can never collide.
const authoredFlashcardId = (topicId, i) => `${topicId}-fc-a${i}`;

const insertFlashcard = db.prepare(
  `INSERT INTO flashcards (topic_id, position, front, back, stable_id, origin)
   VALUES (?, ?, ?, ?, ?, 'authored')`
);

// User cards keep their identity and their content; only their slot moves, so
// that the authored deck occupies 0..n-1 and the user's sit after it rather
// than interleaving on duplicate positions (the read is ORDER BY position, and
// ties resolve arbitrarily).
//
// Read-then-write one row at a time, rather than one clever UPDATE with a
// correlated subquery over the table being updated: SQLite applies an UPDATE
// row by row, so such a subquery can see rows this same statement has already
// rewritten. The loop has no such ambiguity.
const userFlashcardsInOrder = db.prepare(
  "SELECT stable_id FROM flashcards WHERE topic_id = ? AND origin = 'user' ORDER BY position, id"
);
const setFlashcardPosition = db.prepare(
  "UPDATE flashcards SET position = ? WHERE stable_id = ?"
);

/** Park the topic's user-authored cards immediately after its authored ones. */
function appendUserFlashcards(topicId, afterPosition) {
  userFlashcardsInOrder.all(topicId).forEach((row, i) => {
    setFlashcardPosition.run(afterPosition + i, row.stable_id);
  });
}

// items (ROADMAP.md A3/A4): itemSchema.js's polymorphic bank. The topic module
// stays the source of truth and this is still a one-way bridge into SQLite —
// but UPSERT, not delete-and-reinsert like the three tables above.
//
// This is load-bearing, not a style preference. server/db.js sets
// `foreign_keys = ON`, and item_review_state, item_attempts and
// item_suspensions all declare `item_id REFERENCES items(id) ON DELETE
// CASCADE` (schema.sql). A `DELETE FROM items WHERE topic_id = ?` therefore
// cascades into every one of them, and reinserting the same id afterward does
// not bring the children back — so a plain reseed used to destroy all FSRS
// scheduling, the entire attempt log, and every suspension, for every item,
// including the ones whose content hadn't changed. Editing one prompt cost you
// your whole study history.
//
// ON CONFLICT(id) keeps the row (and its children) alive while refreshing
// every content column, which is exactly the "topic module wins" semantics the
// delete was reaching for.
const upsertItem = db.prepare(`
  INSERT INTO items (id, topic_id, position, format, origin, prompt, expected,
                     criteria, provenance, generation_meta, difficulty,
                     verified_by_human, retired, choices, answer_index,
                     time_budget_sec, extra_atoms)
  VALUES (@id, @topic_id, @position, @format, @origin, @prompt, @expected,
          @criteria, @provenance, @generation_meta, @difficulty,
          @verified_by_human, @retired, @choices, @answer_index,
          @time_budget_sec, @extra_atoms)
  ON CONFLICT(id) DO UPDATE SET topic_id          = excluded.topic_id,
                                position          = excluded.position,
                                format            = excluded.format,
                                origin            = excluded.origin,
                                prompt            = excluded.prompt,
                                expected          = excluded.expected,
                                criteria          = excluded.criteria,
                                provenance        = excluded.provenance,
                                generation_meta   = excluded.generation_meta,
                                difficulty        = excluded.difficulty,
                                verified_by_human = excluded.verified_by_human,
                                retired           = excluded.retired,
                                choices           = excluded.choices,
                                answer_index      = excluded.answer_index,
                                time_budget_sec   = excluded.time_budget_sec,
                                extra_atoms       = excluded.extra_atoms
`);

// The other half of the upsert: an item deleted from a topic module has to
// disappear from the bank too. Cascading here IS correct — the item is
// genuinely gone, so its scheduling state and attempts have nothing left to
// describe. Built per topic because the id list is variadic.
function deleteMissingItems(topicId, keepIds) {
  const placeholders = keepIds.map(() => "?").join(", ");
  return db
    .prepare(
      keepIds.length
        ? `DELETE FROM items WHERE topic_id = ? AND id NOT IN (${placeholders})`
        : "DELETE FROM items WHERE topic_id = ?"
    )
    .run(topicId, ...keepIds).changes;
}

// Stale-content sweep for --reset. The old --reset was a blunt
// `DELETE FROM topics` (plus courses, questions, cards, flashcards) — which
// cascades: `attempts.topic_id` and `items.topic_id` are both ON DELETE
// CASCADE, so a reset silently took the entire quiz history, every item's FSRS
// schedule and every suspension with it. That is the same class of bug
// upsertQuestion exists to fix, so --reset prunes instead of wiping: rows for
// content that is genuinely gone from the curriculum are deleted (and SHOULD
// cascade — that history describes something that no longer exists), while
// everything still authored keeps its identity and its history.
//
// Net content state after a reset is what it always was. To actually start
// from nothing, delete db/skilltape.db — that is an explicit act, not a flag
// away from a routine reseed.
function pruneMissing(table, keepIds) {
  const placeholders = keepIds.map(() => "?").join(", ");
  return db
    .prepare(`DELETE FROM ${table} WHERE id NOT IN (${placeholders})`)
    .run(...keepIds).changes;
}

/**
 * Every question must carry an authored, curriculum-unique `id`.
 *
 * Checked up front, before the transaction opens, because both failure modes
 * are silent otherwise: a missing id would insert a row the attempt log can
 * never reference, and a duplicate id would make the second question's UPSERT
 * quietly overwrite the first — one question vanishing from the bank, and the
 * survivor inheriting the other's attempt history.
 */
function assertQuestionIds() {
  const seen = new Map();
  const problems = [];

  for (const topic of curriculum) {
    (topic.questions ?? []).forEach((q, i) => {
      if (typeof q.id !== "string" || !q.id.trim()) {
        problems.push(
          `${topic.id}.questions[${i}] has no authored id — add id: "${topic.id}-q${String(i + 1).padStart(2, "0")}" (AUTHORING.md §4.1)`
        );
        return;
      }
      if (seen.has(q.id)) problems.push(`duplicate question id "${q.id}" (also in ${seen.get(q.id)})`);
      else seen.set(q.id, topic.id);
    });
  }

  if (problems.length) {
    throw new Error(`Cannot seed — question ids are not valid:\n  ${problems.join("\n  ")}`);
  }
}

/** Flatten the optional { src, alt, caption } figure into three columns. */
function figureCols(figure) {
  return {
    figure_src: figure?.src ?? null,
    figure_alt: figure?.alt ?? null,
    figure_caption: figure?.caption ?? null,
  };
}

// One transaction for the whole seed: either the bank lands intact or the
// database is untouched. Never a half-migrated curriculum.
const seed = db.transaction(() => {
  if (reset) {
    // Cards and flashcards are cleared per-topic below anyway; doing it
    // globally here is what additionally drops rows orphaned on a topic that
    // has since been removed. Questions and items are pruned by their own
    // per-topic sweeps. See pruneMissing above for why topics and courses are
    // pruned rather than wiped.
    // Flashcards are qualified by origin for the same reason the per-topic
    // clear is: --reset drops stale CURRICULUM content, and a card the user
    // typed is not that. A user card whose topic is genuinely gone still goes,
    // via the ON DELETE CASCADE on the topics prune below.
    // Only shared curriculum is seed-owned. Account-owned courses and every
    // child below them are durable user data and must survive --reset.
    db.exec(`
      DELETE FROM cards WHERE topic_id IN (
        SELECT topics.id FROM topics JOIN courses ON courses.id = topics.course_id
        WHERE courses.owner_id IS NULL
      );
      DELETE FROM flashcards WHERE origin = 'authored';
    `);
    const topicIds = curriculum.map((t) => t.id);
    const topicMarks = topicIds.map(() => "?").join(", ");
    db.prepare(`DELETE FROM topics WHERE course_id IN (SELECT id FROM courses WHERE owner_id IS NULL) AND id NOT IN (${topicMarks})`).run(...topicIds);
    const courseIds = COURSES.map((c) => c.id);
    const courseMarks = courseIds.map(() => "?").join(", ");
    db.prepare(`DELETE FROM courses WHERE owner_id IS NULL AND id NOT IN (${courseMarks})`).run(...courseIds);
  }

  COURSES.forEach((c, i) => upsertCourse.run(c.id, c.title, c.subtitle ?? null, i));

  let cards = 0;
  let questions = 0;
  let flashcards = 0;
  let items = 0;
  // Reported at the end: a revision bump means a question's graded content
  // changed under an id that past attempts already point at, which is exactly
  // the event the "rewrite the ones I got right" workflow is watching for.
  const revised = [];

  curriculum.forEach((topic, position) => {
    upsertTopic.run(
      topic.id,
      topic.course,
      topic.title,
      topic.subtitle ?? null,
      topic.showChart ? 1 : 0,
      position,
      topic.examWeight ?? 1.0
    );

    clearCards.run(topic.id);
    clearAuthoredFlashcards.run(topic.id);
    // NOT clearQuestions / clearItems — both are upserted below and pruned
    // here instead, so that quiz history, per-user review state and drill
    // attempts survive a reseed.
    deleteMissingQuestions(topic.id, (topic.questions ?? []).map((q) => q.id));
    deleteMissingItems(topic.id, (topic.items ?? []).map((it) => it.id));

    (topic.cards ?? []).forEach((card, i) => {
      insertCard.run({
        topic_id: topic.id,
        position: i,
        heading: card.heading,
        body: card.body ?? null,
        code: card.code ?? null,
        art: card.art ?? null,
        accept: card.accept ? JSON.stringify(card.accept) : null,
        ...figureCols(card.figure),
      });
      cards++;
    });

    (topic.questions ?? []).forEach((q, i) => {
      const hash = contentHash(q);
      const { revision, bumped } = revisionFor(q.id, hash);
      // RETURNING, because lastInsertRowid is only meaningful on the INSERT
      // half of an upsert and the row usually already exists here.
      const { id: questionId } = upsertQuestion.get({
        stable_id: q.id,
        revision,
        content_hash: hash,
        topic_id: topic.id,
        position: i,
        prompt: q.prompt,
        code: q.code ?? null,
        answer: q.answer,
        explanation: q.explanation ?? null,
        tag: q.tag ?? null,
        ...figureCols(q.figure),
      });
      // Stored in authored order; QuizView re-permutes at runtime via
      // shuffleChoices, so `answer` stays a valid index into this order.
      clearChoices.run(questionId);
      q.choices.forEach((text, ci) => insertChoice.run(questionId, ci, text));
      questions++;
      if (bumped) revised.push(`${q.id} → r${revision}`);
    });

    const authoredDeck = topic.flashcards ?? [];
    authoredDeck.forEach((f, i) => {
      insertFlashcard.run(topic.id, i, f.front, f.back, authoredFlashcardId(topic.id, i));
      flashcards++;
    });
    appendUserFlashcards(topic.id, authoredDeck.length);

    (topic.items ?? []).forEach((it, i) => {
      upsertItem.run({
        id: it.id,
        topic_id: topic.id,
        position: i,
        format: it.format,
        origin: it.origin,
        prompt: it.prompt,
        expected: it.expected ?? null,
        criteria: it.criteria?.length ? JSON.stringify(it.criteria) : null,
        provenance: it.provenance ? JSON.stringify(it.provenance) : null,
        generation_meta: it.generationMeta ? JSON.stringify(it.generationMeta) : null,
        difficulty: it.difficulty ?? 2,
        verified_by_human: it.verifiedByHuman ? 1 : 0,
        retired: it.retired ? 1 : 0,
        choices: it.choices?.length ? JSON.stringify(it.choices) : null,
        answer_index: typeof it.answerIndex === "number" ? it.answerIndex : null,
        time_budget_sec: it.timeBudgetSec ?? null,
        extra_atoms: it.extraAtoms?.length ? JSON.stringify(it.extraAtoms) : null,
      });
      items++;
    });
  });

  return { cards, questions, flashcards, items, revised };
});

assertQuestionIds();
const counts = seed();

console.log(
  `Seeded ${COURSES.length} courses · ${curriculum.length} topics · ` +
    `${counts.cards} cards · ${counts.questions} questions · ` +
    `${counts.flashcards} flashcards · ${counts.items} items`
);

if (counts.revised.length) {
  console.log(
    `\n${counts.revised.length} question${counts.revised.length > 1 ? "s" : ""} revised ` +
      `(graded content changed; past attempts keep pointing at the earlier revision):`
  );
  for (const line of counts.revised) console.log(`  ${line}`);
}
