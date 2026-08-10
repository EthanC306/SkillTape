// server/seed.js — the guarantee that a reseed does not destroy quiz history.
//
// This is the regression test for docs/STABLE_QUESTION_IDS.md. `questions.id`
// is AUTOINCREMENT and seeding used to `DELETE FROM questions WHERE topic_id = ?`
// before re-inserting, so every `npm run db:seed` handed each question a brand
// new integer id and `attempts.question_id ON DELETE SET NULL` quietly blanked
// the record of which question every past attempt had answered. With near-daily
// content edits, no MCQ history could ever survive — all 38 attempt rows in the
// author's database had already been wiped this way before anyone noticed.
//
// Nothing about that failure is loud: the seed prints the same success line
// either way, the app looks fine, and the loss only shows up as history that is
// mysteriously anonymous months later. So it gets a test.
//
// Runs the real `node server/seed.js` against a throwaway database rather than
// reimplementing it — the bug lived in the interaction between the schema's FK
// actions and the seed's write strategy, which is exactly what a reimplemented
// stub would paper over.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

/** A fresh temp database path, cleaned up when the test ends. */
function tempDbPath(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "skilltape-seed-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return path.join(dir, "test.db");
}

function seed(dbPath, args = []) {
  return execFileSync("node", [path.join(ROOT, "server", "seed.js"), ...args], {
    cwd: ROOT,
    env: { ...process.env, SKILLTAPE_DB: dbPath },
    encoding: "utf8",
  });
}

/** Open the seeded database the way the server does, FKs and all. */
function open(dbPath) {
  const db = new Database(dbPath);
  db.pragma("foreign_keys = ON");
  return db;
}

/** Record one answered question, as POST /api/attempts would. */
function recordAttempt(db, { topicId, stableId, revision, correct = 1 }) {
  db.prepare(
    `INSERT INTO attempts (user_id, run_id, topic_id, question_id, question_stable_id,
                           question_revision, position, correct, created_at)
     VALUES (NULL, 'run-1', ?, NULL, ?, ?, 0, ?, ?)`
  ).run(topicId, stableId, revision, correct, Date.now());
}

test("every authored question reaches the database with its stable id", (t) => {
  const dbPath = tempDbPath(t);
  seed(dbPath);
  const db = open(dbPath);

  const { total, withStableId, distinctIds } = db
    .prepare(
      `SELECT COUNT(*) AS total,
              COUNT(stable_id) AS withStableId,
              COUNT(DISTINCT stable_id) AS distinctIds FROM questions`
    )
    .get();

  assert.ok(total > 0, "seeded no questions at all");
  assert.equal(withStableId, total, "some questions reached the database with a NULL stable_id");
  assert.equal(distinctIds, total, "two questions share a stable_id");
});

test("a reseed leaves an existing attempt still pointing at its question", (t) => {
  const dbPath = tempDbPath(t);
  seed(dbPath);
  const db = open(dbPath);

  const q = db.prepare("SELECT id, stable_id, revision, topic_id FROM questions LIMIT 1").get();
  recordAttempt(db, { topicId: q.topic_id, stableId: q.stable_id, revision: q.revision });
  db.close();

  seed(dbPath); // the operation that used to destroy the link

  const after = open(dbPath);
  const attempt = after.prepare("SELECT * FROM attempts").get();
  assert.equal(
    attempt.question_stable_id,
    q.stable_id,
    "reseeding blanked the attempt's question id — the exact regression this test exists for"
  );
  assert.equal(attempt.question_revision, q.revision);

  // Not just retained — still resolvable. A dangling id would be no better
  // than a NULL one for answering "which questions did I get right".
  const joined = after
    .prepare(
      `SELECT q.prompt FROM attempts a
       JOIN questions q ON q.stable_id = a.question_stable_id`
    )
    .get();
  assert.ok(joined?.prompt, "the attempt's stable id no longer joins to any question");
});

test("reseeding does not churn question rows or invent revisions", (t) => {
  const dbPath = tempDbPath(t);
  seed(dbPath);
  const db = open(dbPath);
  const before = db.prepare("SELECT id, stable_id, revision FROM questions ORDER BY stable_id").all();
  db.close();

  seed(dbPath);

  const after = open(dbPath);
  const rows = after.prepare("SELECT id, stable_id, revision FROM questions ORDER BY stable_id").all();

  // Identical integer ids means the rows were updated in place, not deleted
  // and re-inserted. This is what keeps choices.question_id valid too.
  assert.deepEqual(rows, before, "a no-op reseed rewrote question rows");
  assert.ok(
    rows.every((r) => r.revision === 1),
    "an unchanged question had its revision bumped — cosmetic reseeds must be free"
  );

  // Choices must not accumulate: they are still replaced wholesale per
  // question, keyed on an id that now survives, so a leak would show up here.
  const orphans = after
    .prepare("SELECT COUNT(*) AS n FROM choices WHERE question_id NOT IN (SELECT id FROM questions)")
    .get();
  assert.equal(orphans.n, 0, "reseeding left orphaned choice rows behind");
});

