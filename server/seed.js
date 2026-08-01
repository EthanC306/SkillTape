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
// than diffing, and the volume is trivial (~176 cards, ~232 questions).
const clearCards = db.prepare("DELETE FROM cards WHERE topic_id = ?");
const clearQuestions = db.prepare("DELETE FROM questions WHERE topic_id = ?");
const clearFlashcards = db.prepare("DELETE FROM flashcards WHERE topic_id = ?");
const clearItems = db.prepare("DELETE FROM items WHERE topic_id = ?");

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

// items (ROADMAP.md A3/A4): itemSchema.js's polymorphic bank. Seeded
// wholesale like everything else here — the topic module stays the source of
// truth, this is a one-way bridge into SQLite.
const insertItem = db.prepare(`
  INSERT INTO items (id, topic_id, position, format, origin, prompt, expected,
                     criteria, provenance, generation_meta, difficulty,
                     verified_by_human, retired, choices, answer_index,
                     time_budget_sec, extra_atoms)
  VALUES (@id, @topic_id, @position, @format, @origin, @prompt, @expected,
          @criteria, @provenance, @generation_meta, @difficulty,
          @verified_by_human, @retired, @choices, @answer_index,
          @time_budget_sec, @extra_atoms)
`);

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
    clearItems.run(topic.id);

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
      insertItem.run({
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
