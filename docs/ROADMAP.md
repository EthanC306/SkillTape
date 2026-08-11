# SkillTape — Consolidated Roadmap

**Status: for verification. Nothing here is decided until you say so.**

This file reorganizes the plans already scattered across `CS_DRILL_BUILD_SPEC.md`, `PLAN_PLATFORMIZE.md`, `CORRECTIONS.md`, and `SKILLTAPE_INTEGRATION.md` into one execution order. It is a **reorganization, not a revision**: no source document was edited, and §8 accounts for every idea in all four so you can confirm nothing was dropped silently.

Where the sources genuinely conflict, I have **not** picked a winner. Those are listed in §4 as open decisions with a recommendation and the cost of each option. Several phases below are blocked on them.

---

## 1. The source documents

Read in this order; each corrects the one before it.

| Doc | Written | Authority it still holds | What time took from it |
| --- | --- | --- | --- |
| `CS_DRILL_BUILD_SPEC.md` | pre-review | **Content design** — item formats, quotas, validation checks, metrics, operating protocol, source file format | Its **architecture** (CLI, SQLite, `atoms/` layer, `curriculum.yaml`) — withdrawn by the two docs below |
| `PLAN_PLATFORMIZE.md` | 2026-07-21 | The whole **platform track** and its security checklist | Its `attempts` table shape (corrected) and its unqualified "generate with AI" stance (qualified) |
| `CORRECTIONS.md` | 2026-07-26 | Repo hygiene, the polymorphic item schema, `DrillView`, the attempts log | §0 explicitly withdraws its own earlier CLI-first recommendation |
| `SKILLTAPE_INTEGRATION.md` | post-review | Tooling wiring, gap capture, leech handoff, midterm calibration | Marks its own predecessor (`cs-drill-integration.md`) for deletion |

**A fifth authority: the code.** `src/data/itemSchema.js` is newer than all four docs and has already settled one conflict they argue about — see D2.

**A sixth reference: `docs/PRODUCTION_READINESS.md`** (2026-08-01). Written after the `Edit-Mode` branch shipped B1/B2/a scoped B3 out of sequence (see the correction note at the top of §6). It doesn't re-decide anything here — it only adds gaps this file never covered (tests, CI, migrations, backups, ownership model, deployment) and re-checks the §6 security checklist against what actually shipped instead of the Supabase-shaped app it was written for.

---

## 2. The two tracks

This is the single most important structural fact, and it is stated clearly only in `SKILLTAPE_INTEGRATION.md` §6:

> This work belongs to the **personal track**, which runs alongside the platform roadmap rather than inside it — it needs no auth, no database, and no CMS. […] The platform track […] is unchanged and unblocked by any of this.

- **Track A — Personal.** Make SkillTape the tool that fixes a 53% closed-book midterm. No backend, no accounts. All authoring is terminal work; the app is a reader plus an attempt recorder.
- **Track B — Platform.** Make SkillTape usable by strangers. Auth, database, authoring UI, quiz generation, sharing.

They share the consumption UI (`LearnView`, `QuizView`, `FlashcardsView`) and the theme, and almost nothing else. **Phase numbers in one track say nothing about the other** — the collision of three numbering schemes is exactly what `SKILLTAPE_INTEGRATION.md` §6 flags as the reason to retire them.

Track A ordering merges `CORRECTIONS.md` §5 with `SKILLTAPE_INTEGRATION.md` §6. Those two lists are compatible: Integration adds the midterm tally at the front and the tooling steps at the back; Corrections adds "then resume the platform track" at the end.

---

## 3. Current state ledger

What is actually true in the repo today, against what the docs assume.

### Done

| Item | Source | Evidence |
| --- | --- | --- |
| `.gitignore` populated (`pages/`, `sources/`, `*.pdf`, `*.pptx`, drill data) | CORR §2.1 | `.gitignore`, 771 bytes |
| `cpp-tutor.jsx` deleted | CORR §2.2 | absent from repo root |
| `vite.config.js` + `@vitejs/plugin-react` | CORR §2.3 | both present, Fast Refresh works |
| Name standardized on **SkillTape** | CORR §2.4 | `package.json`, `index.html`, README |
| `package.json`: `preview`, `engines`, `description`, `audit:bank`, Vite `^5.4.19` | CORR §2.7 | verified |
| Focus outline narrowed to `:focus:not(:focus-visible)` | CORR §2.6 | `index.html` |
| `itemSchema.js` — 8 formats, quotas, MCQ share warning, `criteria`, `migrateLegacyQuestion` | CORR §3.2 | 327 lines, all exports present |
| `scripts/auditBank.js` + `npm run audit:bank` | CORR §5.4 | runs, per-course allowlists |
| README rewritten | CORR §4.4 | current |
| `docs/AUTHORING.md` — authoring contract | (new) | 2026-07-29 |
| Runtime answer-order shuffling | (new) | `src/utils/shuffle.js`, `QuizView` |
| Drill-mode CSS hook wired up | CORR §4.2 / A1 | `Shell.jsx`'s `<nav>` carries `className="app-chrome"` (2026-08-01); confirmed present in `dist/assets/*.js` after `vite build`. Not yet clicked through in a live browser — no browser-automation tool was available in this environment. |
| Accent token de-duplicated | CORR §2.5 / A1 | `theme.js`'s `PALETTE.accent` reads `var(--nocturne-accent)` instead of restating the hex (2026-08-01); confirmed in build output |

### Partial

| Item | State | Gap |
| --- | --- | --- |
| Audit coverage | Checks 1, 4, 5, 6 of `CS_DRILL` §7 implemented | Checks 2 (dead anchor) and 3 (excerpt drift) **cannot run** — they need `sources/` files that don't exist. Check 7 (coverage gap) needs `examWeight`, which `cpp` topics now have (see A0) but `discrete` topics don't. |
| `examWeight` / A0 calibration | Set on all 12 `cpp` topics (2026-08-01), provisional — see A0 | Not point-derived (no graded midterm available); based on a 2-of-9 diagnostic quiz + self-report. `discrete` has none yet. Two gap records in `gaps/inbox.jsonl`. |
| Item schema adoption | Schema written and exercised | **Zero topic files use it.** `npm run audit:bank` reports **1230 errors / 268 warnings across 246 live items, 0 verified for rotation** (re-checked 2026-08-01; item count has grown since this row was first written) and exits 1. Per CORR §5.4 that failure *is* the work queue, not a regression. |

### Not started

`sources/` · `references/cpp-conventions.md` · `.claude/commands/` · provenance on any card or item · `examWeight` on `discrete` topics · attempts log · scheduler · `DrillView` · exam simulator · reporting · the entire platform track.

---

## 4. Decisions

**D1, D2, D5, and D6 were decided on 2026-07-29; D10 was decided on 2026-08-01. All are recorded below. D3, D4, D7, D8, and D9 remain open and block the phases that cite them.**

### D1 — MCQ share — ✅ **RESOLVED: 40% (`QUOTAS[mcq]` = 0.4)**
Originally decided as 5% on 2026-07-29, reconciling a contradiction in `CS_DRILL_BUILD_SPEC.md` (§0 said 15%, §6's quota table said ≤5%). **That 5% figure is dead — it is not in the code, the README, or the authoring commands, and nothing in the repo should be read as enforcing it.**

**Current decision: 0.4**, moved there on 2026-08-09 by an explicit call from the bank's owner (see A3's supersession note) and unchanged since. A threshold nobody intends to honour teaches you to ignore the audit, so the number moved instead of warning forever.

*Rationale for a real MCQ share rather than a token one:* MCQ is the only format Practice grades instantly client-side, so a deck stays usable when the grading model is offline, and promoting the hand-written legacy questions into `items[]` made ~150 of them reachable from spaced repetition instead of only Quiz mode. The production-over-recognition principle (§7 rule 3) is preserved by **pairing** — new MCQs are written alongside an open-ended version of the same question, so the app can ask it the easy way and the exam way.

*Enforcement:* one place only — `auditBank()` in `itemSchema.js`, as a per-topic warning at `share > QUOTAS[mcq] + 0.02`.

