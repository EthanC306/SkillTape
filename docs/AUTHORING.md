# SkillTape — Authoring Guide

How to add course content to SkillTape so every topic comes out the same way, regardless of who or what writes it.

This is the authoring contract. The schema itself is documented inline at the top of `src/data/curriculum.js` — that comment stays the source of truth for *field names and types*; this file covers *house style, conventions, and the steps around it*. If the two ever disagree, the code wins and this file needs fixing.

**Design principle, inherited from the README:** every item traces back to a verbatim excerpt from real course material — zyBooks, lecture slides, lab handouts, the textbook. Nothing in the author's own courses is model-generated. Writing a topic means *transcribing and organizing* a source, not *inventing* plausible CS content.

---

## 1. Where content lives

```
src/data/courses.js                    # the class list (picker cards + tab ids)
src/data/curriculum.js                 # flat topic array, assembled by import
src/data/topics/<course>/<topic>.js    # one file per topic — all the content
public/figures/<course>/<name>.png     # diagrams, served from the site root
```

One topic = one file = one default-exported object. Topic files never import each other and never import from the app; they are pure data.

---

## 2. The topic object

```js
export default {
  id: "dynamic-classes",              // unique, kebab-case; also the localStorage progress key
  title: "Dynamic Memory with Classes & Structures",
  subtitle: "CS 2401 — destructors, copy constructors & operator=",
  course: "cpp",                      // must match a COURSES id in courses.js
  showChart: false,                   // Big-O chart + reference table (see §2.1)
  cards: [ /* Learn mode */ ],
  questions: [ /* Quiz mode */ ],
  flashcards: [ /* optional */ ],
};
```

### 2.1 Field notes

- **`id`** — stable forever. It's the primary key of `topics` in the database (`server/schema.sql`) and keys every quiz attempt row, so renaming it silently orphans that topic's history. Pick it once. C++ topics use a plain slug (`linked-lists`); discrete topics use a numbered slug matching the textbook section (`discrete-2-4-circuits`).
- **`subtitle`** — course code plus a short scope line. C++ style: `"CS 2401 — destructors, copy constructors & operator="`. Discrete style: `"CS3000 — §2.4"`.
- **`showChart`** — `true` renders the Big-O `ComplexityChart` and `ReferenceTable` in Learn and Quiz. These visuals are Big-O specific. **Only `bigo.js` sets this true.** Everything else sets it `false` explicitly — don't omit the field.

### 2.2 File header comment

