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
  art            TEXT,               -- monospace text diagram; unlike `code` it does not widen the card
  accept         TEXT,               -- JSON object or NULL (see AUTHORING §3.3)
  figure_src     TEXT,
  figure_alt     TEXT,
  figure_caption TEXT
);
CREATE INDEX IF NOT EXISTS idx_cards_topic ON cards(topic_id, position);

CREATE TABLE IF NOT EXISTS questions (
  -- Surrogate PK, kept because choices.question_id points at it. It is NOT an
  -- identity: AUTOINCREMENT reassigns it on every reseed, which is why
  -- stable_id below exists.
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  topic_id       TEXT NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  position       INTEGER NOT NULL,
  -- Authored id from the topic module ("bigo-q03"), stable forever for the
  -- same reason topics.id and items.id are (AUTHORING.md §2.1/§4.1) — it is
  -- what keys the attempt log across reseeds. See seed.js's upsertQuestion.
  -- The UNIQUE index lives in db.js, not here: SQLite's ALTER TABLE cannot add
  -- a UNIQUE column, so a database created before this column existed can only
  -- get the constraint as a separate CREATE UNIQUE INDEX.
  stable_id      TEXT,
  -- Bumped by seed.js when content_hash changes, never by hand. content_hash
  -- covers only the GRADED fields (prompt, code, choices, answer) — fixing a
  -- typo in an explanation must not invalidate the history of a question
  -- nobody's answer would have differed on.
  revision       INTEGER NOT NULL DEFAULT 1,
  content_hash   TEXT,
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
  -- LEGACY surrogate. The editor saves a deck by DELETE-then-INSERT, so this
  -- AUTOINCREMENT value is reassigned on every save and identifies nothing over
  -- time. Use stable_id for identity — same lesson as questions.id
  -- (docs/STABLE_QUESTION_IDS.md).
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  topic_id  TEXT NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  position  INTEGER NOT NULL,
  front     TEXT NOT NULL,
  back      TEXT NOT NULL,
  -- The card's real, permanent name. Minted once when the card is first added
  -- (by the editor client, or by the server if the client sent none) and then
  -- carried unchanged through every later save, so a deck can be reordered,
  -- edited, emptied and refilled without any card losing its identity.
  -- Declared without UNIQUE here because ALTER TABLE cannot add a UNIQUE column
  -- for databases that predate it; the constraint arrives as a separate
  -- CREATE UNIQUE INDEX in db.js, so old and new installs converge.
  stable_id TEXT,
  -- 'authored' — came from a topic module under src/data/topics/, and belongs
  --              to seed.js, which may replace it on any reseed.
  -- 'user'     — created in Edit Mode. seed.js must never touch these; they are
  --              the only copy that exists. Defaulting to 'user' is deliberate:
  --              the editor inserts without naming an origin, and the safe
  --              default for an unlabeled row is the one seed leaves alone.
  origin    TEXT NOT NULL DEFAULT 'user'
);
CREATE INDEX IF NOT EXISTS idx_flashcards_topic ON flashcards(topic_id, position);

