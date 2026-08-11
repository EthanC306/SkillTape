# Changelog

## 
## [v.v.v] - YYYY-MM-DD
### Type - Added, Fixed, etc,
### Target
- 
- 

## 
## [1.0.21] - 2026-08-11
### Type - Added
### Item bank
- 55 new items across recursion and multidim arrays.
- Every new question paired: multiple choice plus written.
- Recursion gained 27 items; multidim arrays gained 16.
- Trees, stacks, queues, iterators each gained a pair.
### Type - Changed
### Verification
- 93 questions now marked verified by a human.
- Format mix rebalanced; MCQ share raised to 25%.
- Dead 5% MCQ cap scrubbed from docs and comments.
### Exam
- Exam length and timer moved into named constants.


## 
## [1.0.20] - 2026-08-10
### Type - Added
### Question verification
- Verification UI across all questions in the entire codebase.
- `npm run verify` serves unverified questions as reviewable cards.
- Check mark writes `verifiedByHuman: true` into the seed file.
- X flags a question to `data/needs-fixing.json` with a reason.
- Filter by topic, course, or items versus legacy questions.
- Keyboard review: J or right verifies, F or left flags.
- Every legacy question now carries an explicit `verifiedByHuman: false`.
- 18 new linked-list items: recall, write, trace, error, cloze.
### Type - Fixed
### Tests
- Due-rule fixture no longer fails when run after 18:00.
- Format tests compare against `NO_VALUE` instead of a hardcoded dash.


## 
## [1.0.19] - 2026-08-10
### Type - Added
### Learn and Flashcards
- Card `art` field: monospace diagrams that don't widen the card.
- Newsreader display serif for card titles and flashcard fronts.
- Fonts self-hosted, so Electron and Docker render identically offline.
- README screenshots of landing, topics, learn, quiz, sandbox.
### Type - Fixed
### Learn and Flashcards
- Bold spans inherit their font instead of forcing sans.

## 
## [1.0.18] - 2026-08-10
### Type - Fixed
### Trees
- Slide 7 gives two conflicting tree heights; both now documented.
- Slide 12's `remove` does not compile; card explains why.
- Slide 15's preorder traversal bug called out on the card.
- Full binary tree corrected: neither deck example qualifies.
- Degenerate-tree diagram shared by card and item, preventing drift.
### Learn
- Narrow windows no longer overflow when a card spans two.

## 
## [1.0.17] - 2026-08-10
### Type - Added
### Trees
- New Trees topic: 21 cards, 15 questions, 15 flashcards.
- 40 Trees items generated from one shared item factory.

## 
## [1.0.16] - 2026-08-10
### Type - Added
### Scheduling (FSRS)
- Home shows a due / learning / new strip.
- One-click "Start review" straight from that strip.
- Each topic card shows its own due count.
- "Review ahead" pulls the next-soonest items forward when nothing's due.
- Drill grade buttons show the interval each rating produces.
- MCQ items suggest a grade you can override.
- Keys 1-4 grade a Drill item; Enter takes the suggestion.
- "How scheduling works": an interactive sandbox, nothing saved.
- Settings: desired retention, daily new limit, max interval, fuzz.
- Changing retention re-derives due dates without touching stability.
- Settings: toggles for the due strip and scheduler inspector.
### Type - Fixed
### Scheduling (FSRS)
- Rescheduling a card and logging the review are one transaction.
- Double-clicking a grade button no longer counts as two reviews.
- Review log records the card state the scheduler actually saw.
- Parameter version recorded too, so history can be replayed.
- Learning-step position persists instead of restarting at step 0.

## 
## [1.0.15] - 2026-08-10
### Type - Fixed
### MCQ Quiz and Masterset
- Every question now has a permanent id (stable_id) and a revision number. 
  Attempts record both, so an attempt stays tied to its question even when you edit the question later.
- Seeding no longer wipes questions and rebuilds them. 
  It updates in place and only deletes questions you actually removed from the curriculum.


