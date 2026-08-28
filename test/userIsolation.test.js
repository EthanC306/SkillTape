// The guarantee this whole change exists to provide: two accounts share the
// same course content and share NOTHING else, and a logged-out app shows
// nothing at all.
//
// Drives the real routers over real SQL, like dueRule.test.js — an isolation
// test that inspected the tables directly would pass even if a route forgot
// its WHERE clause, which is precisely the bug that was shipped.
import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import cookieParser from "cookie-parser";
import { isolatedTestDb, signIn } from "./helpers/testDb.js";

isolatedTestDb(import.meta.url);

const { default: db } = await import("../server/db.js");
const { default: drillRouter } = await import("../server/routes/drill.js");
const { default: progressRouter } = await import("../server/routes/progress.js");
const { default: statsRouter } = await import("../server/routes/stats.js");
const { attachUser } = await import("../server/userScope.js");

const COURSE = "isocourse";
const TZ = new Date().getTimezoneOffset();

db.exec(`
  INSERT INTO courses (id, title) VALUES ('${COURSE}', 'Isolation');
  INSERT INTO topics (id, course_id, title, position) VALUES ('t1', '${COURSE}', 'Topic One', 0);
`);
const addItem = db.prepare(`
  INSERT INTO items (id, topic_id, position, format, origin, prompt, verified_by_human, retired)
  VALUES (?, 't1', ?, 'recall', 'authored', 'q?', 1, 0)
`);
for (const [id, pos] of [["i1", 1], ["i2", 2], ["i3", 3]]) addItem.run(id, pos);

db.prepare(
  `INSERT INTO questions (topic_id, position, stable_id, revision, prompt, answer)
   VALUES ('t1', 1, 'q-01', 1, 'prompt?', 0)`
).run();

// Two accounts on one install — the scenario the user_id = 0 bucket destroyed.
const A = signIn(db, "alice@example.com");
const B = signIn(db, "bob@example.com");

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use("/api/drill", attachUser, drillRouter);
app.use("/api/stats", attachUser, statsRouter);
app.use("/api", attachUser, progressRouter);
const server = app.listen(0);
const base = `http://127.0.0.1:${server.address().port}`;

test.after(() => {
  server.close();
  db.close();
});

