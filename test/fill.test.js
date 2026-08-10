// fill.js — the three-layer lenient matching behind Fill Mode.
//
// Layers, cheapest first: normalize() folds meaningless surface differences,
// variants() adds singular/plural spellings, and aliases add declared synonyms.
// The risk this file guards is asymmetric: a false negative marks a student who
// knew the answer wrong, which is the failure that makes the mode feel broken.
// So most assertions here are "this IS accepted", with a smaller set pinning
// the distinctions that must survive (a leading minus, a bare punctuation
// answer, genuinely different terms).
import test from "node:test";
import assert from "node:assert/strict";
import { normalize, variants, isCorrect, parseBold } from "../src/utils/fill.js";

// ── Layer 1: normalize() ────────────────────────────────────────────────

test("normalize folds case and collapses whitespace", () => {
  assert.equal(normalize("Linked List"), "linked list");
  assert.equal(normalize("  LINKED   list  "), "linked list");
  assert.equal(normalize("linked\tlist"), "linked list");
});

test("normalize turns an internal hyphen into a space", () => {
  assert.equal(normalize("linked-list"), "linked list");
  assert.equal(normalize("Linked–List"), "linked list"); // en dash
  assert.equal(normalize("linked—list"), "linked list"); // em dash
  assert.equal(normalize("doubly-linked-list"), "doubly linked list");
});

test("normalize keeps a leading minus, which is not a hyphen", () => {
  // The lookbehind requires a word char on both sides, so "-1" stays distinct
  // from "1" — a signed answer is a different answer.
  assert.equal(normalize("-1"), "-1");
  assert.notEqual(normalize("-1"), normalize("1"));
});

test("normalize folds Unicode superscripts and carets to plain digits", () => {
  assert.equal(normalize("O(n²)"), "o(n2)");
  assert.equal(normalize("O(n^2)"), "o(n2)");
  assert.equal(normalize("O(N²)"), "o(n2)");
  assert.equal(normalize("2ⁿ"), "2n");
  assert.equal(normalize("O(n³)"), "o(n3)");
  // Parentheses survive — "O(n)" needs them.
  assert.ok(normalize("O(n)").includes("("));
});

test("normalize folds number words to digits", () => {
  assert.equal(normalize("two"), "2");
  assert.equal(normalize("Twelve"), "12");
  assert.equal(normalize("ninety"), "90");
  assert.equal(normalize("one hundred"), "1 100"); // each word folds on its own
  // Only whole words fold: "tone" must not become "t1e".
  assert.equal(normalize("tone"), "tone");
  assert.equal(normalize("someone"), "someone");
});

test("normalize strips quotes and trailing sentence punctuation", () => {
  assert.equal(normalize('"pointer"'), "pointer");
  assert.equal(normalize("`pointer`"), "pointer");
  assert.equal(normalize("“pointer”"), "pointer");
  assert.equal(normalize("pointer."), "pointer");
  assert.equal(normalize("pointer?!"), "pointer");
});

test("normalize keeps a bare punctuation answer intact", () => {
  // A card may legitimately blank a lone ";" — the lookbehind on the trailing
  // punctuation rule is what protects it.
  assert.equal(normalize(";"), ";");
  assert.equal(normalize("?"), "?");
});

// ── Layer 2: variants() / plurals ───────────────────────────────────────

test("regular plurals match their singular in both directions", () => {
  assert.ok(isCorrect("programs", "program"));
  assert.ok(isCorrect("program", "programs"));
  assert.ok(isCorrect("pointers", "pointer"));
  assert.ok(isCorrect("nodes", "node"));
});

test("-ies and -es plurals singularize correctly", () => {
  assert.ok(isCorrect("arrays", "array"));
  assert.ok(isCorrect("queries", "query"));
  assert.ok(isCorrect("query", "queries"));
  assert.ok(isCorrect("classes", "class"));
  assert.ok(isCorrect("boxes", "box"));
});

test("words that merely end in s are not treated as plurals", () => {
  // class/status/basis would otherwise singularize to clas/statu/basi and stop
  // matching themselves.
  for (const w of ["class", "status", "basis", "this"]) {
    assert.ok(isCorrect(w, w), `${w} should match itself`);
  }
  assert.ok(!isCorrect("clas", "class"));
});

