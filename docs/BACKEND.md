# SkillTape — Backend

Architecture reference for the API and database that curriculum content, Edit Mode, progress, and accounts all run through. `docs/AUTHORING.md` covers *content*; this covers the server that stores it.

---

## 1. Running it

**Two processes.** `npm run dev` alone does not boot a working app — the frontend has nothing to fetch content from.

```bash
npm run dev          # Vite dev server, frontend, http://localhost:5173
npm run dev:server   # Express API, http://127.0.0.1:3001 — separate terminal
```

`vite.config.js` proxies `/api` → `127.0.0.1:3001`, so the browser stays same-origin (no CORS) and `src/api/client.js` — the only frontend module that knows HTTP exists — only ever calls relative `/api/…` paths.

The database is a single file, `db/skilltape.db` (gitignored — see "Drill data / local progress" in `.gitignore`). Deleting it is safe: `server/db.js` recreates every table on boot (`schema.sql` is all `CREATE TABLE IF NOT EXISTS`, so running it on every boot is a no-op once the tables exist), and `db:seed` refills the content tables from the topic files.

```bash
npm run db:seed              # load/refresh content from src/data/topics/**/*.js
npm run db:seed -- --reset   # also wipe courses/topics first, then reload
```

**Read § 5 before running either of these against a database anyone has used Edit Mode on.**

---

## 2. `server/` file layout

| File | Purpose |
| --- | --- |
| `server/index.js` | Express app: `express.json()` (2 MB body cap), `cookie-parser`, mounts the three route files, a JSON 404 for unmatched `/api/*`, and a final error handler. Bound to `127.0.0.1` only, not `0.0.0.0` — this process holds password hashes and never needs to be reachable off the machine it runs on. |
| `server/db.js` | The one `better-sqlite3` connection every route imports. WAL journal mode (so a save doesn't block a concurrent read), `foreign_keys = ON` (SQLite ships this off by default; without it the `REFERENCES` clauses in `schema.sql` are documentation, not constraints), and runs `schema.sql` on every boot. |
| `server/schema.sql` | All table definitions. See § 3. |
| `server/seed.js` | One-way loader: `src/data/topics/**/*.js` → SQLite. See § 5. |
| `server/auth.js` | Password hashing (bcrypt, cost 12), session-token creation/lookup, and `requireAuth` middleware. See § 4. |
| `server/routes/topics.js` | `GET /api/topics`, `GET /api/topics/:id` (open), `PUT /api/topics/:id/cards`, `PUT /api/topics/:id/flashcards` (both behind `requireAuth`). Reassembles flat SQL rows back into the exact nested shape a topic module used to export, so the four consumption views (`LearnView`, `QuizView`, `FlashcardsView`, `TopicView`) needed no changes. |
| `server/routes/progress.js` | `POST /api/attempts`, `GET /api/progress` (both open). See § 6. |
| `server/routes/auth.js` | `POST /api/auth/{signup,login,logout}`, `GET /api/auth/me`. See § 4. |

Every write route treats the request body as hostile — validated field-by-field (required/optional strings, bounded lengths, bounded array sizes) before anything touches SQL, with a `BadRequest` → 400 convention so a rejected payload names the offending field instead of surfacing as a raw 500. `topics.js` and `progress.js` each define their own `MAX_ITEMS`/`MAX_STRING` bounds — not policy, just a backstop against a malformed or looping client growing the database unbounded.

---

## 3. Data model

Full column-level detail (types, defaults, indexes, FK behavior) lives as comments directly in `server/schema.sql` — that stays the source of truth for field shapes, same convention `docs/AUTHORING.md` uses for `curriculum.js`. Summary:

- **Content** — `courses` → `topics` → `cards` / `questions` / `flashcards`, plus `choices` (one row per MCQ option, its own table rather than a JSON column so options are queryable/orderable). `position` columns carry array order everywhere, since SQL rows are otherwise unordered. This mirrors the shape of a topic module in `src/data/topics/<course>/<topic>.js` closely enough that `buildTopic()` in `topics.js` can round-trip one back into the original module shape.
- **Accounts** — `users` (email, bcrypt hash, `created_at`) and `sessions` (random token as primary key, owning `user_id`, `expires_at`).
- **Attempts** — `attempts`, one row per quiz question answered. See § 6 for why.

`topics.id` is `TEXT` and intentionally not an integer — it's the same stable id topic files have always used (`"bigo"`, `"discrete-2-4-circuits"`), and it's the foreign key every attempt row hangs off. Renaming it orphans that topic's history (`docs/AUTHORING.md` § 2.1).

---

## 4. Auth model

Sessions are a random 256-bit token (`crypto.randomBytes(32)`, hex-encoded) stored as the primary key of a `sessions` row and set as an `httpOnly`, `sameSite: "lax"` cookie (`skilltape_session`, 30-day expiry). `httpOnly` keeps it unreadable from JS (the only thing that matters against XSS stealing it); it is deliberately **not** `secure`, because this app runs on plain HTTP at `127.0.0.1` — a `secure` cookie would be silently dropped and no session would ever stick. Revisit if this ever moves behind TLS.

`getSessionUser(req)` in `server/auth.js` is the single lookup every auth-aware code path shares: it returns the user or `null` without throwing, deleting the row on the spot if it's expired (lazy cleanup — a single-user app doesn't need a cron job for this). `requireAuth` is a thin wrapper that 401s when it gets `null`.

