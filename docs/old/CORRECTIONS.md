# SkillTape — Code Review & Corrections

Reviewed 2026-07-26 against the uploaded project plus `cs-drill-build-spec.md` and `cs-drill-integration.md`.

## 0. Scope limit — read this first

**I only received the entry points, not the application.** Uploaded: `index.html`, `main.jsx`, `cpp-tutor.jsx`, `package.json`, `package-lock.json`, `.gitignore`, `README.md`, `PLAN_PLATFORMIZE.md`.

Everything substantive is missing:

```
src/Shell.jsx            src/data/curriculum.js      src/components/Inline.jsx
src/App.jsx              src/data/courses.js         src/components/FillBody.jsx
src/hooks/useProgress.js src/data/theme.js           src/components/Figure.jsx
src/views/QuizView.jsx   src/data/topics/**/*.js     src/components/ComplexityChart.jsx
src/views/LearnView.jsx  src/utils/fill.js           src/components/ReferenceTable.jsx
src/views/FlashcardsView.jsx  src/views/MasterQuizView.jsx
vite.config.js (may not exist at all — see §2.3)
```

So §2 and §3 are corrections I could actually make and verify. §4 is specifications for files I have not seen — treat those as review notes to apply, not as verified diffs. **Send `curriculum.js`, one topic file, `useProgress.js`, and `App.jsx` and I can correct them directly.**

Also: my earlier recommendation of a CLI-first drill loop was wrong, and I'm withdrawing it. I made it before seeing that you have a working React app with Learn, Quiz, Fill, and Flashcard modes already shipped. Rewriting that as a terminal app would destroy working software to satisfy a preference. §4.2 replaces it with a way to get closed-book enforcement inside the app you have.

---

## 1. Findings by severity

| # | Severity | Finding |
|---|---|---|
| 1 | ✅| `.gitignore` is **empty (0 bytes)** while README claims copyrighted course materials are ignored |
| 2 | ✅ | `PLAN_PLATFORMIZE.md` §4 recommends LLM-generated quizzes — directly contradicts the no-AI-generated-content requirement |
| 3 | 🚨 | Question shape is MCQ-only, structurally preventing the formats that would fix a 53% closed-book score |
| 4 | ⚠️ | No provenance anywhere in the content model — nothing traces back to zyBooks or Epp |
| 5 | ⚠️ | `cpp-tutor.jsx` is dead code |
| 6 | ⚠️ | No `vite.config.js` and no `@vitejs/plugin-react` → no React Fast Refresh |
| 7 | ⚠️ | Three different project names across four files |
| 8 | ⚠️ | README is stale — describes a structure the project outgrew |
| 9 | ⚠️ | `useProgress.js` stores best-score only; cannot support scheduling, timing, or open-vs-closed tracking |
| 10 | ⚠️ | `--nocturne-accent` duplicated in `index.html` and `theme.js` |
| 11 | ℹ️ | `:focus { outline: none }` reset is broader than needed |
| 12 | ℹ️ | Vite 5.4.10 is behind several 5.4.x patch releases |
| 13 | ℹ️ | `package.json` has no `preview` script and no `engines` field |

---

## 2. Corrections applied

### 2.1 🚨 `.gitignore` was empty

The uploaded `.gitignore` is zero bytes. README says:

> Original lecture slides and PDFs (the `pages/` folder) are **not** included in this repository — they are copyrighted course materials and are gitignored.

An empty ignore file means that is not true. If `pages/` exists on disk it is tracked, along with `node_modules/` and any local database. Verify against the real repo — this may be an upload artifact rather than the actual file — with:

```bash
git ls-files | grep -Ei '\.(pdf|pptx|docx)$|^pages/|node_modules'
```

If anything comes back, it's already in history and removing it from HEAD won't remove it from the repo. You'd need `git rm -r --cached` plus history rewrite (`git filter-repo`) before any push to a public remote.

Replacement `.gitignore` provided. It covers `pages/`, `sources/`, `.env*` (with a note that `VITE_*` vars are inlined into the client bundle — relevant to your Phase 1 auth work), and local DB files.

### 2.2 ⚠️ `cpp-tutor.jsx` is dead code

```jsx
import App from "./src/App";
export default function CppTutor() { return <App />; }
```

`main.jsx` renders `Shell`, not this. Nothing imports it, and the README's project structure doesn't list it — it's a leftover from before the multi-course Shell refactor. It's also actively misleading: it implies `App` is the root when `App` is now the per-course view mounted under `Shell`. **Delete it.**

### 2.3 ⚠️ Missing Vite config and React plugin

No `vite.config.js` in the upload, and `@vitejs/plugin-react` is absent from both `package.json` and the lockfile (63 packages, react/react-dom/vite only).

The app still builds — Vite compiles `.jsx` through esbuild's classic transform, which is why every file needs `import React from "react"`. But without the plugin there's **no React Fast Refresh**: every save full-reloads the page and wipes component state. In a quiz app that means losing your place mid-question on every edit.

`vite.config.js` provided (React plugin, sourcemaps, `@` → `src` alias). Note `resolve.alias` only takes effect once the config exists — existing relative imports keep working either way.

