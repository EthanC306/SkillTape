// Who may change the curriculum everyone reads.
//
// The regression this pins: PUT /api/topics/:id/cards checked only that a
// request was logged in. Signup is open, so any account could send
// {"cards": []} and empty a topic for every user of the install. That was not
// theoretical — it was confirmed against a real database during a security
// pass, and it deleted a topic's cards.
import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import cookieParser from "cookie-parser";
import { isolatedTestDb, signIn } from "./helpers/testDb.js";

isolatedTestDb(import.meta.url);

const { default: db } = await import("../server/db.js");
const { default: topicsRouter } = await import("../server/routes/topics.js");
const { attachUser } = await import("../server/userScope.js");

db.exec(`
  INSERT INTO courses (id, title) VALUES ('authz', 'Authz');
  INSERT INTO topics (id, course_id, title, position) VALUES ('t1', 'authz', 'Topic One', 0);
  INSERT INTO cards (topic_id, position, heading, body) VALUES ('t1', 0, 'Card A', 'body a');
  INSERT INTO cards (topic_id, position, heading, body) VALUES ('t1', 1, 'Card B', 'body b');
`);

const ADMIN = signIn(db, "admin@example.com", { admin: true });
const PLAIN = signIn(db, "plain@example.com");

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use("/api/topics", attachUser, topicsRouter);
const server = app.listen(0);
const base = `http://127.0.0.1:${server.address().port}/api/topics`;

test.after(() => {
  server.close();
  db.close();
});

const cardCount = () => db.prepare("SELECT COUNT(*) n FROM cards WHERE topic_id='t1'").get().n;

function putCards(who, cards) {
  return fetch(`${base}/t1/cards`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...(who ? { Cookie: who.cookie } : {}) },
    body: JSON.stringify({ cards }),
  });
}

function postTopic(who, body) {
  return fetch(base, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(who ? { Cookie: who.cookie } : {}) },
    body: JSON.stringify(body),
  });
}

test("a logged-out request cannot edit content", async () => {
  assert.equal((await putCards(null, [])).status, 401);
  assert.equal(cardCount(), 2, "and nothing was deleted");
});

test("an ordinary account cannot wipe a topic — the exact shipped IDOR", async () => {
  const res = await putCards(PLAIN, []);
  assert.equal(res.status, 403, "logged in but unprivileged is 403, not 401");
  assert.match((await res.json()).error, /may not edit course content/);
  assert.equal(cardCount(), 2, "the cards must still be there");
});

test("403 is distinguishable from 401 so the client can tell them apart", async () => {
  // One is fixable by signing in, the other is not. Collapsing them would send
  // an admin-less user to a login form that cannot help.
  assert.equal((await putCards(null, [])).status, 401);
  assert.equal((await putCards(PLAIN, [])).status, 403);
});

test("an admin can edit content", async () => {
  const res = await putCards(ADMIN, [{ heading: "Only", body: "one" }]);
  assert.equal(res.status, 200);
  assert.equal(cardCount(), 1);
});

test("an admin can create an empty deck at the end of its course", async () => {
  const res = await postTopic(ADMIN, {
    course: "authz",
    title: "Integration Techniques",
    subtitle: "Methods and common forms",
  });
  assert.equal(res.status, 201);
  const topic = await res.json();
  assert.equal(topic.id, "authz-integration-techniques");
  assert.equal(topic.course, "authz");
  assert.equal(topic.title, "Integration Techniques");
  assert.equal(topic.subtitle, "Methods and common forms");
  assert.deepEqual(topic.cards, []);
  assert.deepEqual(topic.questions, []);
  assert.equal(db.prepare("SELECT position FROM topics WHERE id = ?").get(topic.id).position, 1);
});

test("a non-admin cannot create a shared deck", async () => {
  const res = await postTopic(PLAIN, { course: "authz", title: "Forbidden", subtitle: "" });
  assert.equal(res.status, 403);
  assert.equal(db.prepare("SELECT 1 FROM topics WHERE title = 'Forbidden'").get(), undefined);
});

test("revoking the flag takes effect immediately, not when the cookie expires", async () => {
  db.prepare("UPDATE users SET is_admin = 0 WHERE id = ?").run(ADMIN.userId);
  // Same cookie, still a valid session — the check reads the row, not the session.
  assert.equal((await putCards(ADMIN, [])).status, 403);
  assert.equal(cardCount(), 1, "and the revoked admin's write did not land");
});
