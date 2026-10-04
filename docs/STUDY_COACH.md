# SkillTape — Study Coach (PDF / PPTX → study advice)

**Status: draft, for review. Nothing here is decided until you say so.**

Numbered **A12**, after the A10 Study Hub (`docs/STUDY_HUB.md`) and A11
cross-surface stats, so it slots into the existing roadmap numbering.

---

## 0. What this is, in one paragraph

You drop a lecture deck (`.pptx`) or a PDF (slides exported to PDF, a handout, a
textbook chapter) onto a **Coach** page. The server pulls the text out of it,
page by page or slide by slide, and runs it through the **local Ollama model
SkillTape already uses for Practice grading** (`server/ollama.js`). You get back
a **Study Guide**: the key concepts in the material, each tied to the slide it
came from; how they map onto the course's existing topics; a study order that
puts **your own weak spots** first (from FSRS state and the attempt log); and
concrete next steps that point at SkillTape features ("Fill Mode on
`linked-lists`, then a closed-book Drill").

It is an **advisor, not an author**. Nothing it writes enters the drill rotation.

---

## 1. Why the standing rules shape this design

`ROADMAP.md` §5 makes three rules that "AI reads my slides" runs straight into.
The design is built around them rather than in spite of them:

| Rule | Tension | How this design respects it |
| --- | --- | --- |
| **1. Verifiability over authorship** | A model summarizing slides can hallucinate | Every concept the coach states has to carry a **verbatim quote** from the uploaded text and a slide/page number. The server checks the quote really is in the extracted text and **drops** anything that fails (§5.4). The UI shows the quote next to the claim. |
| **7. Manual ingestion, deliberately** | Auto-extraction skips the "transcribing is the first study pass" step | The coach **never writes to `sources/`** and **never creates `items`**. Its output is advice and ungraded self-check prompts, kept in their own tables. Transcribing to `sources/` and authoring items stay manual. If drafting items is wanted later, that is a separate decision (§9, C4) and goes through the existing `verifiedByHuman` gate. |
| **8. Sources stay private** | Uploaded course material is copyrighted | Inference runs **locally** (Ollama, same machine). The original file is **not stored** by default, only the extracted text, in the gitignored SQLite DB and scoped to the uploading user. A hosted model is not part of v1 (§9, C1). |

Rule 3 (production over recognition) and rule 4 (closed-book by default) also
apply to the *advice*: the prompt tells the model to prefer recall and
production activities over rereading, and the guide's suggested actions point
at Fill Mode, Drill and Exam before Learn Mode.

---

## 2. Scope

**In scope (v1):**
- Uploading `.pdf` and `.pptx` files, up to 25 MB / 150 pages or slides.
- Server-side text extraction with a pure-JS parser: text, speaker notes,
  page/slide numbers.
- A chunked, schema-constrained Ollama pipeline that produces a Study Guide.
- Personalizing the guide from the user's existing FSRS / attempt data.
- A Coach page (upload, progress, guide view) plus a history of past guides.

**Out of scope (v1):**
- OCR of scanned PDFs or image-only slides. These are detected and reported
  instead (§4.3).
- Generating `items`, flashcards, or Learn cards from the upload (see C4).
- Writing to `sources/`.
- Any hosted LLM API.
- `.ppt` (the legacy binary format), `.docx`, `.key`. Only `.pptx` and `.pdf`.
- A chat interface. A one-shot guide comes first; follow-up Q&A can come later (C6).

---

## 3. Architecture

```
 Coach page (React)                         Express (server/)                       Ollama (local)
 ─────────────────                          ─────────────────                       ──────────────
 drop file ──POST /api/coach/docs──────────▶ routes/coach.js
   (raw bytes, octet-stream)                   ├─ sniff + size/page caps
                                               ├─ coach/extract/{pdf,pptx}.js
                                               │    → pages[{n, text, notes}]
                                               ├─ INSERT study_docs
             ◀──── { docId, pages, warnings } ─┘
 "Generate" ──POST /api/coach/docs/:id/guide─▶ coach/jobs.js (1-at-a-time queue)
             ◀──── { jobId } ─────────────────   └─ coach/pipeline.js
 poll GET /api/coach/jobs/:id ───────────────▶       ├─ chunk.js     (token-budgeted)
             ◀──── { status, done/total } ────       ├─ MAP:   per chunk ─── chatJSON ─▶ concepts + quotes
                                                     ├─ ground.js   (drop unquoted claims)
                                                     ├─ personalize.js (FSRS/attempts → weak topics)
                                                     ├─ REDUCE: whole doc ─── chatJSON ─▶ guide
                                                     └─ INSERT study_guides
 GET /api/coach/guides/:id ──────────────────▶ guide JSON → GuideView
```

New files:

```
server/routes/coach.js          HTTP surface, auth, validation
server/coach/extract/pdf.js     PDF → pages
server/coach/extract/pptx.js    PPTX → slides (+ notes)
server/coach/chunk.js           pages → token-budgeted chunks
server/coach/ground.js          quote/anchor verification
server/coach/personalize.js     user's weak topics, leeches, recent accuracy
server/coach/prompts.js         system prompts + JSON schemas
server/coach/pipeline.js        map → ground → personalize → reduce
server/coach/jobs.js            in-memory single-worker job queue
src/components/coach/CoachView.jsx
src/components/coach/UploadDrop.jsx
src/components/coach/GuideView.jsx
src/hooks/useCoachJob.js
```

`server/ollama.js` is reused **unchanged**: `chatJSON`, `resolveHost`, the error
classes, and the model/host defaults the user already set in Settings
(`useOllamaSettings.js`). Its header comment says `routes/drill.js` is the only
caller, so that comment gets updated.

---

## 4. Extraction

### 4.1 PDF: `pdfjs-dist` (legacy Node build)

- Pure JS, **no native module**. That matters: the README's Electron section
  shows the cost of `better-sqlite3`/`bcrypt` native binaries on cross-builds,
  and a third native dependency is not worth it.
- `getDocument({ data, disableWorker: true, isEvalSupported: false })`, then
  `page.getTextContent()` for each page. Join text items into lines by their
  y-coordinate so bullet lists don't turn into one long run-on string.
- One page counts as one unit. Lecture decks exported to PDF map 1:1 to slides,
  which is what `provenance.page` already expects (`itemSchema.js`).
- `isEvalSupported: false` because the document is untrusted input (pdf.js has
  had a CVE around font evaluation, CVE-2024-4367).

### 4.2 PPTX: `fflate` + targeted XML reads

A `.pptx` is a zip of XML. No full Office parser is needed:

- Unzip with `fflate` (tiny, pure JS).
- Take slide order from `ppt/presentation.xml` → `<p:sldIdLst>` →
  `ppt/_rels/presentation.xml.rels`. **Do not sort by filename**: `slide10.xml`
  sorts before `slide2.xml`, and decks that were reordered no longer match
  their file numbering anyway.
- Slide text: every `<a:t>` run, grouped by `<a:p>` paragraph, in document
  order. Table cells come through the same way.
- Speaker notes: `ppt/notesSlides/notesSlideN.xml`, found through the slide's
  own `_rels`. Notes are often where the lecturer's actual explanation lives,
  so they are kept as a separate `notes` field instead of being dropped.
- Hidden slides (`show="0"`) are included but flagged.

### 4.3 What extraction reports back

```js
{
  kind: "pdf" | "pptx",
  pages: [{ n: 1, text: "…", notes: "…" | null, imageOnly: false }],
  warnings: [
    "Slides 4, 9, 17 contain only images — their content can't be read (no OCR).",
    "This PDF appears to be scanned: 0 of 42 pages have a text layer."
  ]
}
```

A page with fewer than about 20 characters of text but at least one image is
marked `imageOnly`. If more than 60% of the document is `imageOnly`, the upload
still succeeds, but the Coach page says plainly that a guide would be built from
almost nothing and asks before generating.

### 4.4 Input hardening

The upload is untrusted bytes from a browser:

- **Dedicated body parser** on this route only:
  `express.raw({ type: "application/octet-stream", limit: "25mb" })`. The global
  `express.json({ limit: "2mb" })` in `server/index.js` stays as it is. Using
  raw bytes instead of multipart avoids adding `multer` (the dependency list is
  deliberately short, per `rateLimit.js`).
- **Magic-byte sniffing**, not the file extension: `%PDF-` for PDF, and
  `PK\x03\x04` plus a `ppt/presentation.xml` entry for PPTX.
- **Zip-bomb guard**: cap the total uncompressed size (100 MB), the number of
  entries (5,000), and the size of any single XML part, checked while
  `fflate` streams entries rather than after.
- **XML**: read with a non-entity-expanding parser, or a regex over `<a:t>` with
  entities decoded by a fixed table. Never use a DTD-resolving parser (XXE).
- **Page cap** of 150, and a hard wall-clock timeout on extraction (20 s).
- The filename is kept for display only, and is length-capped and stripped of
  control characters.

---

## 5. The AI pipeline

### 5.1 Why map → reduce instead of one call

`ollama.js` uses `num_ctx: 8192` (`DEFAULT_NUM_CTX`) for a reason: overflowing
it truncates the JSON mid-object, which surfaces as a confusing
`OllamaBadResponseError`. A 40-slide deck is easily 10–15k tokens, so one call
can't hold it. Splitting the work also gives honest progress ("chunk 3 of 7")
in place of a single spinner that hangs for two minutes.

### 5.2 Chunking (`chunk.js`)

- Budget about 3,000 source tokens per chunk (estimated as characters ÷ 4). That
  leaves about 1,200 for the system prompt and about 3,500 for output inside
  8,192.
- Chunks break **only at page/slide boundaries**, never mid-slide, so every
  chunk covers a contiguous `[firstPage, lastPage]` range.
- Each page is prefixed with a marker the model can cite:
  `=== SLIDE 12 ===` (and `--- NOTES ---` before notes).
- A single slide over budget (a text-dense textbook page, say) is split at
  paragraph boundaries and keeps its page number.

### 5.3 MAP: concepts per chunk

One `chatJSON` call per chunk, `temperature: 0.1`, `format` = a JSON Schema (the
same grammar-constrained approach `gradeResponseSchema` uses for grading):

```js
{
  concepts: [{
    name: string,                 // "Shallow vs. deep copy"
    explanation: string,          // 1–3 sentences, in the model's words
    quote: string,                // VERBATIM span from the chunk, ≥ 8 words
    slide: integer,               // must fall within this chunk's page range
    kind: "definition" | "rule" | "procedure" | "example" | "pitfall" | "comparison",
    examLikely: boolean,          // lecturer emphasis: "remember", "on the exam", repeated, boxed
    topicId: enum[...course topic ids, "none"]   // see below
  }],
  prerequisites: string[]         // concepts the chunk assumes but doesn't teach
}
```

**`topicId` is a schema `enum`** built from the current course's `topics` rows.
The grammar makes it *impossible* for the model to invent a topic id, so mapping
concepts onto SkillTape topics needs no fuzzy post-matching. Each topic's
title and subtitle are listed in the system prompt so the model can choose.

### 5.4 Grounding (`ground.js`): the rule 1 enforcement point

After each MAP call, before anything is kept:

1. Normalize the quote and the chunk text the same way: Unicode NFKC, collapse
   whitespace, lowercase, straighten smart quotes and dashes.
2. **The quote must be a substring of the chunk's text.** If it isn't, try a
   tolerant match (≥ 90% token overlap within a sliding window on the claimed
   slide). Slide text extracted from PDFs often has odd line breaks.
3. **`slide` must be in the chunk's range**, and the quote must actually occur
   on that slide. If it occurs on a different slide in the chunk, the slide
   number is corrected; if it occurs nowhere, the concept is rejected.
4. Concepts that fail are **dropped and counted**, not shown with a warning. The
   guide footer reports "3 claims dropped: the model couldn't point to where the
   slides said them." That count is also the main quality metric in §8.

This is the same kind of tripwire `itemSchema.js` runs with `novelTokens`, but
it hard-fails instead of warning, because nobody verifies these claims by hand.

### 5.5 Personalization (`personalize.js`)

This is what makes the feature a *coach* and not a generic summarizer. It runs
deterministic SQL with no model involved, scoped to `req.userId`:

| Signal | Source | Used as |
| --- | --- | --- |
| Leeches per topic | `item_review_state.leech = 1` | "you've lapsed on this 3+ times" |
| Recent closed-book accuracy per topic | `item_attempts` (last 30 days, `mode = 'closed'`), same rules as `server/stats.js` | weak / ok / strong |
| Due backlog per topic | `item_review_state.due_on <= now` | "already due: review before new material" |
| Topics never attempted | `items` with no attempt row for the user | "new to you" |
| Logged confusions | `gaps/inbox.jsonl` entries whose `topic_guess` matches | "you flagged this before: <what_broke>" |

The result is a compact per-topic profile (one line per topic, well under 500
tokens) that is passed to REDUCE. Anonymous users (`user_id = 0`) get the same
profile from the anonymous rows. With no history at all, the guide skips the
"your weak spots" section and says so.

### 5.6 REDUCE: the Study Guide

One final `chatJSON` call takes the **grounded concept list** (not the raw
slides; those have already been used), the topic profile, and the course topic
list:

```js
{
  overview: string,                       // 2–4 sentences: what this material is about
  studyOrder: [{                          // ordered: prerequisites → weak → new → strong
    conceptRefs: integer[],               // indices into the grounded concept list
    topicId: enum[...],
    reason: string,                       // "Your accuracy on linked-lists is 52% and this builds on it"
    action: enum["fill", "drill", "exam", "learn", "flashcards", "transcribe"],
    minutes: integer
  }],
  pitfalls: [{ conceptRef: integer, warning: string }],
  selfCheck: [{ conceptRef: integer, prompt: string }],  // recall prompts — NOT items, never graded/scheduled
  gaps: string[]                          // material with no matching SkillTape topic → "consider adding a topic"
}
```

Every `conceptRef` is range-checked server-side. Anything the model says in
REDUCE that isn't attached to a grounded concept is narrative (`overview`,
`reason`), and the UI styles it that way, without a quote.

