// applyWriteCap (src/data/itemSchema.js) — the "at most 3 WRITE items in a
// mixed session" rule. Two callers depend on it (PracticeView.startPractice and
// GET /api/drill/exam), and both of them cap a deck they have ALREADY shuffled,
// so the two properties worth pinning are: the cap actually bites on a mixed
// deck, and it deliberately does not bite when WRITE is all there is. The
// second is the one a well-meaning refactor would break — a plain
// "filter out writes past 3" is correct for mixed decks and silently turns
// WRITE-only practice into a 3-question session.
import test from "node:test";
import assert from "node:assert/strict";
import { applyWriteCap, MAX_WRITE_PER_SESSION, FORMATS } from "../src/data/itemSchema.js";

const write = (id) => ({ id, format: FORMATS.WRITE });
const mcq = (id) => ({ id, format: FORMATS.MCQ });
const recall = (id) => ({ id, format: FORMATS.RECALL });

const countWrites = (items) => items.filter((it) => it.format === FORMATS.WRITE).length;

test("a mixed deck keeps at most MAX_WRITE_PER_SESSION write items", () => {
  const deck = [write("w1"), mcq("m1"), write("w2"), recall("r1"), write("w3"), write("w4"), write("w5"), mcq("m2")];
  const capped = applyWriteCap(deck);

  assert.equal(countWrites(capped), MAX_WRITE_PER_SESSION);
  // Everything that isn't WRITE survives — the cap trims one format, it does
  // not shrink the session to a fixed size.
  assert.deepEqual(
    capped.filter((it) => it.format !== FORMATS.WRITE).map((it) => it.id),
    ["m1", "r1", "m2"]
  );
});

test("the surviving write items are the first ones in the deck's order", () => {
  // Callers shuffle before capping, so "first three" is what makes the choice
  // random. If this ever became "last three" or a sort, a caller that shuffles
  // would still look fine — but one that doesn't would always drill the same
  // three items.
  const deck = [write("w1"), mcq("m1"), write("w2"), write("w3"), write("w4")];
  const capped = applyWriteCap(deck);

  assert.deepEqual(capped.map((it) => it.id), ["w1", "m1", "w2", "w3"]);
});

test("a write-only deck is returned untouched, however long it is", () => {
  const deck = [write("w1"), write("w2"), write("w3"), write("w4"), write("w5"), write("w6")];
  const capped = applyWriteCap(deck);

  assert.equal(capped.length, 6);
  assert.equal(capped, deck); // same reference: nothing had to be cut
});

test("a deck already within the cap is returned untouched", () => {
  const deck = [write("w1"), mcq("m1"), write("w2")];
  assert.equal(applyWriteCap(deck), deck);
});

test("a deck with no write items at all is returned untouched", () => {
  const deck = [mcq("m1"), recall("r1"), mcq("m2")];
  assert.equal(applyWriteCap(deck), deck);
});

test("the limit is overridable, and 0 strips every write from a mixed deck", () => {
  const deck = [write("w1"), mcq("m1"), write("w2")];
  assert.deepEqual(applyWriteCap(deck, { limit: 1 }).map((it) => it.id), ["w1", "m1"]);
  assert.deepEqual(applyWriteCap(deck, { limit: 0 }).map((it) => it.id), ["m1"]);
});

test("limit 0 still leaves a write-only deck alone", () => {
  // The write-only exemption is checked before the limit is applied, so even an
  // aggressive cap can't empty a deck the user explicitly asked for.
  const deck = [write("w1"), write("w2")];
  assert.equal(applyWriteCap(deck, { limit: 0 }), deck);
});

test("an empty deck and a non-array are handled without throwing", () => {
  assert.deepEqual(applyWriteCap([]), []);
  assert.equal(applyWriteCap(null), null);
  assert.equal(applyWriteCap(undefined), undefined);
});
