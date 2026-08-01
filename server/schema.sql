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
  position   INTEGER NOT NULL DEFAULT 0,   -- display order within the course
  -- ROADMAP.md A0's per-topic exam weight. Set on 12 cpp topic module files
  -- since 2026-08-01 but never actually reached the database until A5 needed
  -- it server-side for exam sampling — seed.js and topics.js buildTopic()
  -- both had to be updated alongside this column, or the value would keep
  -- existing only in the .js source files and never in a served topic.
  exam_weight REAL NOT NULL DEFAULT 1.0
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

-- ── Drill mode (ROADMAP.md A4) ──────────────────────────────────────────────
-- Three tables, deliberately separate from the legacy MCQ-only `questions` /
-- `attempts` pair above rather than reshaped into it:
--   items             — the polymorphic src/data/itemSchema.js bank, one row
--                        per item. Content, shared across users, like cards.
--   item_review_state — per-user FSRS scheduling state, one row per
--                        (user, item). NOT content — this is what changes
--                        every time someone drills the item.
--   item_attempts     — the append-only attempt log CORR §4.3 specifies:
--                        { itemId, ts, mode, grade, seconds, tabBlurs, note }.

CREATE TABLE IF NOT EXISTS items (
  -- Authored id from itemSchema.js (e.g. "dynamic-alloc-01"), stable forever
  -- for the same reason topics.id is (AUTHORING.md §2.1) — it keys both
  -- review state and the attempt log.
  id               TEXT PRIMARY KEY,
  topic_id         TEXT NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  position         INTEGER NOT NULL,
  format           TEXT NOT NULL,   -- itemSchema.js FORMATS
  origin           TEXT NOT NULL,   -- itemSchema.js ITEM_ORIGIN
  prompt           TEXT NOT NULL,
  expected         TEXT,
  criteria         TEXT,            -- JSON string[]
  provenance       TEXT,            -- JSON Provenance object or NULL
  generation_meta  TEXT,            -- JSON object or NULL
  difficulty       INTEGER NOT NULL DEFAULT 2,  -- AUTHORED 1..3 rating — see
                                                 -- item_review_state.difficulty
                                                 -- for the unrelated FSRS state
  verified_by_human INTEGER NOT NULL DEFAULT 0, -- 0/1 — rotation gate
  retired          INTEGER NOT NULL DEFAULT 0,  -- 0/1
  -- MCQ only:
  choices          TEXT,            -- JSON string[]
  answer_index     INTEGER,
  -- WRITE only:
  time_budget_sec  INTEGER,
  -- COMPARE only:
  extra_atoms      TEXT             -- JSON string[]
);
CREATE INDEX IF NOT EXISTS idx_items_topic ON items(topic_id, position);

-- One row per (user, item) the user has ever reviewed. user_id is NOT NULL —
-- 0 stands in for "no session", the same anonymous-single-user convention
-- progress.js already uses for `attempts.user_id`, but here it MUST be a real
-- value rather than SQL NULL: SQLite's uniqueness checks treat every NULL as
-- distinct from every other NULL, so a nullable user_id would let each
-- anonymous review insert a fresh row instead of updating the existing one —
-- due dates would never advance. 0 is never a real users.id (AUTOINCREMENT
-- starts at 1), so it can't collide with an actual account later.
CREATE TABLE IF NOT EXISTS item_review_state (
  user_id        INTEGER NOT NULL DEFAULT 0,
  item_id        TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  state          INTEGER NOT NULL DEFAULT 0,  -- ts-fsrs State enum
  difficulty     REAL NOT NULL DEFAULT 0,     -- FSRS difficulty, NOT items.difficulty
  stability      REAL NOT NULL DEFAULT 0,
  due_on         INTEGER NOT NULL,            -- epoch ms; next review becomes due
  reps           INTEGER NOT NULL DEFAULT 0,
  lapses         INTEGER NOT NULL DEFAULT 0,
  leech          INTEGER NOT NULL DEFAULT 0,  -- 0/1, set once lapses >= 3 (A8)
  last_reviewed_at INTEGER,                   -- epoch ms, NULL before the first review
  PRIMARY KEY (user_id, item_id)
);
CREATE INDEX IF NOT EXISTS idx_item_review_due ON item_review_state(user_id, due_on);

CREATE TABLE IF NOT EXISTS item_attempts (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL DEFAULT 0,
  item_id    TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  ts         INTEGER NOT NULL,   -- epoch ms
  mode       TEXT NOT NULL,      -- "closed" | "open" | "exam"
  grade      INTEGER,            -- 0..3 (Again/Hard/Good/Easy), NULL if abandoned
  seconds    INTEGER NOT NULL,
  tab_blurs  INTEGER NOT NULL DEFAULT 0,
  note       TEXT,
  abandoned  INTEGER NOT NULL DEFAULT 0  -- 0/1 — "End drill" mid-item (A4 escape hatch)
);
CREATE INDEX IF NOT EXISTS idx_item_attempts_user ON item_attempts(user_id, ts);
CREATE INDEX IF NOT EXISTS idx_item_attempts_item ON item_attempts(item_id, ts);