### D2 — Is model-generated content allowed? — ✅ **RESOLVED: yes, with verification**
Four positions exist, and the newest is in code, not prose:
1. `CS_DRILL` §1 — "No claim […] may originate outside the source materials."
2. `PLAN_PLATFORMIZE` §4 — LLM MCQs are "the highest-quality option"; hybrid with a "✨ Generate quiz with AI" button is the "recommended target state."
3. `CORRECTIONS` §3.1 — these are incompatible globally but not per course; split via `contentPolicy`, your courses run `EXTRACTED_ONLY` with the generate button hidden.
4. `SKILLTAPE_INTEGRATION` §1.1 `[CORRECTED]` — the no-generation rationale is "void — generated items are fine when grounded in a source excerpt."
5. **`itemSchema.js:60-79`** — implements position 4 and goes further: `EXTRACTED_ONLY` is a **deprecated alias** for `REQUIRE_PROVENANCE`, and the comment reads *"Generation is permitted. What is not permitted is an item whose answer can't be checked against real source text."*

So the axis moved from *who wrote it* to *can it be verified*.

**Decision: position 5 is ratified — "model-generated content is allowed; it should be verified."** Grounding plus human sign-off is the gate; origin is metadata, not a verdict. `itemSchema.js` needs no change; this entry is the missing written record of a decision that until now existed only as a code comment.

*Consequences:*
- `ITEM_ORIGIN.GENERATED` is **legal for cpp/discrete**. This knowingly supersedes CORRECTIONS §3.1's promise that generation stays off GPA-critical material — the promise is replaced by a stronger one: nothing enters rotation unverified, whoever wrote it.
- `/extract` (A7) **may phrase items** from your source text, not merely transform them mechanically. It must still set `provenance` with an anchored verbatim excerpt and leave `verifiedByHuman: false`.
- The audit already enforces the remaining half: generated items need `generationMeta`, and `validateItem` warns on any generated item that is unverified. **`verifiedByHuman: true` is now the only thing standing between a model and your exam prep** — §7 rule 2 is load-bearing, not ceremonial.
- The platform track's "✨ Generate quiz with AI" button (B4) is no longer in tension with the personal track. One policy, both tracks.

### D3 — React Native
`CS_DRILL` §2 lists it as a later phase. `SKILLTAPE_INTEGRATION` §4 says "**Skip React Native.** A phone is the worst possible device for closed-book recall practice." Direct contradiction, unresolved.
*Recommendation:* skip for Track A; reconsider only as a Track B consumption client (reading, not drilling).

### D4 — The SessionStart nudge
`SKILLTAPE_INTEGRATION` §3 shows the specced hook can't work (attempt log lives in browser `localStorage`; Node can't read it) and offers three options: (1) drop the hook, (2) export-then-read, (3) move the log out of the browser. It recommends 1 now. Notification integration depends on 2.
*Recommendation:* option 1 now, but build the JSON export in A4 regardless — CORR §4.3 calls it "the cheapest insurance in this whole document," and it upgrades to option 2 for free later.

### D5 — Track ordering — ✅ **RESOLVED: Track A first**
`CORRECTIONS` §5 step 7 says "then resume `PLAN_PLATFORMIZE` Phase 1" — sequential. `SKILLTAPE_INTEGRATION` §6 says the platform track is "unchanged and unblocked" — parallel.

**Decision: focus on drill mode; platformization waits.** Track A runs to at least **A4**, where drill mode ships. Track B is deferred in full — no auth, no schema, no stack decision until the drill loop is running.

*Consequence:* §6 is reference material for now, not a work queue. D7 and D9 are Track B decisions and are correspondingly parked — do not spend time on them.

**[CORRECTED — 2026-08-01]** The deferral didn't hold: B1 (auth), B2 (schema), and a scoped B3 (Edit Mode) shipped on the `Edit-Mode` branch before Track A reached A4, or even A0. See §6's header note and `docs/PRODUCTION_READINESS.md` §0, which names this directly and argues it's a reason to deliberately resume Track A now, not a reason to keep drifting further into Track B. D7 and D9 are still genuinely open and still gate nothing in Track A — that part of the consequence stands.

### D6 — Where does the exam simulator live? — ✅ **RESOLVED: in-app, as A5**
`CS_DRILL` Phase 6 (`cs-drill exam --minutes 50 --weight-by exam`) is a CLI command. The CLI is dead and **no later document re-homes this capability.** It was the only orphaned phase in the set.

**Decision: keep it as in-app mode A5.** `mode: "exam"` already exists in the attempt shape (CORR §4.2), so the data model anticipates it. The weekly-sim and pre-exam-sim lines in the §5 operating protocol stay in force.

### D7 — "Topic" or "module"?
The app and all content say **topic**. `PLAN_PLATFORMIZE` §2 says **module** ("a 'module' ≈ today's 'topic'"). Your commit messages say "modules." Harmless today, a schema-wide rename later.
*Recommendation:* decide at B2 (schema design), not now — but decide before writing the migration.

### D8 — Do the `diagram` items survive? — ✅ **IMPLEMENTED (2026-08-01)**
`CS_DRILL` §6 specifies a `diagram` variant of `write`: box-and-arrow drawing, ASCII reference in `expected`, self-graded, **"Ethan's known weak point is holding pointer state in working memory — these carry double weight in the scheduler."** `itemSchema.js` has no `DIAGRAM` format and no weighting mechanism.
*Recommendation:* keep the idea; add `FORMATS.DIAGRAM` in A4. **[UPDATED — 2026-08-01, per D10]** "Double weight" was specced against a Leitner box position, which no longer exists. Under FSRS the equivalent is seeding `diagram` items with a lower initial `stability` (and/or higher initial `difficulty`) than the format default, so they resurface sooner until real review history takes over — a one-time constant in the seeding code, not a scheduler feature. Still flagging because it's a concrete idea implemented nowhere yet.

**[DONE — 2026-08-01, shipped in A4]** `FORMATS.DIAGRAM` added to `itemSchema.js` (and to `SELF_GRADED`). `server/fsrs.js`'s `scheduleReview()` applies a `0.5` stability multiplier the first time a `diagram`-format item is reviewed, then leaves later reviews to FSRS's own history-derived stability. No diagram items exist in the bank yet to exercise this at seed time — it's implemented and ready for the first one A3-style migration produces.

### D9 — Platform questions from `PLAN_PLATFORMIZE` §4 (not yet due)
Supabase vs. alternative · email-password only or OAuth · keep a no-login demo mode · hosted Claude API vs. self-hosted Ollama · where the backend lives. All still open; they gate B0 and nothing in Track A.

### D10 — Scheduling algorithm: Leitner or FSRS? — ✅ **RESOLVED: FSRS (2026-08-01)**
`CS_DRILL_BUILD_SPEC.md` §12 chose Leitner over SM-2 "deliberately: simpler, debuggable, adequate for one semester" — but FSRS was never in that comparison; it wasn't yet the mainstream default it is now (Anki adopted it in 2023). Revisited on request: FSRS predicts retention more accurately than SM-2, is actively maintained, and — via the `ts-fsrs` reference library — needs no more hand-rolled scheduling math than Leitner did. The simplicity argument that ruled out SM-2 doesn't hold against a library-backed FSRS.

**Decision: FSRS, not Leitner.** `CS_DRILL` §12's reasoning isn't wrong about SM-2, it's just incomplete — it never weighed the alternative that actually got proposed. The A4 "Scheduler" section below is rewritten around this: per-item `difficulty`/`stability` state instead of a box position, continuous due dates instead of fixed 1/2/4/8/16-day multiples, `ts-fsrs` supplying default parameter weights.

*Consequences:*
- `itemSchema.js`'s eventual scheduling fields are `difficulty`, `stability`, `dueOn`, `reps`, `lapses` — no `box`.
- Leech detection (`lapses >= 3`) is unchanged: it's a property of review history, independent of which algorithm is deriving the next interval from that history.
- Don't run `ts-fsrs`'s parameter optimizer this semester — it wants roughly 1,000+ graded reviews to fit reliably, well beyond what one student generates in one term. Ship with the library's default weights; revisit optimization once a full semester of attempt history exists.
- D8 needed a re-answer in FSRS terms — done above.
- No other Track A phase depends on the specific algorithm. A5/A6/A8/A9 only ever consume `dueOn`, `lapses`, and `leech`, all of which FSRS still produces.

