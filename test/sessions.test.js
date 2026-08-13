// server/sessions.js — grouping the attempt log back into SITTINGS, behind
// Report → Stats → Sessions.
//
// The rules under test are the ones that decide whether a session on that
// screen is real or invented. Four are easy to get quietly wrong:
//
//   1. A client-tagged session is EXACT and no gap rule may second-guess it.
//      A sitting you paused for two hours is still one sitting if the client
//      said so; splitting it would contradict the only source that actually
//      knows where the boundary was.
//   2. Tagged and untagged rows must never merge. An untagged row that happens
//      to land mid-drill must not absorb that drill's exact boundary into a
//      heuristic one.
//   3. Surfaces never merge. A drill and an exam a minute apart are two
//      sittings on two screens, not one.
//   4. Abandoned rows count in `attempts` but not in `graded`. An exam question
//      the timer never reached was SEEN, not answered — scoring it wrong would
//      punish running out of time twice.
//
// Like test/stats.test.js this imports nothing that touches SQLite —
// server/sessions.js is math only, so no isolatedTestDb harness is needed.
import test from "node:test";
import assert from "node:assert/strict";

import {
  SESSION_GAP_MS,
  buildSessions,
  buildSessionRowGroups,
  normalizeSessionRows,
  derivedKey,
  isDerivedKey,
  parseDerivedKey,
} from "../server/sessions.js";

/** One attempt row in the shape buildSessions consumes. */
function row(overrides = {}) {
  return {
    attemptId: overrides.attemptId ?? 1,
    topicId: "bigo",
    itemId: "bigo-01",
    ts: 1_000_000,
    mode: "closed",
    surface: "drill",
    sessionId: null,
    grade: 2,
    seconds: 10,
    abandoned: 0,
    ...overrides,
  };
}

// ── Tagged sessions ─────────────────────────────────────────────────────────

test("rows sharing a session id are one session, however far apart in time", () => {
  const sessions = buildSessions([
    row({ attemptId: 1, sessionId: "abc", ts: 0 }),
    // Four hours later — far beyond the gap threshold. The tag wins.
    row({ attemptId: 2, sessionId: "abc", ts: 4 * 60 * 60 * 1000 }),
  ]);
  assert.equal(sessions.length, 1);
  assert.equal(sessions[0].key, "abc");
  assert.equal(sessions[0].attempts, 2);
  assert.equal(sessions[0].derived, false);
});

test("different session ids are different sessions, however close in time", () => {
  const sessions = buildSessions([
    row({ attemptId: 1, sessionId: "a", ts: 1000 }),
    row({ attemptId: 2, sessionId: "b", ts: 1001 }),
  ]);
  assert.equal(sessions.length, 2);
  assert.deepEqual(sessions.map((s) => s.attempts), [1, 1]);
});

test("tagged and untagged rows never merge", () => {
  // The untagged row sits between the tagged ones in time. If clustering ran
  // over everything it would swallow all three into one derived session.
  const sessions = buildSessions([
    row({ attemptId: 1, sessionId: "a", ts: 1000 }),
    row({ attemptId: 2, sessionId: null, ts: 2000 }),
    row({ attemptId: 3, sessionId: "a", ts: 3000 }),
  ]);
  assert.equal(sessions.length, 2);
  const tagged = sessions.find((s) => !s.derived);
  const derived = sessions.find((s) => s.derived);
  assert.equal(tagged.attempts, 2);
  assert.equal(derived.attempts, 1);
});

// ── Derived (clustered) sessions ────────────────────────────────────────────

test("untagged rows split on a gap larger than the threshold", () => {
  const sessions = buildSessions([
    row({ attemptId: 1, ts: 0 }),
    row({ attemptId: 2, ts: SESSION_GAP_MS + 1 }),
  ]);
  assert.equal(sessions.length, 2);
  assert.ok(sessions.every((s) => s.derived));
});