`action: "transcribe"` exists for rule 7: when the deck covers a topic that has
**no items yet** (ROADMAP §1 lists `bigo`, `cstrings`, `containers` as
blocked on source material), the coach recommends transcribing those slides into
`sources/` instead of pretending it can stand in for doing that.

### 5.7 Prompt-injection posture

The document is untrusted text going into a prompt. The risk is low here and
contained by construction:

- Output is **grammar-constrained JSON** with enums and integer refs. There is no
  free-form channel that can trigger actions.
- The model's output **never triggers a write** beyond saving the guide itself,
  and it can't call tools, routes, or URLs.
- Rendering uses the existing text components (`Inline.jsx`/`PromptBody.jsx`),
  **never** `dangerouslySetInnerHTML`. A deck that contains
  `<img onerror=…>` renders as literal text.
- The system prompt wraps the source in delimiters and says that instructions
  inside the slides are content to summarize, not instructions to follow. This
  is defense in depth, not the actual control.

### 5.8 Failure behavior

This follows `grade-batch`'s fail-open philosophy, adjusted for a feature
that has no fallback:

| Failure | Behavior |
| --- | --- |
| Ollama unreachable / model missing | Job fails fast before any chunk runs, with the same `gradingFailureReason`-style message ("Ollama isn't running at …" / "`qwen3.5:9b` isn't pulled — run `ollama pull …`"). The extracted doc is kept, so Retry needs no re-upload. |
| One MAP chunk returns bad JSON twice | That chunk is skipped and recorded. The guide is built from the rest and lists "slides 18–24 couldn't be processed". |
| More than half the chunks fail | The job fails. A guide built from a minority of the deck would mislead. |
| REDUCE fails | The grounded concept list is saved and shown on its own (a usable "key concepts by slide" view), and REDUCE can be retried alone. |
| Host not on the allowlist | 400, not fail-open, same reasoning as `drill.js`. |