**What's gated and what isn't:**

- `requireAuth` gates exactly two routes: `PUT /api/topics/:id/cards` and `PUT /api/topics/:id/flashcards`. Editing content is the one thing that needs an account.
- Reading content (`GET /api/topics`, `GET /api/topics/:id`) is open — no login needed to study.
- Taking a quiz (`POST /api/attempts`) is open too, deliberately: gating results on login would add login friction for a single-user app with no benefit. Instead it calls the non-throwing `getSessionUser` directly — if a session cookie happens to be present, the attempt rows get that `user_id`; if not, `user_id` stays `NULL`, exactly as it did before auth existed at all (`attempts.user_id` is nullable for this reason).

There is no row-level-security layer (no Postgres, no RLS) — the `requireAuth` check on those two routes *is* the access-control boundary, enforced in the application, not the database. `docs/ROADMAP.md` § 6 (B0/B1) has the fuller history of that stack choice.

The minimal login/signup UI is `src/components/AuthBar.jsx` (one popover form, mode-toggled between login and signup, wired into `Header.jsx`), backed by `src/hooks/useAuth.js`.

---

## 5. Seed vs. database — which one is the source of truth?

**This is an open, unresolved product decision, not a settled one.** Read this before running `db:seed` on any database that Edit Mode has touched.

`src/data/topics/**/*.js` remain the authored seed source and must stay in git — nothing about the backend changes that. `server/seed.js` is a **one-way bridge**, file → database, `import()`-ing the topic modules directly (they're pure data with no app imports, `docs/AUTHORING.md` § 1) and loading them transactionally.

What `seed.js` actually does on a re-run, read directly from the script rather than assumed:

- For **every** topic, on **every** run — with or without `--reset` — it unconditionally runs `DELETE FROM cards/questions/flashcards WHERE topic_id = ?` for that topic and reinserts from the current contents of the `.js` file. This delete-and-reinsert is *not* gated behind the `--reset` flag; only the additional wipe of `courses`/`topics`/`choices` themselves is.
- **`items` is the exception, and deliberately so (fixed 2026-08-09).** It is *upserted* (`ON CONFLICT(id) DO UPDATE`) and then pruned of ids that no longer appear in the `.js` file — never cleared wholesale. This section predates the `items` table, and the delete-and-reinsert pattern described above was silently catastrophic once applied to it: `server/db.js` sets `foreign_keys = ON`, and `item_review_state`, `item_attempts` and `item_suspensions` all declare `item_id REFERENCES items(id) ON DELETE CASCADE`. So a plain reseed **destroyed every user's FSRS scheduling state, the entire attempt log, and all suspensions** — for every item, including ones whose content hadn't changed — and reinserting the same id did not bring them back. Editing one prompt cost you your whole study history. Do not "simplify" the item pass back into a `DELETE`.
- `--reset` only changes whether `courses` and `topics` rows (and everything cascading from them) are wiped and rebuilt from scratch first. It has no effect on whether a given topic's cards/questions/flashcards get overwritten — that happens either way.
- `users`, `sessions`, and `attempts` are never touched by `seed.js`, `--reset` or not.

**Consequence: any `npm run db:seed` run — reset or not — overwrites that topic's cards and flashcards with whatever is currently in the `.js` file, discarding any Edit Mode changes made in the database that were never backported to the file.** Edit Mode and re-seeding are mutually destructive on the same topic; there is no merge, and whichever happens last wins.

Nothing in this branch decides which side should win long-term — file-as-source-of-truth (re-seeding is safe, but Edit Mode's saves are effectively provisional/lossy across a reseed) or database-as-source-of-truth (Edit Mode's saves are durable, but then the `.js` files stop being an accurate record and `seed.js`'s per-topic clear-and-reinsert becomes actively dangerous). Whoever picks this up next should resolve it deliberately — a one-way export from DB back to the topic file, a diff/merge step in `seed.js`, or simply documenting "don't reseed a topic once it's been edited in-app" as the accepted workflow — rather than discovering it by losing an edit.

---

## 6. Attempts: one row per item, not per run

`attempts` stores one row per question answered, with a `run_id` grouping the rows of a single quiz sitting back together — not one row per finished run with an embedded score. `docs/ROADMAP.md` § 6 (B2) records why, as a correction against the original plan: a per-run shape with `score`/`total`/`per_question_results` "cannot support leech detection or per-item scheduling — change it before writing the migration, not after." Both of those are Track A features (spaced repetition, per-item mastery) that need to know which specific question was gotten wrong across many sittings, not just how many out of how many.

`GET /api/progress` derives the older UI shape — `{ [topicId]: { best, total, runs, history } }`, unchanged since `useProgress.js`'s `localStorage` days — from the per-item rows in SQL (`GROUP BY run_id, topic_id`), so `Home.jsx`, `HistoryModal.jsx`, and `TopicView.jsx` needed no changes when progress moved off `localStorage`. A one-time importer in `useProgress.js` migrates any pre-existing `localStorage["cppquiz:progress"]` history into `attempts` on first load (with `questionId: null`, since the old format only ever recorded booleans), then deletes the legacy key.

`POST /api/attempts` is a single transaction per run — every row of a sitting commits together, so a failure partway through never leaves a half-recorded quiz in the history.
