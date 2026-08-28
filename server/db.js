// The single SQLite connection, shared by every route.
//
// better-sqlite3 is synchronous on purpose: SQLite is a file on disk, not a
// network service, so there is nothing to await. Reads return immediately and
// the usual async ceremony would only add overhead.
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, "..");

// db/ is already covered by .gitignore ("Drill data / local progress").
//
// SKILLTAPE_DB is not only for Docker/Electron. Test files that import
// anything out of routes/drill.js reach this module, which opens a database
// and runs the guarded ALTER TABLEs below at import time, so they each point
// it at a throwaway path (test/helpers/testDb.js). Without that, running the
// test suite migrates the developer's real progress database.
const DB_DIR = path.join(ROOT, "db");
export const DB_PATH = process.env.SKILLTAPE_DB || path.join(DB_DIR, "skilltape.db");

if (DB_PATH !== ":memory:") fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);

// WAL lets reads proceed while a write is in flight — worth having the moment
// the editor saves while a quiz is being taken.
db.pragma("journal_mode = WAL");
// SQLite ships with foreign keys OFF for backwards compatibility. Without this
// the REFERENCES clauses in schema.sql are documentation, not constraints.
db.pragma("foreign_keys = ON");

// schema.sql is entirely CREATE ... IF NOT EXISTS, so running it on every boot
// is a no-op once the tables exist. That makes it a create-or-noop migration.
db.exec(fs.readFileSync(path.join(HERE, "schema.sql"), "utf8"));

// CREATE TABLE IF NOT EXISTS can't add a column to a table that already
// exists from a previous boot — this app has no real migration system yet
// (docs/PRODUCTION_READINESS.md §2.3 tracks that gap). `exam_weight` landed
// on `topics` after some installs already had the table, so it needs this
// one guarded ALTER TABLE to reach a DB created before A5. A fresh DB gets
// the column straight from schema.sql above, so this is a no-op there.
function ensureColumn(table, column, ddl) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all();
  if (!cols.some((c) => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
  }
}
ensureColumn("topics", "exam_weight", "exam_weight REAL NOT NULL DEFAULT 1.0");

// `cards.art` — the monospace diagram block. Same guarded-ALTER story as
// exam_weight: it landed after installs already had a `cards` table, and a card
// without one is simply NULL here, so no backfill is needed.
ensureColumn("cards", "art", "art TEXT");

// docs/STABLE_QUESTION_IDS.md — the authored `questions.stable_id` and the
// attempt columns that reference it. Same guarded-ALTER story as exam_weight,
// with two SQLite restrictions shaping how it's written:
//
//  1. ALTER TABLE cannot add a UNIQUE column, so `stable_id` is added plain and
//     the constraint arrives as a separate CREATE UNIQUE INDEX. A fresh
//     database takes the identical path (schema.sql declares the column
//     without UNIQUE), so both converge on the same structure rather than
//     old and new installs differing.
//  2. ALTER TABLE can only add a REFERENCES column whose default is NULL —
//     which is exactly what `question_stable_id` needs anyway.
//
// The unique index must exist before anything references questions(stable_id):
// SQLite requires a unique index on a foreign key's parent columns, and
// seed.js's ON CONFLICT(stable_id) upsert needs it as its conflict target.
ensureColumn("questions", "stable_id", "stable_id TEXT");
ensureColumn("questions", "revision", "revision INTEGER NOT NULL DEFAULT 1");
ensureColumn("questions", "content_hash", "content_hash TEXT");
db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_questions_stable ON questions(stable_id)");

ensureColumn(
  "attempts",
  "question_stable_id",
  "question_stable_id TEXT REFERENCES questions(stable_id) ON DELETE SET NULL"
);
ensureColumn("attempts", "question_revision", "question_revision INTEGER");
db.exec(
  "CREATE INDEX IF NOT EXISTS idx_attempts_question_stable ON attempts(question_stable_id, created_at)"
);

// Scheduler replay columns on the review log. Same guarded-ALTER story as
// everything above. All six are nullable with no default on purpose: a row
// written before these existed genuinely does not know what the card looked
// like going in, and NULL says so, where a 0 would be a plausible-looking lie
// the optimizer would later train on.
for (const [column, type] of [
  ["state_before", "INTEGER"],
  ["stability_before", "REAL"],
  ["difficulty_before", "REAL"],
  ["elapsed_days", "INTEGER"],
  ["scheduled_days", "INTEGER"],
  ["params_version", "TEXT"],
]) {
  ensureColumn("item_attempts", column, `${column} ${type}`);
}

// These do carry NOT NULL DEFAULT 0, unlike the log columns above. A missing
// value here really is equivalent to 0 (a card mid-way through its learning
// steps just restarts at step 0), and the scheduler reads them on every call,
// so a NULL would have to be defaulted at every read site instead of once.
ensureColumn("item_review_state", "elapsed_days", "elapsed_days INTEGER NOT NULL DEFAULT 0");
ensureColumn("item_review_state", "scheduled_days", "scheduled_days INTEGER NOT NULL DEFAULT 0");
ensureColumn("item_review_state", "learning_steps", "learning_steps INTEGER NOT NULL DEFAULT 0");
ensureColumn("item_review_state", "last_grade", "last_grade INTEGER");