-- ── Accounts ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  email         TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,      -- bcrypt. Never a plaintext or reversible value.
  created_at    INTEGER NOT NULL,   -- epoch ms
  -- May this account EDIT SHARED CONTENT (cards and flashcards)?
  --
  -- Not a general role system, and deliberately not one: there are exactly two
  -- kinds of request in this app — "change my own rows", which every account may
  -- do, and "change the rows everyone reads", which is this flag.
  --
  -- It exists because the two Edit Mode routes in routes/topics.js checked only
  -- that you were logged in, never WHO you were. Since signup is open, anyone
  -- who could create an account could rewrite or delete the curriculum for every
  -- user of the install (docs/PRODUCTION_READINESS.md:57).
  --
  -- Bootstrapped in db.js: if no admin exists, the lowest-numbered account
  -- becomes one, so a self-hosted install's owner stays able to edit.
  is_admin      INTEGER NOT NULL DEFAULT 0
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
  -- LEGACY. questions.id is AUTOINCREMENT and was reassigned by every reseed,
  -- so this column recorded an id that stopped meaning anything the next time
  -- content was edited — every historical row here is already NULL. Kept only
  -- because dropping a column in SQLite means a full table rebuild for zero
  -- benefit. New writes populate question_stable_id instead.
  question_id INTEGER REFERENCES questions(id) ON DELETE SET NULL,
  -- The real identity of the question answered. NULL is legal and expected on
  -- rows from the one-time localStorage importer (useProgress.js), which
  -- reconstructs history that never recorded which question was which.
  question_stable_id TEXT REFERENCES questions(stable_id) ON DELETE SET NULL,
  -- questions.revision as it stood when this was answered, so a correct answer
  -- from before a rewrite stays distinguishable from one after it.
  question_revision  INTEGER,
  position    INTEGER NOT NULL,     -- order answered within the run
  correct     INTEGER NOT NULL,     -- 0/1
  created_at  INTEGER NOT NULL      -- epoch ms
);
CREATE INDEX IF NOT EXISTS idx_attempts_run ON attempts(run_id);
CREATE INDEX IF NOT EXISTS idx_attempts_topic ON attempts(user_id, topic_id, created_at);
CREATE INDEX IF NOT EXISTS idx_attempts_question ON attempts(question_id, created_at);
-- idx_attempts_question_stable is created in db.js alongside the guarded
-- ALTER TABLEs, for the same reason as questions' unique index above.

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
  elapsed_days   INTEGER NOT NULL DEFAULT 0,
  scheduled_days INTEGER NOT NULL DEFAULT 0,
  -- Which of FSRS's learning/relearning steps this card is on. Without it a
  -- card in `learning` restarts at step 0 every review and never graduates.
  learning_steps INTEGER NOT NULL DEFAULT 0,
  -- For the double-submit guard only (isDuplicateReview in fsrs.js). The grade
  -- HISTORY lives in item_attempts; this is one value, overwritten each time.
  last_grade     INTEGER,
  PRIMARY KEY (user_id, item_id)
);
CREATE INDEX IF NOT EXISTS idx_item_review_due ON item_review_state(user_id, due_on);

-- The append-only review log.
--
-- The `*_before` columns hold the card state the scheduler SAW, captured
-- before it ran, not the state it produced. Without them the history cannot be
-- replayed, which is the whole reason the FSRS optimizer will want it. NULL on
-- rows written before those columns existed, and on abandoned rows.
--
-- NEVER update or delete a row here. Undo is a compensating write against
-- item_review_state, never a mutation of the log.
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
  abandoned  INTEGER NOT NULL DEFAULT 0, -- 0/1, "End drill" mid-item (A4 escape hatch)
  -- WHICH SCREEN produced this row: "drill" | "practice" | "exam".
  --
  -- Deliberately not folded into `mode` above. `mode` is the BOOK CONDITION,
  -- and it is what FSRS and every existing report query filter on — widening
  -- it would silently change what /api/drill/stats and /api/drill/report mean.
  -- Drill and Practice are both closed-book, so `mode` alone cannot tell them
  -- apart: until this column existed they wrote identical rows.
  --
  -- NULL is legal and expected on every row written before A11. Stats counts
  -- those closed-book rows under Drill (server/stats.js) without rewriting this
  -- column, so the report stays populated without a Legacy bucket. Practice only
  -- counts rows that carry an explicit surface. `mode = 'exam'` rows ARE
  -- recoverable (only ExamView ever wrote them) and were backfilled once in
  -- db.js.
  surface    TEXT,
  -- WHICH SITTING produced this row: a UUID the client mints once when a study
  -- screen starts and sends with every attempt until it exits.
  --
  -- There is deliberately no `study_sessions` table behind this. An explicit
  -- session row has to be opened on entry and closed on exit, and a crash or a
  -- force-quit leaves it open forever with no way to tell "still going" from
  -- "died". A tag on the append-only log has no lifecycle to get wrong.
  --
  -- NULL is legal and expected on every row written before this column existed.
  -- Those rows are grouped into sessions by clustering timestamps instead
  -- (server/sessions.js, 30-minute gap). That fallback is a HEURISTIC and is
  -- labeled as such in the UI — two back-to-back exams merge, a long pause
  -- splits. It is not backfilled into this column: unlike the `surface = 'exam'`
  -- recovery in db.js, nothing in an old row identifies its sitting with
  -- certainty, and a guess written into an append-only log is indistinguishable
  -- from a fact later.
  session_id TEXT,
  -- The 0-based index into the item's `choices` that was picked, for MCQ items.
  --
  -- Free-text answers do NOT need a column here — all three study screens
  -- already ship the typed answer as `note`. Only the MCQ selection was purely
  -- component state and lost on submit, which is why the Report's session view
  -- can show "your answer" going forward but shows "not recorded" for every
  -- multiple-choice row written before this existed. NULL therefore means
  -- either "not an MCQ item" or "answered before this column existed"; the
  -- item's `format` is what distinguishes the two.
  answer_choice INTEGER,
  state_before      INTEGER,
  stability_before  REAL,
  difficulty_before REAL,
  elapsed_days      INTEGER,
  scheduled_days    INTEGER,
  -- Which weight set produced the row. Logs written under the shipped defaults
  -- have to stay distinguishable from logs written under optimizer-fitted
  -- weights, or a later fit trains on its own output. See fsrs.js.
  params_version    TEXT
);
CREATE INDEX IF NOT EXISTS idx_item_attempts_user ON item_attempts(user_id, ts);
CREATE INDEX IF NOT EXISTS idx_item_attempts_item ON item_attempts(item_id, ts);
-- idx_item_attempts_surface is created in db.js, not here, for the same reason
-- as questions' unique index above: `surface` reaches an older database as a
-- guarded ALTER TABLE, and the index has to be created after the column exists.