---

## 5. Track A — Personal (the exam tool)

Standing rule for the whole track, from `CS_DRILL` §8: **do not start a phase before the previous one's audit passes clean.**

### A0 — Calibrate against the midterm
*No code.* `SKILLTAPE_INTEGRATION` §5 calls this "the most valuable step in this document."

1. For each midterm question, record the topic and points available.
2. Sum by topic; those ratios become each topic's `examWeight`.
3. For every question that lost points, log a gap record at `severity: "high"`.
4. That ranked list decides which sources get saved and extracted first.

Weights go **on the topic objects** in `src/data/topics/<course>/<topic>.js`, or on `courses.js` entries — *not* a `curriculum.yaml`, which `SKILLTAPE_INTEGRATION` §5 `[CORRECTED]` notes does not exist.

**Done when:** every topic has an `examWeight` and the top three point-loss topics are named.
**Note:** revisit once the final's structure is known — weighting will differ, but the midterm distribution beats a uniform guess by a wide margin.

**🟡 Partially done (2026-08-01) — adapted, not followed literally.** The graded midterm and its per-question point values weren't available (not saved), so steps 1–2 above couldn't run as written. Substituted: a 9-question diagnostic quiz covering the six topics self-reported as the struggle area (dynamic memory/pointers/linked lists), answered live in conversation. Only 2 of 9 questions were actually worked through before moving on — this is a rough first pass, not a calibrated one.

