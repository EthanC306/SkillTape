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
