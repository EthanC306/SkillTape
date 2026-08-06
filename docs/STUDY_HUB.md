# SkillTape — Study Hub & Interface Overhaul

**Status: draft, for verification. Nothing here is decided until you say so.**

This is the next wave after `docs/ROADMAP.md`'s Track A (A0–A9), which is where the actual spaced-repetition engine got built. This doc doesn't touch that engine — it's a presentation-layer phase: give the engine a front door worth looking at, replace the one popup left in the app with real navigation, and stop the whole UI from reading as a stack of flat bordered boxes.

Numbered **A10** so it slots into the existing roadmap rather than starting a second numbering scheme — see `ROADMAP.md`'s Track A ordering.

---

## 0. The realization that motivates this doc

The thing you described — "Build a linked list can be on the docket and it never has to pile up, just keep spinning through, whatever day I go on to do the task is when I do it" — **already exists and is already built.** It's not a new feature; it's `GET /api/drill/queue` (`server/routes/drill.js:143`), FSRS via `ts-fsrs` (`server/fsrs.js`, ROADMAP D10), and `DrillView`'s Again/Hard/Good/Easy grading (`src/components/DrillView.jsx:197`, ROADMAP A4's "Rating alignment"). An item becomes due, you review it whenever you actually open Drill that day, you grade it honestly, FSRS pushes the next due date out — nothing ever "piles up" because the queue is always just "what's due right now," not a backlog you owe.

What doesn't exist is anywhere that **shows** you this is happening. `Home.jsx` is a flat grid of topic cards with a best-score bar; Drill is one button among three (`Drill` / `Exam` / `Report`) with no indication of whether anything is even due before you click it. The engine is invisible until you go looking for it. That's the actual gap this phase closes — a **Hub**: the landing screen that leads with "here's what's due, here's how much, one tap to start," and treats the topic list as secondary.

---

## 1. Scope

**In scope:**
- A Hub view that replaces `Home.jsx` as the per-course landing screen.
- A real page-stack navigation model, replacing the mix of ad hoc booleans in `App.jsx` and the one true popup (`HistoryModal.jsx`).
- A visual pass: elevation, depth, motion, and a shared set of UI primitives — applied first to the Hub, then backfilled to the rest of the app.

**Out of scope (explicitly not touched):**
- The scheduler itself. FSRS/`ts-fsrs`, grade semantics, leech detection — all settled (D10, A4, A8), none of it moves.
- Content authoring, the item bank, `examWeight` — Track A's A7/A9 territory.
- Auth, accounts, the platform track (Track B) — untouched, per ROADMAP §2.
- Mobile-native anything — this is still the responsive web app, not React Native (ROADMAP D3, still skip).

---

## 2. What the Hub shows

Replaces `Home.jsx`'s current top row (intro line + Drill/Exam/Report/Select buttons) and topic grid with three tiers, in this order:

### 2.1 The due-now hero
One large card, not a button in a row. Leads with a single number — how many items are due right now in this course — rendered big, the way `DrillView`'s session summary already renders its "items reviewed" count at 44px (`DrillView.jsx:247`). Tapping it starts Drill immediately; there's no intermediate confirmation screen, matching Drill's existing one-click entry.

Framing matters here: due items are not a backlog to feel behind on. Zero due is a *good* state ("nothing to review — come back later"), not an empty one. The copy and color should read as calm/informational (muted, accent-toned) rather than alarm (no red badge screaming a number at you), even when the count is large — that tone is what actually makes "just keep spinning through" sustainable instead of guilt-inducing.

### 2.2 Per-topic due breakdown
Below the hero, the same topic cards `Home.jsx` renders today, but each one gains a small due-count badge (0 shown as nothing, not "0"). This is what makes "Build a linked list can be on the docket" concrete and visible per-topic, not just as one undifferentiated global number.

