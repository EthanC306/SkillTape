# SkillTape → General Platform: Master Plan

Status: **planning only, no implementation yet**. Written 2026-07-21.

## 1. What SkillTape is today

A Vite + React SPA (`src/App.jsx`, `src/Shell.jsx`) with **zero backend**. All content is
hardcoded, personally-authored JS modules:

- `src/data/courses.js` — static array of course cards (id/title/subtitle).
- `src/data/curriculum.js` — static array of "topics," each hand-imported from
  `src/data/topics/<course>/<topic>.js`.
- Each topic file is a hand-written object: `cards` (Learn-mode notes with markdown-ish
  `**bold**` spans), `questions` (Quiz-mode MCQs — prompt/choices/answer index/explanation,
  all manually written), optional `flashcards`, optional `figure` refs into `public/figures/`.
- `src/hooks/useProgress.js` — quiz best-scores persisted to `localStorage`, keyed by topic id.
- No user accounts, no server, no database. Every visitor gets the same fixed content and their
  own local, unshared progress.
- "Quiz generation" doesn't really exist — a human (me) wrote every question by hand. There is no
  algorithm that turns arbitrary content into a quiz.

## 2. What "usable by anyone" means

Turn this from *my textbook app* into *a platform*: any user can log in, create their own
courses/modules, add their own content (notes, code, figures, flashcards), and get the app to
**generate** quizzes from that content automatically — not hand-author question JSON. Multiple
users, each with their own library, isolated from each other, with the option to publish/share.

This is a big lift. Breaking it into independently shippable phases below.

## 3. Phased roadmap

### Phase 0 — Decide the stack (needs a decision before anything else)
Currently 100% static/local. Real user accounts + user-authored content require a backend +
database + auth. Options to weigh when we sit down to start:
- **Supabase** (Postgres + auth + storage, generous free tier, fast to stand up) — probably the
  best fit for a solo-maintained hobby-scale app.
- **Firebase** (Firestore + auth + storage) — similar tradeoffs, less SQL-friendly for
  querying/reporting on quiz stats later.
- Roll-your-own (Node/Express + Postgres + a JWT auth lib) — more control, much more work,
  only worth it if we want to self-host.
- **Recommendation:** Supabase. Gives us Postgres (good for relational data like
  courses→modules→content→questions→attempts), built-in email/password + OAuth login, row-level
  security for per-user data isolation, and a JS client that drops into this Vite app with
  minimal ceremony.

This choice affects everything below, so Phase 0 is "pick the stack" — a short conversation, not
research work — before Phase 1 starts.

### Phase 1 — Auth & accounts
- Login/signup (email+password to start; OAuth — Google — as a stretch).
- Session handling in the React app (replace the currently-anonymous `Shell.jsx` root with an
  auth-gated shell; add a logged-out landing/login screen).
- Per-user profile row (id, email, display name, created_at).
- Route/data guard: nothing user-authored is visible or editable by anyone but its owner, unless
  explicitly published (see Phase 5).
- Migrate `useProgress.js` from `localStorage`-only to server-backed (fall back to localStorage
  for logged-out/demo mode if we keep an anonymous "try it" path).

### Phase 2 — Data model for user-generated content
Replace the static-file content model with a real schema. Rough shape (Postgres/Supabase-flavored):