test("changed graded content bumps the revision; past attempts keep the old one", (t) => {
  const dbPath = tempDbPath(t);
  seed(dbPath);
  const db = open(dbPath);

  const q = db.prepare("SELECT id, stable_id, revision, topic_id FROM questions LIMIT 1").get();
  recordAttempt(db, { topicId: q.topic_id, stableId: q.stable_id, revision: q.revision });

  // Stand in for an edited prompt/choices/answer in the topic module: what the
  // seed actually compares is the stored content_hash against the one it
  // recomputes from the module, so a stale stored hash IS the post-edit state.
  db.prepare("UPDATE questions SET content_hash = 'stale' WHERE stable_id = ?").run(q.stable_id);
  db.close();

  const output = seed(dbPath);

  const after = open(dbPath);
  const reseeded = after.prepare("SELECT id, revision FROM questions WHERE stable_id = ?").get(q.stable_id);
  assert.equal(reseeded.revision, q.revision + 1, "an edited question did not get a new revision");
  assert.equal(reseeded.id, q.id, "an edited question was re-created rather than updated");
  assert.match(output, new RegExp(`${q.stable_id} → r${q.revision + 1}`), "the seed didn't report the bump");

  const attempt = after.prepare("SELECT * FROM attempts").get();
  assert.equal(attempt.question_stable_id, q.stable_id, "editing a question orphaned its history");
  assert.equal(
    attempt.question_revision,
    q.revision,
    "the past attempt was silently re-dated to the new revision — it answered the old wording"
  );

  // Every OTHER question must be untouched: a single edit may not ripple.
  const bumped = after.prepare("SELECT COUNT(*) AS n FROM questions WHERE revision > 1").get();
  assert.equal(bumped.n, 1, "editing one question bumped the revision of others");
});

test("--reset keeps history instead of cascading it away", (t) => {
  const dbPath = tempDbPath(t);
  seed(dbPath);
  const db = open(dbPath);

  const q = db.prepare("SELECT id, stable_id, revision, topic_id FROM questions LIMIT 1").get();
  recordAttempt(db, { topicId: q.topic_id, stableId: q.stable_id, revision: q.revision });
  const before = db.prepare("SELECT id, stable_id, revision FROM questions ORDER BY stable_id").all();
  db.close();

  // --reset used to be `DELETE FROM topics`, which cascades through
  // attempts.topic_id, items.topic_id and everything hanging off them.
  seed(dbPath, ["--reset"]);

  const after = open(dbPath);
  assert.equal(after.prepare("SELECT COUNT(*) AS n FROM attempts").get().n, 1, "--reset destroyed the attempt log");
  assert.equal(after.prepare("SELECT * FROM attempts").get().question_stable_id, q.stable_id);
  assert.deepEqual(
    after.prepare("SELECT id, stable_id, revision FROM questions ORDER BY stable_id").all(),
    before,
    "--reset produced different question rows than a plain seed"
  );
});

test("questions with no stable id are swept, not left as duplicates", (t) => {
  const dbPath = tempDbPath(t);
  seed(dbPath);
  const db = open(dbPath);

  // Exactly what a database seeded before stable ids existed looks like: real
  // question rows that nothing can ever match to an authored question again.
  const topicId = db.prepare("SELECT topic_id FROM questions LIMIT 1").get().topic_id;
  db.prepare(
    `INSERT INTO questions (topic_id, position, prompt, answer, revision)
     VALUES (?, 99, 'orphaned legacy row', 0, 1)`
  ).run(topicId);
  const total = db.prepare("SELECT COUNT(*) AS n FROM questions").get().n;
  db.close();

  seed(dbPath);

  const after = open(dbPath);
  assert.equal(
    after.prepare("SELECT COUNT(*) AS n FROM questions").get().n,
    total - 1,
    "the legacy row survived the reseed and now duplicates a real question"
  );
  assert.equal(after.prepare("SELECT COUNT(*) AS n FROM questions WHERE stable_id IS NULL").get().n, 0);
});