/** `who` is a signIn() result, or null for logged out. */
function req(who, path, { method = "GET", body } = {}) {
  return fetch(`${base}${path}`, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(who ? { Cookie: who.cookie } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

async function json(who, path) {
  const res = await req(who, path);
  assert.equal(res.status, 200, `GET ${path} as ${who ? who.userId : "anon"}`);
  return res.json();
}

const gradeItem = (who, itemId) =>
  req(who, "/api/drill/attempts", {
    method: "POST",
    body: { itemId, mode: "closed", surface: "drill", grade: 3, seconds: 4 },
  });

// ── The histories diverge ───────────────────────────────────────────────────

test("two accounts drilling different items keep independent review state", async () => {
  assert.equal((await gradeItem(A, "i1")).status, 201);
  assert.equal((await gradeItem(A, "i2")).status, 201);
  assert.equal((await gradeItem(B, "i3")).status, 201);

  const seen = (userId) =>
    db
      .prepare("SELECT item_id FROM item_review_state WHERE user_id = ? ORDER BY item_id")
      .all(userId)
      .map((r) => r.item_id);

  assert.deepEqual(seen(A.userId), ["i1", "i2"]);
  assert.deepEqual(seen(B.userId), ["i3"], "B must not inherit A's two items");
  assert.equal(
    db.prepare("SELECT COUNT(*) n FROM item_review_state WHERE user_id = 0").get().n,
    0,
    "nothing may land in the retired anonymous bucket"
  );
});

test("/api/drill/stats reports only the caller's attempts", async () => {
  const a = await json(A, `/api/drill/stats?course=${COURSE}`);
  const b = await json(B, `/api/drill/stats?course=${COURSE}`);
  // Same topic, different totals — A graded two items there, B graded one.
  assert.equal(a.t1.attempts, 2);
  assert.equal(b.t1.attempts, 1);
});

test("quiz history is per account, the leak /api/progress used to have", async () => {
  const post = await req(A, "/api/attempts", {
    method: "POST",
    body: {
      topicId: "t1",
      runId: "run-a-1",
      results: [{ questionStableId: "q-01", questionRevision: 1, correct: true }],
    },
  });
  assert.equal(post.status, 201);

  const a = await json(A, "/api/progress");
  assert.equal(a.t1.runs, 1, "A sees the run A recorded");

  const b = await json(B, "/api/progress");
  assert.deepEqual(b, {}, "B must not see A's quiz run");
});

test("/api/questions/stats counts only the caller's answers, but still lists unanswered questions", async () => {
  const a = await json(A, "/api/questions/stats");
  const b = await json(B, "/api/questions/stats");

  assert.equal(a.length, 1);
  assert.equal(a[0].attempts, 1, "A answered it once");

  // The LEFT JOIN must survive scoping: B has answered nothing, so the question
  // still has to appear with attempts: 0 rather than vanish from the list.
  assert.equal(b.length, 1, "an unanswered question must still be listed");
  assert.equal(b[0].attempts, 0);
});

test("suspensions do not cross accounts", async () => {
  const res = await req(A, "/api/drill/suspensions", {
    method: "POST",
    body: { itemIds: ["i1"] },
  });
  assert.equal(res.status, 200);

  assert.deepEqual((await json(A, "/api/drill/suspensions")).itemIds, ["i1"]);
  assert.deepEqual((await json(B, "/api/drill/suspensions")).itemIds, []);
});

test("scheduler settings are per account", async () => {
  const res = await req(A, "/api/drill/settings", {
    method: "PUT",
    body: { dailyNewLimit: 3 },
  });
  assert.equal(res.status, 200);

  assert.equal((await json(A, "/api/drill/settings")).dailyNewLimit, 3);
  assert.equal(
    (await json(B, "/api/drill/settings")).dailyNewLimit,
    10,
    "B keeps the default, not A's choice"
  );
});

// ── Logged out shows nothing ────────────────────────────────────────────────

test("every per-user read is 200-and-empty when logged out", async () => {
  assert.deepEqual(await json(null, "/api/progress"), {});
  assert.deepEqual(await json(null, `/api/drill/stats?course=${COURSE}`), {});
  assert.deepEqual(await json(null, `/api/drill/queue?course=${COURSE}&tz=${TZ}`), []);
  assert.deepEqual((await json(null, `/api/drill/suspensions`)).itemIds, []);

  // Not merely falsy — the shape has to match the populated one field for
  // field, because src/api/client.js throws on a non-2xx and the components
  // read these keys directly.
  const counts = await json(null, `/api/drill/counts?course=${COURSE}&tz=${TZ}`);
  const populated = await json(A, `/api/drill/counts?course=${COURSE}&tz=${TZ}`);
  assert.deepEqual(
    Object.keys(counts).sort(),
    Object.keys(populated).sort(),
    "the empty payload must carry every key the populated one does"
  );
  assert.equal(counts.reviewable, 0);
  assert.equal(counts.newAvailable, 0, "an unseen item is not 'new' to nobody");
  assert.deepEqual(counts.byTopic, {});

  // Content still loads — the grid draws its rows, with no history in them.
  const summary = await json(null, `/api/stats/summary?course=${COURSE}`);
  assert.equal(summary.topics.length, 1, "course content stays visible logged out");
  assert.deepEqual(summary.cells, [], "but carries no history");

  assert.deepEqual((await json(null, `/api/stats/sessions?course=${COURSE}`)).sessions, []);
  assert.equal((await json(null, "/api/stats/view")).view, "grid");
  assert.deepEqual((await json(null, "/api/drill/export")).attempts, []);
});

test("every per-user write is 401 when logged out", async () => {
  const writes = [
    ["/api/drill/attempts", "POST", { itemId: "i1", mode: "closed", grade: 3, seconds: 1 }],
    ["/api/attempts", "POST", { topicId: "t1", runId: "r", results: [{ correct: true }] }],
    ["/api/drill/settings", "PUT", { dailyNewLimit: 5 }],
    ["/api/drill/suspensions", "POST", { itemIds: ["i1"] }],
    ["/api/drill/suspensions", "DELETE", undefined],
    ["/api/drill/suspensions/i1", "DELETE", undefined],
    ["/api/drill/items/i1/reset", "POST", undefined],
    ["/api/drill/leeches/i1/reset", "POST", undefined],
    ["/api/drill/import", "POST", { attempts: [] }],
    ["/api/stats/view", "PUT", { view: "sessions" }],
  ];
  for (const [path, method, body] of writes) {
    const res = await req(null, path, { method, body });
    assert.equal(res.status, 401, `${method} ${path} must refuse an anonymous write`);
  }
});

test("a logged-out write leaves no trace anywhere", async () => {
  const before = db.prepare("SELECT COUNT(*) n FROM item_attempts").get().n;
  await req(null, "/api/drill/attempts", {
    method: "POST",
    body: { itemId: "i1", mode: "closed", grade: 3, seconds: 1 },
  });
  assert.equal(db.prepare("SELECT COUNT(*) n FROM item_attempts").get().n, before);
});

// ── The migration's own safety rule ─────────────────────────────────────────

test("the ownership lockdown refuses to drop unclaimed history, but clears preferences", async () => {
  const { default: Database } = await import("better-sqlite3");
  const { lockUserOwnership, claimOrphans, countOrphans } = await import("../server/migrations.js");
  const fs = await import("node:fs");
  const os = await import("node:os");
  const path = await import("node:path");

  // A database in the OLD shape: nullable user_id, sentinel rows, no FK.
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "skilltape-lock-"));
  const legacy = new Database(path.join(dir, "legacy.db"));
  legacy.exec(`
    CREATE TABLE users (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT, password_hash TEXT, created_at INTEGER);
    CREATE TABLE topics (id TEXT PRIMARY KEY);
    CREATE TABLE items (id TEXT PRIMARY KEY);
    CREATE TABLE attempts (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER,
      run_id TEXT, topic_id TEXT, position INTEGER, correct INTEGER, created_at INTEGER);
    CREATE TABLE item_review_state (user_id INTEGER NOT NULL DEFAULT 0, item_id TEXT, due_on INTEGER,
      PRIMARY KEY (user_id, item_id));
    CREATE TABLE item_attempts (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL DEFAULT 0,
      item_id TEXT, ts INTEGER, mode TEXT, seconds INTEGER);
    CREATE TABLE item_suspensions (user_id INTEGER NOT NULL DEFAULT 0, item_id TEXT, suspended_at INTEGER,
      PRIMARY KEY (user_id, item_id));
    CREATE TABLE scheduler_settings (user_id INTEGER PRIMARY KEY DEFAULT 0, updated_at INTEGER);
    CREATE TABLE ui_settings (user_id INTEGER PRIMARY KEY DEFAULT 0, report_view TEXT, updated_at INTEGER);
    INSERT INTO users (email, password_hash, created_at) VALUES ('owner@example.com', 'x', 0);
    INSERT INTO topics (id) VALUES ('t1');
    INSERT INTO items (id) VALUES ('i1');
    INSERT INTO attempts (user_id, run_id, topic_id, position, correct, created_at)
      VALUES (NULL, 'r1', 't1', 0, 1, 0);
    INSERT INTO item_attempts (user_id, item_id, ts, mode, seconds) VALUES (0, 'i1', 0, 'closed', 1);
    INSERT INTO ui_settings (user_id, report_view, updated_at) VALUES (0, 'grid', 0);
  `);

  assert.deepEqual(countOrphans(legacy), {
    attempts: 1,
    item_attempts: 1,
    ui_settings: 1,
  });

  // History present -> refuse, loudly, naming the recovery step.
  assert.throws(
    () => lockUserOwnership(legacy),
    /Refusing to migrate.*claimAnonymousData/s,
    "unrecoverable history must stop the migration, not be deleted by it"
  );
  assert.equal(
    legacy.prepare("SELECT COUNT(*) n FROM item_attempts").get().n,
    1,
    "and the refused migration must not have destroyed anything on its way out"
  );

  // Claim the history; the disposable preference row goes with it.
  const owner = legacy.prepare("SELECT id FROM users").get().id;
  claimOrphans(legacy, owner);
  assert.deepEqual(countOrphans(legacy), {});

  const result = lockUserOwnership(legacy);
  assert.deepEqual(result.rebuilt.sort(), [
    "attempts",
    "item_attempts",
    "item_review_state",
    "item_suspensions",
    "scheduler_settings",
    "ui_settings",
  ]);

  // History survived the rebuild and now belongs to the account.
  assert.equal(legacy.prepare("SELECT user_id FROM attempts").get().user_id, owner);
  assert.equal(legacy.prepare("SELECT user_id FROM item_attempts").get().user_id, owner);

  // And the sentinel can never come back.
  legacy.pragma("foreign_keys = ON");
  assert.throws(() =>
    legacy.prepare("INSERT INTO ui_settings (report_view, updated_at) VALUES (?, ?)").run("grid", 0)
  );
  assert.throws(() =>
    legacy.prepare("INSERT INTO item_attempts (user_id, item_id, ts, mode, seconds) VALUES (0,'i1',0,'closed',1)").run()
  );

  // Idempotent: a second run is a no-op.
  assert.deepEqual(lockUserOwnership(legacy).rebuilt, []);

  legacy.close();
  fs.rmSync(dir, { recursive: true, force: true });
});