- `users` (handled by auth provider)
- `courses` — id, owner_id, title, subtitle, created_at
- `modules` — id, course_id, title, subtitle, order_index, show_chart(bool), created_at
  (a "module" ≈ today's "topic": one Learn+Quiz+Flashcard unit)
- `content_blocks` — id, module_id, order_index, type(heading/body/figure/code), body_text,
  figure_url, caption — replaces the hardcoded `cards` array so users can author Learn-mode
  content block-by-block in a UI instead of editing JS.
- `questions` — id, module_id, prompt, choices(jsonb array), answer_index, explanation,
  source(enum: "manual" | "generated"), generation_meta(jsonb — model/seed/algorithm used, for
  regenerate/audit)
- `flashcards` — id, module_id, front, back
- `attempts` — id, user_id, module_id, score, total, per_question_results(jsonb), created_at
  (replaces localStorage best-score with real history/analytics)
- `figures` — id, owner_id, storage_path (Supabase Storage bucket), alt, caption — replacing the
  static `public/figures/` tree with per-user uploads.

This is the schema to design carefully once we start — get the relationships right (courses →
modules → content/questions/flashcards → attempts) since quiz generation and progress tracking
both depend on it.

### Phase 3 — Authoring UI ("Module Builder")
New UI surface, separate from the existing Learn/Quiz/Flashcard *consumption* views:
- Course CRUD (create/rename/delete/reorder).
- Module CRUD within a course.
- Content-block editor for a module: add/remove/reorder heading+body cards, markdown-style bold
  spans (reuse existing `Inline.jsx` renderer), optional figure upload+caption, optional code
  block.
- Flashcard editor (front/back pairs, add/remove/reorder).
- Figure upload flow (Supabase Storage bucket, per-user folder, replaces static `public/figures/`).
- This is essentially a CMS bolted onto the existing consumption UI — reuse `PALETTE`/`theme.js`
  styling so authored content renders identically to the existing hand-authored courses.

### Phase 4 — Quiz generation algorithm(s)
This is the crux of "every quiz needs an algorithm." Today questions are 100% hand-written; we
need something that takes a module's authored content (`content_blocks`, i.e. the Learn-mode
notes) and produces quiz questions. Realistic approaches, roughly ordered by effort:

1. **Rule-based extraction from bolded terms** (cheapest, no external calls, matches what the
   content model already encourages): every `**bolded**` span in a content block is a
   candidate key term. Generate:
   - Fill-in-the-blank questions by blanking a bold term in its original sentence (the app
     *already* has fill-mode logic in `src/utils/fill.js` — extend it to also emit MCQ format:
     right answer + N distractors pulled from other bold terms in the same module).
   - "Which of these is true/false" questions built from paraphrasing card bodies — harder to do
     well without NLP, likely lower quality; may want to skip this sub-mode initially.
   - Pros: deterministic, free, instant, no API dependency, explainable (the explanation can just
     be the original sentence). Cons: mechanical, limited variety, quality caps out fast.

