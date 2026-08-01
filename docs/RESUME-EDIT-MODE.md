# Resume — `Edit-Mode` branch

Handoff notes for the backend + Edit Mode work. Written 2026-07-31, mid-build.

**Branch:** `Edit-Mode` (off `main`, not merged, nothing committed yet — the whole branch is uncommitted working-tree changes).

---

## 1. What this branch does

Two things, deliberately in one branch because the second depends on the first:

1. **SkillTape stops being a static app.** It now has a real backend — Node + Express + SQLite, self-hosted. Curriculum content lives in a database and arrives over HTTP.
2. **Edit Mode** — an Edit toggle on any topic that makes Learn cards and flashcards editable in place, with a **B** button that marks fill-in-the-blank spans, `+ Add card`, delete, and ↑↓ reorder.

### Why the backend came first

The original plan saved edits by having a Vite dev-middleware **rewrite the `.js` topic files on disk** — which needed a JS source serializer, a string-aware bracket scanner to find the `cards: [...]` span, backup-and-rollback, and a localStorage merge layer. Roughly 400 lines of machinery whose only purpose was to fake a database. With a real one, saving is `PUT /api/topics/:id/cards`. All of that was deleted from the plan before it was written.

### The insight that makes Edit Mode small

**`**double asterisks**` are simultaneously the bold markup and the fill-in-the-blank marker.** `src/utils/fill.js` defines `BOLD_RE = /(\*\*[^*]+\*\*)/g` and `parseBold()` splits on it. So a Bold button that wraps the selection in `**` *is* the blank authoring tool — there was no second syntax to design.

---

## 2. How to run it

**Two processes now.** `npm run dev` alone no longer boots a working app.

```bash
npm run dev          # frontend, localhost:5173
npm run dev:server   # API, 127.0.0.1:3001   (separate terminal)
```

Database management:

```bash
npm run db:seed            # load/refresh content from src/data/topics/**/*.js
npm run db:seed -- --reset # wipe content tables first, then reload
```

The database is `db/skilltape.db` (already covered by `.gitignore`). Deleting it is safe — `db.js` recreates the tables on boot and `db:seed` refills them from the topic files.

`vite.config.js` proxies `/api` → `127.0.0.1:3001`, so the browser stays same-origin and CORS never arises. Frontend code only ever writes `fetch("/api/…")`.

---

## 3. State: what is done and how it was verified

### ✅ Phase 0 — server skeleton
`server/index.js` (Express, `express.json()`, `cookie-parser`, `/api/health`, JSON 404, error handler, bound to `127.0.0.1`), `dev:server` script, Vite proxy.
**Verified:** `curl localhost:3001/api/health` → `{"ok":true}`, and the same through the Vite proxy on the frontend port.

### ✅ Phase 1 — read path, app is no longer static
- `server/schema.sql` — `courses, topics, cards, questions, choices, flashcards, users, sessions, attempts`.
- `server/db.js` — better-sqlite3 connection, WAL, `foreign_keys = ON`, runs `schema.sql` on boot as a create-or-noop migration.
- `server/seed.js` — `import()`s the 20 topic modules and loads them transactionally; idempotent.
- `server/routes/topics.js` — `GET /api/topics`, `GET /api/topics/:id`.
- `src/api/client.js`, `src/hooks/useTopics.js`, rewired `src/App.jsx`.

**Verified:**
- Seed: 2 courses · 21 topics · 188 cards · 246 questions · 53 flashcards. Re-running produces identical counts (idempotent). 984 choices = 246 × 4 exactly, confirming the "always four choices" rule survived.
- **Parity: all 21 topics round-trip byte-identical** — a script compared `buildTopic(row)` against each source module's default export via `JSON.stringify`. Superscripts (`²`, `ⁿ`), discrete glyphs (`∀ ∧ ∨`), figures, and `accept` all survive.
- Content is genuinely out of the JS bundle: `grep "A quick trick: count the loops" dist/assets/*.js` → 0 hits. Nothing in `src/` imports `curriculum.js` any more.

### ✅ Phase 2 — Edit Mode
- `src/utils/fill.js` — `BOLD_RE` is now exported; `src/components/Inline.jsx` imports it instead of re-typing the literal (there were two copies of that regex).
- `src/utils/blankEdit.js` — `toggleBold()` and `validateBody()`.
- `src/components/CardEditor.jsx` — the per-card editor.
- `src/components/LearnView.jsx` — draft state, save bar, `+ Add card`, renders `CardEditor` when editing.
- `src/components/TopicView.jsx` — Edit/Done toggle; Flashcards tab now also appears in edit mode.
- `src/components/FlashcardsView.jsx` — `FlashcardEditor` list view; empty-deck crash guarded.
- `server/routes/topics.js` — `PUT /api/topics/:id/cards` and `/flashcards`.

**Verified:**
- `npx vite build` clean (55 modules).
- `toggleBold` unit-tested under bare Node: wrap, unwrap, **double-toggle returns the original string exactly**, whitespace trimming, returned selection covers the inner text, and `*`-inside-selection is rejected with a clear message.
- `validateBody` correctly flags the `**operator***` trap (the real-world gotcha where one `*` inside the delimiters silently kills the match and renders literal asterisks).
- Live `PUT` → `GET` round trip persisted edited cards, and **left `questions` and `flashcards` untouched** (12 and 5 respectively for `bigo`).
- Database restored afterwards with `npm run db:seed` — `bigo` is back to its 7 authored cards.

