// Who owns the rows this request may touch.
//
// Before this module, every per-user route repeated the same two lines:
//
//     const user = getSessionUser(req);
//     const userId = user?.id ?? ANON_USER_ID;   // ANON_USER_ID = 0
//
// 26 copies of it, and the `0` fallback was the bug: it is a REAL user id as
// far as SQL is concerned, so every logged-out visitor read and wrote one
// shared pile of attempts, FSRS state and suspensions. Two people on the same
// install saw each other's history, and a quiz taken before logging in landed
// somewhere the account could never see.
//
// The replacement is a single global resolve step (attachUser) plus two rules:
//
//   WRITES  — requireUser. No session, no row. There is no anonymous owner to
//             fall back to any more, so the write is refused rather than
//             misfiled.
//   READS   — req.userId threaded straight into the query. It is `null` when
//             logged out, and `user_id = NULL` is never true in SQL, so the
//             query matches nothing and the route's existing builders produce
//             a correctly shaped EMPTY payload through the ordinary code path.
//
// That last point is the whole reason reads are not gated. src/api/client.js
// throws a generic Error on any non-2xx and the frontend has no 401 handling
// anywhere, so a 401 on a read would surface as an error toast instead of an
// empty state. A 200 carrying nothing renders as nothing, with no frontend
// change — which is the requirement.
//
// NOT EVERY READ CAN THREAD NULL, and assuming so is a trap worth naming.
// A query shaped `NOT EXISTS (SELECT 1 FROM item_review_state WHERE user_id =
// @userId AND ...)` — which is how /queue and /counts find NEW material —
// becomes vacuously TRUE under a null user, so a logged-out queue would come
// back FULL of new items rather than empty. Those routes return an explicit
// empty payload up front instead. See EMPTY_QUEUE / EMPTY_COUNTS below.
import db from "./db.js";
import { getSessionUser } from "./auth.js";

/**
 * Resolve the session once per request. Sets `req.userId` (number) or `null`,
 * and `req.user` ({ id, email }) or `null`.
 *
 * Mounted on /api only, never app-wide: server/index.js also serves dist/ and
 * a SPA catch-all beneath these routes, and mounting globally would run a
 * sessions-table lookup for every JS chunk, font and figure the page loads.
 */
export function attachUser(req, res, next) {
  const user = getSessionUser(req);
  req.user = user;
  req.userId = user?.id ?? null;
  next();
}

/**
 * Gate a WRITE on a real account. 401s when there is no session.
 *
 * Deliberately separate from auth.js's requireAuth, which this does not
 * replace: requireAuth re-reads the session itself, while this one trusts the
 * `req.userId` attachUser already resolved. Both 401 with the same body, so
 * the two are interchangeable from the client's side.
 */
export function requireUser(req, res, next) {
  if (req.userId == null) {
    return res.status(401).json({ error: "not authenticated" });
  }
  next();
}

const isAdminRow = db.prepare("SELECT is_admin FROM users WHERE id = ?");

/**
 * Gate a route on an account allowed to change SHARED content.
 *
 * 401 when logged out, 403 when logged in but not an admin — the distinction
 * matters to the caller: one is fixable by signing in, the other is not.
 *
 * Read fresh from the row rather than from the session, so revoking the flag
 * takes effect on the next request instead of whenever a 30-day cookie happens
 * to expire.
 */
export function requireAdmin(req, res, next) {
  if (req.userId == null) {
    return res.status(401).json({ error: "not authenticated" });
  }
  if (!isAdminRow.get(req.userId)?.is_admin) {
    return res.status(403).json({ error: "this account may not edit course content" });
  }
  next();
}