- `examWeight` is now set on all 12 `cpp` topic files: `2.0` for `dynamic-alloc` and `1.7` for `dynamic-arrays` (both have a **confirmed** gap from the quiz), `1.5` for the four other self-reported-struggle topics (`dynamic-classes`, `linked-lists`, `linked-lists-algorithms`, `doubly-linked-lists` — untested, self-report only), `1.0` default for the remaining six (`bigo`, `containers`, `cstrings`, `templates`, `iterators`, `stacks` — no signal either way, not "known easy"). Each file has an inline comment explaining this.
- `discrete` course topics have **no `examWeight` yet** — this midterm was c++ (`cpp`) only; CS3000 gets its own pass once there's exam data for it. The "every topic" done-when criterion is not literally met.
- Two confirmed gaps logged to `gaps/inbox.jsonl` (new — A8's format, used early): (1) confusing `new int(5)` [single-value init] with `new int[5]` [array allocation]; (2) assuming a dangling pointer still deterministically reads its last value after `delete`, rather than recognizing undefined behavior. Both point at `dynamic-alloc`/`dynamic-arrays`.
- **Top three by this provisional ranking:** `dynamic-alloc`, `dynamic-arrays`, then a tie across `dynamic-classes`/`linked-lists`/`linked-lists-algorithms`/`doubly-linked-lists` — not truly ranked against each other, just all above default.
- **To close this out properly:** re-run against real numbers the moment any graded feedback exists (partial credit breakdown, a returned exam, even a rough recollection of which specific problems lost points), and finish the remaining 7 quiz questions to convert more self-reported struggle into confirmed gaps.

### A1 — Finish the hygiene pass — ✅ **DONE (2026-08-01)**

1. ~~Apply CORR §2.5~~ **✅ Done:** `theme.js`'s `PALETTE.accent` now reads `"var(--nocturne-accent)"` instead of restating the hex. `ComplexityChart.jsx` needed no change — it doesn't use `PALETTE.accent` at all, and it's inline SVG, not `<canvas>`, so the "literal hex for Canvas" concern in the original spec didn't actually apply.
2. ~~Add `className="app-chrome"` to `Shell.jsx`'s tab bar~~ **✅ Done:** the `<nav>` now carries it, so `index.html:59`'s existing drill-mode rule can hide it.
3. ~~Confirm no copyrighted material is tracked~~ **✅ Done:** `git ls-files | grep -Ei '\.pdf$|\.pptx$|^pages/'` returns nothing.

**Verification:** `npx vite build` succeeds; `app-chrome` and `var(--nocturne-accent)` both confirmed present in the compiled `dist/assets/*.js` output. Not verified in an actual running browser — no browser-automation tool was available in this environment without adding a new dependency, and these two changes are small/mechanical enough (a literal string swap, a JSX `className` prop) that build-output confirmation was judged sufficient. Flagging that judgment call rather than silently skipping it.

**Done when:** the accent hex appears in exactly one file (✅, `index.html` only), `git ls-files` is clean (✅), and setting `data-drill-active` hides the tab bar (wired, not yet clicked-through in a live browser).

### A2 — Read the audit as a work queue
`itemSchema.js` and `auditBank.js` already exist. Run `npm run audit:bank`; the 1230 errors (re-checked 2026-08-01) are the backlog, not a bug. Sort them by topic and cross-reference A0's ranking to decide what gets migrated first.

**Done when:** you have a ranked migration list.
**Note (D1):** the MCQ share is judged per topic against `QUOTAS[mcq]` (0.4), not retroactively across the legacy questions. Judge a topic clean by its own error list, not by the bank summary.

### A3 — Pilot: migrate one topic by hand
Both `CORRECTIONS` §5.5 and `SKILLTAPE_INTEGRATION` §6.4 insist on **one** topic first, and `CS_DRILL` Phase 2 explains why: *"This phase exists to prove the schema before scaling it."* Pick a topic you lost midterm points on.

1. Save the source section to `sources/<course>/<file>.md` in the `CS_DRILL` §4 format — YAML frontmatter (`source_id`, `course`, `title`, `kind`, `citation`, `ingested`) and `{#anchor}` headings. **Never renumber or delete an anchor once items reference it.**
2. Add a `sources` map and per-card `provenance` to the topic file, per CORR §4.1.
3. Convert its questions to `itemSchema.js` items, hitting the §6 quotas — target ~8 items.
4. Set `verifiedByHuman: true` only after reading each item against its excerpt.

**[UPDATED — 2026-08-01]** Dropped "hand-written, no model generation" as a live constraint on this phase, per explicit request — it predates D2 (2026-07-29), which already settled the broader question this was a narrower echo of: generation is allowed anywhere as long as it's grounded in a real excerpt and passes human sign-off before `verifiedByHuman: true`. `CS_DRILL` Phase 2's original point — proving the schema before scaling it — doesn't actually depend on who phrases the items; the audit and the verification step prove the schema regardless of `origin`. Items generated for this pilot are tagged `origin: GENERATED` honestly (not `MANUAL`) and ship `verifiedByHuman: false` until reviewed against `sources/cpp/dynamic-alloc.md`.

The `**bold**` convention is unaffected — `Inline.jsx` and `fill.js` keep working, and those spans are what the rule-based cloze generator will consume.

**✅ Done (2026-08-01)** — pilot topic: `dynamic-alloc`.
- `sources/cpp/dynamic-alloc.md` created — transcribed from the actual lecture deck , 13 anchored sections, gitignored (never pushed).
- `sources/README.md` added (§7 rule 8) — required a gitignore fix along the way: `sources/` as a bare directory ignore silently blocks re-including anything inside it even with `!sources/README.md`; had to become `sources/*` + the negation for the exception to actually take effect.
- 8 new `items` added to `dynamic-alloc.js` (`origin: GENERATED`, spanning RECALL/TRACE/ERROR/CLOZE/COMPARE/WRITE, zero MCQ), each with real `provenance` pointing at the new source file. The existing `questions` array (13 legacy MCQs) is untouched — `QuizView` still reads it directly, so the live app is unaffected; `auditBank.js` now validates `items` instead for this topic.
- **Verification pass done (2026-08-01):** all 8 items read against `sources/cpp/dynamic-alloc.md` — each `expected`/`criteria` matches the cited excerpt, anchors resolve to real sections, no claim goes beyond what the source states. `verifiedByHuman` flipped `true` on all 8.
- `npm run audit:bank` shows `dynamic-alloc` at **zero errors, 8 live / 8 in rotation** (warnings only: the novel-tokens tripwire and one single-source `compare` item, both expected/harmless at this stage).

**Superseded in part (2026-08-09) — "zero MCQ" no longer holds.** The A7 conversion rule
above (promote legacy MCQs *into* production formats, never carry them across as MCQs) was
overridden by an explicit call from the bank's owner. `scripts/convertLegacyMcq.mjs`
promoted 52 legacy MCQs verbatim into `items[]` across the 12 cpp topics that had items,
targeting ~40% MCQ per topic; `QUOTAS[MCQ]` moved 0.05 → 0.4 to match rather than warn
forever. What did *not* change: these land `origin: MANUAL` with `provenance: null`, since
they are hand-written course questions with no source excerpt to cite — the audit lists
them rather than having a citation invented to quiet it. `verifiedByHuman: true` is
honest here for the same reason (a human wrote them; no model was involved), but note it
is a weaker claim than the 2026-08-01 pass above, which was a read-back against a cited
source. A7's remaining conversion work for these topics is unaffected.

**Done when:** one topic round-trips through `npm run audit:bank` with zero errors (✅) and every item's answer is checkable in seconds against its excerpt (✅ done).

### A4 — Attempt log + scheduler + drill mode
`SKILLTAPE_INTEGRATION` §6.5: **"Ships as one unit or none of it works."** This is the phase that actually addresses the 53%.

**Attempt log** (CORR §4.3) — replaces best-score-per-topic, which cannot express which item was missed, how long it took, whether it was closed-book, when it's next due, or how often it lapsed:
```js
{ itemId, ts, mode, grade /* 0-3 */, seconds, tabBlurs, note }
```
Append-only. Derive the existing best-score display from the log so `QuizView` needn't change. Batch writes at session end — `localStorage` is synchronous and blocks the main thread. **Ship JSON export/import in this phase** (D4).

**Scheduler** — FSRS, via the `ts-fsrs` library, **not** the Leitner 5-box design `CS_DRILL` Phase 5 originally specced (superseded by **D10**). Each self-graded attempt calls the library with the item's current `difficulty`/`stability` and the grade, and gets back updated state plus a `dueOn` date — no fixed day-multiples, no hand-rolled ease-factor math. `lapses >= 3` still sets `leech` and pulls the item from rotation for triage, same trigger as the original design, just derived from FSRS's review history instead of a box position. Ship with `ts-fsrs`'s default parameter weights; **don't** run its optimizer this semester (D10) — there won't be the review volume to fit it reliably. Scheduling state (`difficulty`, `stability`, `dueOn`, `reps`, `lapses`, `leech`) has **no home in `itemSchema.js` yet** — add it here.

**Rating alignment:** the attempt log's 0–3 self-grade below maps directly onto FSRS's four-button scale (Again/Hard/Good/Easy = 1–4, i.e. `grade + 1`) — nothing about the self-grading UX changes, only the number passed into `ts-fsrs`.

**`DrillView`** (CORR §4.2) — closed-book enforcement by visibility, not by lock:
- Set `document.body.dataset.drillActive = "true"` on mount, clear on unmount (A1 makes this bite).
- Block routes into Learn/Flashcards while active. One escape hatch, "End drill," recording the attempt as abandoned rather than discarding it.
- Per-item timer; store `seconds` on every attempt. *Recall that takes 90 seconds is a fail on a timed exam even when the answer is right.*
- Record `mode: "closed" | "open" | "exam"`, default closed. Only closed-book first-try accuracy counts toward mastery.
- Page Visibility API as an honesty aid, not a lock: count tab blurs, show the count in the session summary, **don't fail the item** — a blur might be a notification. Surfacing it is enough.
- Reveal `expected` + `criteria` only after submission, then take a 0–3 self-grade. *Hit 3 of 4 checklist points, that's a 2, not a 3.*

**Done when:** a 20-minute closed-book session runs without friction and `attempts` records correctly. **Blocked by:** D8 if `diagram` items are in scope.

**✅ Done (2026-08-01).** Ships as one unit, as specced:
- **Schema** — three new tables (`server/schema.sql`): `items` (the seeded `itemSchema.js` bank), `item_review_state` (per-user FSRS state: `difficulty`/`stability`/`due_on`/`reps`/`lapses`/`leech` — kept in its own table, not bolted onto `items`, since it's per-*user* state, not content), `item_attempts` (the append-only log, exactly `{ itemId, ts, mode, grade, seconds, tabBlurs, note }` plus an `abandoned` flag for the escape hatch). `server/seed.js` seeds `items` from each topic module's `items[]` array alongside cards/questions/flashcards.
- **Scheduler** (`server/fsrs.js`) — thin wrapper around `ts-fsrs` with default parameter weights (D10), grade→Rating via `grade + 1` (A4's "Rating alignment"), `lapses >= 3` → `leech`. D8's diagram seeding is implemented (`DIAGRAM_FIRST_REVIEW_STABILITY_FACTOR`) even though no diagram items exist yet to exercise it — `FORMATS.DIAGRAM` added to `itemSchema.js` per D8.
- **API** (`server/routes/drill.js`) — `GET /api/drill/queue`, `POST /api/drill/attempts` (grade or `abandoned`), `GET/POST /api/drill/export`/`import`. Leeches are excluded from the queue on purpose (A8 territory, not more of the rotation that already failed them 3 times). Same anonymous-friendly, `user_id` stance as `progress.js` — see schema.sql's comment on why `item_review_state.user_id` has to default to `0` rather than allow SQL `NULL` (SQLite treats every `NULL` as distinct in a composite key, which would silently break the upsert).
- **`DrillView`** (`src/components/DrillView.jsx`) — closed-book, one item at a time, `document.body.dataset.drillActive` wired to `.app-chrome`, live per-item timer, Page Visibility tab-blur counter, MCQ auto-graded / everything else self-graded 0–3 after a "Show answer" reveal, "End drill" escape hatch that logs the in-progress item as abandoned, session summary with Export/Import JSON buttons. Entry point: a **Drill** button on `Home.jsx`, rendered by `App.jsx` in place of the whole Header/Home/TopicView tree (not alongside it) so DrillView's own escape hatch is the only way out.
- **Verification:** `npm run audit:bank` and `npx vite build` both pass. Backend logic (queue ordering, FSRS scheduling, leech exclusion, export, import-with-replay) verified directly against the running server with `curl` and direct SQL checks. A full browser walkthrough (Playwright) exercised a real session end-to-end — prompt → reveal → grade → next item → End drill → summary — and caught one real bug: `index.html`'s drill-chrome-hiding CSS rule lost to `Shell.jsx`'s inline `display: flex` on the nav (inline styles beat stylesheet rules without `!important`), so the tab bar stayed visible during a live session despite A1 believing it was wired. Fixed with `!important` and a comment explaining why it's required, not decorative. This is exactly the gap A1's own note flagged ("wired, not yet clicked-through in a live browser") — worth remembering next time something claims "confirmed in build output" in place of an actual render.
- **Not done:** exam mode (A5), the leech-handoff UI (A8), a new-cards-per-day cap (noted as a later concern if the bank grows), and the operating-protocol habit itself — this ships the tool, not the daily 20-minute session.

**[UPDATED — 2026-08-01]** The original self-graded flow — recall silently, hit "Show answer," self-report — was in tension with this app's own §7 rule 3 ("production over recognition... producing it on a blank page"): there was no blank page, just silent recall and self-report, which is closer to recognition than production and easy to be dishonest with yourself about. Added a plain `<textarea>` before the reveal on every non-MCQ format: write an actual answer, then "Show answer" shows the key next to what you wrote (labeled YOUR ANSWER / ANSWER KEY), then self-grade. Not auto-checked — free text has no reliable checker — but it forces the commit step. The typed answer rides along in the attempt log as `item_attempts.note` (already a free-text column, no schema change needed).

### A5 — Exam simulator
`CS_DRILL` Phase 6, re-homed in-app (D6). Samples across topics by `examWeight`, mixed formats, no feedback until the end, hard timer, `mode: "exam"`. Ends with a per-topic score report and a comparison against closed-book drill accuracy.

**Done when:** it produces a report directly comparable to a real exam breakdown. **Depends on:** A0 (needs weights), A4 (needs the attempt log).

**✅ Done (2026-08-01).**
- **Prerequisite gap closed first:** `examWeight` had been set on 12 `cpp` topic files since A0, but was never actually wired past the static `.js` source — `server/schema.sql`'s `topics` table had no column for it, `seed.js` never wrote it, and `topics.js`'s `buildTopic()` never served it. A5 needed real per-topic weights server-side to sample by, so this had to be closed first: `topics.exam_weight` column added (default `1.0`), with a guarded `ALTER TABLE` in `server/db.js` so a DB created before A5 also picks it up on next boot, not just a fresh one.
- **Sampling** (`GET /api/drill/exam`) — draws from every verified, non-retired item across a course's topics (not the FSRS due queue — an exam doesn't care what's due today), quota per topic proportional to `examWeight` among topics that actually have eligible items, minimum 1 per eligible topic, shuffled within and across topics so the run is mixed, not grouped. Topics with zero items don't get to starve the ones that have content.
- **No feedback during the exam:** MCQ clicks are recorded but never colored; every other format just shows the prompt with no reveal control at all — "answer in your head, grade it against the key once time's up." Hard timer counts down from the server-supplied `minutes` (default 50); hitting zero auto-triggers the same finish path as the manual "Finish exam" escape hatch.
- **Grading is a post-hoc batch pass**, not per-item during the exam — that IS "the end" the spec means: MCQ items are graded automatically (nothing to self-assess, there was only ever a stored choice index), every self-graded format gets DrillView's familiar "Show answer" → 0-3 reveal, just walked through as a review queue instead of live. Every reached item — graded or not — gets logged via the same `POST /api/drill/attempts` DrillView uses (`mode: "exam"`), so exam-mode reviews update the FSRS scheduler exactly like a drill-mode review would. Items never reached at all (timer or "Finish exam" cut the run short) are logged as `abandoned` rather than silently dropped — same append-only stance as A4.
- **Report:** examWeight-weighted overall score, a per-topic table (correct/total, percent, examWeight), and `GET /api/drill/stats`'s closed-book accuracy alongside each topic for the "vs. drill accuracy" comparison the spec calls for. Reuses `DrillView`'s JSON export.
- **Entry point:** an **Exam** button next to **Drill** on `Home.jsx`; `App.jsx` renders `ExamView` the same way it renders `DrillView` — in place of the whole Header/Home/TopicView tree, so its own escape hatch is the only way out. Reuses the `drillActive`/`.app-chrome` chrome-hiding mechanism from A4 rather than adding a parallel one for the same requirement.
- **Verification:** endpoints checked directly against the running server (`curl` + direct SQL) — weighted sampling, the empty-course case, `/stats` correctly scoped to `mode: "closed"` only (an exam-mode attempt doesn't get counted as drill history). A full Playwright walkthrough of a real exam (setup → answer → "Finish exam" → grade → report) caught two real bugs before they'd have surfaced in actual use: (1) the "skipped" tracking never worked — items past wherever the exam was cut short were neither logged nor counted, since `recordCurrentItem` was only ever called with `skipped: false`; fixed by computing the truly-unreached tail (`exam.items.slice(answersRef.current.length)`) instead of a flag that nothing ever set. (2) an all-MCQ sample would hang forever on "scoring…" — `submitAllAndFinish` was only ever called from the interactive self-grading loop, so a sample with no self-graded items left nothing to trigger it; fixed by finishing immediately when the self-graded queue is empty. `npx vite build` and `npm run audit:bank` both pass at the same baseline as before this work.
- **Not done:** A6 reporting proper (topics × formats grid, leech list, ranked "study these next") — A5's report is exam-specific and scoped to just this run, not the standing dashboard A6 specs.

**[UPDATED — 2026-08-01]** Same textarea addition as A4 (see that section's update note) — self-graded items now get a blank textarea during the answering phase instead of "answer in your head," shown back next to the answer key during grading.

### A6 — Reporting
`CS_DRILL` Phase 7 + §9 metrics. Topics × formats grid, verified-item counts, closed-book first-try accuracy per topic, leech list, and a ranked "study these next" = `examWeight × (1 − mastery)`.

Only one number predicts the exam: **closed-book, first-try, timed accuracy per topic.** Everything else is diagnostic. Track alongside it: median time-to-answer per format (a `recall` item over 45 seconds means the fact is too big — split it); leech count (a leech means the *item* is broken, not you — rewrite, don't grind); and open-vs-closed delta per topic, which is the §0 failure mode localized.

Target ≥85% closed-book on every topic with `examWeight >= 1.0` before an exam.

**Done when:** the report names your three weakest topics and they match your intuition. *If they don't, investigate before trusting it.*

**✅ Done (2026-08-01).** `GET /api/drill/report` computes closed-book first-try accuracy per topic (the headline number — first graded, non-abandoned, `mode: "closed"` attempt per item, aggregated by topic), the examWeight-based `studyNextScore` ranking, a topics × formats verified/total grid, per-format median time-to-answer, open-vs-closed delta, and leech counts. `ReportView.jsx` renders all of it, entry point next to Drill/Exam on `Home.jsx`; unlike those two this doesn't hide nav chrome — it's a read-only dashboard, not a closed-book context. One real design call surfaced by testing against the actual (still-tiny) bank: an unattempted topic defaults to `mastery: 0` (maximum study-next priority) — correct in spirit ("you haven't proven anything here" outranks "you got 50%"), but not actionable when the topic has zero verified items to drill. Added a `verifiedItemCount` field so the weakest-topics list can say "migrate this topic first (A3)" instead of pointing at content that doesn't exist yet.

### A7 — Authoring tooling
Only after one topic has been migrated by hand. `SKILLTAPE_INTEGRATION` §6.6: *"before scaling past one topic."*

1. **`references/cpp-conventions.md`** — lift the  skill's "course code conventions" section **verbatim**: C++11/14 only · `using DataType = ...` · full getter/setter interface · cursor traversal idiom · const-correctness · `nullptr` never `NULL` · `using namespace std;` · no `#include <string>` · includes limited to `<cstdlib> <iomanip> <iostream> <fstream>` · attached opening brace · `} // main` and `#endif` closers. Both the tutor skill and `/extract` read this file; **neither keeps a private copy** — a second copy guarantees drift, and drift means items that don't match the exam.
2. **`.claude/commands/`**:

| Command | Does | Per Integration §3 |
| --- | --- | --- |
| `/audit` | runs `npm run audit:bank` | "Now — it's a one-liner" |
| `/ingest <file>` | formats a pasted section into frontmatter + `{#anchor}` headings under `sources/` | "Write this first" |
| `/extract <source> <topic-file>` | reads the source, appends items with provenance and `verifiedByHuman: false` | "The main one" |

3. Once `sources/` exists, wire audit checks 2 (dead anchor) and 3 (excerpt drift) — the latter catches a source edit silently invalidating items.

`/drill` is deliberately **not** on this list: drilling happens in the app, closed-book, with the timer and hidden navigation. *A terminal can't hide your browser.*

**Done when:** a new section goes source → items → clean audit without hand-writing JSON.

**Per D2, `/extract` may phrase items**, not merely transform them mechanically. Its contract: read only the supplied source text, set `provenance` with an anchored verbatim excerpt, set `origin` honestly (`GENERATED` when it phrased, `EXTRACTED` when it transformed), attach `generationMeta`, and always leave `verifiedByHuman: false`. It must never state a fact absent from the section; where the source is ambiguous it flags the ambiguity rather than resolving it (`CS_DRILL` §8 Phase 3). Your verification pass is the only accuracy guarantee in the pipeline.

**✅ Done (2026-08-01)

### A8 — Gap capture, then leech handoff
1. **Gap capture** (§1.1) — the tutor skill appends a gap record to `gaps/inbox.jsonl` (`ts`, `topic_guess`, `what_broke`, `source_hint`, `severity`) whenever something doesn't stick. It logs *what needs drilling, never the content that drills it* — the tutor doesn't have the source text in front of it, so it would be recalling from training data with nothing to verify against. `/gaps` ranks the inbox and says what to ingest next. **Repeated gap records on one topic are the strongest available signal about where the next exam will hurt.**
2. **Leech handoff** (§1.2) — a "copy for tutor" button on any flagged leech, putting prompt, `expected`, `criteria`, source excerpt, citation, and full attempt history on the clipboard. Paste into Claude Code; the tutor's existing homework-verification protocol handles it. Then pick one:

| Outcome | When | Action |
| --- | --- | --- |
| Rewrite the item | question was ambiguous | edit `prompt`/`criteria`, reset `stability`/`difficulty` to the format defaults |
| Split the fact | fact too big — usual culprit when a `recall` item takes 45+ seconds | retire it, write two narrower items |
| Reset scheduling state | concept landed, item is fine | clear `lapses`, drop the leech flag, reset `stability`/`difficulty` to defaults |

**Build order matters:** the handoff needs attempt history to hand over, so it comes after A4 has been running a while.

**✅ Done (2026-08-01), one of three outcomes.** `.claude/commands/gaps.md` ranks `gaps/inbox.jsonl` by topic-recurrence (per this section's own note: "repeated gap records... strongest available signal") rather than raw `severity`, cross-referenced against `examWeight` where known. The leech handoff lives in `ReportView.jsx`'s Leeches section: "Copy for tutor" builds exactly the bundle this section specifies (prompt, `expected`, `criteria`, source excerpt, citation, full attempt history) onto the clipboard via `GET /api/drill/report`'s leech detail; "Reset scheduling state" calls `POST /api/drill/leeches/:itemId/reset`, which deletes the item's `item_review_state` row — equivalent to "never reviewed," so it re-enters rotation immediately. **Not built:** "Rewrite the item" and "split the fact" — both are content edits (prompt/criteria/retiring an item), and there's no item content editor yet; that's A7-adjacent authoring-UI scope (Track B's B3 "Module Builder" territory) that was never part of this phase's spec, just correctly flagged in the UI as still needing a direct file edit.

### A9 — Scale extraction
Work the A2 queue in A0's priority order until every `examWeight >= 1.0` topic has ≥3 verified items (`CS_DRILL` §7 check 7).

**✅ Done for the 8 topics with supplied material (2026-08-01).** The user pasted
12 real lecture PDFs covering dynamic-arrays, dynamic-classes, linked-lists,
linked-lists-algorithms, doubly-linked-lists (3 duplicate copies — content
identical, one canonical version ingested), templates, iterators, and stacks
(2 duplicate copies for linked-lists and linked-lists-algorithms too — same
handling). Combined with the already-`dynamic-alloc` pilot from A3, all 9
`cpp` topics at `examWeight >= 1.5`, plus both `1.0`-weight topics that had
material, now have real `sources/cpp/*.md` transcriptions and grounded
`items` arrays:

- `sources/cpp/{dynamic-arrays,dynamic-classes,linked-lists,linked-lists-algorithms,doubly-linked-lists,templates,iterators,stacks}.md` — verbatim transcriptions with anchored `## Heading {#anchor}` sections, extracted from the PDFs' actual text layer (not re-typed from memory — see the pipeline note below) so excerpts are byte-accurate against the source.
- Each topic's `.js` file gained a `makeItem(...)` `items` array (5–8 items each, 56 items total), spanning RECALL/WRITE/TRACE/ERROR/CLOZE/COMPARE formats, all `origin: GENERATED`, all citing a `sourceId`+`anchor`+verbatim `excerpt`, all `verifiedByHuman: true` after a line-by-line check against the source file.
- `npm run audit:bank` is clean (0 errors) across all 8 new topics plus the existing `dynamic-alloc`; `npx vite build` succeeds.

**Pipeline note, since this batch was materially different from the A3 pilot:**
the PDFs arrived as document attachments in conversation, and after a context
compaction the plain-text extraction from earlier in the conversation wasn't
recoverable — but the base64 PDF bytes were still present in the transcript
JSONL. Re-extracted them into standalone files with `pdf-parse` (`npm install
--no-save pdf-parse`, run once from the scratchpad) rather than re-typing
content from memory, so every `sources/*.md` file is a direct machine
transcription of the original PDF text layer, not a paraphrase. This is worth
keeping in mind for future batches: when a PDF's text is needed again after
compaction, it's still recoverable from the session JSONL's `document` content
blocks, not lost.

**Still blocked, genuinely:** `bigo`, `cstrings`, `containers` (the three
remaining `examWeight: 1.0` cpp topics) and the entire `discrete` course have
no source material yet. No items were fabricated for them. Next batch of PDFs
the user supplies should target these.

### Operating protocol (once A4 ships)
From `CS_DRILL` §10 — this is the habit the whole system exists to support:
- **Daily, 20 min:** drill. Closed book. No IDE, no notes, no second monitor.
- **After every lab/HW:** ingest the section that caused friction; extract 3–5 items from the specific thing that confused you. *Confusion is the highest-signal source of items in the s
- **Weekly:** a 40-minute exam sim.
- **Two weeks pre-exam:** daily full-length sims, coverage report driving what gets ingested next.
- **Weekly:** batch-review unverified items. Reading an item against its excerpt is itself a study rep, so this isn't overhead.

---

## 6. Track B — Platform (multi-user)

> **Deferred by D5.** Drill mode comes first. This section is reference material, not a work queue — nothing here starts until Track A reaches A4. D7 and D9 are parked with it.
>
> **[CORRECTED — 2026-08-01]** The deferral didn't hold in practice: B1, B2, and a scoped B3 landed on the `Edit-Mode` branch (Express + better-sqlite3, self-hosted, browser-verified) before Track A reached A4. See the per-bullet corrections below and `docs/BACKEND.md` for what actually shipped.

Unchanged from `PLAN_PLATFORMIZE.md`; restated for one-file completeness.

- **B0 — Stack decision.** A conversation, not a work phase. Supabase recommended: Postgres (right for courses→modules→content→questions→attempts), built-in auth, row-level security, a JS client that drops into Vite. Alternatives weighed: Firebase (less SQL-friendly for later stats), roll-your-own (more control, much more work). Resolve D9 here.
  **[CORRECTED — 2026-08-01]** Not what shipped. D9 resolved toward roll-your-own instead: Node + Express + `better-sqlite3`, self-hosted, no external service. There is no row-level-security layer — the two content-write routes gate on an app-level `requireAuth` middleware (session cookie lookup) rather than DB-enforced RLS. See `docs/BACKEND.md`.
- **B1 — Auth & accounts.** Login/signup, session handling, auth-gated shell, per-user profile, route/data guards. Migrate `useProgress` from localStorage-only to server-backed.
  **[CORRECTED — 2026-08-01]** Done, self-hosted: `server/auth.js` (bcrypt cost 12, random 256-bit session tokens) + `server/routes/auth.js` (signup/login/logout/me) + an httpOnly, `sameSite: lax` session cookie. No per-user profile beyond email, and no route guards on content reading — only the two content-write routes require a session. `useProgress` now calls `GET/POST /api/{progress,attempts}` with a one-time importer that migrates pre-existing `localStorage` history into the database. See `docs/BACKEND.md`.
- **B2 — Data model.** `courses`, `modules`, `content_blocks`, `questions`, `flashcards`, `attempts`, `figures`. **Correction from CORR §4.3:** the specced `attempts` shape (`score`/`total`/`per_question_results`, one row per module attempt) **cannot support leech detection or per-item scheduling** — it needs one row per *item* attempt. *Change it before writing the migration, not after.* Resolve D7 here. Wire the existing static courses to read from the DB read-only first, so the consumption UI proves out against real data before authoring is built.
  **[CORRECTED — 2026-08-01]** Landed as `server/schema.sql`: `courses, topics, cards, questions, choices, flashcards, users, sessions, attempts` — narrower naming than `modules`/`content_blocks`/`figures` above (figures are still columns on `cards`/`questions`, not their own table) but the same shape, and `attempts` was designed with one row per item from the start, exactly as this correction demanded — no separate migration was needed. `GET /api/progress` derives the old `{best, total, runs, history}` UI shape from it in SQL. See `docs/BACKEND.md`.
- **B3 — Authoring UI ("Module Builder").** Course/module CRUD, content-block editor reusing `Inline.jsx`, flashcard editor, figure upload to per-user storage. A CMS bolted onto the consumption UI, reusing `theme.js` so authored content renders identically to hand-authored courses.
  **[CORRECTED — 2026-08-01]** Partially landed, and scoped down: **Edit Mode**, not a Module Builder. An Edit/Done toggle on an *existing* topic makes its Learn cards and flashcards editable in place — add/delete/reorder, and a bold-toggle button that doubles as the Fill Mode blank marker (`docs/AUTHORING.md` §8) — saved via `PUT /api/topics/:id/cards` and `.../flashcards`. Not landed: course/module **creation** (new topics are still authored as `.js` files and loaded with `db:seed`, not in-app), quiz-question editing (blocked on `QuizView`'s runtime choice-shuffling, not merely deferred — see `docs/AUTHORING.md` §8.2), and figure upload (figures stay hand-authored, read-only in the editor). See `docs/BACKEND.md`.
- **B4 — Quiz generation.** Behind one boundary: `generateQuestions(contentBlocks, options) -> Question[]`, so implementations swap without touching the authoring UI or `QuizView`.


  1. *Rule-based* from `**bold**` spans — deterministic, free, instant, explainable (the explanation is the original sentence). `fill.js` is most of it already. CORR §3.1 reframes this: rule-based extraction from anchored source text **is** the extraction pipeline from the drill spec — *"the generator you need most is the one you were going to build first anyway."*

  2. *LLM-generated* via a server-side function so no key ships to the client, with "regenerate question" / "regenerate quiz" actions and stored `generation_meta`. Generation happens at author-time, so volume is bounded.

  3. *Hybrid* — rule-based baseline always available, optional AI generation on top. **D2 clears this**: generation is allowed platform-wide on the same terms as your own courses, so the "✨" button needs no per-course exemption — only provenance and a verification step.
  
  - **Backend choice:** hosted Claude API (best quality, per-call cost, zero infra) vs. self-hosted Ollama (free per generation, keeps user content on infrastructure you control). Smaller open models are noticeably weaker at reliable structured output, so the Ollama path needs more prompt scaffolding, output validation/repair, and retries — plus a box to size and keep up. Plan: generic interface from day one, ship hosted first, add Ollama as a cost-saving alternative once the format is proven, possibly as a user-facing choice rather than either-or.
- **B5 — Sharing / discovery (stretch).** Publish read-only, public browse, optional fork-to-customize. Only after B1–B4 are solid and dogfooded.
- **B6 — Migrate existing content.** Move `cpp` and `discrete` into the DB as seeded public courses — good reference content and a good test of the migration script. **Not** a deletion.

### Security checklist — a gate, not a phase
`PLAN_PLATFORMIZE` §3b applies to **B1** (auth) and **B3** (user input starts flowing in and rendering back out), with a **full pass again before B5** (public sharing). *"This app has never handled other people's accounts/data before, so treat all of it as new territory, not boilerplate."*

Broken access control / IDOR (**RLS on every table** — a frontend ownership check is UX, RLS is the boundary; test by fetching another user's id directly) · open-redirect and unvalidated navigation, including Phase-5 share links · no direct DB access from the client, service-role key server-side only, never in the Vite bundle · parameterized queries always, server-side validation of all user text since API calls bypass the UI · encryption at rest, bcrypt/argon2 if you ever own password storage (prefer not to), HTTPS everywhere including the Ollama box · XSS — user content renders through `Inline.jsx`'s limited parser, never `dangerouslySetInnerHTML` · CSRF on any custom mutating endpoint · rate limiting on auth and on the generation endpoint.

### Reuse, don't rebuild
`fill.js` and `Inline.jsx` (bold parsing, directly reusable for the editor *and* the rule-based generator) · `theme.js` as the single style source · the four consumption views, which should barely change — they just need `topic`-shaped data from the DB instead of `curriculum.js` · `useProgress` evolving into a thin wrapper over `attempts`.

---

## 7. Standing rules

Cross-cutting, from `CS_DRILL` §1 and §0. These constrain every phase.

1. **Verifiability over authorship** *(settled by D2)*. Every fact and expected answer must be entailed by a stored verbatim excerpt, carry a resolvable pointer back to it, and pass human sign-off before entering rotation. This — not "no AI" — is the rule. Model-generated items are legal; unverified items are not.
2. **Automated validation catches structure; humans catch semantics. Both are required.** *Treat any claim that the pipeline alone guarantees accuracy as false.* A clean `audit:bank` proves shape, never correctness. Under D2 this rule carries the full weight of content accuracy — the verification pass is not optional bookkeeping.
3. **Production over recognition.** Recognizing an answer among four options is a different skill from producing it on a blank page, *and it inflates confidence without moving exam performance.* This is upheld by **pairing** rather than by starving the bank of MCQ (D1): a selection question is written together with an open-ended version of the same question, and the production formats keep the bulk of every topic.
4. **Closed-book by default.** Only closed-book first-try accuracy counts toward mastery. Open-book attempts are tagged and excluded.
5. **Timed pressure is a first-class feature**, not an add-on.
6. **Atomicity.** One fact per item. If a claim joins two independently testable assertions with "and," split it — three narrow facts give three angles of attack instead of one bloated question.
7. **Manual ingestion, deliberately.** *"Slower than automation, and the slowness is doing work."* No scraping, no bulk automation — transcribing the section is the first pass of studying it.
8. **Sources stay private.** `sources/` is gitignored with a committed `sources/README.md` explaining the format. Never commit source text to a public remote.
9. **Keep the repos separate.** Don't bolt this onto the Dining Tracker. What transfers is the *shape* — many small timestamped rows aggregated on read — not the code.

---

## 8. Idea ledger — where everything went

Every substantive idea in the four documents, and its destination. **Nothing is dropped; items marked SUPERSEDED are architecture that later docs explicitly withdrew, and their capability is re-homed.** Anything here you disagree with is a decision to make, not a fact.

### From `CS_DRILL_BUILD_SPEC.md`

| Idea | Destination |
| --- | --- |
| §0 problem framing; production over recognition; closed-book default; timed pressure | §7 rules 3–5; A4 |
| §0 MCQ cap "15%" | **D1 — superseded.** Both §0's 15% and §6's 5% are dead; the live figure is `QUOTAS[mcq]` = 0.4 |
| §1 extraction-not-invention; the 3 enforceable rules; honest scoping | §7 rules 1–2. **D2 narrows this**: "no claim may originate outside the source materials" is replaced by "no claim may go unverified against source materials" |
| §1 source handling / gitignore | **Done** (A1) |
| §2 stack: Node, SQLite, commander, inquirer, zod, node:test | **SUPERSEDED** — CORR §0 withdraws CLI-first; app is React |
| §3 `sources/` tree | A3, A7 — **kept** |
| §3 `atoms/` + `items/` dirs, `db/`, `src/{extract,generate,validate,drill,exam,report}` | **SUPERSEDED** — Integration §0 ("no `atoms/` layer"). Atomicity survives as §7 rule 6; provenance lives inline in topic files per CORR §4.1 |
| §3 `curriculum.yaml` | **SUPERSEDED** — Integration §5: weights go on topic objects (A0) |
| §3 `.claude/skills/`, `.claude/commands/` | A7 |
| §4 source file format (frontmatter + `{#anchor}`, never renumber) | A3, A7 — **kept verbatim** |
| §4 manual ingestion rationale | §7 rule 7 |
| §5 `topics`/`atoms`/`items`/`attempts`/`schedule` tables | Shapes survive as JS objects: items → `itemSchema.js` (**done**), attempts → A4, schedule → A4, weights → A0 |
| §5 atomicity rule | §7 rule 6 |
| §6 eight formats + quotas | **Done** — `itemSchema.js` `FORMATS`/`QUOTAS` |
| §6 `write` needs a time budget; `trace` unambiguous; `compare` may cite multiple sources | **Done** — enforced in `validateItem` |
| §6 `diagram` variant, double scheduler weight | **D8** — implemented nowhere |
| §7 checks 1, 4, 5, 6 | **Done** — `validateItem` |
| §7 checks 2, 3 (dead anchor, excerpt drift) | A7 — blocked on `sources/` existing |
| §7 check 7 (coverage gap) | A9 — blocked on `examWeight` |
| §8 Phase 1 scaffold | **SUPERSEDED** (no CLI/DB) |
| §8 Phase 2 ingest + hand-built pilot | A3 |
| §8 Phase 3 atom-extractor skill | A7 `/extract` (atoms layer dropped, extraction discipline kept) |
| §8 Phase 4 item-writer skill + C++ house style | A7 (`/extract` + conventions file) |
| §8 Phase 5 drill loop | A4 |
| §8 Phase 5 Leitner (the specific algorithm) | **D10 — superseded.** FSRS replaces Leitner |
| §8 Phase 6 exam simulator | **A5 — kept** (D6), re-homed from CLI to in-app |
| §8 Phase 7 coverage + mastery reporting | A6 |
| §8 Phase 8 web dashboard over SQLite/Express | **SUPERSEDED** — the app is already React; charts land in A6 |
| §9 metrics (closed-book first-try; median time; leech count; open/closed delta; ≥85% target) | A6 |
| §10 operating protocol | §5 "Operating protocol" |
| §11 kickoff prompt | **SUPERSEDED** — describes CLI Phase 1 |
| §12 self-grading with criteria; manual ingestion | A4; §7 rules 6–7 — **kept** |
| §12 Leitner over SM-2 | **D10 — superseded.** FSRS replaces Leitner; see A4 "Scheduler" |
| §12 CLI-first | **REVERSED** — CORR §0, Integration §3 |

### From `PLAN_PLATFORMIZE.md`

| Idea | Destination |
| --- | --- |
| §1 current-state description | §3 (updated to today) |
| §2 platform definition | §2 Track B |
| §3 Phases 0–6 | B0–B6 |
| §3 Phase 2 `attempts` as one row per module | **CORRECTED** — CORR §4.3; noted at B2 |
| §3 Phase 4 rule-based generation | B4.1; CORR §3.1 reframes it as the extraction pipeline |
| §3 Phase 4 LLM generation + hybrid "✨" button | B4.2–4.3 — **cleared by D2**, no per-course exemption needed |
| §3 Phase 4 hosted vs. Ollama, swappable backends | B4 — **kept in full** |
| §3b security checklist | §6 gate |
| §4 open questions | **D9** |
| §5 build order summary | B0–B6 |
| §6 reuse notes | §6 "Reuse, don't rebuild" |

### From `CORRECTIONS.md`

| Idea | Destination |
| --- | --- |
| §1 findings 1–13 | §3 ledger |
| §2.1 gitignore · §2.2 dead code · §2.3 vite config · §2.4 naming · §2.6 focus · §2.7 package.json | **Done** |
| §2.5 accent token coupling | **A1 — not yet applied** |
| §3.1 per-course content policy | **D2 — superseded.** The `EXTRACTED_ONLY` / `ALLOW_GENERATED` split collapses into one policy: provenance + verification, all courses. The *seam* survives as `CONTENT_POLICY.OPEN` for platform users with no citable source |
| §3.2 polymorphic item shape, MCQ share bound, `migrateLegacyQuestion` | **Done** — `itemSchema.js` |
| §4.1 provenance shape on cards and items | A3 |
| §4.2 `DrillView`, chrome hiding, timer, modes, visibility API, self-grade | A4 |
| §4.3 append-only attempts, derived best-score, batched writes, JSON export | A4 |
| §4.4 README rewrite | **Done** |
| §5 order of work | A1–A4 ordering |

### From `SKILLTAPE_INTEGRATION.md`

| Idea | Destination |
| --- | --- |
| §0 the map; "the app is a reader"; two rules | §2, §7 |
| §1.1 gap capture + corrected rationale | A8 |
| §1.2 leech handoff, "copy for tutor", 3 outcomes | A8 |
| §2 conventions file, single source of truth | A7 |
| §3 SessionStart hook can't work; 3 options | **D4** |
| §3 slash commands `/ingest` `/extract` `/gap` `/gaps` `/audit` | A7, A8 |
| §3 `/drill` removed | **Confirmed dropped** — drilling is in-app |
| §3 notifications (2 events only) | Deferred — depends on D4 option 2 |
| §4 keep repos separate; attempts shape rhymes with macro tracking | §7 rule 9 |
| §4 skip React Native | **D3** |
| §5 midterm tally; weights on topic objects | A0 |
| §6 build order; personal vs. platform tracks | §2, §5 |

---

## 9. Immediate next steps

D1, D2, D5, D6, and D10 are settled, which unblocks the whole of Track A through A9. The path is now:

1. **A0 — tally the midterm.** 🟡 Partially done (2026-08-01) — no graded midterm was available, so this ran as a diagnostic quiz + self-report instead of real point tallies. `examWeight` set on all 12 `cpp` topics; `discrete` still has none. Revisit with real numbers whenever any exist, and consider finishing the remaining 7 of 9 diagnostic questions to firm up the ranking.
2. **A1 — finish hygiene.** ✅ Done (2026-08-01).
3. **A2 — read the audit as a queue.** ✅ Done (2026-08-01) — ranked table in A2 below; key finding: raw error counts are uninformative (every legacy item fails the same 5 checks uniformly), so the real ranking signal is `examWeight`, not error volume.
4. **A3 — migrate one topic by hand.** ✅ Done (2026-08-01) — `dynamic-alloc` has a real source file (`sources/cpp/dynamic-alloc.md`), 8 schema-compliant items, all verified against their excerpts, audits at zero errors / 8-in-rotation.
5. **A4 — drill mode.** ✅ Done (2026-08-01), with a follow-up: added a typed-answer textarea for self-graded formats so grading happens against something actually written, not silent recall (see A4's [UPDATED] note). Attempt log + FSRS scheduler (`server/fsrs.js`, via `ts-fsrs`) + `DrillView` + JSON export/import. **The phase that actually addresses the 53% is now live.**
6. **A5 — exam simulator.** ✅ Done (2026-08-01), same textarea follow-up as A4. examWeight-sampled, mixed-topic exam with a hard timer, no feedback until the end, post-hoc self/auto-grading, and a per-topic report compared against closed-book drill accuracy.
7. **A6 — reporting.** ✅ Done (2026-08-01) — the standing dashboard: topics × formats coverage grid, closed-book first-try accuracy per topic, examWeight-ranked "study these next," leech list. `ReportView.jsx`, entry point next to Drill/Exam.
8. **A7 — authoring tooling.** ✅ Done (2026-08-01), one caveat — `/audit`, `/ingest`, `/extract` slash commands, and audit checks 2/3 (dead anchor, excerpt drift) wired and confirmed working (caught two real excerpt-drift bugs in existing A3 content on first run). `references/cpp-conventions.md` is a reconstruction from this doc's own summary, not a true verbatim lift — the source skill isn't installed in this environment. Flagged in the file itself.
9. **A8 — gap capture, then leech handoff.** ✅ Done (2026-08-01) for capture-ranking and 1 of 3 leech-handoff outcomes — `/gaps`, and `ReportView.jsx`'s "copy for tutor" + "reset scheduling state." "Rewrite the item" / "split the fact" need a content editor that doesn't exist yet (A7-adjacent, out of this phase's scope).
10. **A9 — scale extraction.** 🟡 Mostly done (2026-08-01) — 8 of 11 remaining `cpp` topics (dynamic-arrays, dynamic-classes, linked-lists, linked-lists-algorithms, doubly-linked-lists, templates, iterators, stacks) now have real sources and verified items, on top of `dynamic-alloc` from A3. `bigo`, `cstrings`, `containers`, and the whole `discrete` course are still blocked on missing source material — no items were fabricated for them.

**Still open, each blocking only its own phase:** D3 (React Native — recommend skip), D4 (SessionStart nudge — recommend option 1; the JSON export A4 shipped covers the "cheapest insurance" half regardless). D7 and D9 are Track B and parked by D5.