-- ── Suspensions ─────────────────────────────────────────────────────────────
-- Per-user "I know this one, stop showing it" set, driven from Practice's
-- results screen. Deliberately NOT items.retired: that column is authored
-- content shared by every user, this is one person's rotation. Same
-- user_id = 0 anonymous convention as item_review_state — see its comment for
-- why that has to be a real value rather than SQL NULL. Nothing else is
-- stored: deleting the rows is the whole "Reset deck" story, and scheduling
-- state deliberately survives a suspend/reset round trip untouched.
CREATE TABLE IF NOT EXISTS item_suspensions (
  user_id      INTEGER NOT NULL DEFAULT 0,
  item_id      TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  suspended_at INTEGER NOT NULL,   -- epoch ms
  PRIMARY KEY (user_id, item_id)
);
CREATE INDEX IF NOT EXISTS idx_item_suspensions_user ON item_suspensions(user_id);

-- ── Scheduler settings ──────────────────────────────────────────────────────
-- One row per user, same user_id = 0 anonymous convention as item_review_state.
-- Server-side rather than localStorage because the scheduler runs here: these
-- four are inputs to FSRS, not display preferences. Most visual toggles (due
-- strip, inspector) stay in localStorage; the one exception is the Report
-- view mode, which lives in `ui_settings` below — see that table's comment.
CREATE TABLE IF NOT EXISTS scheduler_settings (
  user_id           INTEGER PRIMARY KEY DEFAULT 0,
  request_retention REAL    NOT NULL DEFAULT 0.9,     -- 0.70 .. 0.97
  maximum_interval  INTEGER NOT NULL DEFAULT 36500,   -- days
  daily_new_limit   INTEGER NOT NULL DEFAULT 10,      -- new items introduced per day
  enable_fuzz       INTEGER NOT NULL DEFAULT 1,       -- 0/1
  updated_at        INTEGER NOT NULL
);

-- ── UI settings ─────────────────────────────────────────────────────────────
-- Display preferences that are deliberately NOT localStorage, one row per user,
-- same user_id = 0 anonymous convention as item_review_state.
--
-- Its own table rather than a column on scheduler_settings: that table is
-- documented as the FSRS *inputs*, and widening it to hold a display preference
-- would blur what "settings" means there and put a value the scheduler must
-- never read next to four it always does.
CREATE TABLE IF NOT EXISTS ui_settings (
  user_id     INTEGER PRIMARY KEY DEFAULT 0,
  -- Report → Stats reading mode: 'grid' (accuracy by topic x mode, the
  -- original) or 'sessions' (past sittings, drillable into per-question
  -- detail). Unknown values are treated as 'grid' at read time rather than
  -- constrained here, so a downgrade to an older client cannot wedge the panel.
  report_view TEXT NOT NULL DEFAULT 'grid',
  updated_at  INTEGER NOT NULL
);
