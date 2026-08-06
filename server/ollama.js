// Thin client for a locally-run Ollama server (docs/OLLAMA_GRADING.md). Pure
// functions, no DB or Express access — server/routes/drill.js is the only
// caller. Ollama runs on the same machine as this process (see
// electron/main.cjs: server/index.js is a plain forked Node child, so an
// outbound fetch to 127.0.0.1:11434 is no different from any other
// server-side call already in this codebase); the browser never talks to it
// directly. The host is caller-supplied, though, so every fetch below runs
// it through resolveHost's allowlist first — see the block comment there.

const FALLBACK_HOST = "http://127.0.0.1:11434";
// Measured against real items from this bank (see docs/OLLAMA_GRADING.md §8):
// qwen3.5:9b grades 100% of criteria correctly where both qwen2.5:7b-instruct
// and qwen2.5-coder:7b sit at 94%, each with a different deterministic failure
// this one fixes. 6.6GB, stays 100% on an 8GB card.
export const DEFAULT_MODEL = "qwen3.5:9b";

// ── Host allowlist ──────────────────────────────────────────────────────
//
// The host is caller-supplied (SettingsMenu's field -> POST
// /api/drill/grade-batch's body and GET /api/drill/ollama-status's query),
// but the fetch happens *here*, server-side, on an unauthenticated route.
// Without this allowlist an outside caller could aim this process at any
// address it can reach and read the timing/status back: a port scanner for
// the private network the server sits on, and on a cloud VM a reader for
// the link-local metadata endpoint (169.254.169.254) that hands out
// instance credentials. That's a non-issue for the single-user desktop
// build every comment here assumes, and a real one for the Docker
// deployment docker-compose.yml ships.
//
// Allowed: loopback on any port — Ollama's port is user-configurable, and a
// caller who has already reached this server's own loopback gains nothing
// new — plus any full origin the operator lists in OLLAMA_ALLOWED_HOSTS
// ("http://ollama.internal:11434,https://..."), which is how a hosted
// install points at a real Ollama box on purpose. OLLAMA_HOST overrides the
// default and is always allowed.

