# SkillTape — Production Readiness

Gap analysis: what's missing between the app as it exists today (after the `Edit-Mode` branch's backend + auth work) and a stable, competitive multi-user product. Written 2026-08-01, against a clean `Edit-Mode` working tree.

**This document does not re-decide anything already decided.** Where a gap below is already covered by `docs/PLAN_PLATFORMIZE.md` §3b, `docs/ROADMAP.md` §6, or elsewhere, it's cited, not restated — this file only adds what those don't already say, and gives the whole thing a priority order.

---

## 0. Read this before the rest of the document

**Two things need to be true on purpose, not by drift, before you follow the plan in §4:**

**First — this continues Track B, which `docs/ROADMAP.md` D5 (resolved 2026-07-29) explicitly deferred.** *"Focus on drill mode; platformization waits... Track B is deferred in full — no auth, no schema, no stack decision until the drill loop is running."* The `Edit-Mode` branch built B1 (auth), B2 (schema), and a scoped B3 (Edit Mode) anyway — `ROADMAP.md` §6 already has `[CORRECTED — 2026-08-01]` notes admitting "the deferral didn't hold in practice." Track A (the actual midterm-fixing drill mode — A0 through A9, spaced repetition, exam simulator) is **still not started**: no `examWeight`, no attempt log beyond raw quiz scores, no scheduler, no `DrillView`, no leech detection. If the original motivation for this app (a 53% closed-book midterm) still matters, going further down the "competitive product" road in this document makes that worse before it makes it better. This isn't a reason to stop — it's a reason to *decide* to keep going, rather than notice in three weeks that Track A never happened again.

**Second — "enterprise" is the wrong yardstick.** An enterprise application implies multiple engineering teams, an existing paying customer base, compliance obligations (SOC 2, GDPR, HIPAA depending on domain), and infrastructure budget. Comparing a solo-built study app to that produces a to-do list no individual should try to clear. The useful comparison is narrower: **what does a small, self-hosted, multi-user SaaS product need to not lose someone's data, not leak someone's account, and not fall over** — a much shorter list, most of which is achievable in the timeframe you named.

---

## 1. Already decided or already documented — not re-litigated here

| Concern | Where it's already covered | Current status |
| --- | --- | --- |
| Stack choice (Supabase vs. self-hosted) | `ROADMAP.md` D9 / §6 B0 | Resolved in practice: self-hosted Express + `better-sqlite3`, no RLS layer |
| Auth approach | `PLAN_PLATFORMIZE.md` Phase 1, `ROADMAP.md` §6 B1 | Built: bcrypt + session cookies (see `docs/BACKEND.md` §4) |
| `attempts` table shape (per-item vs. per-run) | `CORRECTIONS.md`, `ROADMAP.md` D7-adjacent, §6 B2 | Built correctly the first time |
| Authoring UI scope | `PLAN_PLATFORMIZE.md` Phase 3, `ROADMAP.md` §6 B3 | Partially built as Edit Mode (cards + flashcards only — see `AUTHORING.md` §8 for the explicit non-goals: no course/topic creation, no quiz editing, no figure upload) |
| Quiz generation | `PLAN_PLATFORMIZE.md` Phase 4, `ROADMAP.md` §6 B4 | Not started. Interface boundary (`generateQuestions(contentBlocks, options)`) already specced — build to that, don't redesign it |
| Sharing/publish | `ROADMAP.md` §6 B5 | Not started, correctly sequenced last |
| Security checklist (IDOR/RLS, XSS, CSRF, rate limiting, encryption, HTTPS) | `PLAN_PLATFORMIZE.md` §3b, restated `ROADMAP.md` §6 | **Written, not implemented.** Compliance snapshot against the current self-hosted build is §3 below — this is the one place I'm re-touching a covered topic, because the checklist was written for a Supabase-shaped app and needs re-checking against what actually shipped |
| Drill mode / spaced repetition / exam simulator | `ROADMAP.md` §5 (A0–A9) | Not started — see §0 above |

---

## 2. Genuine gaps — not addressed in any existing doc

Nothing below is mentioned in `PLAN_PLATFORMIZE.md`, `ROADMAP.md`, `CORRECTIONS.md`, `CS_DRILL_BUILD_SPEC.md`, or `SKILLTAPE_INTEGRATION.md`. Confirmed by reading all five and grepping for test/lint/CI/migration/backup — none of those words appear as a checklist item anywhere in `docs/`.

### 2.1 Zero automated tests
`npm run audit:bank` validates **content structure** (item formats, quotas, provenance) — it has never run a line of application code. There is no unit test, no integration test, no end-to-end test, and no test runner in `package.json`. Every verification this session happened by hand (curl, Playwright driven ad hoc by an agent, manual browser clicks) — none of it is repeatable by running a command. Every future change to `server/routes/*.js`, `blankEdit.js`, or `shuffle.js` is a regression risk with nothing to catch it.

