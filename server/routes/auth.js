// Account routes: signup, login, logout, and "who am I".
//
// Like topics.js and progress.js, the request body is treated as hostile —
// validated up front, before any hashing or SQL, with the same BadRequest /
// fail() convention so a malformed request is a clean 400 naming the field,
// not a raw 500.
import { Router } from "express";
import db from "../db.js";
import { rateLimit } from "../rateLimit.js";
import {
  hashPassword,
  verifyPassword,
  verifyPasswordDummy,
  createSession,
  clearSessionCookie,
  deleteSessionForRequest,
  requireAuth,
} from "../auth.js";

const router = Router();

// Bounds, not policy — same philosophy as topics.js's MAX_ITEMS/MAX_STRING.
const MAX_EMAIL = 254; // practical RFC 5321 cap
const MIN_PASSWORD = 8;
const MAX_PASSWORD = 200; // bcrypt itself ignores bytes past 72; this just stops a huge body

const getIsAdmin = db.prepare("SELECT is_admin FROM users WHERE id = ?");

/** Whether an account may edit shared content. See users.is_admin in schema.sql. */
function isAdmin(userId) {
  return Boolean(getIsAdmin.get(userId)?.is_admin);
}

/** A rejected payload. The handlers convert this — and only this — into a 400. */
class BadRequest extends Error {}

function fail(message) {
  throw new BadRequest(message);
}

// Minimal shape check (something@something.something) — not a full RFC 5322
// validator, which is a rabbit hole with no payoff for a single-user app's
// signup form. The real check that an email is "valid" is: can this person
// receive mail there — this app has no email verification, so it isn't
// answerable here regardless.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function requireEmail(body) {
  const email = body?.email;
  if (typeof email !== "string" || !email.trim()) fail("email must not be blank");
  if (email.length > MAX_EMAIL) fail(`email exceeds ${MAX_EMAIL} characters`);
  if (!EMAIL_RE.test(email.trim())) fail("email looks invalid");
  return email.trim();
}

function requirePassword(body) {
  const password = body?.password;
  if (typeof password !== "string" || !password) fail("password must not be blank");
  if (password.length > MAX_PASSWORD) fail(`password exceeds ${MAX_PASSWORD} characters`);
  return password;
}

/** Signup enforces a minimum length; login doesn't — a login attempt with a
 *  too-short password is just a wrong password, and should 401 like any
 *  other, not 400 in a way that hints the account might exist. */
function signupCreds(body) {
  const email = requireEmail(body);
  const password = requirePassword(body);
  if (password.length < MIN_PASSWORD) {
    fail(`password must be at least ${MIN_PASSWORD} characters`);
  }
  return { email, password };
}

function loginCreds(body) {
  return { email: requireEmail(body), password: requirePassword(body) };
}

// ── Rate limits ─────────────────────────────────────────────────────────────
//
// bcrypt at cost 12 already makes each guess cost ~200ms, which bounds the rate
// but never stops it: left alone, a script gets ~5 guesses a second forever.
// These add a ceiling.
//
// Login keys on BOTH the client address and the target email, because the two
// attacks are shaped differently and one bucket cannot catch both:
//   * one IP guessing many accounts  -> caught by the IP key
//   * many IPs guessing ONE account  -> caught by the email key
// A successful login clears its own buckets (req.clearRateLimit), so mistyping
// a password a few times and then getting it right does not leave you locked
// out for the rest of the window.
//
// Signup keys on IP only — there is no target account yet, by definition.
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const SIGNUP_WINDOW_MS = 60 * 60 * 1000;

/** Lower-cased so casing does not create a fresh bucket; users.email is NOCASE. */
function emailKey(req) {
  const email = req.body?.email;
  return typeof email === "string" ? `email:${email.trim().toLowerCase()}` : "email:<none>";
}

const loginLimiter = rateLimit({
  windowMs: LOGIN_WINDOW_MS,
  max: 10,
  keys: (req) => [`ip:${req.ip}`, emailKey(req)],
  message: "too many login attempts — wait a few minutes and try again",
});

