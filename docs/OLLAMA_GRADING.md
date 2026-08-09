# SkillTape — Auto-grading Drill mode with a local Ollama model

Written 2026-08-04, in response to: "would it be possible to get an ollama model to
grade drills?" This is a design proposal, not a build — nothing here is implemented.
Follows `docs/ROADMAP.md`'s own decision-record style (`Gn` below, same spirit as its
`Dn`), so it can be lifted into that file later if adopted.

**Verdict up front: yes, and it fits this app's architecture better than the hosted
Claude API would.** No blocker found. The open questions are about grading *quality*
on locally-sized models and about not quietly regressing a self-honesty design
decision this app already made once — not about whether it's buildable.

---

## 1. Why this is the right tool for this app specifically

`package.json` describes SkillTape as "Self-hosted, source-grounded study app," and
the last two commits (`Made installable with Electron`, `Windows Installer with
Wine`) are turning that into a literal installer someone else runs on their own
machine. `docs/ROADMAP.md` D9/§6 already had this exact hosted-vs-self-hosted
argument for **question generation** (B4) and picked "ship hosted first, add Ollama
as a cost-saving alternative" — but that was written for a *server you operate*,
where you hold the Anthropic key and eat the per-call cost. An Electron installer
has no server you operate. Whoever double-clicks the `.exe` is the only "operator,"
so:

- A hosted Claude API key baked into the installer is your key, paying for every
  install, forever — not viable for something you hand out.
- Asking each user to paste in their own Anthropic key is a real option but adds
  signup friction to a tool whose whole pitch is "downloads and just works," and
  reintroduces the "no API keys yet" gap `docs/PRODUCTION_READINESS.md` §2 already
  flagged as unaddressed.
- A local Ollama call has neither problem: free per-grade, works offline, no key to
  manage or leak, and it's already the same shape as every other server-side
  operation in this codebase — `server/index.js` runs as a plain forked Node process
  (`electron/main.cjs:93`), so an outbound `fetch("http://127.0.0.1:11434/...")` from
  a route handler is not architecturally different from any other server call here.

Confirmed in this environment: Ollama is already installed (`~/ollama/bin/ollama`,
v0.31.2) but not currently running, and there's an RTX 2070 Super with 8GB VRAM
available via `nvidia-smi`. That's a real, if mid-range, local-inference budget —
concrete enough to name actual models below instead of hand-waving "a small model."

---

## 2. What "grading" means today, precisely

`src/components/DrillView.jsx` has **no auto-grading at all** right now — everything
non-MCQ is graded by the human, by hand, every time:

1. Prompt shown, blank `<textarea>` for a real written answer (`DrillView.jsx:365`).
2. "Show answer" reveals `item.expected` + the `item.criteria` checklist
   side-by-side with what was typed (`DrillView.jsx:392-441`).
3. The user self-picks Again/Hard/Good/Easy (`DrillView.jsx:445-465`), with the
   on-screen reminder "Hit 3 of 4 checklist points? That's a 2, not a 3."

MCQ is the only format that's machine-graded today (`submitMcq`, `DrillView.jsx:143`
— correct maps straight to grade 2, incorrect to grade 0), and that grade drives
`server/fsrs.js`'s scheduling directly.

Worth reading before building anything: the `[UPDATED — 2026-08-01]` note at
`ROADMAP.md:250` is the *second* iteration of this exact screen. The first version
had no textarea at all — silent recall, then self-report — and it was deliberately
changed because that was "in tension with this app's own §7 rule 3 ('production over
recognition')... closer to recognition than production and easy to be dishonest with
yourself about." An LLM auto-grader that fully replaces the human's grade click is,
in effect, reverting part of that fix: it's still production (the textarea stays),
but the moment of "did I actually get this right" moves from the user to the model.
That's not a reason not to build it — it's the reason **G1** below recommends
suggest-and-confirm over auto-submit, so this addition doesn't quietly undo a
decision that was made for a specific, stated reason.

---

## 3. Why this doesn't collide with the "no unverified content" rule