/** Parse to a bare origin, or null if it isn't an ordinary credential-free http(s) URL. Normalizing to origin also drops any path/trailing slash, so `${host}/api/chat` can't be steered elsewhere. */
function toOrigin(candidate) {
  let url;
  try {
    url = new URL(candidate);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  // new URL("http://127.0.0.1@evil.example") already resolves to hostname
  // evil.example (so the allowlist below catches it), but embedded
  // credentials have no business in this field either way.
  if (url.username || url.password) return null;
  return url.origin;
}

function isLoopback(origin) {
  const { hostname } = new URL(origin);
  // URL() keeps IPv6 literals bracketed in .hostname.
  return hostname === "localhost" || hostname === "[::1]" || /^127(\.\d{1,3}){3}$/.test(hostname);
}

export const DEFAULT_HOST = (() => {
  const configured = process.env.OLLAMA_HOST?.trim();
  if (!configured) return FALLBACK_HOST;
  const origin = toOrigin(configured);
  if (origin) return origin;
  console.warn(`OLLAMA_HOST is not a valid http(s) URL ("${configured}") — falling back to ${FALLBACK_HOST}`);
  return FALLBACK_HOST;
})();

const ALLOWED_ORIGINS = new Set([DEFAULT_HOST]);
for (const entry of (process.env.OLLAMA_ALLOWED_HOSTS ?? "").split(",")) {
  const trimmed = entry.trim();
  if (!trimmed) continue;
  const origin = toOrigin(trimmed);
  if (origin) ALLOWED_ORIGINS.add(origin);
  else console.warn(`Ignoring OLLAMA_ALLOWED_HOSTS entry "${trimmed}" — not a valid http(s) URL`);
}

/** The caller asked for a host outside the allowlist. A client bug or an SSRF attempt — never an outage, so callers must NOT fail open on this the way they do for OllamaUnavailableError. */
export class OllamaHostNotAllowedError extends Error {
  constructor(host) {
    super(
      `Ollama host "${host}" is not allowed — only loopback addresses, or origins listed in OLLAMA_ALLOWED_HOSTS, may be used`
    );
    this.name = "OllamaHostNotAllowedError";
  }
}

/**
 * Validate a caller-supplied host against the allowlist above and normalize
 * it to a bare origin. Empty/missing means "use the configured default".
 *
 * Enforced inside postChat/listModels too, so no future caller can fetch an
 * unvalidated host by forgetting this; routes call it directly to reject
 * early with a 400 instead of a 500.
 *
 * @throws {OllamaHostNotAllowedError}
 */
export function resolveHost(candidate) {
  if (typeof candidate !== "string" || !candidate.trim()) return DEFAULT_HOST;
  const trimmed = candidate.trim();
  const origin = toOrigin(trimmed);
  if (!origin || (!isLoopback(origin) && !ALLOWED_ORIGINS.has(origin))) {
    throw new OllamaHostNotAllowedError(trimmed);
  }
  return origin;
}

// How long Ollama keeps the model resident in VRAM after a call. Refreshed on
// every call, so a whole multi-chunk grading pass — and a second Practice
// session started shortly after — finds it already warm instead of paying
// the multi-second reload cost per chunk.
const KEEP_ALIVE_SEC = 600;

/** Ollama isn't reachable (down, wrong host, model missing, timed out). Callers must fail open on this. */
export class OllamaUnavailableError extends Error {
  constructor(message, code) {
    super(message);
    this.name = "OllamaUnavailableError";
    this.code = code; // "ECONNREFUSED" | "ENOTFOUND" | "TIMEOUT" | "HTTP_<status>" | "UNKNOWN"
  }
}

/** Ollama responded, but the model's output wasn't valid JSON even after a retry. */
export class OllamaBadResponseError extends Error {
  constructor(message, raw) {
    super(message);
    this.name = "OllamaBadResponseError";
    this.raw = raw; // the unparseable string, for server-side logging
  }
}

async function postChat({ host, model, system, user, temperature, timeoutMs }) {
  host = resolveHost(host);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let res;
  try {
    res = await fetch(`${host}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        format: "json",
        stream: false,
        keep_alive: KEEP_ALIVE_SEC,
        // Required, not a tuning knob. qwen3.5 and other hybrid-reasoning
        // models default to thinking, and on a prompt as long as the grading
        // one they spend the whole budget in message.thinking and return an
        // EMPTY message.content — which the parse below turns into
        // OllamaBadResponseError, and the caller fails open on, so grading
        // would silently switch itself off with no visible error anywhere.
        // Verified a no-op (HTTP 200, unchanged output) on non-thinking
        // models, which matters because existing installs have qwen2.5
        // pinned in localStorage via useOllamaSettings.js.
        think: false,
        options: { temperature },
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });
  } catch (err) {
    if (err.name === "AbortError") {
      throw new OllamaUnavailableError(`Ollama request timed out after ${timeoutMs}ms`, "TIMEOUT");
    }
    throw new OllamaUnavailableError(`Could not reach Ollama at ${host}: ${err.message}`, err.cause?.code ?? "UNKNOWN");
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    throw new OllamaUnavailableError(`Ollama responded ${res.status} ${res.statusText}`, `HTTP_${res.status}`);
  }

  let envelope;
  try {
    envelope = await res.json();
  } catch {
    throw new OllamaBadResponseError("Ollama response body was not valid JSON", "<unparseable body>");
  }

  const raw = envelope?.message?.content ?? "";
  try {
    return JSON.parse(raw);
  } catch {
    throw new OllamaBadResponseError("Ollama's message content was not valid JSON", raw);
  }
}

/**
 * One JSON-mode chat call to Ollama. Distinguishes "Ollama isn't reachable"
 * (OllamaUnavailableError, never retried — a dead connection or missing
 * model won't fix itself) from "Ollama answered but the JSON didn't parse"
 * (OllamaBadResponseError, retried once with a stricter reminder appended to
 * the system prompt — small local models occasionally wrap JSON in prose
 * despite `format: "json"`).
 *
 * @returns {Promise<any>} the parsed value of the model's message content
 */
export async function chatJSON({
  host = DEFAULT_HOST,
  model = DEFAULT_MODEL,
  system,
  user,
  temperature = 0.15,
  timeoutMs = 30000,
} = {}) {
  try {
    return await postChat({ host, model, system, user, temperature, timeoutMs });
  } catch (err) {
    if (!(err instanceof OllamaBadResponseError)) throw err;
    const stricter = `${system}\n\nIMPORTANT: reply with ONLY the JSON object. No prose, no markdown fences, no explanation.`;
    return await postChat({ host, model, system: stricter, user, temperature, timeoutMs });
  }
}

/** GET {host}/api/tags -> the names of locally pulled models. Throws OllamaUnavailableError on connection failure; never throws on "empty list". */
export async function listModels({ host = DEFAULT_HOST, timeoutMs = 4000 } = {}) {
  host = resolveHost(host);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let res;
  try {
    res = await fetch(`${host}/api/tags`, { signal: controller.signal });
  } catch (err) {
    if (err.name === "AbortError") {
      throw new OllamaUnavailableError(`Ollama request timed out after ${timeoutMs}ms`, "TIMEOUT");
    }
    throw new OllamaUnavailableError(`Could not reach Ollama at ${host}: ${err.message}`, err.cause?.code ?? "UNKNOWN");
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    throw new OllamaUnavailableError(`Ollama responded ${res.status} ${res.statusText}`, `HTTP_${res.status}`);
  }

  const data = await res.json().catch(() => ({}));
  return (data.models ?? []).map((m) => m.name);
}
