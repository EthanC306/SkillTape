// The grading response schema is what stops a small local model from merging
// two rubric criteria into one entry or wrapping its JSON in prose — Ollama
// compiles it into a sampling grammar, so a wrong shape is unreachable rather
// than merely rejected afterwards. These assert the two shapes that behave
// differently: a single-item batch (what PracticeView sends) pins the criteria
// count exactly; a multi-item batch can't, and must not pretend to.

import test from "node:test";
import assert from "node:assert/strict";

import { gradeResponseSchema } from "../server/routes/drill.js";

test("a single-item batch pins the criteria array to that item's rubric length", () => {
  const schema = gradeResponseSchema([{ itemId: "a", criteria: ["one", "two", "three"] }]);
  const criteria = schema.properties.results.items.properties.criteria;
  assert.equal(criteria.minItems, 3);
  assert.equal(criteria.maxItems, 3);
  assert.deepEqual(schema.properties.results.items.properties.itemId.enum, ["a"]);
  assert.equal(schema.properties.results.minItems, 1);
  assert.equal(schema.properties.results.maxItems, 1);
});

test("a multi-item batch leaves the criteria count unpinned — the rubrics differ", () => {
  const schema = gradeResponseSchema([
    { itemId: "a", criteria: ["one"] },
    { itemId: "b", criteria: ["one", "two"] },
  ]);
  const criteria = schema.properties.results.items.properties.criteria;
  assert.equal(criteria.minItems, undefined);
  assert.equal(criteria.maxItems, undefined);
  assert.deepEqual(schema.properties.results.items.properties.itemId.enum, ["a", "b"]);
  assert.equal(schema.properties.results.minItems, 2);
});

test("every field the route reads back is required", () => {
  const schema = gradeResponseSchema([{ itemId: "a", criteria: ["one"] }]);
  assert.deepEqual(schema.required, ["results"]);
  assert.deepEqual(schema.properties.results.items.required, ["itemId", "criteria", "rationale"]);
  assert.deepEqual(schema.properties.results.items.properties.criteria.items.required, [
    "criterion",
    "searched_for",
    "met",
  ]);
});