test("untagged rows do NOT split on a gap at or under the threshold", () => {
  const sessions = buildSessions([
    row({ attemptId: 1, ts: 0 }),
    row({ attemptId: 2, ts: SESSION_GAP_MS }),
  ]);
  assert.equal(sessions.length, 1);
  assert.equal(sessions[0].attempts, 2);
});

test("the gap is measured between CONSECUTIVE rows, not from the session start", () => {
  // Three rows, each 20 minutes after the last. Total span is 40 minutes —
  // longer than the threshold — but no single pause is, so it is one sitting.
  const twenty = 20 * 60 * 1000;
  const sessions = buildSessions([
    row({ attemptId: 1, ts: 0 }),
    row({ attemptId: 2, ts: twenty }),
    row({ attemptId: 3, ts: 2 * twenty }),
  ]);
  assert.equal(sessions.length, 1);
  assert.equal(sessions[0].attempts, 3);
});

test("rows need not arrive sorted", () => {
  const sessions = buildSessions([
    row({ attemptId: 3, ts: 2000 }),
    row({ attemptId: 1, ts: 0 }),
    row({ attemptId: 2, ts: 1000 }),
  ]);
  assert.equal(sessions.length, 1);
  assert.equal(sessions[0].startedAt, 0);
  assert.equal(sessions[0].endedAt, 2000);
});

// ── Surfaces ────────────────────────────────────────────────────────────────

test("surfaces never merge, however close in time", () => {
  const sessions = buildSessions([
    row({ attemptId: 1, surface: "drill", ts: 1000 }),
    row({ attemptId: 2, surface: "exam", mode: "exam", ts: 1001 }),
  ]);
  assert.equal(sessions.length, 2);
  assert.deepEqual(sessions.map((s) => s.surface).sort(), ["drill", "exam"]);
});

test("a pre-surface closed-book row clusters under Drill, matching stats.js", () => {
  const sessions = buildSessions([row({ attemptId: 1, surface: null, mode: "closed" })]);
  assert.equal(sessions.length, 1);
  assert.equal(sessions[0].surface, "drill");
});

test("a row that cannot be attributed to a screen is dropped", () => {
  // Same stance stats.js takes: a session with no mode has no place in a
  // per-mode list, and inventing a column the UI has no label for is worse.
  const sessions = buildSessions([row({ attemptId: 1, surface: null, mode: "weird" })]);
  assert.equal(sessions.length, 0);
});

// ── Scoring ─────────────────────────────────────────────────────────────────

test("abandoned rows count as attempts but not as graded", () => {
  const sessions = buildSessions([
    row({ attemptId: 1, sessionId: "a", grade: 2 }),
    row({ attemptId: 2, sessionId: "a", grade: null, abandoned: 1 }),
    row({ attemptId: 3, sessionId: "a", grade: null, abandoned: 1 }),
  ]);
  assert.equal(sessions[0].attempts, 3);
  assert.equal(sessions[0].graded, 1);
  assert.equal(sessions[0].correct, 1);
});

test("Hard counts as wrong, matching every other accuracy figure in the app", () => {
  const sessions = buildSessions([
    row({ attemptId: 1, sessionId: "a", grade: 0 }), // Again
    row({ attemptId: 2, sessionId: "a", grade: 1 }), // Hard
    row({ attemptId: 3, sessionId: "a", grade: 2 }), // Good
    row({ attemptId: 4, sessionId: "a", grade: 3 }), // Easy
  ]);
  assert.equal(sessions[0].graded, 4);
  assert.equal(sessions[0].correct, 2);
  assert.deepEqual(sessions[0].grades, [1, 1, 1, 1]);
});

test("seconds is summed time on task, not wall-clock span", () => {
  // Practice and Exam post every attempt at once, so all their rows land within
  // the same second. A span-based duration would read as 0 for a 30-minute exam.
  const sessions = buildSessions([
    row({ attemptId: 1, sessionId: "a", ts: 1000, seconds: 40 }),
    row({ attemptId: 2, sessionId: "a", ts: 1001, seconds: 80 }),
  ]);
  assert.equal(sessions[0].seconds, 120);
  assert.equal(sessions[0].endedAt - sessions[0].startedAt, 1);
});

