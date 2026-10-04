// POST /api/assistant/chat — one turn of the in-app assistant.
//
// Body: { message, history?, host?, model? }
// → { reply, action: null | { type, ok, course?, error? }, modelUsed }
//
// The model proposes; this route disposes. server/assistant.js constrains the
// reply to { reply, action } and validates it, and the action then runs here
// through the same function its UI button uses. `action` in the response is
// what ACTUALLY happened, not what the model said — the client shows its
// confirmation from this field, so a model that claims "done!" without
// requesting the action can't make the UI say a course exists when it doesn't.
//
// Logged-in only, like every write it can trigger. Rate-limited per user:
// each turn is seconds of GPU time, and on the Docker deployment an
// unthrottled loop of these would starve Practice grading on the same card.

import { Router } from "express";
import { requireUser } from "../userScope.js";
import { rateLimit } from "../rateLimit.js";
import {
  chatJSON,
  resolveHost,
  DEFAULT_MODEL,
  OllamaUnavailableError,
  OllamaBadResponseError,
  OllamaHostNotAllowedError,
} from "../ollama.js";
import {
  ASSISTANT_SYSTEM_PROMPT,
  MAX_MESSAGE_CHARS,
  assistantResponseSchema,
  normalizeHistory,
  parseAction,
} from "../assistant.js";
import { createCourse } from "./courses.js";
import { gradingFailureReason } from "./drill.js";

const router = Router();

const chatLimiter = rateLimit({
  windowMs: 60_000,
  max: 20,
  keys: (req) => [`assistant:${req.userId}`],
  message: "Too many assistant messages — wait a moment and try again.",
});

/** Run a validated action as `userId`. Returns what to report back; never throws. */
function executeAction(userId, action) {
  switch (action.type) {
    case "create_course":
      try {
        const course = createCourse(userId, { title: action.title, subtitle: action.subtitle });
        return { type: action.type, ok: true, course };
      } catch (error) {
        return { type: action.type, ok: false, error: error.message };
      }
    default:
      return null;
  }
}

router.post("/chat", requireUser, chatLimiter, async (req, res) => {
  const body = req.body ?? {};

  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (!message) return res.status(400).json({ error: "message must be a non-empty string" });
  if (message.length > MAX_MESSAGE_CHARS) {
    return res.status(400).json({ error: `message exceeds ${MAX_MESSAGE_CHARS} characters` });
  }

  let history;
  try {
    history = normalizeHistory(body.history);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }

  // Same reasoning as grade-batch: a host outside the allowlist is a bad
  // request or an SSRF probe, never an outage.
  let host;
  try {
    host = resolveHost(body.host);
  } catch (err) {
    if (err instanceof OllamaHostNotAllowedError) return res.status(400).json({ error: err.message });
    throw err;
  }
  const model = typeof body.model === "string" && body.model.trim() ? body.model.trim() : DEFAULT_MODEL;

  let parsed;
  try {
    parsed = await chatJSON({
      host,
      model,
      system: ASSISTANT_SYSTEM_PROMPT,
      history,
      user: message,
      format: assistantResponseSchema(),
      temperature: 0.2,
      // A cold model load measured 67s on qwen2.5:7b before the first token,
      // so this is double grade-batch's 60s. The widget shows "Thinking…"
      // the whole time; a TIMEOUT still reports "may still be loading".
      timeoutMs: 120000,
    });
  } catch (err) {
    if (err instanceof OllamaUnavailableError || err instanceof OllamaBadResponseError) {
      const reason = gradingFailureReason(err, { model, host });
      console.warn(`[assistant] ${reason}`);
      // 503, not 200-with-a-fallback like grading: there is no degraded
      // answer to give, and the client shows this text in place of a reply.
      return res.status(503).json({ error: reason });
    }
    throw err;
  }

  const { reply, action } = parseAction(parsed);
  const result = executeAction(req.userId, action);

  res.json({
    reply: reply || (result ? "" : "Sorry — I didn't get a usable answer. Try rephrasing."),
    action: result,
    modelUsed: model,
  });
});

export default router;
