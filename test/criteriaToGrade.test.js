// criteriaToGrade (server/routes/drill.js) — the met/total -> 0-3 mapping that
// turns the model's per-criterion booleans into the same self-grade a Drill
// item produces by hand. The threshold is `met >= Math.ceil(total * 0.75)`,
// which is the whole reason this file exists: ceil() makes "75%" mean
// different things at different rubric sizes, and an off-by-one there silently
// downgrades correct answers to "partial" (or promotes wrong ones to a pass,
// since gradeToVerdict treats >= 2 as correct and FSRS reschedules on it).
import test from "node:test";
import assert from "node:assert/strict";
import { criteriaToGrade } from "../server/routes/drill.js";

test("no criteria at all -> null (ungraded, not a zero)", () => {
  // Distinct from grade 0 on purpose: an item with an empty rubric was never
  // judged, and must not be logged as a failed review.
  assert.equal(criteriaToGrade(0, 0), null);
});

test("every criterion met -> 3 (Easy)", () => {
  for (const total of [1, 2, 3, 4, 5, 8, 12]) {
    assert.equal(criteriaToGrade(total, total), 3, `${total}/${total}`);
  }
});

test("no criterion met -> 0 (Again)", () => {
  for (const total of [1, 2, 3, 4, 5, 8]) {
    assert.equal(criteriaToGrade(0, total), 0, `0/${total}`);
  }
});

test("exactly the 75% threshold -> 2 (Good)", () => {
  // Rubric sizes where 75% lands on a whole number, so "three quarters" is
  // literally achievable.
  assert.equal(criteriaToGrade(3, 4), 2);
  assert.equal(criteriaToGrade(6, 8), 2);
  assert.equal(criteriaToGrade(9, 12), 2);
});

test("one below the 75% threshold -> 1 (Hard)", () => {
  // The off-by-one guard: these must NOT reach 2.
  assert.equal(criteriaToGrade(2, 4), 1);
  assert.equal(criteriaToGrade(5, 8), 1);
  assert.equal(criteriaToGrade(8, 12), 1);
});

test("ceil() rounds the threshold UP, so partial credit is the strict side", () => {
  // total=3 -> ceil(2.25) = 3, but 3/3 is already caught by the `met === total`
  // branch above. So a 3-criterion rubric can never score 2 — it is 3, 1, or 0.
  // That is a real property of the mapping, not an accident to paper over:
  // 2/3 (66.7%) is genuinely below 75%.
  assert.equal(criteriaToGrade(2, 3), 1);
  assert.equal(criteriaToGrade(1, 3), 1);
  assert.notEqual(criteriaToGrade(2, 3), 2);

  // total=5 -> ceil(3.75) = 4. 4/5 (80%) passes, 3/5 (60%) does not.
  assert.equal(criteriaToGrade(4, 5), 2);
  assert.equal(criteriaToGrade(3, 5), 1);

  // total=6 -> ceil(4.5) = 5. 5/6 (83%) passes, 4/6 (66.7%) does not.
  assert.equal(criteriaToGrade(5, 6), 2);
  assert.equal(criteriaToGrade(4, 6), 1);

  // total=7 -> ceil(5.25) = 6. 6/7 (85.7%) passes, 5/7 (71.4%) does not.
  assert.equal(criteriaToGrade(6, 7), 2);
  assert.equal(criteriaToGrade(5, 7), 1);
});

test("a 2-criterion rubric is all-or-nothing above 0", () => {
  // ceil(1.5) = 2, which is `met === total` — so 1/2 (50%) is 1, never 2.
  assert.equal(criteriaToGrade(2, 2), 3);
  assert.equal(criteriaToGrade(1, 2), 1);
  assert.equal(criteriaToGrade(0, 2), 0);
});

test("a 1-criterion rubric has no middle ground", () => {
  assert.equal(criteriaToGrade(1, 1), 3);
  assert.equal(criteriaToGrade(0, 1), 0);
});

test("every output is a valid self-grade or null", () => {
  // The result is handed straight to scheduleReview -> gradeToRating, which
  // throws on anything outside 0..3.
  for (let total = 0; total <= 12; total++) {
    for (let met = 0; met <= total; met++) {
      const g = criteriaToGrade(met, total);
      if (total === 0) assert.equal(g, null);
      else assert.ok(Number.isInteger(g) && g >= 0 && g <= 3, `${met}/${total} -> ${g}`);
    }
  }
});

test("the mapping is monotonic in met", () => {
  // More criteria met can never lower the grade.
  for (let total = 1; total <= 12; total++) {
    for (let met = 1; met <= total; met++) {
      assert.ok(
        criteriaToGrade(met, total) >= criteriaToGrade(met - 1, total),
        `${met}/${total} scored below ${met - 1}/${total}`
      );
    }
  }
});
