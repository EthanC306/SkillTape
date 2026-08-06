// gradeToRating (server/fsrs.js) — the 0..3 self-grade -> ts-fsrs Rating
// conversion. It is a bare `grade + 1`, which is correct only because the two
// scales happen to describe the same four buttons in the same order. That
// coincidence is exactly what a test should pin: if ts-fsrs ever renumbers its
// enum, `+1` keeps returning plausible integers and every review silently
// schedules against the wrong rating.
import test from "node:test";
import assert from "node:assert/strict";
import { gradeToRating, Rating } from "../server/fsrs.js";

test("each self-grade maps to its ts-fsrs Rating by name, not by number", () => {
  assert.equal(gradeToRating(0), Rating.Again);
  assert.equal(gradeToRating(1), Rating.Hard);
  assert.equal(gradeToRating(2), Rating.Good);
  assert.equal(gradeToRating(3), Rating.Easy);
});

test("the Rating enum is still the 1..4 the `+1` assumes", () => {
  // The assertion above passes trivially if both sides drift together; this is
  // the one that actually catches a renumbered enum.
  assert.equal(Rating.Again, 1);
  assert.equal(Rating.Hard, 2);
  assert.equal(Rating.Good, 3);
  assert.equal(Rating.Easy, 4);
  // Rating.Manual is 0 and is not a grade a user can pick — no self-grade may
  // ever land on it.
  assert.equal(Rating.Manual, 0);
  for (const g of [0, 1, 2, 3]) assert.notEqual(gradeToRating(g), Rating.Manual);
});

test("the pass/fail boundary lines up with the >= 2 convention used elsewhere", () => {
  // /stats and gradeToVerdict both treat grade >= 2 as a pass. In FSRS terms
  // that must mean Good-or-better, i.e. anything but Again/Hard.
  assert.ok(gradeToRating(2) >= Rating.Good);
  assert.ok(gradeToRating(3) >= Rating.Good);
  assert.ok(gradeToRating(1) < Rating.Good);
  assert.ok(gradeToRating(0) < Rating.Good);
});

test("out-of-range grades throw rather than scheduling something wrong", () => {
  for (const bad of [-1, 4, 5, 100]) {
    assert.throws(() => gradeToRating(bad), RangeError, `grade ${bad}`);
  }
});

test("non-integer grades throw", () => {
  // criteriaToGrade can return null for an empty rubric; that must never reach
  // the scheduler as a silent 1.
  for (const bad of [null, undefined, 1.5, NaN, "2", true, {}]) {
    assert.throws(() => gradeToRating(bad), RangeError, `grade ${JSON.stringify(bad)}`);
  }
});