### 2.2 No CI
No `.github/workflows/`, no pre-commit hook running `audit:bank` or a build. `npx vite build` passing is currently a fact someone has to remember to check by hand.

### 2.3 No schema migration system
`server/schema.sql` is 100% `CREATE TABLE IF NOT EXISTS` — additive-only, on-boot. There is no mechanism to *alter* an existing table (add a column, change a constraint) without either editing `schema.sql` and hoping `IF NOT EXISTS` doesn't silently no-op the change, or hand-writing a one-off `ALTER TABLE` script. The first real schema change (e.g. adding `courses.owner_id` for multi-tenancy, §2.7 below) will expose this.

### 2.4 No backup strategy
The entire application's data — every user's account, every edit, every quiz attempt — is one file: `db/skilltape.db`. There is no automated backup, no point-in-time recovery, nothing. A bad `rm`, a bad `--reset`, or a disk failure is total data loss with no recovery path.

### 2.5 No observability
No structured logging (errors currently go to `console.error` in `index.js`'s handler and nowhere else), no error tracking service, no request logging, no uptime check, no metric of any kind. If the server crashes at 2am, nothing tells you.

### 2.6 No secrets/environment management
No `.env` file exists despite `.gitignore` already carving out space for one. Not urgent today (there are no API keys yet), but B4 (quiz generation) needs one for a hosted LLM key, and the moment that lands, "no established env-var convention" becomes a real risk of a key ending up hardcoded or logged.

### 2.7 No multi-tenancy / ownership model
This is the sharpest gap for "competitive multi-user product" specifically, and it's a code gap the docs don't fully anticipate either: `server/schema.sql`'s `courses`/`topics` tables have **no `owner_id`** (`PLAN_PLATFORMIZE.md`'s original schema sketch had one on `courses`; what shipped doesn't). Concretely, today: **any signed-up user can edit any topic's cards or flashcards** — `requireAuth` checks "is someone logged in," never "does this user own this content." For a single-operator app that's irrelevant. For anything with more than one real account, it's the exact IDOR gap `PLAN_PLATFORMIZE.md` §3b warns about, just not yet triggered because nobody but you has an account. This has to be resolved before a second real user ever signs up, not after.

### 2.8 No account recovery
No password reset flow, no email sending capability at all. Today, a forgotten password is a permanent lockout with no self-service recovery — the only fix is direct database surgery.

### 2.9 No deployment story
`docs/BACKEND.md` documents the two-process **dev** setup only. There's no `Dockerfile`, no process manager config (`pm2`/`systemd`), no reverse-proxy/TLS guidance, nothing describing how `server/index.js` is supposed to run unattended, restart on crash, or survive a reboot. Right now "deploying" this app means someone's terminal staying open.

### 2.10 No code quality tooling
No ESLint, no Prettier, no `.editorconfig`. Style consistency across the growing `server/` and `src/` trees depends entirely on each contributor (or agent) matching existing patterns by eye.

### 2.11 No rate limiting (implementation gap, not a documentation gap)
`PLAN_PLATFORMIZE.md` §3b already flags this as needed on auth endpoints; it's correctly on the list, just not built. `server/routes/auth.js`'s `/login` has no throttling at all — it's brute-forceable today at whatever rate `bcrypt.compare`'s ~250ms lets a script run.

---

## 3. Security checklist — compliance snapshot against what actually shipped

`PLAN_PLATFORMIZE.md` §3b was written for a hypothetical Supabase-backed app. Re-checked here against the real, self-hosted implementation in `server/`:

| Checklist item | Status | Detail |
| --- | --- | --- |
| Broken access control / IDOR, RLS | ❌ Not present | No RLS (SQLite has none); no ownership model at all — see §2.7. The one thing gated (`requireAuth` on the two `PUT` routes) checks login, not ownership |
| No direct DB access from client | ✅ | `db/skilltape.db` is server-process-only |
| Parameterized queries | ✅ | Every query in `server/routes/*.js` uses `better-sqlite3` prepared statements; no string-built SQL anywhere |
| Server-side input validation | ✅ | `topics.js`, `progress.js`, `auth.js` all validate field-by-field before touching SQL (`BadRequest`/`fail()` convention) |
| Encryption at rest | ❌ Not present | Plain, unencrypted SQLite file on disk. No disk-level encryption enforced or documented |
| Password hashing | ✅ | bcrypt, cost 12 (`server/auth.js`) |
| HTTPS everywhere | ❌ Not present | Plain HTTP only; session cookie explicitly not `secure` by design (`server/auth.js`, commented) since the app is `127.0.0.1`-only today. **This has to change before the server is reachable from anywhere but localhost** |
| XSS | ✅ | Confirmed no `dangerouslySetInnerHTML` anywhere in `src/`; `Inline.jsx` renders bold spans as React text nodes/`<strong>`, never raw HTML |
| CSRF | 🟡 Partial | `sameSite: "lax"` on the session cookie mitigates the common case; no CSRF token as defense-in-depth on the mutating routes |
| Rate limiting | ❌ Not present | See §2.11 |

Four of ten are unaddressed, one partial. None of the four (`IDOR`/ownership, encryption at rest, HTTPS, rate limiting) are hard to fix in isolation — they're just not done, and three of them (`HTTPS`, encryption at rest, rate limiting) don't matter *at all* while this runs on localhost for one person, which is presumably why they were deferred. They become mandatory the moment this is reachable by, or holds data for, anyone other than you.

---

## 4. Priority plan

Ordered by "what breaks first if skipped," not by how it's usually presented in a roadmap. Each item names the concrete file(s) it touches.

### Tier 0 — do before any second real account exists
1. **Ownership model.** Add `owner_id` to `courses` (or `topics`, decide which level per `ROADMAP.md` D7's still-open topic/module naming question) in `server/schema.sql`. Since there's no migration system yet (§2.3), this is also the forcing function to build one — a real, numbered migration mechanism, even a minimal one (a `migrations` table + an ordered list of `.sql` files applied once), not another `IF NOT EXISTS` block.
2. **Scope `requireAuth` to ownership**, not just login, on the two `PUT` routes.
3. **Rate-limit `/api/auth/login` and `/api/auth/signup`** — `express-rate-limit` or hand-rolled, doesn't need to be fancy, just present.

### Tier 1 — stability foundations (do in parallel with Tier 0, no strict order)
4. **A test suite, starting small.** Not full coverage on day one — start with the validation logic (`cardRow`/`resultRow`/`requireEmail` etc. in the three route files) and `blankEdit.js`'s `toggleBold`/`validateBody`, since those are pure functions with no server/browser needed and were only ever verified by an agent typing into a browser once. `vitest` is the natural pick (Vite-native, near-zero config).
5. **CI**: one GitHub Actions workflow running `npx vite build`, the new test suite, and `npm run audit:bank`, on every push. This is what turns "an agent said it verified this" into something checkable without re-running it by hand.
6. **Backups**: a cron/systemd-timer copying `db/skilltape.db` on an interval (even daily, even to another local disk) is a two-line script and infinitely better than nothing.
7. **Basic observability**: replace the bare `console.error` in `server/index.js`'s error handler with structured request/error logging to a file at minimum. A hosted error tracker (Sentry has a generous free tier) is the next step up, not required immediately.

### Tier 2 — needed before this leaves localhost
8. **TLS.** Either terminate it yourself (a reverse proxy — Caddy is the least-ceremony option, gets you HTTPS with almost no config) or put it behind something that does. Flip the session cookie's `secure` flag on once this lands (`server/auth.js` already has a comment marking exactly where).
9. **Deployment story**: a process manager config (`systemd` unit is simplest for a single self-hosted box) so `server/index.js` restarts on crash and on reboot, plus a written runbook — even a short one — for "how do I actually get this running on a server," which `docs/BACKEND.md` currently doesn't cover at all.
10. **Password reset.** Needs outbound email (a transactional email provider — even a free tier of one) — this is the point where §2.6's "no secrets convention yet" stops being theoretical, so establish the `.env` pattern here if it hasn't happened already.

### Tier 3 — competitive-product features (already specced, just build them)
These are `ROADMAP.md` §6 B4/B5/B6 — don't redesign, follow what's already written:
11. Quiz generation (B4) — ship the rule-based `**bold**`-span generator first (cheap, already 80% built via `fill.js`), LLM generation second.
12. Sharing/publish (B5) — only after Tier 0-2 are solid, per the existing sequencing rationale (`ROADMAP.md` §6: "only after B1–B4 are solid and dogfooded").
13. Migrate existing `cpp`/`discrete` content into the DB as seeded public courses (B6).

### Ongoing, not a phase
14. **Code quality tooling** — add ESLint + Prettier whenever convenient; low-risk, low-urgency, but the codebase is growing fast enough (four new server files and three new frontend files landed in one session) that style drift is a when, not an if.

---

## 5. What NOT to build yet

Explicitly out of scope until there's evidence of real multi-user load: connection pooling / a networked database (Postgres) to replace SQLite, horizontal scaling / multiple app instances, a CDN, a queue/worker system, microservices of any kind, Kubernetes or any container orchestration, SSO/OAuth beyond email-password, a full admin dashboard, i18n. `better-sqlite3` comfortably handles single-writer read-heavy workloads at a scale far beyond "friends and classmates" — reach for Postgres only when there's a concrete reason (concurrent-write contention actually observed, or a real move to a real Supabase-style managed backend), not preemptively.