Timeouts: MAP 90 s per chunk (the first call pays the cold load, see the note in
`grade-batch`), REDUCE 120 s.

---

## 6. Data model

Added to `server/schema.sql` (all `IF NOT EXISTS`, matching how that file works
as a migration):

```sql
-- ── Study Coach (A12) ───────────────────────────────────────────────────────
-- Uploaded study material and the guides generated from it. Per-user,
-- private, and deliberately separate from `items`/`sources/`: nothing here is
-- verified content and nothing here ever enters drill rotation (ROADMAP §5 r1/r7).

CREATE TABLE IF NOT EXISTS study_docs (
  id          TEXT PRIMARY KEY,               -- random UUID
  user_id     INTEGER NOT NULL DEFAULT 0,     -- same user_id = 0 convention as item_review_state
  course_id   TEXT REFERENCES courses(id) ON DELETE SET NULL,
  filename    TEXT NOT NULL,                  -- display only
  kind        TEXT NOT NULL,                  -- 'pdf' | 'pptx'
  sha256      TEXT NOT NULL,                  -- de-dupe re-uploads of the same file
  page_count  INTEGER NOT NULL,
  pages       TEXT NOT NULL,                  -- JSON [{n, text, notes, imageOnly}] — extracted text, NOT the file
  warnings    TEXT,                           -- JSON string[]
  created_at  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_study_docs_user ON study_docs(user_id, created_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_study_docs_dedupe ON study_docs(user_id, sha256);

CREATE TABLE IF NOT EXISTS study_guides (
  id            TEXT PRIMARY KEY,
  doc_id        TEXT NOT NULL REFERENCES study_docs(id) ON DELETE CASCADE,
  user_id       INTEGER NOT NULL DEFAULT 0,
  status        TEXT NOT NULL,                -- 'complete' | 'partial' | 'failed'
  model         TEXT NOT NULL,                -- which Ollama model wrote it
  prompt_version TEXT NOT NULL,               -- bump when prompts.js changes; old guides stay labelled
  concepts      TEXT,                         -- JSON grounded concept list (MAP output after ground.js)
  guide         TEXT,                         -- JSON REDUCE output, NULL if REDUCE failed
  stats         TEXT,                         -- JSON {chunks, chunksFailed, conceptsDropped, ms}
  created_at    INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_study_guides_doc ON study_guides(doc_id, created_at);
```

