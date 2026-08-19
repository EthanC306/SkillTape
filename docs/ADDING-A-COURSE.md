# Adding a Course — Step by Step

A complete walkthrough of adding a brand-new class (course) to SkillTape, written
for someone who has never touched this codebase. It uses the Spring Boot course
as a hypothetical worked example. That course is **not** in the repo — the
example shows what each edit would look like, so follow along and make the edits
yourself.

If you only want to add a **topic** to a course that already exists, you do not
need this document. Use `docs/AUTHORING.md` §7 instead. This document is for the
rarer case: a whole new tab in the app.

---

## 0. Before you start

You need:

- Node 18 or newer (`node --version`).
- The repo installed (`npm install`, once).
- A text editor.

Two vocabulary notes, because the rest of the document leans on them:

- **course** — a class. "C++", "Discrete Structures", "Spring Boot". Each course
  is one tab along the bottom of the app.
- **topic** — one study unit inside a course. A course with zero topics opens to
  an empty screen, which is why Step 4 adds a placeholder topic even when you
  have no material written yet.

Pick two names now and write them down, because they must match exactly in
several places later:

| Thing | Spring Boot example | Rule |
| --- | --- | --- |
| **course id** | `spring` | lowercase, no spaces. Used in code and in the database. |
| **tab id** | `springboot` | lowercase, no spaces. Only used inside `src/Shell.jsx`. |

They are allowed to differ (the existing Discrete course uses course id
`discrete` and tab id `cs3000`), and the code does **not** check that they match,
so a typo here surfaces as an empty tab rather than an error message. Copy-paste
rather than retype.

---

## 1. Register the course — `src/data/courses.js`

This file holds the list of course cards. Add one entry to the `COURSES` array:

```js
export const COURSES = [
  { id: "cpp", title: "C++", subtitle: "Computer Science Intro" },
  { id: "discrete", title: "Discrete Structures", subtitle: "Epp — Discrete Mathematics 5e" },
  { id: "spring", title: "Spring Boot", subtitle: "Java — Spring Boot" },   // ← new
];
```

- `id` — your **course id**. Every topic in this class will carry this exact
  string in its `course` field.
- `title` — what a human sees.
- `subtitle` — one short context line (course code, textbook, framework).

---

## 2. Make a folder for the course's topics

```bash
mkdir -p src/data/topics/spring
```

One folder per course, named after the course id. Every topic file for this
class lives here.

---

## 3. Make a folder for the course's source material (optional but recommended)

```bash
mkdir -p sources/spring
```

`sources/` holds the transcribed lecture slides, textbook sections, and handouts
that topics are built from. SkillTape's design rule is that content is
*transcribed* from real course material, not invented — so this folder is where
the raw material lands before it becomes a topic. See `sources/README.md`.

---

## 4. Create a placeholder topic

A course with no topics is reachable but blank. Give it one topic so the tab
opens to something. `src/data/topics/spring/vocabulary.js`:

```js
export default {
  id: "spring-vocabulary",           // unique across the WHOLE app, not just this course
  title: "Vocabulary",
  subtitle: "Spring Boot key terms, flashcards",
  course: "spring",                  // ← must equal the id from Step 1
  showChart: false,                  // Big-O chart; only the C++ complexity topics want this
  cards: [
    {
      heading: "About this deck",
      body:
        "This topic is a flashcard-only study aid for Spring Boot vocabulary. Hit **Edit** above, then switch to the **Flashcards** tab to add terms.",
    },
  ],
  questions: [],
  flashcards: [],
};
```

Every topic file is a plain JavaScript module with a single default export.
`cards`, `questions`, and `flashcards` may be empty arrays, but all three keys
should be present. The full field-by-field reference — what `**bold**` does in a
card body, how `accept` works, what a `figure` is — is `docs/AUTHORING.md` §2–§6.
A flashcard-only placeholder like this one is deliberately the smallest legal
topic, and the deck can be filled in later from inside the app via Edit Mode.

---

## 5. Import the topic — `src/data/curriculum.js`

`curriculum.js` is the flat list of every topic in the app. Nothing renders
until a topic appears here. Two edits, both required:

**5a. Add the import**, at the bottom of the import block, in its own labelled
group, **with the `.js` extension**:

```js
// Spring Boot
import springVocabulary from "./topics/spring/vocabulary.js";
```

**5b. Add it to the `curriculum` array**, in the order you want topics listed,
separated from the previous course by a blank line:

```js
const curriculum = [
  // …cpp topics…

  // …discrete topics…
  discreteVocabulary,

  springVocabulary,          // ← new
];
```

Forgetting 5b is the single most common mistake: the file compiles fine and the
topic simply never appears.

---

## 6. Add the tab — `src/Shell.jsx`

**The bottom tab bar is hardcoded.** It is not generated from `COURSES`, so a
course with no entry here can never be opened. Two edits:

**6a. A render branch**, mapping tab id → course id:

```jsx
) : tab === "springboot" ? (
  <App key="springboot" course="spring" />
) : (
```

`key` forces React to rebuild the view when you switch tabs; `course` is what
filters the topic list down to this class. Use the tab id for `key` and the
course id for `course`.

**6b. A button** in the tab-bar array near the bottom of the file:

```js
[null, "Home"],
["c++", "C++"],
["cs3000", "Discrete"],
["springboot", "Spring Boot"],   // ← new
```

The first element is the tab id (must match 6a exactly), the second is the
label shown on the button.

---

## 7. Teach the content auditor your course's notation — `scripts/auditBank.js`

`npm run audit:bank` flags text that looks model-generated. Technical notation
that is normal for your subject would otherwise trip that check, so each course
declares an allowlist of expected terms. Add an entry keyed by your **course
id**:

```js
const ALLOWLIST = {
  cpp: [ /* … */ ],
  discrete: [ /* … */ ],
  spring: [
    "@springbootapplication", "@restcontroller", "@service", "@repository",
    "@autowired", "@component", "@bean", "@entity", "bean", "pom.xml",
    "maven", "gradle", "jpa", "http", "rest", "json",
  ],
};
```

Lowercase entries. Grow the list as you add real content — this is a starting
set, not a fixed one.

---

## 8. Verify

```bash
npx vite build     # catches syntax errors and bad import paths
npm run db:seed    # loads the new course + topics into the SQLite database
```

`db:seed` prints a summary line. The course count should have gone up by one and
the topic count by however many topics you added:

```
Seeded 3 courses · 28 topics · 255 cards · 316 questions · 83 flashcards · 291 items
```

Then look at it in a browser. Edit Mode saves go over `/api` to the Express
process, so **both** commands are needed, in two terminals:

```bash
npm run dev          # terminal 1 — the UI
npm run dev:server   # terminal 2 — the API + database
```

Open the app, click the new tab, and confirm the topic list shows your
placeholder.

A clean build and a clean seed prove the *structure* is right. They say nothing
about whether the content is *correct* — only human review establishes that.

---

## 9. Troubleshooting

| Symptom | Cause |
| --- | --- |
| New tab does nothing / stays blank | Tab id in the render branch (6a) doesn't match the button (6b), or `course=` doesn't match the `id` in `courses.js`. |
| Tab opens but shows no topics | Topic's `course` field doesn't match the course id, or the topic was imported but never added to the `curriculum` array (5b). |
| `Failed to resolve import` on build | Import path is wrong, or the `.js` extension is missing. |
| Topic missing after seeding | You edited files but didn't re-run `npm run db:seed`. |
| Weird/duplicated progress data | Two topics share an `id`. Topic ids must be unique across the whole app, not just within a course. |

---

## 10. Checklist

- [ ] `src/data/courses.js` — entry added to `COURSES`
- [ ] `src/data/topics/<course-id>/` — folder created
- [ ] `sources/<course-id>/` — folder created
- [ ] At least one topic file, default export, `course` matching the course id, unique `id`
- [ ] `src/data/curriculum.js` — imported **and** added to the array
- [ ] `src/Shell.jsx` — render branch **and** tab button
- [ ] `scripts/auditBank.js` — `ALLOWLIST` entry
- [ ] `npx vite build` clean
- [ ] `npm run db:seed` clean, counts went up
- [ ] Tab visible and clickable in the running app