// `item_attempts.surface` — which SCREEN wrote the row, as opposed to `mode`,
// which is the book condition. See the column comment in schema.sql for why the
// two are separate. Same guarded-ALTER story as everything above; nullable
// because a pre-A11 row genuinely does not know which screen it came from.
ensureColumn("item_attempts", "surface", "surface TEXT");

// The one backfill in this file, and it is a recovery rather than a guess:
// `mode = 'exam'` was only ever written by ExamView, so those rows can be
// labeled with certainty. `mode = 'closed'` rows are deliberately LEFT NULL in
// the log — DrillView and PracticeView both wrote them and nothing in the row
// distinguishes the two. Stats counts those NULL closed rows under Drill (see
// server/stats.js) without rewriting the append-only history, so the report
// stays populated without inventing a Legacy column.
//
// Idempotent: the `surface IS NULL` guard makes every re-run a no-op, which
// matters because this executes on every boot alongside the ALTERs above.
db.exec("UPDATE item_attempts SET surface = 'exam' WHERE surface IS NULL AND mode = 'exam'");
db.exec(
  "CREATE INDEX IF NOT EXISTS idx_item_attempts_surface ON item_attempts(user_id, surface, ts)"
);

// `item_attempts.session_id` / `.answer_choice` — the Report's session view.
// Same guarded-ALTER story as everything above, and both stay NULL on old rows.
//
// There is deliberately NO backfill here, unlike the `surface = 'exam'` recovery
// above. That one was a recovery: only ExamView ever wrote `mode = 'exam'`, so
// those rows could be labeled with certainty. A sitting cannot be. Old rows are
// grouped by clustering timestamps at read time (server/sessions.js) and the UI
// marks those sessions approximate — a heuristic that stays visibly a heuristic,
// rather than one frozen into the log where it would later read as fact.
ensureColumn("item_attempts", "session_id", "session_id TEXT");
ensureColumn("item_attempts", "answer_choice", "answer_choice INTEGER");
db.exec(
  "CREATE INDEX IF NOT EXISTS idx_item_attempts_session ON item_attempts(user_id, session_id, ts)"
);

// `users.is_admin` — the content-editing gate. Same guarded-ALTER story as
// everything above; DEFAULT 0 means every existing account starts unprivileged.
ensureColumn("users", "is_admin", "is_admin INTEGER NOT NULL DEFAULT 0");

// Bootstrap: an install with accounts but NO admin can never edit content
// again, because the only way to become an admin is to already be one. The
// lowest-numbered account is the person who set the install up, so it gets the
// flag. Guarded on "no admin exists", making it a one-time promotion rather
// than something that re-runs and re-promotes a demoted account on next boot.
{
  const admins = db.prepare("SELECT COUNT(*) AS n FROM users WHERE is_admin = 1").get().n;
  if (admins === 0) {
    const first = db.prepare("SELECT id, email FROM users ORDER BY id LIMIT 1").get();
    if (first) {
      db.prepare("UPDATE users SET is_admin = 1 WHERE id = ?").run(first.id);
      console.log(`[db] promoted ${first.email} to admin (no admin account existed)`);
    }
  }
}

// ── Ownership lockdown ──────────────────────────────────────────────────────
// Everything above is additive: a new column, an index, an idempotent backfill.
// This last step is structural — it rewrites six tables so user_id is NOT NULL
// and foreign-keyed to users(id), which SQLite cannot express as an ALTER.
//
// It runs last because it depends on every ensureColumn() above having already
// landed: the rebuild re-declares each table from its LIVE shape, so a column
// added after this point would be copied faithfully, but one added before it and
// missing here would be silently dropped.
//
// Throws if unowned history exists, which stops the server from starting. That
// is deliberate — see lockUserOwnership's comment.
import { lockUserOwnership } from "./migrations.js";

// SKILLTAPE_SKIP_LOCK is the escape hatch scripts/claimAnonymousData.mjs needs,
// and it exists to break a genuine deadlock rather than as a convenience:
// lockUserOwnership throws when unowned history exists, and its message tells
// the operator to run that script — but the script imports THIS module, so it
// would hit the same throw before it could claim anything. The one tool that
// can fix the condition has to be able to open the database while it holds.
const migration =
  process.env.SKILLTAPE_SKIP_LOCK === "1" ? { rebuilt: [], dropped: {} } : lockUserOwnership(db);
if (migration.rebuilt.length > 0) {
  console.log(`[db] locked user ownership on: ${migration.rebuilt.join(", ")}`);
  for (const [table, n] of Object.entries(migration.dropped)) {
    console.log(`[db] dropped ${n} unowned preference row(s) from ${table}`);
  }
}

export default db;
