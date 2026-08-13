/**
 * newSessionId — a fresh id for one study sitting, minted client-side.
 *
 * Every attempt sent during one Drill / Practice / Exam sitting carries the
 * same value, which is what lets the Report group them back into a session
 * exactly (server/sessions.js). The client is the only place that KNOWS where a
 * sitting starts and ends — the server sees isolated POSTs — so the id is
 * generated here rather than handed out by an endpoint.
 *
 * There is deliberately no `study_sessions` table behind this. An explicit
 * session row would have to be opened on entry and closed on exit, and a crash
 * or a force-quit would leave it open forever with no way to distinguish "still
 * going" from "died mid-drill". A tag on the append-only attempt log has no
 * lifecycle to get wrong: rows that made it are grouped, rows that didn't
 * simply aren't there.
 *
 * `crypto.randomUUID` needs a secure context, which covers every way this app
 * actually runs (https, http://localhost under Vite, and Electron's file://).
 * The fallback exists for the one case that isn't: a self-hosted server reached
 * over plain http by IP or LAN hostname, where the API is missing entirely and
 * an unguarded call would throw inside the attempt handler and silently cost
 * the session its grouping. Uniqueness only has to hold within one user's
 * database, so 128 bits of Math.random is ample here even though it would not
 * be for anything security-bearing.
 */
export default function newSessionId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  const rand = () => Math.floor(Math.random() * 0xffffffff).toString(16).padStart(8, "0");
  return `${rand()}-${rand()}-${rand()}-${rand()}`;
}
