// The interval scale the grade bar prints under every button. Worth pinning:
// these strings are the only place a user reads what pressing a button costs
// them, and an off-by-a-unit here is invisible in code review and glaring on
// screen.
import test from "node:test";
import assert from "node:assert/strict";
import {
  formatInterval,
  formatIntervalBetween,
  formatStability,
  formatDifficulty,
  formatRetrievability,
  formatDueLabel,
  NO_VALUE,
} from "../src/data/fsrsFormat.js";

const DAY = 1440; // minutes

test("formatInterval covers the whole scale the plan specifies", () => {
  assert.equal(formatInterval(1), "1m");
  assert.equal(formatInterval(10), "10m");
  assert.equal(formatInterval(59), "59m");
  assert.equal(formatInterval(60), "1h");
  assert.equal(formatInterval(90), "2h"); // rounds, doesn't truncate
  assert.equal(formatInterval(DAY), "1d");
  assert.equal(formatInterval(3 * DAY), "3d");
  assert.equal(formatInterval(29 * DAY), "29d");
  assert.equal(formatInterval(61 * DAY), "2mo");
  assert.equal(formatInterval(365 * DAY), "1y");
  assert.equal(formatInterval(511 * DAY), "1.4y");
});

test("formatInterval drops a decimal that carries no information", () => {
  // "2mo" and "1y", never "2.0mo" or "1.0y".
  assert.ok(!formatInterval(61 * DAY).includes("."));
  assert.ok(!formatInterval(365 * DAY).includes("."));
  // But keeps one where it distinguishes two real intervals.
  assert.equal(formatInterval(46 * DAY), "1.5mo");
  assert.notEqual(formatInterval(46 * DAY), formatInterval(61 * DAY));
});

test("formatInterval never renders a learning step as 0d", () => {
  // FSRS reports scheduled_days: 0 for both the 1m and 10m steps. A days-based
  // formatter would print "0d" for the two intervals a new card lives on.
  for (const minutes of [1, 5, 10, 30]) {
    assert.match(formatInterval(minutes), /^\d+m$/);
  }
});

test("a non-interval renders as a word, not a number", () => {
  assert.equal(formatInterval(0), "now");
  assert.equal(formatInterval(-5), "now");
  assert.equal(formatInterval(NaN), "now");
  assert.equal(formatInterval(undefined), "now");
});

test("formatIntervalBetween is the same scale over two instants", () => {
  const now = Date.UTC(2026, 7, 10);
  assert.equal(formatIntervalBetween(now, now + 3 * 86400000), "3d");
  assert.equal(formatIntervalBetween(now, now + 600000), "10m");
  // An already-elapsed due date is the common case on the due strip.
  assert.equal(formatIntervalBetween(now, now - 600000), "now");
});

test("stability is one decimal, and an unscheduled card shows the placeholder", () => {
  assert.equal(formatStability(2.3065), "2.3");
  assert.equal(formatStability(3), "3");
  assert.equal(formatStability(50.704), "51");
  // Never "0.0". A card with no stability has not been reviewed, and a zero
  // would read as one that has decayed to nothing.
  assert.equal(formatStability(0), NO_VALUE);
  assert.equal(formatStability(null), NO_VALUE);
  assert.equal(formatStability(undefined), NO_VALUE);
});

test("difficulty carries one decimal, and the top of the range is not special", () => {
  assert.equal(formatDifficulty(2.1043), "2.1");
  assert.equal(formatDifficulty(9.5), "9.5"); // unlike stability, no >=10 cutover
  assert.equal(formatDifficulty(10), "10");
  assert.equal(formatDifficulty(0), NO_VALUE);
  assert.equal(formatDifficulty(null), NO_VALUE);
});

test("retrievability is a whole percent, and null is not 0%", () => {
  assert.equal(formatRetrievability(0.8879), "89%");
  assert.equal(formatRetrievability(1), "100%");
  assert.equal(formatRetrievability(0), "0%");
  assert.equal(formatRetrievability(null), NO_VALUE);
  assert.equal(formatRetrievability(undefined), NO_VALUE);
});

test("formatDueLabel reads as a sentence fragment at every distance", () => {
  const now = Date.UTC(2026, 7, 10, 12);
  assert.equal(formatDueLabel(null, now), "not scheduled");
  assert.equal(formatDueLabel(now - 86400000, now), "due now");
  assert.equal(formatDueLabel(now, now), "due now");
  assert.equal(formatDueLabel(now + 3600000, now), "later today");
  assert.equal(formatDueLabel(now + 86400000, now), "tomorrow");
  assert.equal(formatDueLabel(now + 5 * 86400000, now), "in 5d");
});