test("the irregular plural table is honoured", () => {
  assert.ok(isCorrect("indices", "index"));
  assert.ok(isCorrect("index", "indices"));
  assert.ok(isCorrect("indexes", "index"));
  assert.ok(isCorrect("indices", "indexes")); // both fold to "index"
  assert.ok(isCorrect("vertices", "vertex"));
  assert.ok(isCorrect("vertex", "vertices"));
  assert.ok(isCorrect("matrices", "matrix"));
  assert.ok(isCorrect("matrix", "matrices"));
  assert.ok(isCorrect("children", "child"));
  assert.ok(isCorrect("leaves", "leaf"));
  assert.ok(isCorrect("people", "person"));
});

test("variants includes the whitespace-free spelling", () => {
  // This is what lets a typed "o(n 2)" reach "o(n2)".
  assert.ok(variants("O(n 2)").has("o(n2)"));
  assert.ok(isCorrect("O(n 2)", "O(n²)"));
  assert.ok(isCorrect("O(n^2)", "O(n²)"));
  assert.ok(isCorrect("o(n2)", "O(n²)"));
});

test("plural folding applies per word inside a phrase", () => {
  assert.ok(isCorrect("Linked Lists", "linked-list"));
  assert.ok(isCorrect("doubly linked lists", "Doubly-Linked List"));
});

// ── Layer 3: aliases ────────────────────────────────────────────────────
//
// ALIAS_GROUPS is empty in this codebase today, so the site-wide path has
// nothing to exercise; the per-card `accept` map is the live path.

test("a card's accept map is honoured, keyed by the raw bold text", () => {
  assert.ok(isCorrect("constant time", "O(1)", { "O(1)": ["constant time"] }));
  assert.ok(isCorrect("O(1)", "O(1)", { "O(1)": ["constant time"] }));
});

test("a card's accept map is honoured, keyed by the normalized form", () => {
  assert.ok(isCorrect("constant time", "O(1)", { "o(1)": ["constant time"] }));
});

test("accept takes a bare string as well as an array", () => {
  assert.ok(isCorrect("constant time", "O(1)", { "O(1)": "constant time" }));
});

test("accepted synonyms are themselves matched leniently", () => {
  // The alias goes through the same variants() pipeline, so its plural and
  // hyphenation are covered without listing every spelling.
  assert.ok(isCorrect("Constant-Time", "O(1)", { "O(1)": ["constant time"] }));
});

test("accept entries for a different blank do not leak", () => {
  assert.ok(!isCorrect("constant time", "O(n)", { "O(1)": ["constant time"] }));
});

// ── Rejections that must survive all three layers ───────────────────────

test("genuinely different answers are still wrong", () => {
  assert.ok(!isCorrect("stack", "queue"));
  assert.ok(!isCorrect("O(n)", "O(n²)"));
  assert.ok(!isCorrect("vertex", "index"));
});

test("blank input is never correct", () => {
  assert.ok(!isCorrect("", "node"));
  assert.ok(!isCorrect("   ", "node"));
});

// ── parseBold, the tokenizer both modes share ───────────────────────────

test("parseBold splits a body into text and blank tokens", () => {
  assert.deepEqual(parseBold("a **b** c"), [
    { type: "text", value: "a " },
    { type: "blank", value: "b" },
    { type: "text", value: " c" },
  ]);
});

test("parseBold on a body with no markup yields one text token", () => {
  assert.deepEqual(parseBold("no blanks here"), [{ type: "text", value: "no blanks here" }]);
});

test("parseBold pulls `code` out as its own token, never a blank", () => {
  assert.deepEqual(parseBold("call `delete[] p;` first"), [
    { type: "text", value: "call " },
    { type: "code", value: "delete[] p;" },
    { type: "text", value: " first" },
  ]);
});

// The whole reason code is split off before bold: a snippet's `*` must not be
// able to pair with real emphasis and swallow the sentence between them.
test("a star inside inline code cannot open a blank", () => {
  assert.deepEqual(parseBold("`int *p;` declares a **pointer**"), [
    { type: "code", value: "int *p;" },
    { type: "text", value: " declares a " },
    { type: "blank", value: "pointer" },
  ]);
});

test("code and blanks coexist in one body", () => {
  assert.deepEqual(parseBold("`new` returns a **pointer** to the `heap`"), [
    { type: "code", value: "new" },
    { type: "text", value: " returns a " },
    { type: "blank", value: "pointer" },
    { type: "text", value: " to the " },
    { type: "code", value: "heap" },
  ]);
});
