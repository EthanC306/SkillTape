// gradingFailureReason (server/routes/drill.js) — the fail-open path's
// explanation, as shown on an ungraded results card.
//
// This exists because the card used to say "Ollama didn't respond" for every
// failure, including the one where Ollama responded instantly and clearly to
// say the model wasn't pulled. A whole debugging session went to the wrong
// cause on the strength of that sentence. The property worth protecting isn't
// the wording — it's that causes with DIFFERENT fixes produce DIFFERENT text,
// and that the text names the fix.
import test from "node:test";
import assert from "node:assert/strict";
import { isolatedTestDb } from "./helpers/testDb.js";

// gradingFailureReason is a pure function, but it lives in routes/drill.js,
// which imports server/db.js, which opens a database and migrates it at import
// time. Point that somewhere disposable BEFORE the import below, or this test
// migrates whatever database it finds. See helpers/testDb.js.
isolatedTestDb(import.meta.url);

const { gradingFailureReason } = await import("../server/routes/drill.js");
const { OllamaUnavailableError, OllamaBadResponseError } = await import("../server/ollama.js");

const CTX = { model: "qwen3.5:9b", host: "http://127.0.0.1:11434" };

test("connection refused says Ollama isn't running, and names the host", () => {
  const reason = gradingFailureReason(new OllamaUnavailableError("boom", "ECONNREFUSED"), CTX);
  assert.match(reason, /running/i);
  assert.match(reason, /127\.0\.0\.1:11434/);
});

test("a missing model names the model AND the command that fixes it", () => {
  // The exact failure this function was written for: Ollama up and answering,
  // model absent. "Restart Ollama" is the wrong fix and must not be implied.
  const err = new OllamaUnavailableError("Ollama responded 404", "HTTP_404", 'model "qwen3.5:9b" not found');
  const reason = gradingFailureReason(err, CTX);
  assert.match(reason, /qwen3\.5:9b/);
  assert.match(reason, /ollama pull qwen3\.5:9b/);
  assert.doesNotMatch(reason, /not running|didn't respond/i);
});

test("a timeout points at a still-loading model, not at a dead server", () => {
  // Different fix from ECONNREFUSED: run it again, don't go restart something
  // that is already up.
  const reason = gradingFailureReason(new OllamaUnavailableError("timed out", "TIMEOUT"), CTX);
  assert.match(reason, /try again/i);
  assert.doesNotMatch(reason, /doesn't look like it's running/i);
});

test("the three causes with different fixes never share wording", () => {
  const reasons = [
    gradingFailureReason(new OllamaUnavailableError("x", "ECONNREFUSED"), CTX),
    gradingFailureReason(new OllamaUnavailableError("x", "TIMEOUT"), CTX),
    gradingFailureReason(new OllamaUnavailableError("x", "HTTP_404"), CTX),
    gradingFailureReason(new OllamaBadResponseError("x", "not json"), CTX),
  ];
  assert.equal(new Set(reasons).size, reasons.length, "each cause must be distinguishable on the card");
});

test("an unrecognized HTTP failure still surfaces Ollama's own explanation", () => {
  const err = new OllamaUnavailableError("Ollama responded 500", "HTTP_500", "out of memory");
  assert.match(gradingFailureReason(err, CTX), /out of memory/);
});

test("an HTTP failure with no body falls back to the code rather than an empty sentence", () => {
  const reason = gradingFailureReason(new OllamaUnavailableError("Ollama responded 503", "HTTP_503"), CTX);
  assert.match(reason, /HTTP_503/);
});

test("bad JSON blames the model, and suggests the setting that changes it", () => {
  const reason = gradingFailureReason(new OllamaBadResponseError("nope", "<prose>"), CTX);
  assert.match(reason, /qwen3\.5:9b/);
  assert.match(reason, /Settings/);
});

test("a non-Ollama error is reported rather than swallowed into a generic line", () => {
  assert.match(gradingFailureReason(new TypeError("undefined is not a function"), CTX), /undefined is not a function/);
});

test("every reason is a single non-empty sentence safe to render as-is", () => {
  const errors = [
    new OllamaUnavailableError("x", "ECONNREFUSED"),
    new OllamaUnavailableError("x", "ENOTFOUND"),
    new OllamaUnavailableError("x", "TIMEOUT"),
    new OllamaUnavailableError("x", "HTTP_404"),
    new OllamaUnavailableError("x", "UNKNOWN"),
    new OllamaBadResponseError("x", "y"),
    new Error("plain"),
  ];
  for (const err of errors) {
    const reason = gradingFailureReason(err, CTX);
    assert.equal(typeof reason, "string");
    assert.ok(reason.trim().length > 0, `empty reason for ${err.code ?? err.name}`);
    assert.doesNotMatch(reason, /\n/, `reason must stay one line: ${reason}`);
  }
});