Standing rule 1 (`ROADMAP.md:403`, "Verifiability over authorship") governs what's
allowed **into the item bank**: every fact and expected answer must trace back to a
stored source excerpt and pass human sign-off before it's eligible for rotation.
Auto-grading doesn't touch that boundary at all — the grader never writes `expected`
or `criteria`, never creates an item, and never marks anything `verifiedByHuman`. It
only judges, for one ephemeral attempt, whether text the *user* typed satisfies a
rubric a *human already verified* when the item was authored. If the model judges
wrong, the blast radius is one wrong FSRS grade on one attempt — recoverable, and no
worse than a human self-grading generously on a day they wanted to be done. That's a
fundamentally smaller risk than generation, which is why B4's hosted-vs-Ollama
argument doesn't need to be re-litigated here; this is a new, separate capability the
roadmap hasn't covered yet, not a rerun of D9.

---

## 4. Design decisions (Gn, mirroring `ROADMAP.md`'s Dn)

### G1 — Suggest-and-confirm, not auto-submit (recommended)
The grader pre-selects/highlights one of the four grade buttons and shows its
reasoning, but the user still clicks to submit. Keeps the human as the final say on
their own honesty (see §2), costs one click, and gives an escape hatch for every bad
grade a local 7-14B model produces — which, per §6, will happen.

