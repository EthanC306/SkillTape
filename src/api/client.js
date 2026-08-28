/**
 * The only frontend module that knows HTTP exists.
 *
 * Every path is relative ("/api/…"), never absolute. In dev, vite.config.js
 * proxies /api to the Express server on 3001, so the browser stays same-origin
 * and CORS never comes up; in production the API is served from the same origin
 * anyway. Either way there is no hostname here to change.
 */

/**
 * One fetch wrapper: JSON in, JSON out, errors as thrown Errors.
 *
 * `keepalive` lets a request outlive the page that started it — the browser
 * finishes sending it even as the tab closes. Only useful from a pagehide
 * handler (PracticeView flushes its held attempts there); the response is
 * unreadable by then, so callers must not depend on what it resolves to.
 * Browsers cap keepalive bodies at 64KB, which no request here approaches.
 */
export async function api(path, { method = "GET", body, keepalive = false } = {}) {
  let res;
  try {
    res = await fetch(path, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      // Send the session cookie once auth exists. Same-origin is the default,
      // but being explicit means this keeps working if the API ever moves.
      credentials: "same-origin",
      keepalive,
    });
  } catch {
    // fetch only rejects when the request never completed — server down,
    // DNS, offline. An HTTP 500 is a *resolved* promise, handled below.
    throw new Error("Can't reach the SkillTape API. Is `npm run dev:server` running?");
  }

  if (res.status === 204) return null;

  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    // A non-JSON body means we hit something that isn't our API — usually the
    // dev proxy missing, so Vite returned index.html.
    throw new Error(`Expected JSON from ${path} but got ${res.status} ${res.statusText}`);
  }

  if (!res.ok) throw new Error(data?.error || `${res.status} ${res.statusText}`);
  return data;
}

// ── Topics ─────────────────────────────────────────────────────────────────

// Module-level cache, deliberately outside React. Shell.jsx renders
// <App key="c++" …>, so switching course tabs REMOUNTS App and re-runs its
// effects — without this, every tab switch would refetch the whole bank.
let topicsPromise = null;

/** All topics, fully populated. Cached until invalidateTopics(). */
export function getTopics() {
  if (!topicsPromise) topicsPromise = api("/api/topics");
  return topicsPromise;
}

/** Drop the cache so the next getTopics() refetches — call after a save. */
export function invalidateTopics() {
  topicsPromise = null;
}

export function postTopic(course, title, subtitle) {
  return api("/api/topics", {
    method: "POST",
    body: { course, title, subtitle },
  });
}

export function putCards(topicId, cards) {
  return api(`/api/topics/${encodeURIComponent(topicId)}/cards`, {
    method: "PUT",
    body: { cards },
  });
}

export function putFlashcards(topicId, flashcards) {
  return api(`/api/topics/${encodeURIComponent(topicId)}/flashcards`, {
    method: "PUT",
    body: { flashcards },
  });
}

// ── Progress ───────────────────────────────────────────────────────────────

/** Record one finished quiz run. body: { topicId, runId, results }. */
export function postAttempts(body) {
  return api("/api/attempts", { method: "POST", body });
}

/** Every topic's quiz history: { [topicId]: { best, total, runs, history } }. */
export function getProgress() {
  return api("/api/progress");
}

// ── Auth ───────────────────────────────────────────────────────────────────
// All four set/read the httpOnly session cookie server-side; nothing here
// touches document.cookie directly, so there's no token for frontend code to
// mishandle.

/** Create an account and log in as it. Resolves { id, email }; rejects on 409/400. */
export function signup(email, password) {
  return api("/api/auth/signup", { method: "POST", body: { email, password } });
}

/** Log in. Resolves { id, email }; rejects with a generic message on 401. */
export function login(email, password) {
  return api("/api/auth/login", { method: "POST", body: { email, password } });
}

/** End the session. Never rejects on "already logged out" — the route is idempotent. */
export function logout() {
  return api("/api/auth/logout", { method: "POST" });
}

/** The logged-in user, or throws if there isn't one (useAuth treats 401 as "no user"). */
export function getMe() {
  return api("/api/auth/me");
}

// ── Drill mode (ROADMAP.md A4) ──────────────────────────────────────────────

/**
 * The client's own UTC offset, sent on every scheduler read.
 *
 * The server decides what "due today" means (dueBoundary in server/fsrs.js) and
 * needs to draw that line at midnight in the USER's timezone, not its own. In
 * Electron they are the same machine, but under Docker they need not be, and a
 * day-boundary disagreement is exactly the off-by-one this plan warns about.
 */
function tz() {
  return `tz=${new Date().getTimezoneOffset()}`;
}

/**
 * Due (or new) items for `course`, FSRS-ordered, ready to drill. Each item
 * arrives with its scheduling state and the four predicted intervals attached.
 *
 * `ahead` drops the due filter and pulls the next-soonest items instead, the
 * "Review ahead" path for when nothing is actually due.
 */
export function getDrillQueue(course, limit = 20, { ahead = false } = {}) {
  return api(
    `/api/drill/queue?course=${encodeURIComponent(course)}&limit=${limit}&${tz()}${ahead ? "&ahead=1" : ""}`
  );
}

/** Due / learning / new counts for the home strip, plus a per-topic breakdown. */
export function getDrillCounts(course) {
  return api(`/api/drill/counts?course=${encodeURIComponent(course)}&${tz()}`);
}

/** This user's FSRS parameters: { requestRetention, maximumInterval, dailyNewLimit, enableFuzz }. */
export function getSchedulerSettings() {
  return api("/api/drill/settings");
}

/** Save any subset of the FSRS parameters. Resolves with the saved set plus `rescheduled`, the number of due dates the change moved. */
export function putSchedulerSettings(patch) {
  return api("/api/drill/settings", { method: "PUT", body: patch });
}

