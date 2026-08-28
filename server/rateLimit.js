// A small in-memory rate limiter for the credential endpoints.
//
// Hand-rolled rather than express-rate-limit because this app's dependency list
// is deliberately short and the requirement is narrow: slow down guessing
// against /api/auth/login and /api/auth/signup. It is NOT a general traffic
// shaper, and it is not a substitute for one on a public deployment.
//
// WHAT IT DOES NOT DO, stated plainly so nobody assumes otherwise:
//
//  * State lives in this process's memory. Restarting the server clears every
//    counter, and two server processes do not share one. Fine for a
//    single-process self-hosted app; useless in front of a load balancer.
//  * It keys on req.ip. Behind a reverse proxy (the nginx in docker-compose)
//    Express reports the PROXY's address for every request unless
//    `app.set("trust proxy", …)` is configured, which would put every user in
//    one bucket. server/index.js notes this where the limiter is mounted.

/** A fixed-size sliding window of hit timestamps, per key. */
class Window {
  constructor(windowMs, max) {
    this.windowMs = windowMs;
    this.max = max;
    this.hits = new Map(); // key -> number[] (epoch ms, ascending)
  }

  /** Drop timestamps that have aged out of the window. */
  #prune(key, now) {
    const times = this.hits.get(key);
    if (!times) return [];
    const cutoff = now - this.windowMs;
    // Timestamps are appended in order, so the survivors are always a suffix.
    let i = 0;
    while (i < times.length && times[i] <= cutoff) i++;
    const kept = i === 0 ? times : times.slice(i);
    if (kept.length === 0) this.hits.delete(key);
    else this.hits.set(key, kept);
    return kept;
  }

  /** @returns {{ limited: boolean, retryAfterSec: number }} */
  check(key, now) {
    const kept = this.#prune(key, now);
    if (kept.length >= this.max) {
      const retryMs = kept[0] + this.windowMs - now;
      return { limited: true, retryAfterSec: Math.max(1, Math.ceil(retryMs / 1000)) };
    }
    return { limited: false, retryAfterSec: 0 };
  }

  record(key, now) {
    const times = this.hits.get(key) ?? [];
    times.push(now);
    this.hits.set(key, times);
  }

  /** Called on success — a correct login should not count against the limit. */
  reset(key) {
    this.hits.delete(key);
  }

  /**
   * Drop every empty/expired bucket. Without this the Map grows once per
   * distinct key forever, which turns the limiter itself into a memory-
   * exhaustion vector — the attack it exists to blunt.
   */
  sweep(now) {
    for (const key of [...this.hits.keys()]) this.#prune(key, now);
  }

  get size() {
    return this.hits.size;
  }
}

/**
 * Build a rate-limiting middleware.
 *
 * @param {object} opts
 * @param {number} opts.windowMs      how far back the window reaches
 * @param {number} opts.max           hits allowed per key per window
 * @param {(req: any) => string[]} opts.keys
 *        every bucket this request counts against. Returning more than one is
 *        the point for login: an attacker spreading guesses across addresses
 *        is still one IP, and an attacker spreading across IPs is still one
 *        target account, so both are limited independently.
 * @param {string} opts.message       the 429 body's `error`
 */
export function rateLimit({ windowMs, max, keys, message }) {
  const window = new Window(windowMs, max);

  // unref() so an idle timer never keeps the process alive — without it
  // `node --test` hangs after the last assertion instead of exiting.
  const sweeper = setInterval(() => window.sweep(Date.now()), windowMs).unref?.();
  void sweeper;

  const middleware = (req, res, next) => {
    const now = Date.now();
    const bucket = keys(req);

    for (const key of bucket) {
      const { limited, retryAfterSec } = window.check(key, now);
      if (limited) {
        res.setHeader("Retry-After", String(retryAfterSec));
        return res.status(429).json({ error: message, retryAfterSeconds: retryAfterSec });
      }
    }
    for (const key of bucket) window.record(key, now);

    // Handed to the route so a SUCCESSFUL attempt can clear its own counters.
    // Without it, someone who mistypes a password four times and then gets it
    // right stays throttled for the rest of the window despite having proven
    // who they are.
    req.clearRateLimit = () => {
      for (const key of bucket) window.reset(key);
    };
    next();
  };

  middleware.window = window; // exposed for tests
  return middleware;
}
