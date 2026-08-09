// Loads src/data/ into the database.
//
// The topic modules stay in git as the authored source of truth; this script
// is the one-way bridge from those files into SQLite. Node can import them
// directly because they are pure data with no app imports (AUTHORING.md §1) —
// the same trick scripts/auditBank.js already uses, and the reason §7 makes
// the `.js` extension mandatory on curriculum.js's imports.
//
//   npm run db:seed              # insert/update, keep existing rows
//   npm run db:seed -- --reset   # wipe content tables first
//
// Re-runnable: content rows are keyed by (topic_id, position), so a second run
// updates in place instead of duplicating. Attempts and users are never touched.
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

// Child rows are replaced wholesale per topic — simpler and more predictable
// than diffing, and the volume is trivial (~176 cards, ~232 questions). Safe
// for these three because nothing references them: no per-user state hangs off
// a card, a legacy question, or a flashcard.
//
// `items` is the exception and must NOT be cleared this way — see
// deleteMissingItems below.
const clearCards = db.prepare("DELETE FROM cards WHERE topic_id = ?");
const clearQuestions = db.prepare("DELETE FROM questions WHERE topic_id = ?");
const clearFlashcards = db.prepare("DELETE FROM flashcards WHERE topic_id = ?");

const insertCard = db.prepare(`
  INSERT INTO cards (topic_id, position, heading, body, code, accept,
                     figure_src, figure_alt, figure_caption)
  VALUES (@topic_id, @position, @heading, @body, @code, @accept,
          @figure_src, @figure_alt, @figure_caption)
`);

const insertQuestion = db.prepare(`
  INSERT INTO questions (topic_id, position, prompt, code, answer, explanation, tag,
                         figure_src, figure_alt, figure_caption)
  VALUES (@topic_id, @position, @prompt, @code, @answer, @explanation, @tag,
          @figure_src, @figure_alt, @figure_caption)
`);

const insertChoice = db.prepare(
  "INSERT INTO choices (question_id, position, text) VALUES (?, ?, ?)"
);

const insertFlashcard = db.prepare(
  "INSERT INTO flashcards (topic_id, position, front, back) VALUES (?, ?, ?, ?)"
);

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
    // Order matters even with ON DELETE CASCADE — be explicit about it.
    db.exec("DELETE FROM choices; DELETE FROM questions; DELETE FROM cards; DELETE FROM flashcards; DELETE FROM topics; DELETE FROM courses;");
  }

  COURSES.forEach((c, i) => upsertCourse.run(c.id, c.title, c.subtitle ?? null, i));

  let cards = 0;
  let questions = 0;
  let flashcards = 0;
  let items = 0;

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
    clearQuestions.run(topic.id);
    clearFlashcards.run(topic.id);
    // NOT clearItems — items are upserted below and pruned after, so that
    // per-user review state and attempts survive a reseed.
    deleteMissingItems(topic.id, (topic.items ?? []).map((it) => it.id));

    (topic.cards ?? []).forEach((card, i) => {
      insertCard.run({
        topic_id: topic.id,
        position: i,
        heading: card.heading,
        body: card.body ?? null,
        code: card.code ?? null,
        accept: card.accept ? JSON.stringify(card.accept) : null,
        ...figureCols(card.figure),
      });
      cards++;
    });

    (topic.questions ?? []).forEach((q, i) => {
      const { lastInsertRowid } = insertQuestion.run({
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
      q.choices.forEach((text, ci) => insertChoice.run(lastInsertRowid, ci, text));
      questions++;
    });

    (topic.flashcards ?? []).forEach((f, i) => {
      insertFlashcard.run(topic.id, i, f.front, f.back);
      flashcards++;
    });

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

  return { cards, questions, flashcards, items };
});

const counts = seed();

console.log(
  `Seeded ${COURSES.length} courses · ${curriculum.length} topics · ` +
    `${counts.cards} cards · ${counts.questions} questions · ` +
    `${counts.flashcards} flashcards · ${counts.items} items`
);