/** How many cards a retention change would reschedule, so the confirmation can name a number. */
export function getSchedulerImpact() {
  return api("/api/drill/settings/impact");
}

/**
 * Run one hypothetical review. Stateless: nothing is read from or written to the
 * database, which is what lets the scheduler sandbox hold its card in React
 * state while still leaving every interval calculation on the server.
 *
 * body: { card, grade?, now?, format?, settings? }
 */
export function postSchedulerSimulate(body) {
  return api("/api/drill/simulate", { method: "POST", body });
}

/** Forget one card back to new. Clears its scheduling state; its attempt log is untouched. */
export function resetItemSchedule(itemId) {
  return api(`/api/drill/items/${encodeURIComponent(itemId)}/reset`, { method: "POST" });
}

/** Record one drill attempt. body: { itemId, mode, grade, seconds, tabBlurs, note, abandoned }. Pass keepalive when posting from a pagehide handler. */
export function postDrillAttempt(body, { keepalive = false } = {}) {
  return api("/api/drill/attempts", { method: "POST", body, keepalive });
}

/** The full item-attempt log as JSON, for download. */
export function getDrillExport() {
  return api("/api/drill/export");
}

/** Re-ingest a previously exported attempt log. body: { attempts: [...] }. */
export function postDrillImport(body) {
  return api("/api/drill/import", { method: "POST", body });
}

// ── Exam simulator (ROADMAP.md A5) ──────────────────────────────────────────

/** An examWeight-sampled, mixed-topic item set for `course`, plus the topic breakdown and time budget. */
export function getExamSet(course, { count = 20, minutes = 50 } = {}) {
  return api(`/api/drill/exam?course=${encodeURIComponent(course)}&count=${count}&minutes=${minutes}`);
}

/** Per-topic closed-book drill accuracy for `course` — the exam report's comparison baseline. */
export function getDrillStats(course) {
  return api(`/api/drill/stats?course=${encodeURIComponent(course)}`);
}

// ── Practice mode (Ollama-graded, additive to Drill mode) ───────────────────

/** Grade a chunk of free-text Practice answers (PracticeView sends one at a time) via the configured local Ollama model. */
export function postPracticeGradeBatch(body) {
  return api("/api/drill/grade-batch", { method: "POST", body });
}

/** Ollama reachability + whether `model` is pulled, for SettingsMenu's test-connection button. */
export function getOllamaStatus({ host, model } = {}) {
  const params = new URLSearchParams();
  if (host) params.set("host", host);
  if (model) params.set("model", model);
  const qs = params.toString();
  return api(`/api/drill/ollama-status${qs ? `?${qs}` : ""}`);
}

// ── Reporting + leech handoff (ROADMAP.md A6 / A8) ──────────────────────────

/** The standing dashboard for `course`: topics x formats grid, first-try accuracy, leeches, weakest-topic ranking. */
export function getDrillReport(course) {
  return api(`/api/drill/report?course=${encodeURIComponent(course)}`);
}

/** A8 "reset scheduling state" outcome — clears a leech's review history so it re-enters rotation fresh. */
export function resetLeech(itemId) {
  return api(`/api/drill/leeches/${encodeURIComponent(itemId)}/reset`, { method: "POST" });
}

/**
 * Topic x surface accuracy for `course` (ROADMAP.md A11) — the Report view's
 * Stats tab. Unifies Quiz (MCQ) history with Drill/Practice/Exam history, which
 * live in separate tables and no other endpoint reads together.
 *
 * Sends `tz` for the same reason the scheduler reads do: the activity strip is
 * bucketed by the USER's calendar day, not the server's.
 */
export function getStatsSummary(course) {
  return api(`/api/stats/summary?course=${encodeURIComponent(course)}&${tz()}`);
}

/**
 * Past study SITTINGS for `course`, newest first — the Stats tab's other
 * reading of the same history. Summaries only; the per-question detail is a
 * separate call because it carries full prompt and answer text.
 */
export function getSessions(course) {
  return api(`/api/stats/sessions?course=${encodeURIComponent(course)}`);
}

/**
 * One sitting's questions in answered order: what was asked, what you answered,
 * what was right, and the grade.
 *
 * `course` rides along because a derived (timestamp-clustered) key is only
 * unique within the course partition it came from — see routes/stats.js.
 */
export function getSessionDetail(course, key) {
  return api(
    `/api/stats/sessions/${encodeURIComponent(key)}?course=${encodeURIComponent(course)}`
  );
}

/** Which reading the Stats tab opens in: "grid" | "sessions". */
export function getReportView() {
  return api("/api/stats/view");
}

export function putReportView(view) {
  return api("/api/stats/view", { method: "PUT", body: { view } });
}

// ── Suspensions ─────────────────────────────────────────────────────────────
// Per-user "out of circulation" set, driven from Practice's results screen and
// honoured by Practice's pool and Drill's queue (not by the exam simulator).
// Distinct from items.retired, which is authored content shared by every user.

/** Every suspended itemId for the current user: { itemIds: string[] }. */
export function getSuspensions() {
  return api("/api/drill/suspensions");
}

/** Take items out of circulation. Accepts one id or many — bulk is a single request. */
export function postSuspensions(itemIds) {
  return api("/api/drill/suspensions", { method: "POST", body: { itemIds } });
}

/** Put one item back in rotation (per-card undo). */
export function deleteSuspension(itemId) {
  return api(`/api/drill/suspensions/${encodeURIComponent(itemId)}`, { method: "DELETE" });
}

/** "Reset deck" — put everything this user parked back in rotation at once. */
export function clearSuspensions() {
  return api("/api/drill/suspensions", { method: "DELETE" });
}