### ⚠️ NOT verified — browser interaction
Everything above is build-level and unit-level. **Nobody has clicked the actual UI.** In particular:
- The **B** button's focus/selection restore (`useLayoutEffect` + `pendingSel` ref in `CardEditor.jsx`) is the piece most likely to be subtly wrong — it exists because React re-renders the textarea from `value` on every keystroke and drops the caret to the end. Test pressing B twice in a row.
- `+ Add card`, ↑↓ reorder, delete, Revert, and the disabled-Save-when-invalid logic.
- The flashcard editor on a topic with **no** deck (that's the path the `editMode` tab condition exists for).

---

## 4. Remaining work

### Phase 3 — progress on the backend (not started)
`src/hooks/useProgress.js` is **untouched and still writes to `localStorage`** under `"cppquiz:progress"`. The `attempts` table exists but nothing writes to it.

- `server/routes/progress.js` — `POST /api/attempts`, `GET /api/progress`.
- Rewrite `useProgress.js` to call the API, **keeping the exact `{ progress, recordRun }` signature** so `App.jsx`, `Home`, `HistoryModal`, and `TopicView` need no changes.
- Write a one-time importer for existing `localStorage` history so real quiz results aren't lost.

The `attempts` schema is already correct for this: **one row per item, not per run**, with a `run_id` grouping a sitting. `docs/ROADMAP.md:270` records why — a per-run shape "cannot support leech detection or per-item scheduling — change it before writing the migration, not after."

### Phase 4 — auth (not started)
`users` and `sessions` tables exist and are empty. Nothing references them.

- `server/auth.js` — bcrypt hashing, session token, `httpOnly` + `sameSite` cookie, `requireAuth` middleware. (`bcrypt` and `cookie-parser` are already installed; `cookie-parser` is already mounted in `index.js`.)
- `server/routes/auth.js` — signup / login / logout / me.
- Set `attempts.user_id`; put the `PUT` edit routes behind `requireAuth`.

### Docs (not started)
- `README.md:137` currently says *"There is no backend or account system"* — **now false**, must be updated.
- `docs/AUTHORING.md` — add Edit Mode alongside hand-authoring; update §9 Verifying.
- `docs/ROADMAP.md` — B1/B2/B3 landed early and self-hosted rather than Supabase; Track B was supposed to be deferred behind drill mode (D5).
- `docs/BACKEND.md` — doesn't exist yet.

---

## 5. Things that will bite

- **`src/data/topics/**/*.js` are the seed source and must never be deleted.** They stay in git as the authored origin of all content. The database is populated *from* them. But note: **edits made in the app do NOT flow back into those files.** After editing in-app, the DB and the topic files diverge, and `npm run db:seed` will overwrite in-app edits with the file contents. This is a real unresolved tension — decide deliberately whether the files or the DB are the long-term source of truth.
- **`topics.id` is TEXT and must stay stable** (`"bigo"`, `"discrete-2-4-circuits"`). `docs/AUTHORING.md` §2.1: renaming it silently wipes that topic's progress history.
- **`Shell.jsx` remounts `App` on every course-tab switch** (`<App key="cs2401" …>`). That's why the topics fetch is cached at module level in `src/api/client.js` rather than in a hook — without it, every tab switch refetches the whole bank.
- **`GET /api/topics` returns fully-populated topics, not a light list.** `App.buildMasterSet` does `picked.flatMap((t) => t.questions)` over the same array the topic list renders from, so a trimmed payload breaks Master Set.
- **Quiz questions are deliberately not editable.** Editing them means editing four choices plus a correct-answer index, and `QuizView` re-permutes choices at runtime via `shuffleChoices`, so the on-screen question is a shuffled copy whose `answer` index differs from the stored one. Any future quiz editor must write to the pre-shuffle source.
- **Figures and `accept` stay hand-authored** — no upload path. `CardEditor` shows a read-only note when a card has a figure so it doesn't look like data loss.
- **`dist/` is committed but stale** (`dist/index.html` is tracked, `dist/assets/` is not, so it can't actually boot). Running a build dirties it. It is not a deployment — there's no CI, no Pages workflow. Consider `git rm --cached` on it.
- **`npm run audit:bank` still fails** (~1025 errors). Pre-existing and documented in `AUTHORING.md` §9 as not-a-gate. `npx vite build` is the real gate.
- **`src/components/CodeBlock.jsx`** (C++ syntax highlighting) appeared during this work from separate effort — it is preserved and wired into `LearnView`'s read-only path. Not mine, not to be reverted.

---

## 6. Files

**New:** `server/{index,db,seed}.js`, `server/schema.sql`, `server/routes/topics.js`, `src/api/client.js`, `src/hooks/useTopics.js`, `src/utils/blankEdit.js`, `src/components/CardEditor.jsx`

**Modified:** `src/App.jsx`, `src/components/{LearnView,TopicView,FlashcardsView,Inline}.jsx`, `src/utils/fill.js`, `vite.config.js`, `package.json`, `.gitignore`

**Dependencies added:** `express`, `better-sqlite3`, `bcrypt`, `cookie-parser` (all four compile and load on this machine — Node v24.18.0)

**Untouched but planned:** `src/hooks/useProgress.js`, `server/auth.js`, `server/routes/{progress,auth}.js`

Full plan with rationale: `~/.claude/plans/goofy-watching-hellman.md`.