Notes:
- **The original file is not stored.** Re-extracting would need a re-upload, and
  that is fine. Not keeping copyrighted binaries around is worth more.
- `prompt_version` and `model` serve the same purpose `params_version` does on
  `item_attempts`: when the prompts improve, old guides stay distinguishable
  instead of looking like they came from today's pipeline.
- Deleting a doc cascades to its guides. A "Delete" button on each history row
  is part of v1, not a nice-to-have.
- **Isolation**: every query filters on `user_id = req.userId ?? 0`, following
  `server/userScope.js`. `test/userIsolation.test.js` gains coach cases (§8).

---

## 7. API

All routes live under `/api/coach`, mounted in `server/index.js` next to `drill`.

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| `POST` | `/docs?course=cpp` | **requireUser** | Upload raw bytes (`Content-Type: application/octet-stream`, `X-Filename` header). Extracts and stores. → `201 { docId, kind, pageCount, warnings, imageOnlyRatio }`. A re-upload of the same file returns the existing `docId` with `200`. |
| `GET` | `/docs` | session-scoped | The user's docs, newest first, with latest guide status. |
| `DELETE` | `/docs/:id` | requireUser | Delete the doc and its guides. |
| `POST` | `/docs/:id/guide` | **requireUser** | Body `{ host?, model? }` (validated with `resolveHost`). Enqueues a job. → `202 { jobId, position }`. |
| `GET` | `/jobs/:id` | session-scoped | `{ status: "queued"|"extracting"|"mapping"|"reducing"|"done"|"failed", done, total, guideId?, error? }` |
| `POST` | `/jobs/:id/cancel` | requireUser | Cancel. The in-flight Ollama request is aborted through its `AbortController`. |
| `GET` | `/guides/:id` | session-scoped | Guide plus concepts plus the page texts referenced by quotes (so the UI can show context without a second call). |

