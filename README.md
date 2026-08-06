# SkillTape

A self-hosted study app for computer-science coursework. Course material is presented as note cards you can read, blank out and fill from memory, or drill through as quizzes — a single-page React app with progress saved locally.

> Previously named **Cpp Tracker** / **cs.tutor**. The C++-specific name predates multi-course support; `SkillTape` is the name used going forward (see `docs/PLAN_PLATFORMIZE.md`).

**Design principle:** every item in the question bank traces back to a verbatim excerpt from real course material — zyBooks, lecture slides, lab handouts. Nothing in the author's own courses is model-generated. See `docs/CORRECTIONS.md` §3.1 for how this coexists with the platform's generation features.

## Courses

The home screen has a bottom tab bar, one tab per class:

| Tab | Course | Focus |
| --- | --- | --- |
| `c++` | C++ Data Structures & Algorithms | Big-O, C-strings, containers, linked lists, the Big Three |
| `CS3000` | Discrete Structures (Epp, 5e) | logic, quantifiers, proof, sets, relations, graphs |

Selecting a tab opens the tutor filtered to that course's topics.

## Features

Shipped:

- **Learn mode** — topic notes as cards. Key terms are emphasized and, in **Fill Mode**, hidden so you can type them from memory and check yourself. Grading is lenient by design: case, spacing, hyphens, exponent notation, plurals, and number words all fold away, and a card can declare extra accepted answers via `accept` (see `src/utils/fill.js`).
- **Quiz mode** — multiple-choice questions with immediate feedback and per-question explanations. A results screen shows your score and best run.
- **Master Quiz** — draws across all topics in a course rather than one at a time.
- **Flashcards** — front/back pairs per topic.
- **Diagrams** — optional captioned figures on cards and questions.
- **Big-O visuals** — C++ topics can render a complexity-growth chart and reference table, with the relevant curve highlighted when you answer.
- **Progress tracking** — per topic: best score, run count, and the last 50 runs, persisted server-side (one row per question answered) and readable across browsers once logged in. See `docs/BACKEND.md`.
- **Edit Mode** — an Edit toggle on any topic makes Learn cards and flashcards editable in place (add/delete/reorder, a bold-toggle button that doubles as the Fill Mode blank marker). Requires an account. Quiz questions are not editable this way — see `docs/AUTHORING.md`
- **Drill mode** — closed-book, timed, navigation hidden, self-graded against an explicit criteria checklist. This is the mode that targets exam conditions; see `docs/CORRECTIONS.md` §4.2. The `body[data-drill-active]` CSS hook in `index.html` is groundwork for it; nothing sets that attribute today.
- **Mixed-format items** — the polymorphic item shape in `src/data/itemSchema.js` (recall / write / trace / error / cloze / compare / complexity, with MCQ capped). The module is written and exercised by `npm run audit:bank`, but no topic file uses it — every question in the bank is still a legacy MCQ.
- **Provenance on every item** — `sourceId` + anchor + verbatim excerpt, gated by `verifiedByHuman`. Enforced by the audit script, not yet present in the content.
- **Per-item attempt log** — grade, elapsed seconds, open vs. closed book. Requires reworking `useProgress.js`, which currently records per-quiz-run, not per-item.
- **Spaced repetition** — a Leitner 5-box scheduler: correct advances a box, wrong drops to box 1 and increments `lapses`, with intervals of 1/2/4/8/16 days. An item at `lapses >= 3` is flagged a **leech** and pulled from rotation for triage — a leech means the item or the explanation is broken, not that you are, so it gets rewritten rather than ground. Chosen over SM-2 for being simpler and debuggable; see `docs/CS_DRILL_BUILD_SPEC.md` §Phase 5. Scheduling state (`box`, `dueOn`, `lapses`, `leech`) has no home in `src/data/itemSchema.js` yet.


## Getting started

