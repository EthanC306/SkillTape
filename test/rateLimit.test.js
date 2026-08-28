// The credential rate limiters.
//
// Mostly unit-level against a purpose-built limiter rather than the wired
// /api/auth ones, for a reason worth recording: the real login limiter keys on
// `ip:` as well as `email:`, and every test in a file shares 127.0.0.1. Driving
// the live routes repeatedly would drain one shared IP bucket and make each
// test depend on how many requests the ones before it happened to send. One
// integration test proves the wiring; the behaviour is pinned here.
import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { isolatedTestDb } from "./helpers/testDb.js";

isolatedTestDb(import.meta.url);

const { rateLimit } = await import("../server/rateLimit.js");
const { default: authRouter } = await import("../server/routes/auth.js");

/**
 * Stand up a throwaway app behind `limiter`.
 *
 * `t.after` rather than a call at the end of the test body: an assertion that
 * fails jumps straight out, the close never runs, and the still-listening
 * server keeps the event loop alive so `node --test` hangs instead of
 * reporting the failure. That is exactly what happened writing this file.
 */
function serve(t, limiter, handler = (req, res) => res.json({ ok: true })) {
  const app = express();
  app.use(express.json());
  app.use(limiter);
  app.get("/", handler);
  app.post("/", handler);
  const server = app.listen(0);
  t.after(() => server.close());
  return `http://127.0.0.1:${server.address().port}/`;
}

test("a window admits `max` hits, then refuses with a Retry-After", async (t) => {
  const limiter = rateLimit({ windowMs: 60_000, max: 3, keys: () => ["k"], message: "slow down" });
  const url = serve(t, limiter);

  for (let i = 0; i < 3; i++) assert.equal((await fetch(url)).status, 200, `hit ${i + 1}`);

  const blocked = await fetch(url);
  assert.equal(blocked.status, 429);
  const retry = Number(blocked.headers.get("retry-after"));
  assert.ok(retry > 0 && retry <= 60, `Retry-After should be a sane second count, got ${retry}`);
  assert.equal((await blocked.json()).error, "slow down");
});

test("hits age out of the window", async (t) => {
  const limiter = rateLimit({ windowMs: 50, max: 2, keys: () => ["k"], message: "x" });
  const url = serve(t, limiter);

  await fetch(url);
  await fetch(url);
  assert.equal((await fetch(url)).status, 429);
  await new Promise((r) => setTimeout(r, 70));
  assert.equal((await fetch(url)).status, 200, "the window has moved on");
});

test("independent keys do not share a budget", async (t) => {
  const limiter = rateLimit({
    windowMs: 60_000,
    max: 1,
    keys: (req) => [`k:${req.headers["x-key"]}`],
    message: "x",
  });
  const url = serve(t, limiter);

  assert.equal((await fetch(url, { headers: { "x-key": "a" } })).status, 200);
  assert.equal((await fetch(url, { headers: { "x-key": "a" } })).status, 429, "a is spent");
  assert.equal((await fetch(url, { headers: { "x-key": "b" } })).status, 200, "b is untouched");
});

test("any one of a request's keys can trip the limit", async (t) => {
  // The login shape: one IP guessing many accounts, or many IPs guessing one
  // account. Neither bucket alone catches both.
  const limiter = rateLimit({
    windowMs: 60_000,
    max: 2,
    keys: (req) => [`ip:${req.headers["x-ip"]}`, `email:${req.headers["x-email"]}`],
    message: "x",
  });
  const url = serve(t, limiter);
  const hit = (ip, email) => fetch(url, { headers: { "x-ip": ip, "x-email": email } });

  // Two different IPs, same target account: the email bucket fills.
  assert.equal((await hit("1.1.1.1", "victim@x")).status, 200);
  assert.equal((await hit("2.2.2.2", "victim@x")).status, 200);
  assert.equal(
    (await hit("3.3.3.3", "victim@x")).status,
    429,
    "a distributed attack on one account is still limited"
  );
  assert.equal((await hit("3.3.3.3", "other@x")).status, 200, "an unrelated account is unaffected");
});

test("a proven identity clears its own buckets", async (t) => {
  const limiter = rateLimit({ windowMs: 60_000, max: 2, keys: () => ["k"], message: "x" });
  let succeed = false;
  const url = serve(t, limiter, (req, res) => {
    if (succeed) req.clearRateLimit();
    res.json({ ok: true });
  });

  await fetch(url); // 1 wrong
  succeed = true;
  await fetch(url); // 2, but correct -> clears
  succeed = false;

  // Without the clear, the budget would already be spent here.
  assert.equal((await fetch(url)).status, 200);
  assert.equal((await fetch(url)).status, 200);
  assert.equal((await fetch(url)).status, 429, "and the limit still applies afterwards");
});

test("expired buckets are reclaimed rather than leaked", async (t) => {
  const limiter = rateLimit({
    windowMs: 60_000,
    max: 5,
    keys: (req) => [`k:${req.headers["x-key"]}`],
    message: "x",
  });
  const url = serve(t, limiter);

  for (let i = 0; i < 200; i++) await fetch(url, { headers: { "x-key": `k${i}` } });
  assert.equal(limiter.window.size, 200, "each distinct key holds a bucket while fresh");

  // Sweep from a point past the window instead of sleeping through it: the
  // cutoff is `now - windowMs`, so a future `now` expires everything. Keeps the
  // test deterministic rather than timing-dependent.
  limiter.window.sweep(Date.now() + 61_000);
  assert.equal(limiter.window.size, 0, "an unbounded map would itself be the DoS");
});

// ── The wired routes ────────────────────────────────────────────────────────

test("guessing a real account's password hits a ceiling", async (t) => {
  const app = express();
  app.use(express.json());
  app.use("/api/auth", authRouter);
  const server = app.listen(0);
  t.after(() => server.close());
  const base = `http://127.0.0.1:${server.address().port}/api/auth`;

  const email = "victim@example.com";
  const signup = await fetch(`${base}/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: "correct-horse" }),
  });
  assert.equal(signup.status, 201);
  assert.equal((await signup.json()).isAdmin, true, "the first account bootstraps as admin");

  let sawLimit = false;
  for (let i = 0; i < 15; i++) {
    const res = await fetch(`${base}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: "wrong-guess" }),
    });
    if (res.status === 429) {
      sawLimit = true;
      assert.ok(Number(res.headers.get("retry-after")) > 0, "429 must say when to retry");
      break;
    }
    assert.equal(res.status, 401, `attempt ${i + 1} should be 401 until the limit`);
  }
  assert.ok(sawLimit, "guessing must hit a ceiling rather than run forever");
});