**Why `requireUser` on the two expensive routes**, when Practice grading allows
anonymous use: an upload is 25 MB of parsing, and a guide is minutes of GPU
time. On the Docker deployment that is an unauthenticated DoS lever. The desktop
build already has an account flow (`AuthBar.jsx`), so this costs a single-user
install one login.

**Rate limit**: reuse the `Window` class from `server/rateLimit.js`, keyed by
user id: 10 uploads per hour, 5 guide jobs per hour.

**Job queue (`jobs.js`)**: in-memory, **concurrency 1**. There is one GPU, and two
concurrent 9B generations on an 8 GB card would thrash VRAM (the reasoning
`useOllamaSettings.js` gives for collapsing to one model). Same honest
limitations as `rateLimit.js`: state is lost on restart and not shared across
processes. A job interrupted by a restart shows as `failed: "server restarted"`
the next time it is polled, and retry costs nothing because the doc is
persisted.

---

## 8. Frontend

### 8.1 Placement

A **Coach** entry on the course Hub, next to Drill / Exam / Report, pushed as a
full page on the page stack (`STUDY_HUB.md` §3). Because a guide is per-course
(topic mapping needs the course's topic list), the course comes from the Hub
you opened it from.

### 8.2 CoachView: three states

1. **Upload**: a drop zone plus file picker (`accept=".pdf,.pptx"`), and under it
   the list of past docs and guides (filename, date, status, model, delete).
   When Ollama isn't reachable, a status line uses the existing
   `/api/drill/ollama-status` probe and links to Settings, *before* the user
   uploads anything.
2. **Extracted / generating**: page count, the extraction warnings, and a
   **Generate guide** button. While running, a determinate progress bar
   ("Reading slides 13–24 · chunk 2 of 5") from polling `/jobs/:id` every 1.5 s,
   with a Cancel button.
3. **Guide (`GuideView`)**:
   - **Overview** at the top.
   - **Study order**: a numbered list. Each step shows the topic, the reason,
     the time estimate, and **one action button that opens the real feature**
     (Fill Mode on that topic, Drill filtered to it, and so on). This is what
     links the advice to the engine that already exists.
   - **Key concepts by slide**: each concept collapses open to show its
     **verbatim quote** with a "Slide 12" chip and the slide's surrounding text.
     Advice and evidence sit side by side; that is rule 1 in the UI.
   - **Pitfalls** and **Self-check** prompts. Self-check uses a reveal-on-click
     pattern (answer hidden, quote shown after) and is labeled *"Not graded or
     scheduled. Practice only."*
   - **Footer**: the model used, the date, and "N claims dropped as
     ungrounded · slides X–Y couldn't be processed".

### 8.3 Styling

Built from the `ui/` primitives `STUDY_HUB.md` §4.2 proposes (`<Card>`,
`<Button>`, `<SectionHeader>`). If those haven't shipped yet, this feature uses
inline styles like the rest of the app and is migrated in that pass. It is not
a reason to block either one.

---

## 9. Open decisions

### C1: Local Ollama only, or also a hosted model?
`ROADMAP.md` D9 lists "hosted API vs. Ollama" as an open platform question.
**Recommendation: Ollama only for v1.** It is already integrated and measured, it
keeps copyrighted course material on the machine (rule 8), and it costs nothing
per document. Keep `pipeline.js` calling a small `llm.chatJSON` interface so a
hosted provider can be added later behind an explicit, per-upload opt-in that
says the slides will leave the machine. A hosted frontier model would write
noticeably better guides, so revisit this if the §10 eval shows a 9B model's
guides aren't useful.

### C2: Which model?
**Recommendation: reuse the user's configured `model` (`qwen3.5:9b` by default)
with no new setting.** The two loads collide if Practice and Coach use different
models (the 8 GB VRAM eviction problem). Measure it on the §10 eval before
deciding it needs its own model. If 8192 context proves too small for REDUCE on
large decks, raise `numCtx` only for that call. Don't change the global default.

### C3: Store extracted text, or re-extract on every generation?
**Recommendation: store it** (the `study_docs.pages` column). That gives retry
without re-upload, quote context in the guide view, and a later Q&A feature
(C6). It's per-user, lives in the gitignored DB, and is deletable. Don't store
the original binary.

### C4: Should the coach ever draft `items`?
This is the big one. It would be the fastest way to fill the empty topics in
ROADMAP §1, and it is also exactly what rule 7 warns against.
**Recommendation: not in v1. Decide after using v1 for a few weeks.** If yes,
the only acceptable shape is: drafts land as `origin: "generated"`,
`verifiedByHuman: false`, with `provenance.excerpt` = the grounded quote and
`provenance.page` = the slide number. **But** `provenance.anchor` must resolve
inside a `sources/` file, which means the slide text has to be transcribed there
first. So the coach can't skip manual ingestion even then, which is probably
the right outcome.

### C5: Merge guides across multiple uploads?
"Here are 4 decks for the midterm, plan my week." **Recommendation: later.** It
needs a second REDUCE over several concept lists plus calendar logic. v1's
one-guide-per-doc design is the building block for it, so nothing in v1 blocks it.

### C6: Follow-up chat about the material?
**Recommendation: later**, and grounded the same way: retrieve relevant pages
from `study_docs.pages` (lexical search is enough at deck scale), answer with
required quotes, and drop ungrounded answers. Explicitly not a general tutor.

---

## 10. Testing and evaluation

### 10.1 Unit tests (`node --test`, alongside the existing `test/*.test.js`)

| Test file | Covers |
| --- | --- |
| `coachExtractPdf.test.js` | text layer, line joining, page numbering, scanned-PDF detection, encrypted/corrupt PDF → clean 400 |
| `coachExtractPptx.test.js` | slide order from `presentation.xml` (fixture with reordered slides 1, 10, 2), notes linkage, entity decoding, hidden slides, zip-bomb caps |
| `coachChunk.test.js` | budget respected, never splits a slide, oversized-slide fallback, page ranges contiguous |
| `coachGround.test.js` | exact match, whitespace/smart-quote tolerance, wrong-slide correction, fabricated quote rejected, out-of-range slide rejected |
| `coachPersonalize.test.js` | weak/strong classification against seeded attempts (reuse `test/helpers/testDb.js`) |
| `coachPipeline.test.js` | `chatJSON` stubbed: partial chunk failure → `partial`, majority failure → `failed`, REDUCE failure keeps concepts, bad `conceptRef` dropped |
| `userIsolation.test.js` (extend) | user B can't GET, DELETE, or generate against user A's doc or guide |

Fixtures are **self-authored** small PDFs and PPTXs generated in the test
helper. **No course material in `test/`** (README "Course Materials" rule).

### 10.2 Model evaluation (the counterpart to `docs/OLLAMA_GRADING.md` §8)

Before shipping, run 5 real decks you already have `sources/` transcriptions
for (so there is ground truth) and record:

- **Grounding rate**: concepts that survive `ground.js` divided by concepts
  proposed. Below about 80% means the prompt needs work.
- **Coverage**: of the `{#anchor}` sections in the matching `sources/` file,
  how many surfaced as at least one concept.
- **Topic-mapping accuracy**: concepts whose `topicId` matches the topic you'd
  have assigned.
- **Usefulness (manual, 1–5)**: would you follow this study order?
- **Wall time** on the RTX 2070 Super, cold and warm.

Record the numbers in this doc and re-run them when the prompts or model change
(`prompt_version`).

---

## 11. Phased plan

1. **Extraction only.** `extract/pdf.js`, `extract/pptx.js`, `POST /docs`,
   `study_docs`, the upload UI showing extracted pages. No AI. This alone proves
   the parsers on real decks inside the packaged Electron build (pdf.js plus
   asar packaging is the main integration risk).
2. **MAP + grounding.** `chunk.js`, `ground.js`, the job queue, and a "key
   concepts by slide" view. That is already a useful feature, and it is where
   the §10.2 grounding rate gets measured.
3. **Personalization + REDUCE.** `personalize.js`, the full guide, and the
   action buttons into Fill, Drill and Exam.
4. **Polish.** History, delete, cancel, rate limits, the empty and error
   states, and the README/AUTHORING updates.
5. **Later (gated on C1/C4/C5/C6).** Hosted provider, item drafting,
   multi-doc plans, grounded Q&A.

---

## 12. Non-goals, stated plainly

- The coach does not create, edit, or verify `items`, cards, or flashcards.
- The coach does not write to `sources/`, and does not replace transcribing.
- No scheduler changes. Self-check prompts never touch FSRS.
- No OCR in v1.
- No uploaded file leaves the machine in v1.

---

## 13. New dependencies

| Package | Why | Native? |
| --- | --- | --- |
| `pdfjs-dist` | PDF text extraction | No |
| `fflate` | Unzipping `.pptx` | No |

Neither touches the `electron-rebuild` / Windows-prebuild path in the README's
packaging notes.