### 2.3 Everything else
Topics with nothing due collapse into a lighter-weight section below — still reachable (for Learn/Quiz/Flashcards, which aren't schedule-gated), just visually de-emphasized so the due-now tier keeps the eye.

### 2.4 Backend gap this needs
Nothing today returns a cheap due-count. `GET /api/drill/queue` (`drill.js:143`) returns full item rows and is capped at `MAX_ITEMS` — usable for "is there anything due" but wasteful and wrong for "how many, per topic" at Hub-load time. Needs one new endpoint:

```
GET /api/drill/due-counts?course=cpp
→ { total: 7, byTopic: { "linked-lists": 3, "stacks": 4 } }
```

Same query shape as `/queue` (`drill.js:151`'s `WHERE ... rs.leech = 0 AND rs.due_on <= ?`), but a `GROUP BY items.topic_id` count instead of a row fetch — no `LIMIT`, no need to hydrate `prompt`/`expected`/`provenance` for a number the Hub is just going to count.

---

## 3. Navigation: the page-stack

### 3.1 What's wrong today
`App.jsx` currently tracks "what's on screen" as five independent pieces of state: `topicId`, `drilling`, `examining`, `reporting`, `masterTopic`, plus `historyTopicId` for the one thing that's a true modal (`HistoryModal.jsx` — `position: fixed`, dimmed backdrop, click-outside-to-close, `SHADOWS.lg` drop shadow). Drill/Exam/Report are already conceptually "push a full-screen page" (the code comments say so explicitly — `App.jsx:94-108`, "rendered in place of the whole Header/Home/TopicView tree, not alongside it") but each is wired as its own one-off boolean with its own escape hatch, not through a shared mechanism. History is the odd one out: it's the only overlay-style popup left, and it's exactly the pattern you said you don't want.

### 3.2 The model
A single stack of page descriptors, replacing all six pieces of state above:

```js
// [{ type: "home" }, { type: "topic", id }, { type: "drill" }, { type: "history", topicId }]
const [stack, setStack] = useState([{ type: "home" }]);
const push = (page) => setStack((s) => [...s, page]);
const pop = () => setStack((s) => (s.length > 1 ? s.slice(0, -1) : s));
const top = stack[stack.length - 1];
```

Each page is full-bleed — covers the entire content area, no dimmed backdrop, no click-outside dismissal. Going back means popping the stack, not closing an overlay. This is the "paper plate stack" model: each page sits fully on top of the one before it: opening a topic pushes it over Hub; opening History from inside a topic pushes it over that; Back always reveals exactly what was underneath, in order. `HistoryModal` becomes `HistoryView`, pushed instead of portal-rendered, and loses its backdrop/`SHADOWS.lg`-popup treatment entirely.

Drill/Exam already behave like closed contexts with a single escape hatch (ROADMAP A4/A5) — that stays. The stack model doesn't loosen that; it just means their "escape hatch" is `pop()` instead of a bespoke `onExit` boolean-setter, and the End Drill / Exit buttons already in `DrillShell` (`DrillView.jsx:474`) keep working unchanged.

### 3.3 Back should mean Back
Wire `pop()` to: an on-screen Back control (top-left of every pushed page, consistent placement — right now `DrillShell`'s exit button is top-right and `ReportView`'s is inline in a header row, two different places for the same idea), the Escape key, and real browser back via `history.pushState`/`popstate` so the hardware/mouse back button and swipe-back gesture both do the right thing instead of leaving the app or doing nothing. None of that exists today; App.jsx has no history integration at all.

### 3.4 Transition
Pushed pages slide in from the right and fade, ~200ms; popped pages reverse. Guard with `prefers-reduced-motion: reduce` (not currently referenced anywhere in `index.html` or any component — grepped, zero hits). This is presentation only; it does not change what's mounted or when data loads.

---

## 4. Visual pass: give it life

### 4.1 The concrete evidence for "flat, simple, boxes"
`theme.js` already defines a three-tier elevation system — `SHADOWS.sm/md/lg` (`theme.js:40-44`) — but it's used in exactly three places: `SettingsMenu.jsx`, `AuthBar.jsx`, and `HistoryModal.jsx`. All three are popups. Every actual content surface — `Home.jsx`'s topic cards, `DrillView`'s item panel, `ReportView`'s section tables — uses a flat `1px solid ${PALETTE.line}` border and nothing else. The elevation system exists; it was only ever wired up to the things about to get removed in §3. That's the single biggest lever here, and it's nearly free: apply `SHADOWS.sm` at rest and `SHADOWS.md` on hover/focus to every card-like surface, and the "flat boxes" feeling changes immediately without touching layout.

### 4.2 Shared primitives instead of per-file inline styles
Every view (`Home`, `DrillView`, `ReportView`, `TopicView`, ...) currently hand-rolls its own inline `style={{...}}` objects for buttons, cards, and section headers — `navBtn` is redefined nearly identically in `DrillView.jsx:186` and `ReportView.jsx:66`, card padding/radius/border is repeated in `Home.jsx:134-143` and throughout `DrillView`. Pull the recurring shapes into `src/components/ui/`:

- `<Card>` — panel background, border, radius, elevation (rest/hover), replacing the repeated inline object.
- `<Button variant="ghost"|"accent"|"danger">` — replaces `navBtn` and its accent/danger variants scattered across Drill/Report/Home.
- `<StatNumber>` — the big-numeral pattern DrillView's summary already established (`DrillView.jsx:247`), reused for the Hub's due-count hero instead of being re-invented.
- `<SectionHeader>` — replaces `ReportView.jsx`'s local `Section` component, generalized for reuse outside Report.

This isn't a rewrite of every view — it's extracting what already exists in three or four places into one, so the elevation/motion work in §4.1/§4.3 lands everywhere at once instead of needing a pass per file.

### 4.3 Motion and detail
- Hover/press states on cards and buttons: subtle lift (`translateY(-1px)` + `SHADOWS.md`) on hover, slight scale-down on press. None of this exists today outside the `width 0.3s` progress-bar transition in `Home.jsx:174`.
- Count-up animation on the Hub's due-number when it first mounts, rather than a static number appearing.
- Staggered fade/slide-in for the topic card grid on Hub load (each card offset a few ms from the last) instead of the whole grid appearing at once.
- All motion gated behind `prefers-reduced-motion` (§3.4).

### 4.4 Iconography
No icon set exists anywhere in the app today (checked: no `.svg` imports, no icon components, no emoji in UI copy per house style). The Hub's due-hero and per-topic badges will read as more "designed" with small inline-SVG glyphs (a clock/rotation mark for "due," a check for "clear") than with numbers alone — stroke-style, sized to sit inside the existing `MONO`/`HEADING` type system, matching accent color rather than a stock icon library's default palette.

---

## 5. Phased plan

1. **Primitives + elevation** (§4.1, §4.2). Pure extraction/polish, no behavior change, no new endpoints — lowest risk, and it's what every later phase builds on. Ship first so the Hub is built with `<Card>`/`<Button>`/`<StatNumber>` from day one instead of retrofitted.
2. **Page-stack navigation** (§3). Migrate `App.jsx`'s six state variables onto the `stack`, convert `HistoryModal` → `HistoryView`, wire Back/Escape/`popstate`. Verifiable independently of the Hub — the app should navigate identically to today (Home → Topic → Learn/Quiz, Drill/Exam/Report as full-screen), just through one mechanism instead of six.
3. **Due-counts endpoint + Hub** (§2). New `GET /api/drill/due-counts` route, then `Home.jsx` → `Hub.jsx` (topic grid becomes tier 2/3, due-hero becomes tier 1). This is the phase that actually delivers "see what needs to be hit again."
4. **Motion pass** (§4.3, §4.4). Layered on top once the structural pieces (1–3) are stable, since it's the highest-risk-of-bikeshedding, lowest-risk-technically piece.
5. **Stretch: backfill** — apply the same `<Card>`/`<Button>` primitives and page-stack pattern to `TopicView`/`QuizView`/`FlashcardsView` for a consistent feel app-wide, not just on the Hub. Not required for "the Hub looks great," but the app will look inconsistent (new Hub, old everything-else) until this happens.

---

## 6. Open decisions

### E1 — Does the Hub replace Home, or sit in front of it?
**Recommendation: replace.** `Home.jsx` becomes `Hub.jsx` directly; there's no value in an extra click through a "Home" screen before reaching the thing that already has the topic list on it. The Hub *is* the topic list, just reordered and re-headlined.

### E2 — Due count: per-course only, or cross-course awareness?
The app is strictly per-course today (`Shell.jsx`'s tab bar, `App.jsx`'s `course` prop) — a Hub for `cpp` has no way to know discrete has 5 items due without a second fetch. **Recommendation:** keep the Hub itself per-course (matches the existing architecture, no new cross-course state), but add a small due-count badge to `Shell.jsx`'s bottom tab bar itself (`Shell.jsx:20`) so switching courses isn't required just to notice the other course also has something due. Small addition, not a new screen.

### E3 — Icon set: inline SVG glyphs, or a library?
**Recommendation:** hand-drawn inline SVG, small set (due/clock, check, book, drill target — maybe 6-8 total), not a dependency like `lucide-react`. The app has zero icon dependencies today and the Nocturne palette/stroke weight is specific enough that a generic library would need per-icon overrides anyway; a handful of custom paths is less code than the dependency plus overrides.

### E4 — Does `TopicView`'s Learn/Quiz/Flashcards mode switcher also move onto the stack?
Today mode switching inside a topic (`mode` state in `App.jsx:73`) is a sibling toggle, not a navigation push — you don't "go back" from Quiz to Learn, you switch tabs. **Recommendation:** leave it as a toggle, not a stack push. Pushing every mode switch would make Back behave unpredictably (should Back from Quiz go to Learn, or to the Hub?) for something that's genuinely a tab, not a drill-down. Only true drill-downs (Hub → Topic, Topic → History, Hub → Drill/Exam/Report) belong on the stack.

---

## 7. Non-goals, stated plainly

- No scheduler changes. No new grading semantics. No new item formats.
- No new content. This phase ships zero new topic files.
- No auth/platform work.
- Not a mobile app — still the responsive web app in a browser (or the existing Electron wrapper).