### G2 — Judge criteria, not the final grade, and compute the mapping in code (recommended)
Don't ask the model for "grade 0-3" directly. Ask it for a boolean per criterion in
`item.criteria` (a much narrower, more reliable task than holistic scoring — small
models are noticeably better at "does this line's claim appear in this answer, yes
or no" than at "score this 0-3"). Then apply the *same rule the UI already states in
English* (`DrillView.jsx:442`, "3 of 4 = Good, not Easy") as deterministic code:
`met === total → 3, met >= ceil(total*0.75) → 2, met > 0 → 1, met === 0 → 0`, or
similar. This also means the grade the scheduler sees is always internally
consistent with the checklist shown on screen, which a model free-forming "grade: 2"
independently of its own criteria list is not guaranteed to be.

For items with no `criteria` at all — not a real case today, since `validateItem`
(`itemSchema.js:254`) requires `>= 2` for every self-graded format, but worth stating
— fall back to a holistic rubric grounded in `expected`, using the same
Again/Hard/Good/Easy language already in the UI.

### G3 — Model choice: start concrete, expect to special-case TRACE (needs a decision after real testing)
Given the confirmed 8GB VRAM budget:

| Tier | Model | Fits in 8GB? | Notes |
| --- | --- | --- | --- |
| Starting point | `qwen2.5:7b-instruct` | yes, comfortably | Strong instruction-following, solid JSON-mode compliance |
| Code-heavy formats | `qwen2.5-coder:7b` | yes | Purpose-tuned for code; candidate for `TRACE`/`ERROR` items specifically, which need mentally executing C++ pointer/memory state — the format most likely to fool a generalist small model |
| Stretch | `qwen2.5:14b-instruct` (Q4) | borderline — ~8-9GB at Q4, will lean on CPU offload | Noticeably better reasoning; try once 7B accuracy is measured, not before |

Don't guess this — §8 below proposes a cheap way to actually measure it against this
bank's real items before committing to one model. It's plausible the right answer is
"use `qwen2.5:7b` for everything except `TRACE`/`ERROR`, route those two formats to
`qwen2.5-coder:7b`" — but that's a decision to make from evidence, not up front.

### G4 — Fail open, always (required, not optional)
If Ollama isn't running, the model isn't pulled, the call times out, or the JSON
response doesn't parse, Drill mode must fall back to exactly today's pure self-grade
flow — never block reveal, never crash the session. This matches the existing
best-effort pattern already in `recordAttempt` (`DrillView.jsx:120`, a failed
`postDrillAttempt` is swallowed on purpose: "a failed write doesn't block the
session"). A missing local LLM is a much more common failure mode than a failed
write to your own DB, so this matters more here, not less.

**The cost of failing open, and what pays it down.** Silence is the point of G4,
but it also means the most common failure — Ollama simply not started — is
indistinguishable from a grading bug: every answer comes back `ungraded` with no
error anywhere in the UI. So the Electron build starts Ollama itself on launch
(`startOllama` in `electron/main.cjs`), which removes that cause rather than
reporting it. Notes on that:

- It probes first and only spawns if nothing answers, so an Ollama already
  running under a system service or the tray app is left alone — and, since only
  a process we spawned is tracked, only that one is killed on quit (a ~6GB model
  stays resident in VRAM for `KEEP_ALIVE_SEC` otherwise).
- It starts Ollama on the same OS as the app, which is the only correct side. A
  WSL Ollama and a Windows Ollama both answer on `127.0.0.1:11434` and cannot
  see each other, so "Ollama is running on this machine" is not the question.
- It's best-effort: not installed, not on PATH, or slow to bind all log and
  carry on, leaving exactly the G4 behaviour above. Dev runs (`node
  server/index.js`) have no such launcher — start Ollama yourself, §7.
- It does not help with a *stale model name*: `GET /api/drill/ollama-status`
  probes only `model`, never the `skilltape:ollama:codeModel` that
  `PracticeView.jsx` routes WRITE/TRACE/ERROR items to. A deleted code model
  means Ollama 404s and only code items come back `ungraded`, while "test
  connection" still passes.

### G5 — Config lives in Settings, not an env var (recommended)
This has to run on an end user's machine via the Electron build, not just your dev
server, so "set `OLLAMA_MODEL` before starting `node server/index.js`" isn't a real
configuration surface for that build. Add a model name + Ollama host field to
`src/components/SettingsMenu.jsx` (persisted client-side, sent with each grade
request or stored server-side per the existing session), with a "test connection"
action that hits Ollama's `GET /api/tags` and reports which models are actually
pulled. Home or the Drill entry point should show a small "Auto-grade: qwen2.5:7b
ready" / "Auto-grade unavailable — start Ollama" indicator so G4's fallback is never
a silent surprise.

**Caveat added after implementation — the host field needs a server-side allowlist.**
A client-supplied host that the *server* then fetches is a server-side request forgery
hole: `POST /api/drill/grade-batch` and `GET /api/drill/ollama-status` are both
unauthenticated (progress.js's anonymous-friendly stance), so anyone who can reach this
server can aim it at any address *it* can reach and read the outcome back — a port
scanner for the private network it sits on, and on a cloud VM a reader for the
link-local metadata endpoint that hands out instance credentials. Harmless for the
single-user desktop build this whole doc assumes; not harmless for the Docker
deployment in `docker-compose.yml`. So the field stays (G5's reasoning is unchanged for
the Electron case), but `resolveHost` in `server/ollama.js` gates every fetch:

- **Loopback on any port is always allowed** — Ollama's own port is user-configurable,
  and a caller who has already reached this server's loopback gains nothing new.
- **`OLLAMA_HOST`** overrides the default host and is implicitly allowed. This is the
  env-var surface G5 argued *against* as the only config, and it still isn't the only
  one — it's the operator-side knob for a hosted install, alongside the Settings field.
- **`OLLAMA_ALLOWED_HOSTS`** is a comma-separated list of full origins
  (`http://ollama.internal:11434,https://gpu.box.example`) permitting non-loopback
  hosts on purpose. Matching is exact origin, so the port is pinned too.

Anything else is rejected *before* the fetch: `400` from `grade-batch` (a disallowed
host is a bad request, not an outage — deliberately **not** G4's fail-open path, since
answering with a plausible `ungraded` would hand a prober a working oracle), and
`hostAllowed: false` on `ollama-status`, which keeps that route's always-200 contract
and lets SettingsMenu say "not allowed" instead of "start Ollama and try again."

---

## 5. Implementation sketch

Additive to the existing shape, not a rewrite:

1. **`server/ollama.js`** (new) — thin wrapper: `POST {host}/api/chat` with
   `format: "json"` (Ollama's structured-output mode) and a low temperature (0.1-0.2,
   for grading consistency run to run). Distinguish "connection refused" (Ollama not
   running — surface as "unavailable," not an error) from "got a response that
   didn't parse" (log it, still fall back per G4, but this case is worth knowing
   about since it means the prompt needs work).

2. **`POST /api/drill/grade`** (new, in `server/routes/drill.js`) — body
   `{ itemId, answer }`. Deliberately **does not** trust the client for `expected`/
   `criteria` — looks the item up server-side by `itemId`, same as every other route
   in this file already does (`getItemForScheduling`, `drill.js:71`). Builds the
   prompt from the server's own copy of the rubric, calls `ollama.js`, applies G2's
   deterministic mapping, returns `{ grade, criteriaMet: [bool, ...], rationale }`.
   This is a plain judgment call on an already-verified rubric, so it doesn't need
   `verifiedByHuman` gating the way item creation does — it's not writing content.

3. **`DrillView.jsx` wiring** — fire the grade request the moment `revealed` becomes
   `true` (parallel with the reveal render, not blocking it), show a small pending
   state near the grade buttons, and when it resolves: pre-select the suggested
   button, annotate the existing `item.criteria` list (`DrillView.jsx:429-435`) with
   ✓/✗ per line from `criteriaMet`, show `rationale` in the small print. The final
   `submit({ grade })` call is unchanged — G1 keeps the click.

4. **`ExamView.jsx`** (stretch, do after DrillView is validated) — its post-hoc
   grading pass reuses the same reveal-then-self-grade UI (`ROADMAP.md:261`), so the
   same wiring applies once `DrillView`'s version is proven out. Not first.

5. **`SettingsMenu.jsx`** — G5's model/host field + test-connection button.

No schema changes needed — `item_attempts.note` already carries the written answer
(`server/schema.sql`, per `ROADMAP.md:250`), and the grade that lands in
`item_attempts.grade` is indistinguishable from a self-graded one to `server/fsrs.js`
either way, which is exactly what you want: the scheduler doesn't need to know or
care where the grade came from.

---

## 6. Real risks, not hedging

- **Local 7-8B models are not reliable graders on `TRACE`/`ERROR` items** — these
  require actually simulating pointer/memory state or spotting a specific broken
  proof step, and that's where small open models degrade fastest relative to a
  frontier model. Expect the auto-grade suggestion to be wrong more often on these
  two formats than on `RECALL`/`COMPARE`/`COMPLEXITY`. G1's "suggest, don't
  auto-submit" is what makes this tolerable rather than corrosive to trust in the
  feature.
- **Latency without a warm model:** Ollama unloads an idle model from VRAM after a
  few minutes by default; the first grade call after a gap re-loads it, which can be
  several seconds even on the 2070 Super. Show a pending state (§5.3) rather than
  freezing the reveal, and consider a `keep_alive` setting on the Ollama request to
  hold the model resident for the length of a drill session.
- **A 14B model at Q4 on 8GB VRAM will partially offload to CPU** and get
  meaningfully slower — fine for "grade this while I read the answer key," not fine
  if the goal is a snappy click-through session. Measure before choosing it as the
  default (G3).
- **JSON-mode compliance isn't 100% even with `format: "json"`** on small models —
  budget for a parse-failure path (G4), and consider one retry with a stricter
  "return ONLY valid JSON" reminder before giving up and falling back.

---

## 7. Suggested first step

Before wiring any UI: pick one real `RECALL` item from an existing topic file (it's
the format closest to a flat checklist, and the one small models should handle best),
hand-write the grading prompt, and `curl` it against `qwen2.5:7b-instruct` directly —
```bash
ollama serve &          # not running by default in this environment
ollama pull qwen2.5:7b-instruct
curl http://127.0.0.1:11434/api/chat -d '{
  "model": "qwen2.5:7b-instruct",
  "format": "json",
  "options": { "temperature": 0.15 },
  "messages": [
    { "role": "system", "content": "You grade a student answer against a fixed rubric. For each criterion, answer true only if the student answer clearly satisfies it. Do not invent criteria. Respond as JSON: {\"criteriaMet\": [bool, ...], \"rationale\": \"...\"}" },
    { "role": "user", "content": "PROMPT: ...\nEXPECTED: ...\nCRITERIA: [\"...\", \"...\"]\nSTUDENT ANSWER: ..." }
  ],
  "stream": false
}'
```
against 5-10 real items across a couple of formats before touching `server/` or
`DrillView.jsx`. That's what should actually settle G3 (which model per format), and
it costs an afternoon, not a phase.

---

## 8. Measured results — G3 settled (2026-08-04)

§7 asked for exactly this before committing to a model, so here it is: six
hand-built answers graded against two real items from
`src/data/topics/cpp/linked-lists.js` (`linked-lists-01`, a `RECALL` item with 3
criteria; `linked-lists-02`, a `WRITE` item with 2), scored per criterion against
a hand-marked expectation, repeated to average out the fact that **Ollama at
`temperature: 0` is not bit-deterministic** — single runs disagree with each
other, so any one-shot comparison between prompts or models is noise.

The cases deliberately cover both directions of error, not just "does it say
yes to a good answer":

| | case | tests |
| --- | --- | --- |
| A | correct, fully reworded (`NULL` for `nullptr`, "struct" for node, "sentinel/tail" for last) | false negatives from vocabulary mismatch |
| B | correct, plus true detail the reference never mentions (O(n) indexing, doubly-linked) | extra detail wrongly penalized |
| C | genuinely partial — silent on end-of-list | that real gaps are still caught |
| D | contradicts the reference outright | that wrong answers still fail |
| E | code, correct via member-init list instead of assignment | equivalent-construct credit |
| F | code, partial — parameters present but no defaults | false positives on code |

**Per-criterion accuracy, 4 reps/case (24 runs, 64 criterion judgments):**

| model | accuracy | fails | schema rejects |
| --- | --- | --- | --- |
| `qwen2.5:7b-instruct` | 60/64 (94%) | **B** (0/4, deterministic) | 0 |
| `qwen2.5-coder:7b` | 60/64 (94%) | **F** (0/4, deterministic) | 0 |
| `qwen3.5:9b` (`think:false`) | **48/48 (100%)** | none | 0 |

The two qwen2.5 failures are each deterministic and in opposite directions, and
the app's own format routing hit both: `qwen2.5:7b-instruct` marks
`"Termination: next == nullptr on the final node."` as *not* stating the last
node's pointer is nullptr (a false negative on a verbatim match — the harmful
direction), while `qwen2.5-coder:7b` credits a constructor that has no defaults
with having them, by fabricating the *reference's* text as the student's span.
`qwen3.5:9b` fixes both, which is why `DEFAULT_CODE_MODEL` collapsed back onto
the single general model and G3's per-format routing is now dormant (the
`CODE_FORMATS` branch in `PracticeView.jsx` still works; both defaults just
point at the same model).

