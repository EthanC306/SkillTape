import fs from "node:fs";
import os from "node:os";
import path from "node:path";

/**
 * Point server/db.js at a throwaway database, unique to this test file.
 *
 * Two things make this necessary rather than tidy:
 *
 *  1. server/db.js opens a connection and runs its guarded ALTER TABLEs at
 *     IMPORT time. Anything that reaches it — including files that only want a
 *     pure helper out of routes/drill.js — migrates a real database as a side
 *     effect of being imported. `npm test` used to migrate the developer's own
 *     progress database on every run.
 *  2. `node --test` runs test FILES in parallel processes. A single shared
 *     override path is not enough: two processes racing CREATE TABLE and ALTER
 *     TABLE against one SQLite file fail intermittently, which is exactly what
 *     happened when the override was set once in package.json.
 *
 * So: one database per file, keyed off the caller's own module URL, removed on
 * the way out. Call this BEFORE importing anything that pulls in server/db.js,
 * which in practice means using `await import(...)` for those below it.
 *
 * @param {string} moduleUrl the caller's `import.meta.url`
 * @returns {string} the database path, already set as process.env.SKILLTAPE_DB
 */
export function isolatedTestDb(moduleUrl) {
  const name = path.basename(new URL(moduleUrl).pathname, ".js");
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `skilltape-${name}-`));
  const dbPath = path.join(dir, "test.db");
  process.env.SKILLTAPE_DB = dbPath;
  process.on("exit", () => fs.rmSync(dir, { recursive: true, force: true }));
  return dbPath;
}

/**
 * Create a real account plus a live session row, and return the Cookie header
 * value that authenticates as it.
 *
 * Deliberately goes through the actual `users`/`sessions` tables and the real
 * cookie name rather than stubbing `req.userId`: the thing most worth testing
 * after the anonymous bucket was removed is that a request with no valid
 * session genuinely cannot write, and a stub would route around exactly that.
 *
 * @param {import("better-sqlite3").Database} db the already-open test database
 * @param {string} [email] defaults to a unique address per call
 * @param {{ admin?: boolean }} [opts] admin grants the content-editing flag
 * @returns {{ userId: number, cookie: string }}
 */
export function signIn(
  db,
  email = `u${Date.now()}${Math.random().toString(36).slice(2, 8)}@example.com`,
  { admin = false } = {}
) {
  const now = Date.now();
  const { lastInsertRowid: userId } = db
    .prepare("INSERT INTO users (email, password_hash, created_at, is_admin) VALUES (?, ?, ?, ?)")
    .run(email, "not-a-real-hash", now, admin ? 1 : 0);
  const token = `test-session-${userId}-${Math.random().toString(36).slice(2)}`;
  db.prepare(
    "INSERT INTO sessions (id, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)"
  ).run(token, userId, now, now + 3600_000);
  // Must match COOKIE_NAME in server/auth.js.
  return { userId: Number(userId), cookie: `skilltape_session=${token}` };
}
