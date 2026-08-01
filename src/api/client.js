/**
 * The only frontend module that knows HTTP exists.
 *
 * Every path is relative ("/api/…"), never absolute. In dev, vite.config.js
 * proxies /api to the Express server on 3001, so the browser stays same-origin
 * and CORS never comes up; in production the API is served from the same origin
 * anyway. Either way there is no hostname here to change.
 */

/** One fetch wrapper: JSON in, JSON out, errors as thrown Errors. */
export async function api(path, { method = "GET", body } = {}) {
  let res;
  try {
    res = await fetch(path, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      // Send the session cookie once auth exists. Same-origin is the default,
      // but being explicit means this keeps working if the API ever moves.
      credentials: "same-origin",
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
// <App key="cs2401" …>, so switching course tabs REMOUNTS App and re-runs its
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