Discrete topics open with a provenance banner. Follow this for all new topics, including C++ ones (the older C++ files predate the convention and don't have it):

```js
// ─────────────────── CS3000 · §2.4 Application: Digital Logic Circuits ───────────────────
// Content authored from Epp, "Discrete Mathematics with Applications" 5e, §2.4.
// Text is original; the figures are the section's gate charts, reused for study.
export default {
```

Name the source precisely enough that a future reader can re-open it: textbook + edition + section, or the lecture deck's number and title. If figures are lifted from the source, say so.

---

## 3. Cards (Learn mode)

```js
{
  heading: "Why classes need destructors",
  body:
    "When an object with dynamically allocated memory **goes out of scope**, that memory doesn't free itself. …",
  accept: { "O(n)": ["linear", "linear time"] },   // optional, see §3.3
  figure: { src, alt, caption },                   // optional, see §6
}
```

### 3.1 Style

- **Walk the source in order.** Cards should follow the deck's or section's own sequence. A reader going card-to-card should be re-walking the lecture.
- **One idea per card**, 2–5 sentences. Current bank runs 6–11 cards per topic.
- **`heading`** is a short noun phrase, not a question: "The copy problem", "Simplifying with logic laws".
- **Write prose, not bullets.** `body` is a single string rendered as a paragraph. There is no list support.
- **Inline code is bare**, not fenced or backticked: `str = new char[1000];` sits directly in the sentence. Backticks are stripped by the fill-mode normalizer anyway.
- Keep the author's voice — plain, direct, second person where natural ("you don't have to remember to delete anything by hand").

### 3.2 What to bold

`**double asterisks**` do double duty: they emphasize the term in Learn mode, and they become the blanks in Fill Mode. So bold **exactly the terms worth recalling cold** — the load-bearing noun, rule, or complexity class.

- Bold: `**destructor**`, `**O(n²)**`, `**const reference**`, `**2ⁿ**`, `**tilde (~) followed by the class name**`.
- Don't bold: connective words, whole clauses you'd never type from memory, or anything you wouldn't want to be asked for on a blank line.
- Roughly 3–6 blanks per card. A card that's half-bold becomes unfillable noise.

### 3.3 `accept` — extra answers

Fill Mode already grades leniently. `src/utils/fill.js` folds away, automatically and with no help from the topic file:

| Handled | Example |
| --- | --- |
| case | `Linked List` = `linked list` |
| internal hyphens | `linked-list` = `linked list` |
| whitespace runs | `o(n 2)` = `o(n2)` |
| exponents (`^` and superscripts) | `O(n²)` = `O(n^2)` |
| plurals, incl. irregulars | `indices` = `index`, `vertices` = `vertex` |
| number words | `two` = `2`, `sixteen` = `16` |
| quotes, backticks, trailing `.,;:!?` | `"destructor."` = `destructor` |

`accept` is the escape hatch for **synonyms no rule can derive** — and only those:

```js
body: "…shifting every element is **O(n)**…",
accept: { "O(n)": ["linear", "linear time"] },
```

Keys may be the raw bold text or its normalized form. **No topic file currently uses `accept`** — if you reach for it, first check the table above, because the common cases are already covered. For a synonym pair that's interchangeable *everywhere* in the curriculum, add it to `ALIAS_GROUPS` in `src/utils/fill.js` instead of repeating it per card (that array is currently empty by design).

---

## 4. Questions (Quiz mode)

```js
{
  prompt: "What does this destructor do?",
  code: "MyString::~MyString() {\n  delete[] str;\n}",   // optional
  choices: ["…", "…", "…", "…"],
  answer: 0,                                              // 0-based index
  explanation: "delete[] str frees the heap array str points to; …",
  tag: "O(n)",                                            // optional, Big-O topics only
  figure: { src, alt, caption },                          // optional
}
```

### 4.1 Rules

- **Four choices**, always. Every question in the bank has exactly four.
- **`answer` is a 0-based index** into `choices`.
- **`explanation` is one sentence** that justifies the correct answer — not a restatement of it. Compare: *"Destructors run automatically as an object is destroyed, usually to free dynamically allocated memory."* It teaches the rule, not just the letter.
- **`code` carries the source's actual snippet**, verbatim where possible, as a `\n`-escaped string. When the source deck has code, prefer code-based questions — those are the ones that transfer to a closed-book exam.
- **`tag`** highlights the matching curve on the Big-O chart. Only meaningful when `showChart: true`, i.e. only in `bigo.js`. Values are complexity strings: `"O(1)"`, `"O(log n)"`, `"O(n log n)"`, `"O(n²)"`, `"O(2ⁿ)"`.
- Current bank runs 7–14 questions per topic.

### 4.2 Answer position

**Choice order is randomized at runtime.** `QuizView` runs every question through `shuffleChoices` (`src/utils/shuffle.js`), which permutes `choices` and remaps `answer` to match. A fresh permutation is drawn each time the quiz is opened and again on "Try again", so a repeated quiz can't be passed from memory of the option order. The topic file's arrays are never mutated.

**You still author a varied spread.** Keep `answer` roughly even across 0–3 rather than parking every correct answer at index 0. Runtime shuffling means a skew no longer reaches the learner, but the source stays readable, the data is honest on its own terms, and nothing silently regresses if the shuffle is ever bypassed.

A topic where "the first one" is always right trains position, not content — it inflates scores while teaching nothing, which is the failure mode `docs/CS_DRILL_BUILD_SPEC.md` was written to fix.

*History: the C++ bank was originally written almost entirely with `answer: 0` (`dynamic-classes.js` was 13/13, `dynamic-arrays.js` 12/12, `doubly-linked-lists.js` 8/8). It was rebalanced across all 9 committed C++ topics on 2026-07-29, at the same time runtime shuffling was added. Current spread across the C++ bank is 35/33/33/31.*

### 4.3 Distractors

Wrong choices must be *plausible and wrong*, not filler. Good distractors are the actual misconceptions the source warns about — the shallow copy, the missing `[]`, the off-by-one. Avoid joke options and avoid choices that are obviously the wrong shape (a one-word option among three sentences telegraphs the answer).

---

## 5. Flashcards (optional)

```js
flashcards: [
  { front: "O(1)", back: "Constant time — random access of an element in an array; inserting at the beginning of a linked list." },
]
```

`front` is the prompt, `back` is the reveal — name plus classic examples. Both are **plain strings; no `**bold**` markup**, it won't render. When present, a "Flashcards" button appears next to Learn/Quiz. Currently only `bigo.js` has a deck.

---

## 6. Figures

```js
figure: {
  src: "/figures/discrete/logic-gates.png",
  alt: "Figure 2.4.3: symbolic representations and input/output tables for NOT, AND, and OR gates.",
  caption: "Figure 2.4.3 — the NOT, AND, and OR gates",
}
```

Attaches to a **card or a question**. Rendered by `src/components/Figure.jsx`.

- Files live in `public/figures/<course>/`, served at the site root — so `src` starts with `/figures/`, never `./` or `../`.
- `alt` is a real description for accessibility, not a repeat of the caption.
- `caption` carries the source's own figure number when it has one.

---

## 7. Registering the topic

Two edits in `src/data/curriculum.js`:

1. **Import**, in the course's block, **with the `.js` extension**:
   ```js
   import discrete24Circuits from "./topics/discrete/2-4-circuits.js";
   ```
   The extension is mandatory — `scripts/auditBank.js` runs under bare Node, which won't resolve extensionless paths. Vite would have let you get away with it; the audit script won't.

2. **Add to the `curriculum` array** in display order. Courses are grouped with a blank line between them; within a course, keep the source's own order (lecture numbering, textbook sections: 2.3 → 2.4 → 2.5).

The import identifier is camelCase of the file (`2-4-circuits.js` → `discrete24Circuits`).

---

## 8. Edit Mode — authoring in the app

Everything above describes hand-authoring a topic file. There is a second way now: **Edit Mode**, an Edit/Done toggle on any topic (`src/components/TopicView.jsx`) that makes that topic's Learn cards and flashcards editable in the browser, backed by `PUT /api/topics/:id/cards` and `PUT /api/topics/:id/flashcards`. See `docs/BACKEND.md` for the API and auth details; this section covers what it can author and how it maps onto the conventions above.

### 8.1 What it can edit

- **Cards** (`src/components/CardEditor.jsx`, rendered per-card in `LearnView.jsx`) — heading, body, code, and `accept`, plus `+ Add card`, delete, and ↑↓ reorder. A **Revert** control discards unsaved changes back to the last saved state.
- **Flashcards** (`FlashcardsView.jsx`'s editor) — front/back pairs, same add/delete/reorder pattern, including the empty-deck case (an editor still renders, and saving an empty list is how a deck gets deleted — `buildTopic` turns zero flashcard rows back into an absent `flashcards` key, same as a topic that never had a deck).
- **The bold/blank button.** The **B** button in `CardEditor` wraps the current selection in `**double asterisks**` — the *exact same markup* §3.2 above describes for hand-authored cards. There is no second syntax: `src/utils/fill.js`'s `BOLD_RE` is what both Learn mode's emphasis and Fill Mode's blanks key off, so toggling bold in the editor **is** marking a fill-in-the-blank span. Toggling it again on the same span unwraps it back to plain text. §3.2's "3–6 blanks per card, only terms worth recalling cold" guidance applies exactly as written — `src/utils/blankEdit.js`'s `validateBody()` will warn if a card has none.
- Requires being logged in (`docs/BACKEND.md` — the two `PUT` routes are the only thing an account gates).

### 8.2 What it can't edit

- **Quiz questions are not editable in Edit Mode**, deliberately, and there's no near-term plan to add it. `QuizView` runs every question through `shuffleChoices` (§4.2) at render time, so the choices and `answer` index on screen are a permuted copy of what's stored — an in-place editor would need a UI built against the *pre-shuffle* source, which doesn't exist. Editing questions today still means editing the topic's `.js` file (§4) and re-seeding.
- **Figures stay hand-authored.** There is no upload path; `CardEditor` shows a read-only note on a card that has one so it doesn't look like the figure was silently dropped.
- **Course/topic creation and metadata** (title, subtitle, `course`, `showChart`) aren't editable in-app — registering a new topic is still the file + `curriculum.js` + `db:seed` path in §7 below.

### 8.3 Edit Mode and the seed source

Edit Mode writes only to the database. The `src/data/topics/**/*.js` files this guide otherwise describes are unaffected by anything you do in the app, and running `npm run db:seed` afterward will overwrite the in-app changes with the file's stale content. This is an open, unresolved tension between two sources of truth — see `docs/BACKEND.md`'s "Seed vs. database" section before running a reseed on a topic anyone has edited in-app.

---

## 9. Adding a course

Rarer, and it touches three files. Check `COURSES` in `src/data/courses.js` first — if the topic fits `cpp` or `discrete`, it isn't a new course.

1. `src/data/courses.js` — add `{ id, title, subtitle }` to `COURSES`.
2. Topic files — set `course` to the new `id`.
3. `src/Shell.jsx` — **the bottom tab bar is hardcoded**, not generated from `COURSES`. Tabs are keyed by their own ids (`"cs2401"`, `"cs3000"`) which are *not* the course ids, and each branch renders `<App key="…" course="…" />`. A new course needs a branch here or it will never be reachable.
4. `scripts/auditBank.js` — add an `ALLOWLIST` entry keyed by the new course id, listing notation the content tripwire would otherwise flag.

---

## 10. Verifying

**Hand-authored files:**

```bash
npx vite build      # catches syntax errors and bad imports
npm run db:seed      # loads the new/changed topic file into the database
```

A clean build plus a clean seed run is the check that matters for a `.js`-file edit — see `docs/BACKEND.md` for what `db:seed` does and does not touch. No dev server needed for either.

**Edit Mode changes** are verified live, not built: run **both** `npm run dev` and `npm run dev:server` (§ "Getting started" in the README — Edit Mode has no effect with only one of the two running, since saves go over `/api` to the Express process), open the topic, toggle Edit, and confirm the save round-trips — reload the page and check the edit persisted. There's no separate build step for a database-backed edit.

**`npm run audit:bank` does not currently pass and is not a gate.** It validates the *planned* item schema in `src/data/itemSchema.js` — `id`, `topicId`, `format`, `provenance`, `expected` — and the bank is still 100% legacy MCQ, so it reports **1025 errors across 205 items** and exits non-zero. That's the known state, not a regression you introduced. Run it if you're migrating content to the new schema; ignore it otherwise. See README §"Item formats (planned)".

Structure checks pass ≠ content is correct. Only human review establishes accuracy.

---

## 11. Checklist

- [ ] File at `src/data/topics/<course>/<kebab-id>.js`, default export, provenance header comment
- [ ] `id` unique and final; `course` matches a `COURSES` id; `showChart` set explicitly
- [ ] Cards follow the source's order, one idea each, prose not bullets
- [ ] 3–6 `**bold**` blanks per card, all worth recalling cold
- [ ] `accept` only for synonyms `fill.js` can't derive (check the §3.3 table first)
- [ ] Every question has 4 choices, a correct 0-based `answer`, and a one-sentence `explanation`
- [ ] **Answer indices varied** across 0–3, not all 0 (§4.2)
- [ ] Code-based questions where the source has code, snippets verbatim
- [ ] Figures under `public/figures/<course>/`, `src` starts with `/figures/`
- [ ] Imported in `curriculum.js` **with `.js`** and placed in source order
- [ ] `npx vite build` is clean
