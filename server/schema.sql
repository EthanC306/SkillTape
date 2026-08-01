-- ─────────────────────────── SkillTape schema ───────────────────────────
-- Every statement is IF NOT EXISTS, so db.js can run this file on every boot
-- and it acts as a create-or-noop migration.
--
-- Content tables (courses → topics → cards/questions/choices/flashcards)
-- mirror the shape of src/data/topics/<course>/<topic>.js, which stays in git
-- as the seed source. See docs/AUTHORING.md for what each field means.

-- ── Content ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS courses (
  id        TEXT PRIMARY KEY,   -- "cpp", "discrete" — matches COURSES in courses.js
  title     TEXT NOT NULL,
  subtitle  TEXT,
  position  INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS topics (
  -- Kept TEXT and identical to the authored id ("bigo", "discrete-2-4-circuits").
  -- AUTHORING.md §2.1: this id is stable forever because it keys progress —
  -- renaming it silently wipes a topic's history. Do not swap it for an integer.
  id         TEXT PRIMARY KEY,
  course_id  TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  subtitle   TEXT,
  show_chart INTEGER NOT NULL DEFAULT 0,   -- SQLite has no BOOLEAN; 0/1
  position   INTEGER NOT NULL DEFAULT 0    -- display order within the course
);

-- Learn-mode cards. `position` carries order: SQL returns rows unordered
-- unless asked, so array order has to be stored, not assumed.
CREATE TABLE IF NOT EXISTS cards (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  topic_id       TEXT NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  position       INTEGER NOT NULL,
  heading        TEXT NOT NULL,
  body           TEXT,               -- **bold** spans double as Fill Mode blanks
  code           TEXT,
  accept         TEXT,               -- JSON object or NULL (see AUTHORING §3.3)
  figure_src     TEXT,
  figure_alt     TEXT,
  figure_caption TEXT
);
CREATE INDEX IF NOT EXISTS idx_cards_topic ON cards(topic_id, position);

CREATE TABLE IF NOT EXISTS questions (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  topic_id       TEXT NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  position       INTEGER NOT NULL,
  prompt         TEXT NOT NULL,
  code           TEXT,
  answer         INTEGER NOT NULL,   -- 0-based index into this question's choices.position
  explanation    TEXT,
  tag            TEXT,               -- Big-O curve highlight; only meaningful when show_chart
  figure_src     TEXT,
  figure_alt     TEXT,
  figure_caption TEXT
);
CREATE INDEX IF NOT EXISTS idx_questions_topic ON questions(topic_id, position);

-- Own table rather than a JSON column so choices are queryable rows.
-- `position` is the authored order; QuizView re-permutes at runtime.
CREATE TABLE IF NOT EXISTS choices (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  question_id INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  position    INTEGER NOT NULL,
  text        TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_choices_question ON choices(question_id, position);

-- front/back are plain strings — no **bold** markup (AUTHORING §5).
CREATE TABLE IF NOT EXISTS flashcards (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  topic_id TEXT NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  front    TEXT NOT NULL,
  back     TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_flashcards_topic ON flashcards(topic_id, position);

-- ── Accounts ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  email         TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,      -- bcrypt. Never a plaintext or reversible value.
  created_at    INTEGER NOT NULL    -- epoch ms
);

CREATE TABLE IF NOT EXISTS sessions (
  id         TEXT PRIMARY KEY,      -- random 256-bit token, sent as an httpOnly cookie
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

-- ── Attempts ─────────────────────────────────────────────────────────────

-- ONE ROW PER ITEM ANSWERED, not one per quiz run.
--
-- docs/ROADMAP.md:270 records this correction against the original spec: a
-- per-run shape (score/total/per_question_results) "cannot support leech
-- detection or per-item scheduling — change it before writing the migration,
-- not after." `run_id` groups the items of a single sitting back together, so
-- the existing {best, total, runs, history} UI shape is still derivable.
CREATE TABLE IF NOT EXISTS attempts (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER REFERENCES users(id) ON DELETE CASCADE,  -- NULL until auth lands
  run_id      TEXT NOT NULL,
  topic_id    TEXT NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  question_id INTEGER REFERENCES questions(id) ON DELETE SET NULL,
  position    INTEGER NOT NULL,     -- order answered within the run
  correct     INTEGER NOT NULL,     -- 0/1
  created_at  INTEGER NOT NULL      -- epoch ms
);
CREATE INDEX IF NOT EXISTS idx_attempts_run ON attempts(run_id);
CREATE INDEX IF NOT EXISTS idx_attempts_topic ON attempts(user_id, topic_id, created_at);
CREATE INDEX IF NOT EXISTS idx_attempts_question ON attempts(question_id, created_at);