## 
## [1.0.14] - 2026-08-10
### Type - Fixed
### Fill Mode
- Inline code spans are no longer turned into blanks.
- `int *ptr` no longer swallows a sentence into emphasis.
### Content
- Swept the discrete card base and templates for errors.
- Removed the stale version string from the home subtitle.

## 
## [1.0.13] - 2026-08-09
### Type - Fixed
### MCQ Quiz
- Correct answer was the longest choice in 58%.
- Trimmed answers and gave distractors matching specificity, bank-wide.
- Audit now warns on choice-length bias per topic.

## 
## [1.0.12] - 2026-08-09
### Type - Added
### Item bank
- WRITE items for every code segment in the stacks, queues, iterators, doubly linked list and templates decks
- Doubly linked list: outputForward, outputBackward, length, clear, copy, search, List destructor
- Stacks: array pop/peek, linked-list constructor/push/pop/peek
- Queues: class declaration, constructor, pop, peek
- Iterators: one item per operator — *, ->, prefix ++, postfix ++, ==, != — plus the ConstIterator constructor
- Templates: write the Pair template class
- sources/: the doubly linked list algorithm slides and the ConstIterator constructor, which were missing from the original ingest
### Practice / Exam
- Max 3 WRITE items per mixed session (applyWriteCap, itemSchema.js) — uncapped when WRITE is the only format selected
- Practice setup screen says when the cap applies and how to drill WRITE on its own

## 
## [1.0.11] - 2026-08-09
### Type - Fixed
### General
- Removed a duplicate quiz question

## 
## [1.0.10] - 2026-08-09
### Type - Added
### General
- Icons and linked list content

## 
## [1.0.9] - 2026-08-09
### Type - Added
### General
- Added recursion


## 
## [1.0.8] - 2026-08-09
### Added
### Practice Mode
- Remove correct cards from deck
- Override LLM grade

## [1.0.7] - 2026-08-09
### Fixed
### General
- LLM not working in app

## 
## [1.0.6] - 2026-08-08
### Type - Fixed
### Practice grading
- Grading failures now name the cause, not "unavailable".
- Ollama's own error text is surfaced on the card.
- Server-unreachable and model-missing no longer read the same.
- Tests pinning every failure reason to distinct wording.

## 
## [1.0.5] - 2026-08-08
### Type - Added
### Desktop app
- Electron starts a local Ollama server when one isn't running.
- Grading works offline in the packaged app.
- `docs/OLLAMA_GRADING.md` documents the setup.
### Type - Fixed
### Desktop app
- Trimmed dead auto-update config from the builder file.

## 
## [1.0.4] - 2026-08-07
### Type - Added
### General
- Course tabs renamed: C++ capitalized, CS3000 becomes Discrete.
### Type - Changed
### Auto update
- Test release, published to confirm the 1.0.3 cache fix.

## 
## [1.0.3] - 2026-08-07
### Type - Fixed
### Auto update
- Installing an update left a blank window on launch.
- Cached `index.html` pointed at asset filenames the update deleted.
- `index.html` now sent `no-store`; hashed assets cached forever.
- Electron clears its cache at launch, recovering already-broken installs.

## 
## [1.0.2] - 2026-08-07
### Type - Added
### Auto update
- In-app update banner: download progress, then restart to install.
- `npm run release:win` publishes a GitHub release apps see.

## 
## [1.0.1] - 2026-08-06
### Type - Added
### Auto update
- electron-updater checks GitHub releases and installs on quit.
- Update checks skipped in dev, where the app isn't packaged.
### Audit
- Audit script falls back to legacy `questions` when `items` absent.
- Topics with no questions are now reported, not skipped.

## 
## [1.0.0] - 2026-08-06
### Type - Added
### Practice Mode
- LLM-based grading of free-text answers via local Ollama.
- Practice mode: pick topics, formats, and session length.
- Ollama settings hook, plus `docs/OLLAMA_GRADING.md`.
### Desktop app
- App icons and the electron-builder packaging config.
### Item bank
- New decks: derived classes, queues, multidimensional arrays.
- Tests for fill, blank editing, criteria grading, FSRS.