Requires [Node.js](https://nodejs.org/) 18 or newer.

```bash
npm install         # required after pulling: @vitejs/plugin-react was added
npm run dev         # Vite dev server, http://localhost:5173
npm run dev:server  # API server, http://127.0.0.1:3001 — run alongside dev, separate terminal
npm run db:seed     # load/refresh curriculum content into the database
npm run build       # production build → dist/
npm run preview     # serve the production build locally
npm run audit:bank  # validate the question bank (see below)
```

The app needs **both** `dev` and `dev:server` running to load content — see `docs/BACKEND.md` for the backend architecture, the two-process setup, and the database.

`npm run audit:bank` currently **fails**, and that is expected: it checks the bank against the
planned item schema, which the existing MCQ content predates. Every legacy question is reported as
missing `id`, `format`, and `provenance`. It will pass once the bank is migrated; until then treat
its output as the migration to-do list, not a regression.

## Running with Docker

```bash
docker compose up -d --build   # build both images and start the containers
docker compose ps              # check status
docker compose logs -f api     # tail one service's logs (or `web`)
docker compose down            # stop and remove the containers
```

The app is served on `http://localhost:8080` (nginx, proxying `/api` to the
Express API container internally — see `nginx.conf`). `./db` is the only
bind mount (`docker-compose.yml`); everything else is baked into the image
at build time via `COPY . .` in the `Dockerfile`.

**Two different things need two different fixes — don't confuse them:**

- **Code changes** (a component, a route, `index.html`, anything under
  `src/` or `server/` that isn't content) — the image has to be rebuilt:
  ```bash
  docker compose up -d --build
  ```
  There's no live reload and no bind mount of the source, so a plain
  `docker compose up -d` (no `--build`) will keep serving the old code even
  after you save a file.

- **Content changes** (editing a topic's `title`/`subtitle`/`cards`/
  `questions`/`flashcards` in `src/data/topics/**`) — these are read from
  the **database**, not from the `.js` files at request time. Reseed
  instead of rebuilding:
  ```bash
  npm run db:seed
  ```
  Run this on the host, *not* inside the container. `./db/skilltape.db` is
  bind-mounted, so it's the exact same file the `api` container reads —
  reseeding on the host updates it immediately, no rebuild or restart
  needed. (`--reset` also wipes and reseeds `courses`/`topics` themselves;
  plain `npm run db:seed` is enough for editing existing topics' content.)

**If the containers are up but the site 502s, or a container is just gone**
(`docker compose ps` shows nothing, or `docker ps -a` shows `Exited`): this
has happened repeatedly in local testing under **Docker Desktop** on WSL2 —
`api` killed with exit `137`, `web` exiting cleanly right after, with no
error in either container's own logs and no OOM. It doesn't correlate with
anything the app itself does. `docker compose up -d` brings both back and
they've held afterward each time, so treat a bounce as Docker Desktop's
WSL2 integration doing something in the background, not an app bug — if it
becomes frequent, check Docker Desktop's own Settings → Resources and its
troubleshoot/logs panel rather than this repo's code.

## Desktop app (Electron)

A real installable desktop app — its own window and icon, no terminal, no
Docker, works offline. Wraps the same frontend and Express+SQLite backend
used everywhere else in this repo; `electron/main.cjs` spawns the existing
`server/index.js`/`server/seed.js` as child processes rather than
reimplementing anything.

```bash
npm run electron:dev       # build + launch locally, without packaging
npm run electron:build     # Linux: rebuilds native modules for this host, then .AppImage + .deb
npm run electron:build:win # Windows: cross-built .exe (NSIS installer) from this Linux shell
```

**Linux vs. Windows packaging are NOT the same recipe — don't run
`electron:build`'s steps for the Windows target.** `electron:build` calls
`electron:rebuild` (`electron-rebuild -f -w better-sqlite3,bcrypt`), which
runs a real `node-gyp` compile **for the host you're running it on**. That's
correct for the Linux target — this shell IS the target. It is wrong for
Windows: there's no cross-compiler here, so `electron-rebuild` silently
produces a **Linux** `node_modules/bcrypt/build/Release/bcrypt_lib.node`
regardless of which platform you're packaging for, and `bcrypt`'s loader
(`node-gyp-build`) prefers that `build/Release/` file over the correct
`node_modules/bcrypt/prebuilds/win32-x64/bcrypt.node` that's already bundled
in the package. The app packages and installs fine either way — it only
breaks at runtime, the first time something calls into `bcrypt`, with
`Error: ... bcrypt_lib.node is not a valid Win32 application`. Caught this
by actually running the packaged app on real Windows, not just from the
build log.

`electron:build:win` avoids it by never running a local rebuild at all:
`electron-builder.yml` sets `npmRebuild: false`, and the script's own
`electron:clean-native` step (`rm -rf node_modules/{bcrypt,better-sqlite3}/build`)
deletes any stale compiled artifact first, so both native modules fall back
to their bundled prebuilt binaries — `better-sqlite3` and `bcrypt` both ship
a genuine `win32-x64` N-API prebuild in the npm package itself, no compile
or network fetch needed. If you ever add `electron:rebuild` back into the
Windows path, or run it by hand before `electron:build:win`, you'll
reintroduce this exact bug — verify with `file
dist-electron/win-unpacked/resources/app.asar.unpacked/node_modules/bcrypt/prebuilds/win32-x64/bcrypt.node`
and confirm it says `PE32+ ... for MS Windows`, and separately confirm
`find dist-electron/win-unpacked -path '*bcrypt*build*'` comes back empty.

Cross-building the Windows target from Linux also needs Wine — specifically
**both** `wine64` and the 32-bit `wine32:i386` (electron-builder's bundled
`rcedit.exe`, used to embed the icon/version info into the `.exe`, is a
32-bit tool even when packaging for x64):
```bash
sudo apt-get install -y wine64
sudo dpkg --add-architecture i386 && sudo apt-get update && sudo apt-get install -y wine32:i386
```
If Wine was installed *after* a first failed attempt, delete `~/.wine`
before retrying — a Wine prefix created before `wine32:i386` was available
is missing base DLLs (`kernel32.dll` fails to load) and won't fix itself.

**Electron version is pinned to >=35 for a real reason, not just "latest":**
`better-sqlite3`'s prebuilt native addon needs Node 22's N-API surface
(`process.versions.napi === 10`). Electron <=34 bundles Node 20
(`napi === 9`) — loading the addon there doesn't error, it **segfaults**
the instant the addon initializes, inside `better-sqlite3`'s own native
code. Confirmed with `strace`: clean crash right after the addon's shared
libs resolve, on both Electron 32 and 34; a working DB round-trip on
Electron 36. This is the same "Node 22, not 20" constraint the `Dockerfile`
already documents for the plain-Node path — it's just not obvious it also
applies to picking an Electron version, since Electron's own `package.json`
version number doesn't tell you which Node it bundles.

If you ever bump the `electron` devDependency, sanity-check the new
version bundles Node >=22 before assuming a hang or crash is this repo's
bug: `ELECTRON_RUN_AS_NODE=1 node_modules/electron/dist/electron -e
"console.log(process.versions.napi)"` — needs to print `10`, not `9`.

The packaged app's SQLite database lives in Electron's real per-OS
user-data directory (`~/.config/SkillTape` on Linux via
`app.getPath("userData")`), not this repo's `./db/` — there is no "repo"
once it's installed. `server/seed.js` runs on every launch (idempotent
upserts) since a packaged app has no terminal to run `npm run db:seed`
from by hand.

No app icon is set yet — `electron-builder`'s default Electron icon is
used on both platforms. macOS isn't configured (`electron-builder.yml` has
`linux` and `win` targets only) and hasn't been attempted — the same
native-module-must-match-target-platform caveat above would apply there
too, and it can't be verified from this Linux shell at all.

The Windows `.exe` is unsigned (no code-signing cert configured — expected
for now, `electron-builder`'s log says "no signing info identified, signing
is skipped" for each binary). Windows SmartScreen/Defender may flag or
silently quarantine an unsigned installer on first run; that's a Windows
policy reaction, not a sign the build itself is broken.

## Project structure

```
├── index.html                  # HTML entry point; defines pre-mount CSS vars
├── main.jsx                    # React root; renders <Shell />
├── vite.config.js              # React plugin, sourcemaps, @ → src alias
├── scripts/
│   └── auditBank.js            # question-bank validator (npm run audit:bank)
├── src/
│   ├── Shell.jsx               # Home page + bottom course tab bar
│   ├── App.jsx                 # Per-course tutor: topic list + view routing
│   ├── data/
│   │   ├── courses.js          # Course cards (id/title/subtitle)
│   │   ├── curriculum.js       # Topic array, assembled from topics/
│   │   ├── complexity.js       # Big-O curve data for the chart
│   │   ├── itemSchema.js       # Item formats, provenance, validation (unused by content yet)
│   │   ├── theme.js            # PALETTE, MONO, HEADING, RADII
│   │   └── topics/
│   │       └── <course>/<topic>.js   # Per-topic cards + questions
│   ├── components/             # Views and presentational components together
│   │   ├── Home.jsx            # Course topic list
│   │   ├── TopicView.jsx       # Mode switcher for one topic
│   │   ├── LearnView.jsx       # Note cards, Fill Mode
│   │   ├── QuizView.jsx        # Single-topic quiz
│   │   ├── MasterQuizView.jsx  # Cross-topic quiz
│   │   ├── FlashcardsView.jsx  # Front/back drilling
│   │   ├── HistoryModal.jsx    # Past runs for a topic
│   │   ├── Header.jsx          # Wordmark + topic breadcrumb
│   │   ├── Inline.jsx          # Inline text with **bold** term markup
│   │   ├── FillBody.jsx        # Fill-in-the-blank rendering
│   │   ├── Figure.jsx          # Captioned diagram/image
│   │   ├── ComplexityChart.jsx # Big-O growth-rate chart
│   │   └── ReferenceTable.jsx  # Big-O reference table
│   ├── hooks/
│   │   └── useProgress.js      # Per-topic best score, run count, run history
│   └── utils/
│       └── fill.js             # Fill Mode blank parsing + lenient grading
└── public/
    └── figures/                # Diagram images served at the site root
```

## Adding content

Course material lives in `src/data/topics/<course>/<topic>.js`, imported by `src/data/curriculum.js`.

**Writing a new topic? Read `docs/AUTHORING.md`** — the full authoring contract: house style for cards and questions, what to bold, answer-index distribution, figures, and the registration steps. The summary below is the short version.

- **Add a course** — add an entry to `src/data/courses.js`, give its topics a matching `course` id, and add a tab in `src/Shell.jsx`.
- **Add a topic** — create a topic file, import it in `curriculum.js` **with the `.js` extension** (the audit script runs under bare Node, which won't resolve extensionless paths), and add it to the exported array. Each topic has `cards` (Learn notes) and `questions` (MCQs).
- **Key terms** — wrap in `**double asterisks**` to bold them in Learn mode and turn them into blanks in Fill Mode.
- **Accepted answers** — Fill Mode already handles case, spacing, hyphens, exponents, plurals, and number words. For synonyms no rule can derive, add `accept: { "O(n)": ["linear", "linear time"] }` to the card.
- **Figures** — attach `{ src, alt, caption }` to a card or question, with the image under `public/figures/`.

### Item formats (planned)

The schema below is defined in `src/data/itemSchema.js` and enforced by `npm run audit:bank`, but
**no topic file uses it yet** — the bank is still 100% MCQ. Migrating it is the next content task.
Once migrated, every item also needs a `provenance` block naming the source, a stable anchor, and a
verbatim excerpt; never renumber or delete a source anchor once items reference it.

Target distribution per topic:

| Format | Share | Drills |
| --- | --- | --- |
| `recall` | 25% | Cold definition or rule, blank page |
| `write` | 20% | Produce a function or proof from a spec |
| `trace` | 15% | Given code, produce output or final state |
| `error` | 10% | Locate a bug and name the violated rule |
| `cloze` | 10% | One load-bearing token blanked in a skeleton |
| `compare` | 10% | Discriminate between two adjacent concepts |
| `complexity` | 5% | Big-O plus justification |
| `mcq` | ≤5% | Selection — capped deliberately |

The MCQ cap is the point, not an accident. Recognizing a correct answer among four options is a different skill from producing it under exam conditions, and it inflates confidence without improving recall.

## Notes

- Lecture slides, textbook PDFs, and zyBooks exports (`pages/`, `sources/`) are **not** in this repository — they're copyrighted course materials and are gitignored. Verify with `git ls-files | grep -Ei '\.pdf$|^pages/'` before pushing.
- There **is** a backend and account system now: a self-hosted Express + SQLite API (see `docs/BACKEND.md`). Progress is stored server-side, keyed to an account once you log in; accounts are optional for reading content and taking quizzes, required only for Edit Mode. `docs/PLAN_PLATFORMIZE.md` covers the rest of the multi-user roadmap, most of which is still planning only — see `docs/ROADMAP.md` for what's landed versus what hasn't.
- `npm run audit:bank` validates structure — anchors, formats, quotas, required fields. It does **not** validate accuracy. Only human sign-off (`verifiedByHuman`) does that.
- Docs moved under `docs/`: `AUTHORING.md` (how to write a topic file, by hand or in Edit Mode — the authoring contract), `BACKEND.md` (the API/database architecture), `CORRECTIONS.md` (code review and findings), `CS_DRILL_BUILD_SPEC.md` (the drill-system brief), `SKILLTAPE_INTEGRATION.md` (tutor-skill wiring), `PLAN_PLATFORMIZE.md` (platform roadmap). Several describe the target state — check this README's Features list for what actually runs. `AUTHORING.md` and `BACKEND.md` describe what to do today.
