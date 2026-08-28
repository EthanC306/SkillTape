// Flashcard identity — server/routes/topics.js's PUT /:id/flashcards.
//
// A deck is saved by DELETE-then-INSERT, which is fine for the text and fatal
// for identity: `flashcards.id` is AUTOINCREMENT, so before `stable_id` existed
// every card in the deck was handed a brand new name on every single save.
// That is the same bug docs/STABLE_QUESTION_IDS.md describes for questions, and
// these tests pin the property that fixes it:
//
//   a card's id is minted once and then survives everything the editor can do
//   to the deck around it — editing text, reordering, deleting other cards,
//   emptying the deck, reseeding the curriculum on top of it.
//
// The route handler is exercised through a hand-rolled req/res rather than a
// live HTTP server: what is under test is the validation and the SQL, and
// standing up Express would only add a port to this.
import test from "node:test";
import assert from "node:assert/strict";
import { isolatedTestDb } from "./helpers/testDb.js";

isolatedTestDb(import.meta.url);

// Below the harness call on purpose — both of these reach server/db.js, which
// opens a database at import time. See the comment in testDb.js.
const { default: db } = await import("../server/db.js");
const { default: topicsRouter } = await import("../server/routes/topics.js");

// ── Harness ────────────────────────────────────────────────────────────────

db.prepare("INSERT INTO courses (id, title, position) VALUES ('calc', 'Calc', 0)").run();
for (const id of ["derivatives", "integrals"]) {
  db.prepare(
    "INSERT INTO topics (id, course_id, title, position) VALUES (?, 'calc', ?, 0)"
  ).run(id, id);
}

/** The PUT handler, pulled off the router by path so the test drives the real stack. */
const putFlashcards = topicsRouter.stack.find(
  (layer) => layer.route?.path === "/:id/flashcards" && layer.route.methods.put
).route.stack.at(-1).handle;

/**
 * Save `flashcards` to `topicId`, returning { status, body }.
 *
 * Synchronous because every layer under it is: better-sqlite3 does no I/O
 * waiting, and the handler never defers. If that changes this needs a promise.
 */
function save(topicId, flashcards) {
  const result = {};
  const res = {
    status(code) {
      result.status = code;
      return res;
    },
    json(body) {
      result.status ??= 200;
      result.body = body;
      return res;
    },
  };
  putFlashcards({ params: { id: topicId }, body: { flashcards } }, res);
  return result;
}

/** Just the ids of a topic's deck, in stored order. */
const idsOf = (result) => (result.body.flashcards ?? []).map((c) => c.id);
const card = (front, id) => (id ? { id, front, back: `${front} back` } : { front, back: `${front} back` });

// ── Minting ────────────────────────────────────────────────────────────────

test("a card saved without an id comes back wearing a permanent one", () => {
  const saved = save("derivatives", [card("Work")]);
  const [id] = idsOf(saved);
  assert.match(id, /^fc-/, "server-minted ids are prefixed so their origin is legible");

  // The point of the id is that a second save does not change it.
  const again = save("derivatives", [{ id, front: "Work", back: "Work back" }]);
  assert.deepEqual(idsOf(again), [id]);
});

test("a client-minted id is stored as sent, never regenerated", () => {
  const saved = save("derivatives", [card("sin", "fc-client-mint")]);
  assert.deepEqual(idsOf(saved), ["fc-client-mint"]);
});

test("ids are unique across cards saved in one payload", () => {
  const saved = save("derivatives", [card("a"), card("b"), card("c")]);
  assert.equal(new Set(idsOf(saved)).size, 3);
});

// ── Survival ───────────────────────────────────────────────────────────────
//
// The regression this file exists for. Each of these is something the editor
// does routinely, and each one used to rename every card in the deck.

test("editing a card's text leaves every id alone", () => {
  const before = idsOf(save("derivatives", [card("a", "fc-a"), card("b", "fc-b")]));
  const after = idsOf(
    save("derivatives", [
      { id: "fc-a", front: "a", back: "COMPLETELY REWRITTEN" },
      card("b", "fc-b"),
    ])
  );
  assert.deepEqual(after, before);
});

test("reordering moves the cards, not their ids", () => {
  save("derivatives", [card("a", "fc-a"), card("b", "fc-b"), card("c", "fc-c")]);
  const reordered = save("derivatives", [
    card("c", "fc-c"),
    card("a", "fc-a"),
    card("b", "fc-b"),
  ]);
  assert.deepEqual(idsOf(reordered), ["fc-c", "fc-a", "fc-b"]);
});

test("deleting one card does not disturb its neighbours' ids", () => {
  save("derivatives", [card("a", "fc-a"), card("b", "fc-b"), card("c", "fc-c")]);
  const pruned = save("derivatives", [card("a", "fc-a"), card("c", "fc-c")]);
  assert.deepEqual(idsOf(pruned), ["fc-a", "fc-c"]);
});