### `think: false` is required, not a tuning knob

`qwen3.5` is a hybrid-reasoning model and thinks by default. On a prompt as long
as the grading one it spends its whole budget in `message.thinking` and returns
an **empty `message.content`** — which `postChat` turns into
`OllamaBadResponseError`, which G4 correctly fails open on, so **auto-grading
switches itself off with no error visible anywhere** and every Practice item
comes back `ungraded`. `server/ollama.js` now sends `think: false` on every
call; verified a no-op (HTTP 200, unchanged output) against both qwen2.5 models,
which matters because existing installs have those pinned in `localStorage`.

### Latency, and a real 8GB trap

Steady-state **7.6s median, 7.9s max** per item (one item per call), against
~4s for `qwen2.5:7b-instruct`. Both are far inside the route's 60s timeout, and
the first call of a session still pays the cold-load cost §6 describes.

But **two models in one session is the thing to avoid on an 8GB card.** While
G3's per-format routing was live, a session alternating a code item and a prose
item kept swapping a 4.7GB and a 5.6GB model that cannot both stay resident —
measured at *minutes* per item, not seconds, and it looks exactly like "the
model is slow" rather than like thrashing. One model for everything is worth
more here than any per-format tuning.

### On tuning the prompt against this

Two changes that sounded obviously right measured *worse* and were reverted —
most notably an explicit "judge only the quoted span, ignore the rest of the
answer" rule, which dropped `qwen2.5:7b-instruct` from 94% to 89% by breaking a
case it previously passed. Re-run the numbers before keeping any prompt edit;
this is a bank where plausible reasoning loses to measurement routinely.
