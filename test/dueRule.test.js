// What "due" means, and the invariant it exists to protect: GET /counts and
// GET /queue must always agree.
//
// Two halves, because a single day-granular rule shipped wrong once: it is
// right for review cards and wrong for learning cards, whose steps are 1 and
// 10 minutes, so a card graded seconds ago was immediately "due" again.
//
// Drives the real router over real SQL against a throwaway database — a test
// that reimplemented the WHERE clause would have agreed with the bug.
import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { isolatedTestDb } from "./helpers/testDb.js";

// Must run BEFORE server/db.js is imported — it reads the path at import time
// and opens exactly one connection.
isolatedTestDb(import.meta.url);

const { default: db } = await import("../server/db.js");
const { default: drillRouter } = await import("../server/routes/drill.js");
const { dueBoundary } = await import("../server/fsrs.js");

const MINUTE = 60000;
const DAY = 86400000;

// Still today, whatever time the suite happens to run. A fixed "+6 hours"
// lands tomorrow for anyone running after 18:00, which made this file pass in
// the morning and fail in the evening.
const LATER_TODAY = dueBoundary(new Date()) - Date.now() - MINUTE;
const COURSE = "testcourse";
const TZ = new Date().getTimezoneOffset();

// Inside the last minute of the local day there is no "later today" left to
// test, and the boundary would roll over mid-run. Say so rather than assert
// something else by accident.
assert.ok(LATER_TODAY > 0, "run this suite more than a minute before local midnight");

const STATE = { LEARNING: 1, REVIEW: 2, RELEARNING: 3 };

db.exec(`
  INSERT INTO courses (id, title) VALUES ('${COURSE}', 'Test');
  INSERT INTO topics (id, course_id, title, position) VALUES ('t1', '${COURSE}', 'Topic One', 0);
`);

const addItem = db.prepare(`
  INSERT INTO items (id, topic_id, position, format, origin, prompt, verified_by_human, retired)
  VALUES (?, 't1', ?, 'recall', 'authored', 'q?', 1, 0)
`);
const addState = db.prepare(`
  INSERT INTO item_review_state
    (user_id, item_id, state, difficulty, stability, due_on, reps, lapses, leech, last_reviewed_at)
  VALUES (0, ?, ?, 5, 10, ?, 1, 0, ?, ?)
`);

/** One item plus, optionally, the scheduling state that makes it due or not. */
function item(id, position, state, dueOffsetMs, { leech = false } = {}) {
  addItem.run(id, position);
  if (state != null) addState.run(id, state, Date.now() + dueOffsetMs, leech ? 1 : 0, Date.now() - DAY);
}

// The fixture is built entirely out of the cases the two halves of the rule
// disagree about.
item("rev-overdue", 1, STATE.REVIEW, -2 * DAY); //           due: overdue
item("rev-later-today", 2, STATE.REVIEW, LATER_TODAY); //    due: day-granular, so today counts
item("rev-tomorrow", 3, STATE.REVIEW, +2 * DAY); //          not due
item("learn-ready", 4, STATE.LEARNING, -1 * MINUTE); //      due: its step has elapsed
item("learn-pending", 5, STATE.LEARNING, +10 * MINUTE); //   NOT due — this is the bug
item("relearn-pending", 6, STATE.RELEARNING, +10 * MINUTE); // NOT due, same reason
item("relearn-ready", 7, STATE.RELEARNING, -30 * MINUTE); // due
item("leech", 8, STATE.REVIEW, -5 * DAY, { leech: true }); // excluded outright (A8)
item("fresh-a", 9, null); //                                 new
item("fresh-b", 10, null); //                                new

const app = express();
app.use(express.json());
app.use("/api/drill", drillRouter);
const server = app.listen(0);
const base = `http://127.0.0.1:${server.address().port}/api/drill`;

test.after(() => {
  server.close();
  db.close();
});

const get = async (p) => {
  const res = await fetch(`${base}${p}`);
  assert.equal(res.status, 200, `GET ${p}`);
  return res.json();
};