// Deliberately looser and per-IP: this one exists to stop a script filling the
// users table, not to protect an individual account.
const signupLimiter = rateLimit({
  windowMs: SIGNUP_WINDOW_MS,
  max: 5,
  keys: (req) => [`ip:${req.ip}`],
  message: "too many accounts created from this address — try again later",
});

const insertUser = db.prepare(
  "INSERT INTO users (email, password_hash, created_at, is_admin) VALUES (?, ?, ?, ?)"
);
const countUsers = db.prepare("SELECT COUNT(*) AS n FROM users");

/**
 * Create the account, making it an admin if it is the FIRST one on the install.
 *
 * db.js has a bootstrap that promotes the lowest-numbered account when no admin
 * exists, but that runs at boot — on a brand-new install there are no users yet,
 * so it promotes nobody, and the person who then signs up cannot edit content
 * until the server is restarted. The two together cover both cases: db.js
 * handles a database that predates the flag, this handles a database that is
 * still empty.
 *
 * One transaction so the count and the insert cannot interleave and mint two
 * "first" admins.
 */
const createUser = db.transaction((email, passwordHash) => {
  const isFirst = countUsers.get().n === 0;
  const info = insertUser.run(email, passwordHash, Date.now(), isFirst ? 1 : 0);
  return { id: Number(info.lastInsertRowid), email, isAdmin: isFirst };
});
const getUserByEmail = db.prepare("SELECT * FROM users WHERE email = ?");

// POST /api/auth/signup — body { email, password }.
router.post("/signup", signupLimiter, async (req, res) => {
  let email, password;
  try {
    ({ email, password } = signupCreds(req.body));
  } catch (err) {
    if (err instanceof BadRequest) return res.status(400).json({ error: err.message });
    throw err;
  }

  const passwordHash = await hashPassword(password);

  let user;
  try {
    user = createUser(email, passwordHash);
  } catch (err) {
    // users.email is UNIQUE COLLATE NOCASE (schema.sql) — the everyday
    // "you already have an account" path, not a server fault. Caught here so
    // it reaches the client as a clean 409 instead of index.js's 500 handler.
    if (err.code?.startsWith("SQLITE_CONSTRAINT")) {
      return res.status(409).json({ error: "an account with that email already exists" });
    }
    throw err;
  }

  createSession(res, user);
  res.status(201).json({ id: user.id, email: user.email, isAdmin: user.isAdmin });
});

// POST /api/auth/login — body { email, password }.
router.post("/login", loginLimiter, async (req, res) => {
  let email, password;
  try {
    ({ email, password } = loginCreds(req.body));
  } catch (err) {
    if (err instanceof BadRequest) return res.status(400).json({ error: err.message });
    throw err;
  }

  // Same generic 401 whether the email doesn't exist or the password is
  // wrong for it — telling those apart lets a caller enumerate registered
  // emails one guess at a time.
  const invalid = () => res.status(401).json({ error: "invalid email or password" });

  const row = getUserByEmail.get(email);
  if (!row) {
    // Deliberately does the work anyway. Returning here directly is ~30x faster
    // than the branch below, which makes the response TIME reveal whether the
    // address is registered even though the response BODY is identical. See
    // verifyPasswordDummy in server/auth.js.
    await verifyPasswordDummy(password);
    return invalid();
  }

  const ok = await verifyPassword(password, row.password_hash);
  if (!ok) return invalid();

  // Proven identity — do not keep counting this address or account as suspect.
  req.clearRateLimit?.();

  createSession(res, { id: row.id, email: row.email });
  res.json({ id: row.id, email: row.email, isAdmin: Boolean(row.is_admin) });
});

// POST /api/auth/logout — delete the session row and clear the cookie.
// Idempotent: logging out with no session (or an already-expired one) is a
// harmless no-op, not an error.
router.post("/logout", (req, res) => {
  deleteSessionForRequest(req);
  clearSessionCookie(res);
  res.status(204).end();
});

// GET /api/auth/me — who the current session belongs to.
router.get("/me", requireAuth, (req, res) => {
  res.json({ id: req.user.id, email: req.user.email, isAdmin: isAdmin(req.user.id) });
});

export default router;