### 2.4 ⚠️ Pick one name

| File | Name |
|---|---|
| `package.json` | `cpp-tracker` |
| `index.html` `<title>` | `Cpp Tracker` |
| `README.md` | `cs.tutor` ("nicknamed Cpp Tracker") |
| `PLAN_PLATFORMIZE.md` | `SkillTape` |

I standardized on **SkillTape**: it's the newest, it isn't C++-specific (the app already covers two courses and the plan targets arbitrary user courses), and the README itself flags the C++ name as outgrown. Applied to `package.json` and `index.html`. Change it if you prefer another — just pick one before there's a deployed URL and a database.

### 2.5 ⚠️ Design token duplicated

`index.html` hardcodes `--nocturne-accent: #9184d9` while `PLAN_PLATFORMIZE.md` §6 names `theme.js` PALETTE the single style source. The var genuinely has to live in `index.html` — `:focus-visible` and `::selection` apply before React mounts — so the fix isn't to delete it but to make `theme.js` consume it:

```js
// src/data/theme.js
export const PALETTE = {
  accent: "var(--nocturne-accent)",   // defined in index.html
  // ...
};
```

That works anywhere the value lands in a CSS property. If any JS needs the literal hex (canvas drawing in `ComplexityChart.jsx` is the likely case — Canvas won't resolve CSS vars), read it once at runtime instead of restating it:

```js
const accent = getComputedStyle(document.documentElement)
  .getPropertyValue("--nocturne-accent").trim();
```

Corrected `index.html` documents the coupling in a comment.

### 2.6 ℹ️ Focus outline reset narrowed

`:focus { outline: none }` strips the ring for all focus sources. The following `:focus-visible` rule restores it for keyboard users in every current browser, so this is nearly fine — but it fails open in the wrong direction. Changed to `:focus:not(:focus-visible)`, which keeps mouse clicks clean and guarantees a visible ring even if the `:focus-visible` rule is ever overridden or unsupported.

### 2.7 ℹ️ package.json

Added `preview` script, `engines: node >=18` (README already states the requirement), a `description`, the `audit:bank` task, and bumped Vite to `^5.4.19` — 5.4.10 predates several 5.4.x patch releases including dev-server file-access fixes. Run `npm audit` and confirm current advisories yourself; I can't verify today's list from here.

**Adding `@vitejs/plugin-react` invalidates your lockfile.** Run `npm install` (not `npm ci`) once and commit the updated lock.

---

## 3. 🚨 The two conflicts you have to resolve

### 3.1 Your own plan contradicts your new requirement

`PLAN_PLATFORMIZE.md` §4 option 2 is LLM-generated MCQs, described as "the highest-quality option," and §4 option 3 names a hybrid with a "✨ Generate quiz with AI" button as the **recommended target state**. Your instruction was that nothing should be model-generated, to guarantee accuracy.

Both goals are legitimate and they're incompatible at the global level — but not per course. For your own course material, correctness against the instructor's exam is the entire point and generated content is a liability. For a platform serving strangers who won't hand-author question JSON, generation is the feature that makes the product work at all.

The seam already exists in your Phase 2 schema: you designed `source: "manual" | "generated"`. Extend it.

```js
ITEM_ORIGIN    = { EXTRACTED, MANUAL, GENERATED }
CONTENT_POLICY = { EXTRACTED_ONLY, ALLOW_GENERATED }
```

Set `content_policy` per course. Your courses run `EXTRACTED_ONLY`: the generate button is hidden, and any item lacking anchored provenance fails the audit. Other users' courses can run `ALLOW_GENERATED`. One flag, both products, no accuracy compromise on the material that decides your GPA.

This also affects Phase 4's build order. Your plan ships rule-based fill-in-the-blank first, then layers in LLM MCQs. Keep the first half and reframe it: rule-based extraction from `**bolded**` spans in *anchored source text* **is** the extraction pipeline from the drill spec. `src/utils/fill.js` is most of it already. That's a real head start — the generator you need most is the one you were going to build first anyway.

### 3.2 The question shape is the reason MCQ dominates

Every question in `topics/<course>/<topic>.js` is `{ prompt, choices, answer, explanation }`. That shape **can only express multiple choice.** It's not that you chose MCQ-heavy content; the data model left no other option.

Set against the midterm: 99% on assignments, 100% on labs, 53% closed-book. The gap is producing answers from nothing, and MCQ is the one format that never asks you to. It's also the format that feels most productive, which is what makes it dangerous — recognition accuracy climbs while recall stays flat.

`itemSchema.js` (provided, tested) makes the shape polymorphic: eight formats, MCQ capped at 5% of a bank, mandatory `criteria` checklists on self-graded formats so grading isn't vibes, and `migrateLegacyQuestion()` so your existing hand-written MCQs convert rather than get deleted — landing as `MANUAL` + unverified so the audit lists them for provenance backfill instead of laundering them into "extracted."

Verified behavior:

```
good item (recall, anchored, verified)  → { errors: [], warnings: [] }
write item missing timeBudgetSec        → 3 errors
generated item under extracted_only     → rejected
bank with 67% mcq                       → warns, cap is 5%
```

---

## 4. Specifications for files I haven't seen

Apply these; I can't diff them without the source.

### 4.1 `src/data/topics/<course>/<topic>.js` — add provenance

Cards and items both need to point at real source text. Minimum shape:

```js
export default {
  id: "c++.linked-lists.doubly",
  course: "c++",
  title: "Doubly Linked Lists",
  contentPolicy: "extracted_only",

  sources: {
    "zb-ch03": { citation: "zyBooks, Data Structures Essentials, Ch. 3" },
    "lab03":   { citation: "c++ Lab 3 handout" },
  },

  cards: [
    {
      id: "c1",
      body: "A node stores a **data** element, a pointer to the **next** node, and a pointer to the **previous** node.",
      provenance: { sourceId: "zb-ch03", anchor: "#s3-2",
                    excerpt: "<verbatim sentence from the section>" },
    },
  ],

  items: [ /* itemSchema.js shape */ ],
};
```

The `**bold**` convention stays exactly as-is — `Inline.jsx` and `fill.js` keep working unchanged, and those bold spans are what the rule-based cloze generator consumes.

### 4.2 Closed-book enforcement in the React app

Replacing my CLI recommendation. A browser tab makes peeking trivial; the fix is to make peeking *visible* rather than impossible, since honest self-report is the actual dependency anyway.

Add a `DrillView` that:

- Sets `document.body.dataset.drillActive = "true"` on mount, clearing on unmount. The corrected `index.html` already hides `.app-chrome` on that attribute — give `Shell`'s tab bar that class and navigation disappears during a drill.
- Blocks all routes into Learn/Flashcards while active. One escape hatch, labeled "End drill," which records the attempt as abandoned rather than silently discarding it.
- Runs a per-item timer and stores `seconds` on every attempt. Recall that takes 90 seconds is a fail on a timed exam even when the answer is right.
- Records `mode: "closed" | "open" | "exam"`. Default closed. Only closed-book first-try accuracy counts toward mastery.
- Uses the Page Visibility API as an honesty aid, not a lock:

```js
useEffect(() => {
  const onHide = () => { if (document.hidden) markTabBlur(currentItemId); };
  document.addEventListener("visibilitychange", onHide);
  return () => document.removeEventListener("visibilitychange", onHide);
}, [currentItemId]);
```

Show the blur count in the session summary. Don't fail the item — a blur might be a Slack notification. Surfacing it is enough; the number itself changes behavior.

- Reveals `expected` + `criteria` only after submission, then takes a 0–3 self-grade. Hit 3 of 4 checklist points, that's a 2, not a 3.

### 4.3 `src/hooks/useProgress.js` — replace best-score with attempts

Current model is best score per topic in `localStorage`. That cannot express: which *item* was missed, how long it took, whether it was closed-book, when it's next due, or how many times it's lapsed. Every scheduling feature depends on data this shape discards — and it silently overwrites the interesting signal, since a bad run under closed-book conditions is more informative than a good open-book one.

Append-only attempts instead:

```js
{ itemId, ts, mode, grade /* 0-3 */, seconds, tabBlurs, note }
```

Derive best-score for the existing UI from the log so `QuizView` doesn't have to change. Two notes on `localStorage`: it's synchronous and blocks the main thread, so batch writes at session end rather than per answer; and clearing site data wipes your entire study history. Add a JSON export/import before you accumulate a semester of it — that's the cheapest insurance in this whole document, and it doubles as the migration path when Phase 1 moves you to Supabase.

Also worth noting for Phase 2: your `attempts` table is currently specced as `score/total/per_question_results(jsonb)` — one row per module attempt. Leech detection and per-item scheduling need one row per item attempt. Change it before you write the migration, not after.

### 4.4 README

Rewritten version provided. The current one predates most of the codebase: no mention of `courses.js`, `theme.js`, `hooks/`, `utils/`, the `topics/<course>/<topic>.js` structure, flashcards, or Master Quiz mode — all of which `PLAN_PLATFORMIZE.md` describes as existing. It also claims `curriculum.js` holds the theme, which `theme.js` now owns.

---

## 5. Order of work

1. Verify and fix `.gitignore`, then check whether copyrighted files are already tracked (§2.1). Do this before any push.
2. Delete `cpp-tutor.jsx`. Add `vite.config.js`, update `package.json`, `npm install`.
3. Decide the naming question and the §3.1 policy question. Both are one-line decisions that constrain everything downstream.
4. Drop in `itemSchema.js` + `scripts/auditBank.js`. Run `npm run audit:bank` — it will fail loudly against your current MCQ-only bank, and that failure output is your actual work queue.
5. Migrate **one** topic to the new shape by hand, with real provenance. Pick a topic you lost midterm points on. One topic proves the schema against real zyBooks text before you touch the other twenty.
6. Build `DrillView` (§4.2) and the attempts log (§4.3).
7. Then resume `PLAN_PLATFORMIZE.md` Phase 1.

Phase 0 from the integration addendum still comes first and still involves no code: tally the midterm by topic to get real exam weights and a ranked list of what to migrate.