const put = async (p, body) => {
  const res = await fetch(`${base}${p}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  assert.equal(res.status, 200, `PUT ${p}`);
  return res.json();
};

test("a review card due later today counts as due; a learning step that hasn't elapsed does not", async () => {
  const c = await get(`/counts?course=${COURSE}&tz=${TZ}`);

  // rev-overdue + rev-later-today. rev-tomorrow is past the day boundary.
  assert.equal(c.due, 2, "review cards due before end of local day");
  // learn-ready + relearn-ready. The two pending ones are the regression.
  assert.equal(c.learning, 2, "only learning cards whose step has actually elapsed");
  assert.equal(c.newAvailable, 2, "two never-reviewed items");
});

test("the queue serves exactly the items the counts promised", async () => {
  const c = await get(`/counts?course=${COURSE}&tz=${TZ}`);
  const q = await get(`/queue?course=${COURSE}&limit=200&tz=${TZ}`);
  assert.equal(
    q.length,
    c.reviewable,
    `"Start review (${c.reviewable})" must hand back ${c.reviewable} items, got ${q.length}`
  );

  const ids = q.map((i) => i.id).sort();
  assert.deepEqual(ids, [
    "fresh-a",
    "fresh-b",
    "learn-ready",
    "relearn-ready",
    "rev-later-today",
    "rev-overdue",
  ]);
});

test("a card whose learning step has not elapsed is counted as scheduled, not lost", async () => {
  const c = await get(`/counts?course=${COURSE}&tz=${TZ}`);
  // learn-pending, relearn-pending, rev-tomorrow. The leech is excluded from
  // both halves — it needs triage, not rotation.
  assert.equal(c.later, 3);
  assert.ok(c.nextDueOn > Date.now(), "and the next one is genuinely in the future");
});

test("leeches are excluded from every count and from the queue", async () => {
  const q = await get(`/queue?course=${COURSE}&limit=200&tz=${TZ}`);
  assert.ok(!q.some((i) => i.id === "leech"));

  const c = await get(`/counts?course=${COURSE}&tz=${TZ}`);
  assert.equal(c.byTopic.t1.leeches, 1, "but the topic card still reports it, so it can be triaged");
});

test("the learning bucket ordering puts elapsed steps ahead of overdue reviews", async () => {
  const q = await get(`/queue?course=${COURSE}&limit=200&tz=${TZ}`);
  const firstReviewAt = q.findIndex((i) => i.id.startsWith("rev-"));
  const lastLearningAt = q.findLastIndex((i) => /^(learn|relearn)-/.test(i.id));
  // Without this, a queue missing one bucket entirely compares against -1 and
  // passes for the wrong reason.
  assert.ok(firstReviewAt >= 0 && lastLearningAt >= 0, "both buckets must be present to order them");
  assert.ok(
    lastLearningAt < firstReviewAt,
    "learning and relearning come first — their steps are minutes and go stale fastest"
  );
  // New items are the tail, after everything already in rotation.
  assert.deepEqual(q.slice(-2).map((i) => i.id), ["fresh-a", "fresh-b"]);
});

test("the daily new-item limit caps how many unseen items a session introduces", async (t) => {
  // Registered before the write, so a failing assertion below can't leave the
  // cap in place for every test that follows.
  t.after(() => put("/settings", { dailyNewLimit: 10 }));
  await put("/settings", { dailyNewLimit: 1 });

  const c = await get(`/counts?course=${COURSE}&tz=${TZ}`);
  assert.equal(c.newAvailable, 2, "two are still unseen");
  assert.equal(c.new, 1, "but only one may be introduced today");

  const q = await get(`/queue?course=${COURSE}&limit=200&tz=${TZ}`);
  assert.equal(q.filter((i) => i.id.startsWith("fresh-")).length, 1);
  assert.equal(q.length, c.reviewable, "and the counts still match the queue under the cap");
});

test("every queued item carries the four intervals the grade bar renders", async () => {
  const q = await get(`/queue?course=${COURSE}&limit=200&tz=${TZ}`);
  for (const it of q) {
    for (const label of ["again", "hard", "good", "easy"]) {
      assert.ok(it.preview?.[label], `${it.id} is missing its ${label} preview`);
      assert.equal(typeof it.preview[label].intervalMinutes, "number");
    }
    assert.ok(
      it.preview.again.intervalMinutes <= it.preview.easy.intervalMinutes,
      `${it.id}: Again must not schedule further out than Easy`
    );
  }
});

test("grading an item removes it from the due queue and the counts together", async () => {
  const before = await get(`/counts?course=${COURSE}&tz=${TZ}`);

  const res = await fetch(`${base}/attempts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ itemId: "rev-overdue", mode: "closed", grade: 2, seconds: 5 }),
  });
  assert.equal(res.status, 201);

  const after = await get(`/counts?course=${COURSE}&tz=${TZ}`);
  assert.equal(after.reviewable, before.reviewable - 1, "the count has to actually fall");

  const q = await get(`/queue?course=${COURSE}&limit=200&tz=${TZ}`);
  assert.ok(!q.some((i) => i.id === "rev-overdue"), "and the item must not be served again");
  assert.equal(q.length, after.reviewable);
});
