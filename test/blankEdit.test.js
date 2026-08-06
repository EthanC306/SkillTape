// blankEdit.js — word-boundary expansion when the "B" button is pressed with a
// bare caret (no selection).
//
// WORD_CHAR is deliberately much wider than \w, because the terms worth
// blanking in this curriculum read as one token to a human while being full of
// punctuation: O(n²), ~ClassName, operator<<, std::vector, size_t. That width
// is the risk. Every character added to the class is a character that can also
// swallow neighbouring prose, and the trailing-punctuation trim is the only
// thing pulling the right edge back. These tests pin both directions: the whole
// term goes in, and the sentence around it stays out.
import test from "node:test";
import assert from "node:assert/strict";
import { toggleBold, validateBody } from "../src/utils/blankEdit.js";

/** Bold the word containing the first occurrence of `term`, caret parked mid-term. */
function boldWordAt(body, term, offsetIntoTerm = 1) {
  const at = body.indexOf(term);
  assert.notEqual(at, -1, `"${term}" not found in fixture`);
  return toggleBold(body, at + offsetIntoTerm, at + offsetIntoTerm);
}

// ── Each punctuation-heavy term expands as ONE token ─────────────────────

const SINGLE_TOKEN_CASES = [
  ["O(n²)", "Insertion runs in O(n²) time.", "Insertion runs in **O(n²)** time."],
  ["~ClassName", "The ~ClassName destructor frees it.", "The **~ClassName** destructor frees it."],
  ["operator<<", "Overload operator<< for output.", "Overload **operator<<** for output."],
  ["std::vector", "A std::vector grows on demand.", "A **std::vector** grows on demand."],
  ["size_t", "Use size_t for the index.", "Use **size_t** for the index."],
];

for (const [term, before, after] of SINGLE_TOKEN_CASES) {
  test(`caret inside ${term} expands to the whole term`, () => {
    const r = boldWordAt(before, term);
    assert.equal(r.error, undefined);
    assert.equal(r.text, after);
    // The returned selection covers the inner text only, never the asterisks.
    assert.equal(r.text.slice(r.selStart, r.selEnd), term);
  });

  test(`${term} expands the same from either edge of the term`, () => {
    const at = before.indexOf(term);
    const fromStart = toggleBold(before, at, at);
    const fromEnd = toggleBold(before, at + term.length, at + term.length);
    assert.equal(fromStart.text, after);
    assert.equal(fromEnd.text, after);
  });

  test(`bolding ${term} round-trips back to the original`, () => {
    const r = boldWordAt(before, term);
    const back = toggleBold(r.text, r.selStart, r.selEnd);
    assert.equal(back.text, before);
  });

  test(`${term} is a single blank once bolded`, () => {
    assert.equal(validateBody(after).blanks, 1);
    assert.deepEqual(validateBody(after).errors, []);
  });
}

// ── Trailing punctuation is trimmed off the right edge ───────────────────

test("a sentence-ending period stays outside the blank", () => {
  const r = boldWordAt("It calls the destructor.", "destructor");
  assert.equal(r.text, "It calls the **destructor**.");
});

test("a trailing comma stays outside the blank", () => {
  const r = boldWordAt("A pointer, or reference", "pointer");
  assert.equal(r.text, "A **pointer**, or reference");
});

test("every trailing punctuation mark is trimmed, including runs", () => {
  for (const [body, expected] of [
    ["the heap;", "the **heap**;"],
    ["the heap:", "the **heap**:"],
    ["the heap!", "the **heap**!"],
    ["the heap?", "the **heap**?"],
    ["the heap?!", "the **heap**?!"],
    ["the heap...", "the **heap**..."],
  ]) {
    const r = boldWordAt(body, "heap");
    assert.equal(r.text, expected, body);
  }
});

test("punctuation that is part of the term is NOT trimmed", () => {
  // The closing paren of O(n²) and the angle brackets of operator<< are term
  // characters, not sentence characters.
  assert.equal(boldWordAt("runs in O(n²).", "O(n²)").text, "runs in **O(n²)**.");
  assert.equal(boldWordAt("call operator<<;", "operator<<").text, "call **operator<<**;");
});

test("a term ending in a colon keeps std:: intact but drops a sentence colon", () => {
  // ':' is both a term character and a trailing-punctuation character, so this
  // is where the two rules meet.
  assert.equal(boldWordAt("A std::vector here", "std::vector").text, "A **std::vector** here");
  assert.equal(boldWordAt("the heap: a region", "heap").text, "the **heap**: a region");
});

// ── Boundaries: what must NOT be swallowed ───────────────────────────────

test("expansion stops at whitespace on both sides", () => {
  const r = boldWordAt("alpha beta gamma", "beta");
  assert.equal(r.text, "alpha **beta** gamma");
});

test("a caret in open space inserts an empty pair instead of grabbing a neighbour", () => {
  const body = "alpha  beta";
  const at = body.indexOf("  ") + 1; // between the two spaces
  const r = toggleBold(body, at, at);
  assert.equal(r.text, "alpha **** beta");
  assert.equal(r.selStart, r.selEnd, "caret parked between the delimiters");
});

test("a caret inside an existing blank expands to the inner text, not across the asterisks", () => {
  // '*' is excluded from WORD_CHAR precisely so this unwraps cleanly.
  const body = "a **node** b";
  const at = body.indexOf("node") + 1;
  const r = toggleBold(body, at, at);
  assert.equal(r.text, "a node b");
});

test("only one term is bolded when several sit in a row", () => {
  const r = boldWordAt("int x = size_t y", "size_t");
  assert.equal(r.text, "int x = **size_t** y");
  assert.equal(validateBody(r.text).blanks, 1);
});

// ── Selection path (not caret) still behaves ─────────────────────────────

test("a selection with ragged whitespace is pulled inward before wrapping", () => {
  const body = "a  node  b";
  const r = toggleBold(body, 1, body.indexOf("b"));
  assert.equal(r.text, "a  **node**  b");
});

test("a selection containing an asterisk is refused with an explanation", () => {
  const r = toggleBold("a *ptr b", 2, 6);
  assert.ok(r.error, "expected a refusal");
  assert.match(r.error, /asterisk/i);
  assert.equal(r.text, undefined, "no partial edit is applied");
});