test("topicIds are deduped", () => {
  const sessions = buildSessions([
    row({ attemptId: 1, sessionId: "a", topicId: "bigo" }),
    row({ attemptId: 2, sessionId: "a", topicId: "bigo" }),
    row({ attemptId: 3, sessionId: "a", topicId: "stacks" }),
  ]);
  assert.deepEqual(sessions[0].topicIds.sort(), ["bigo", "stacks"]);
});

// ── Ordering ────────────────────────────────────────────────────────────────

test("sessions come back newest first", () => {
  const sessions = buildSessions([
    row({ attemptId: 1, sessionId: "old", ts: 1000 }),
    row({ attemptId: 2, sessionId: "new", ts: 9000 }),
  ]);
  assert.deepEqual(sessions.map((s) => s.key), ["new", "old"]);
});

test("rows within a session stay in answered order", () => {
  const groups = buildSessionRowGroups([
    row({ attemptId: 3, sessionId: "a", ts: 300 }),
    row({ attemptId: 1, sessionId: "a", ts: 100 }),
    row({ attemptId: 2, sessionId: "a", ts: 200 }),
  ]);
  assert.deepEqual(groups[0].rows.map((r) => r.attemptId), [1, 2, 3]);
});

// ── Keys ────────────────────────────────────────────────────────────────────

test("a derived key round-trips through parseDerivedKey", () => {
  const key = derivedKey("drill", 1786247293297);
  assert.ok(isDerivedKey(key));
  assert.deepEqual(parseDerivedKey(key), { surface: "drill", firstTs: 1786247293297 });
});

test("a client UUID is not mistaken for a derived key", () => {
  assert.equal(isDerivedKey("6b1e6a2c-1f5a-4a1e-9d3e-1c2b3a4d5e6f"), false);
  assert.equal(parseDerivedKey("6b1e6a2c-1f5a-4a1e-9d3e-1c2b3a4d5e6f"), null);
});

test("a malformed derived key is rejected rather than throwing", () => {
  // These arrive from a URL, so a bad one has to be a 400, not a 500.
  assert.equal(parseDerivedKey("gap:"), null);
  assert.equal(parseDerivedKey("gap:drill"), null);
  assert.equal(parseDerivedKey("gap:drill:notanumber"), null);
  assert.equal(parseDerivedKey(null), null);
});

test("the list and the detail agree on the partition by construction", () => {
  // buildSessions is a projection of buildSessionRowGroups; if they ever
  // diverged, a session could be listed that the detail endpoint cannot find.
  const rows = [
    row({ attemptId: 1, sessionId: "a", ts: 0 }),
    row({ attemptId: 2, ts: 100 }),
    row({ attemptId: 3, ts: SESSION_GAP_MS + 200 }),
    row({ attemptId: 4, surface: "exam", mode: "exam", ts: 50 }),
  ];
  const listed = buildSessions(rows).map((s) => s.key).sort();
  const grouped = buildSessionRowGroups(rows).map((g) => g.key).sort();
  assert.deepEqual(listed, grouped);
});

// ── normalizeSessionRows ────────────────────────────────────────────────────

test("normalizeSessionRows keeps abandoned rows, unlike stats.js's normalizer", () => {
  // The whole reason this module has its own normalizer: a 20-question exam you
  // got halfway through must not read as a 10-question exam.
  const normalized = normalizeSessionRows([
    { id: 1, topic_id: "bigo", item_id: "bigo-01", ts: 1, mode: "exam", surface: "exam", session_id: "a", grade: null, seconds: 0, abandoned: 1 },
  ]);
  assert.equal(normalized.length, 1);
  assert.equal(normalized[0].attemptId, 1);
  assert.equal(normalized[0].sessionId, "a");
  assert.equal(normalized[0].abandoned, 1);
});
