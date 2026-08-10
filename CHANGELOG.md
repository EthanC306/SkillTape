# Changelog

## 
## [v.v.v] - YYYY-MM-DD
### Type - Added, Fixed, etc,
### Target
- 
- 

## 
## [1.0.16] - 2026-08-10
### Type - Added
### Scheduling (FSRS)
- Home shows what's actually due: a `N due · N learning · N new` strip with a one-click
  "Start review", and a due count on each topic card. Nothing due gets a "Review ahead"
  that pulls the next-soonest items forward.
- Drill's four grade buttons now show the interval each one produces (`10m`, `3d`, `2mo`,
  `1.4y`). The number under the button is the interval you get for pressing it.
- MCQ items auto-grade as before, but the derived rating is shown as a suggestion on the
  same bar and can be overridden. Keys 1-4 grade; Enter takes the suggestion.
- "How scheduling works" — an interactive sandbox. Grade a scratch card, push the clock,
  drag desired retention, and watch stability, difficulty and the forgetting curve move.
  Nothing in it is saved.
- Settings: desired retention (0.70-0.97), daily new-item limit, maximum interval, and
  interval fuzz. Changing retention re-derives due dates from existing stability without
  touching it, and asks first when that would move a lot of cards.
- Settings: toggles for the home due strip (off restores the previous home screen exactly)
  and a scheduler inspector row under each Drill item.
### Type - Fixed
### Scheduling (FSRS)
- Rescheduling a card and logging the review are now one transaction. They were two loose
  statements, so a crash between them left a card rescheduled with no log row.
- Double-clicking a grade button no longer counts as two reviews. The second one derived
  its interval from the state the first had just advanced to.
- The review log now records the card state the scheduler actually saw — stability,
  difficulty, state, elapsed days — plus the parameter version. Without those the history
  can't be replayed, which is the whole reason to keep it.
- Learning-step position is persisted, so a card in `learning` no longer restarts at step 0
  on every review.

## 
## [1.0.15] - 2026-08-10
### Type - Fixed
### MCQ Quiz and Masterset
- Every question now has a permanent id (stable_id) and a revision number. 
  Attempts record both, so an attempt stays tied to its question even when you edit the question later.
- Seeding no longer wipes questions and rebuilds them. 
  It updates in place and only deletes questions you actually removed from the curriculum.


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


## [1.0.4] - 2026-07-30
### Added
### General
- LLM-based grading