test("a deck can be emptied and refilled with the same ids", () => {
  save("derivatives", [card("a", "fc-a"), card("b", "fc-b")]);

  const emptied = save("derivatives", []);
  assert.equal(emptied.status, 200);
  // buildTopic drops an empty deck rather than sending [] — TopicView keys the
  // Flashcards tab off `topic.flashcards?.length`.
  assert.equal(emptied.body.flashcards, undefined);

  assert.deepEqual(idsOf(save("derivatives", [card("a", "fc-a"), card("b", "fc-b")])), [
    "fc-a",
    "fc-b",
  ]);
});

test("adding a new card alongside existing ones mints only the new one's id", () => {
  save("derivatives", [card("a", "fc-a")]);
  const grown = save("derivatives", [card("a", "fc-a"), card("new")]);
  const [first, second] = idsOf(grown);
  assert.equal(first, "fc-a");
  assert.match(second, /^fc-/);
  assert.notEqual(second, "fc-a");
});

// ── Origin ─────────────────────────────────────────────────────────────────

test("a card added through the editor is marked 'user', and stays so when edited", () => {
  save("derivatives", [card("mine", "fc-mine")]);
  const originOf = (stableId) =>
    db.prepare("SELECT origin FROM flashcards WHERE stable_id = ?").get(stableId).origin;

  assert.equal(originOf("fc-mine"), "user");

  // The save that follows is a DELETE + INSERT, so `origin` has to be carried
  // across by hand — a card must not become seed-owned just by being edited.
  save("derivatives", [{ id: "fc-mine", front: "mine", back: "edited" }]);
  assert.equal(originOf("fc-mine"), "user");
});

test("an authored card keeps origin 'authored' when the editor saves the deck", () => {
  db.prepare(
    `INSERT INTO flashcards (topic_id, position, front, back, stable_id, origin)
     VALUES ('integrals', 0, 'seeded', 'seeded back', 'integrals-fc-a0', 'authored')`
  ).run();

  save("integrals", [
    { id: "integrals-fc-a0", front: "seeded", back: "edited in the UI" },
    card("mine", "fc-also-mine"),
  ]);

  const origins = db
    .prepare("SELECT stable_id, origin FROM flashcards WHERE topic_id = 'integrals' ORDER BY position")
    .all();
  assert.deepEqual(origins, [
    { stable_id: "integrals-fc-a0", origin: "authored" },
    { stable_id: "fc-also-mine", origin: "user" },
  ]);
});

// ── Rejections ─────────────────────────────────────────────────────────────
//
// All 400s rather than something to paper over: each one means the client has
// lost track of which card is which, and quietly reassigning an id to smooth it
// over would destroy the identity this whole mechanism exists to protect.

test("a duplicated id in one payload is a 400 naming both slots", () => {
  const rejected = save("derivatives", [card("a", "fc-same"), card("b", "fc-same")]);
  assert.equal(rejected.status, 400);
  assert.match(rejected.body.error, /flashcards\[1\]\.id duplicates flashcards\[0\]\.id/);
});

test("an id belonging to another topic is a 400 naming that topic", () => {
  save("integrals", [card("theirs", "fc-theirs")]);
  const rejected = save("derivatives", [card("mine", "fc-theirs")]);
  assert.equal(rejected.status, 400);
  assert.match(rejected.body.error, /already belongs to topic "integrals"/);
});

test("a malformed id is refused rather than sanitized", () => {
  for (const bad of ["has spaces", "slash/es", "plus+es", "", "x".repeat(201)]) {
    const rejected = save("derivatives", [{ id: bad, front: "a", back: "b" }]);
    assert.equal(rejected.status, 400, `expected 400 for id ${JSON.stringify(bad)}`);
    assert.match(rejected.body.error, /flashcards\[0\]\.id must be/);
  }
});

test("a rejected payload leaves the stored deck exactly as it was", () => {
  const before = idsOf(save("derivatives", [card("a", "fc-keep-a"), card("b", "fc-keep-b")]));

  const rejected = save("derivatives", [card("x", "fc-same"), card("y", "fc-same")]);
  assert.equal(rejected.status, 400);

  // Validation runs before the transaction opens, so a bad request never
  // reaches the DELETE — the deck is untouched rather than rolled back.
  const stored = db
    .prepare("SELECT stable_id FROM flashcards WHERE topic_id = 'derivatives' ORDER BY position")
    .all()
    .map((r) => r.stable_id);
  assert.deepEqual(stored, before);
});

test("blank front/back is still rejected, id or no id", () => {
  const rejected = save("derivatives", [{ id: "fc-blank", front: "a", back: "   " }]);
  assert.equal(rejected.status, 400);
  assert.match(rejected.body.error, /back must not be blank/);
});