2. **LLM-generated questions** (server-side model call): send a module's content blocks to an
   LLM with a structured-output prompt asking for N multiple-choice questions in the exact
   `{prompt, choices, answer, explanation}` shape the app already uses. This is the highest-quality
   option and matches the existing hand-authored question style almost exactly (i.e., what I've
   been doing manually, automated). Needs:
   - A server-side function (Supabase Edge Function or small Node endpoint) so no API key/model
     endpoint ships to the client.
   - A "regenerate this question" and "regenerate whole quiz" action in the authoring UI.
   - Store `source: "generated"` + `generation_meta` (which backend/model produced it) so authors
     can tell generated vs. hand-edited questions apart, and can hand-edit a generated question
     afterward (edits flip it to effectively manual, but keep the meta for provenance).
   - Cost/rate-limit consideration: generation happens at author-time (once per module), not
     quiz-attempt-time, so volume is naturally bounded.
   - **Model backend choice — hosted API vs. self-hosted Ollama:** the generation function should
     sit behind one interface (`generateQuestionsLLM(contentBlocks, options) -> Question[]`) with
     swappable backends:
     - *Hosted (Claude API)* — best quality, zero infra to run, costs per call, requires an API
       key held server-side.
     - *Self-hosted (Ollama)* — run an open-weight model (e.g. Llama, Mistral, Qwen) on our own
       box via [Ollama](https://ollama.com), called from the same server-side function instead of
       the Claude API. Attractive because it's **free per-generation** and keeps all user content
       on infrastructure we control (relevant if some users author sensitive/institutional
       material they don't want sent to a third-party API) — this could let us service users at
       zero marginal LLM cost once the box is paid for.
     - Tradeoffs to weigh once we get here: smaller open models are noticeably weaker at reliable
       structured-output (clean JSON, well-formed distractors, correct answer indexing) than
       Claude, so expect to invest more in prompt scaffolding, output validation/repair, and
       retry logic on the Ollama path. Also need to size/host the Ollama box (or a GPU instance)
       and handle its own uptime — it's infra we now own, not a managed API.
     - Realistic plan: build the interface generic from day one, ship on the hosted API first
       (fastest to working quality), then add an Ollama backend as a cost-saving/self-hosted
       alternative once the interface and prompt format are proven — possibly offered as a
       user-facing choice ("fast/hosted" vs. "free/local") rather than an either-or.

3. **Hybrid (recommended target state):** rule-based fill-in-the-blank as an instant, free,
   always-available baseline the moment a user adds content, with an optional "✨ Generate quiz
   with AI" button that calls the LLM path for richer MCQs. Let the author mix: keep some
   generated, hand-edit others, delete/add manually. This mirrors how the existing hand-authored
   topics actually read (mostly concept-check MCQs with explanations).

Whichever generation path, the algorithm boundary should be a single pure-ish function/service —
`generateQuestions(contentBlocks, options) -> Question[]` — so we can swap/AB the rule-based and
LLM implementations without touching the authoring UI or QuizView.

### Phase 5 — Sharing / discovery (stretch, later)
- Publish a course/module publicly (read-only) so other users can take quizzes you built without
  copying them.
- Public course browse page distinct from "my courses."
- Optional: fork a public course into your own account to customize.
- Only worth building once Phases 1–4 are solid and at least one real user (me) is dogfooding it.

### Phase 6 — Migration of existing content
Once the data model + authoring UI exist, migrate the current hardcoded `cpp` and `discrete`
courses into the database as the first two seeded "courses" (owned by my account, published
publicly) rather than deleting them — they're good reference content and a good test case for the
migration script (topic.js → courses/modules/content_blocks/questions rows).

## 4. Open questions to resolve before/at Phase 0 kickoff
- Supabase vs. alternative — confirm before writing any backend code.
- Email/password only, or OAuth too, for v1 login?
- Keep a no-login "demo" mode (today's static courses, read-only, localStorage progress) alongside
  accounts, or require login for everything?
- LLM generation: use the Claude API directly (needs a small server/edge function + API key
  management) — confirm before Phase 4.
- Hosting: where does the backend/edge functions live — Supabase-hosted is default if we pick
  Supabase.

## 5. Suggested build order (summary)
0. Pick stack (Supabase recommended) — quick decision, not a work phase.
1. Auth + accounts.
2. DB schema + wire existing static courses to read from DB (read-only migration) so the
   consumption UI (Learn/Quiz/Flashcards) proves out against real data before we build authoring.
3. Authoring UI (course/module/content-block/flashcard CRUD, figure upload).
4. Quiz generation: ship rule-based fill-in-the-blank generator first (fast, no API dependency),
   then layer in LLM-based MCQ generation.
5. Sharing/publish (stretch).
6. Migrate my existing cpp/discrete content into the new system as seed public courses.

## 6. Notes on existing code to reuse, not rebuild
- `src/utils/fill.js`, `src/components/Inline.jsx` — bold-span parsing/rendering, directly reusable
  for both the authoring editor and the rule-based fill-in-the-blank generator.
- `src/data/theme.js` (`PALETTE`, `MONO`, `HEADING`, `RADII`) — keep as the single style source so
  user-generated courses render identically to the hand-authored ones.
- `QuizView.jsx`, `LearnView.jsx`, `FlashcardsView.jsx`, `MasterQuizView.jsx` — these are
  consumption views and should barely need to change; they just need to receive `topic`-shaped
  data fetched from the DB instead of imported from `curriculum.js`.
- `useProgress.js` — evolve into a thin wrapper that talks to the `attempts` table when logged in,
  falls back to localStorage in demo mode.
