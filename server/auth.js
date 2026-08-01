// Auth primitives: password hashing, session tokens, and the middleware that
// gates the write routes. Kept separate from server/routes/auth.js so the
// session lookup — the one thing multiple files need — has a single
// implementation (getSessionUser) that both requireAuth and the opportunistic
// callers in progress.js share, rather than two copies drifting apart.
import crypto from "crypto";
import bcrypt from "bcrypt";
import db from "./db.js";

// Cost factor 12: slow enough to matter against a stolen hash, fast enough
// (~250ms on modern hardware) not to be felt on a single-user login form.
const BCRYPT_COST = 12;

export function hashPassword(plain) {
  return bcrypt.hash(plain, BCRYPT_COST);
}

export function verifyPassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

// 30 days: this is a self-hosted single-user app, not a bank — optimize for
// not having to re-login constantly, not for minimizing the exposure window.
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export const COOKIE_NAME = "skilltape_session";

const insertSession = db.prepare(
  "INSERT INTO sessions (id, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)"
);
const getSession = db.prepare(`
  SELECT sessions.id AS token, sessions.expires_at, users.id AS user_id, users.email
  FROM sessions JOIN users ON users.id = sessions.user_id
  WHERE sessions.id = ?
`);
const deleteSession = db.prepare("DELETE FROM sessions WHERE id = ?");

/**
 * Create a session row for `user` ({ id, email }) and set it as the session
 * cookie on `res`. Called by both signup and login — a signup logs you in.
 */
export function createSession(res, user) {
  // 256-bit random token, hex-encoded. This IS the session id (schema.sql:
  // sessions.id is the primary key), not a separate secret — knowing the
  // token is exactly equivalent to holding the session, same as any bearer
  // cookie scheme.
  const token = crypto.randomBytes(32).toString("hex");
  const now = Date.now();
  insertSession.run(token, user.id, now, now + SESSION_TTL_MS);

  res.cookie(COOKIE_NAME, token, {
    httpOnly: true, // never readable from JS — the only thing that matters against XSS stealing it
    sameSite: "lax", // blocks cross-site POST/PUT from riding the cookie, still allows top-level nav
    // Deliberately NOT `secure`: this app runs on plain HTTP at 127.0.0.1 (see
    // the comments in vite.config.js and server/index.js) — a `secure` cookie
    // would be silently dropped by the browser and no session would ever
    // stick. Revisit if this app ever moves behind TLS.
    maxAge: SESSION_TTL_MS,
  });

  return token;
}

/** Clear the cookie on logout. Does not touch the row — callers delete that themselves. */
export function clearSessionCookie(res) {
  res.clearCookie(COOKIE_NAME);
}

/** Delete whatever session row the request's cookie names, if any. Used by logout. */
export function deleteSessionForRequest(req) {
  const token = req.cookies?.[COOKIE_NAME];
  if (token) deleteSession.run(token);
}

/**
 * Look up the logged-in user from a request's session cookie WITHOUT
 * requiring one to exist — returns null rather than throwing when there's no
 * cookie, the token is unknown, or the session has expired. This is the one
 * code path every auth check goes through: requireAuth below uses it to
 * decide whether to 401, and progress.js uses it directly to opportunistically
 * attach user_id to a quiz attempt without gating the request on being logged in.
 *
 * Expired sessions found here are deleted on the spot (lazy cleanup) — a
 * single-user app doesn't need a cron job for this.
 */
export function getSessionUser(req) {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) return null;

  const row = getSession.get(token);
  if (!row) return null;

  if (row.expires_at <= Date.now()) {
    deleteSession.run(token);
    return null;
  }

  return { id: row.user_id, email: row.email };
}

/** Gate a route on a valid session. Attaches req.user = { id, email } or 401s. */
export function requireAuth(req, res, next) {
  const user = getSessionUser(req);
  if (!user) return res.status(401).json({ error: "not authenticated" });
  req.user = user;
  next();
}
