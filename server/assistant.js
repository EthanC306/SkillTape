// The in-app assistant's contract with the model: the system prompt, the JSON
// schema its reply is constrained to, and the validation that turns that reply
// into at most one action. Pure — no DB, no Express, no fetch — so it can be
// tested without Ollama running. routes/assistant.js is the only caller and is
// where actions actually execute.
//
// HOW ACTIONS WORK
//
// The model never touches the database. It replies with
// { reply, action: { type, ...fields } }, and Ollama compiles the schema below
// into a sampling grammar, so `type` can only ever be one of ACTION_TYPES. The
// route then runs the action through the same code path a button in the UI
// would (createCourse for "create_course") — validation, naming and ownership
// are exactly what they'd be had the user filled in the dialog themselves.
//
// Adding an action means: a new entry in ACTION_TYPES, its fields in the
// schema, a line in the prompt's action list, a case in parseAction, and a
// case in the route's executor. Nothing else.
//
// Native Ollama tool calling (`tools` on /api/chat) was the other option. It
// isn't used because support varies by model and silently degrades to plain
// text on ones without it, whereas a format schema behaves the same on every
// model this app already grades with.

/** Every action the assistant can request. "none" means just reply. */
export const ACTION_TYPES = ["none", "create_course"];

/** Most recent turns forwarded to the model. Older ones are dropped, not summarized. */
export const MAX_HISTORY = 12;
/** Per-message cap, both for what the user types and for history entries. */
export const MAX_MESSAGE_CHARS = 2000;

export const ASSISTANT_SYSTEM_PROMPT = `You are the assistant built into SkillTape, a study app for college coursework.
You help the signed-in user manage their study material and answer short questions about using the app.

Vocabulary: the user may say "class" or "course" — they mean the same thing. A course contains topics; topics contain notes, flashcards and questions.

You can perform exactly these actions, by setting the "action" field of your reply:
- create_course: create a new course owned by the user. Set "title" to the course name exactly as the user gave it (keep their capitalization; strip surrounding quotes). Set "subtitle" to a short description only if the user supplied one, otherwise "".
- none: no action — just reply.

Rules:
- Only request an action when the user clearly asks for it. If the request is ambiguous (for example, no course name was given), use action "none" and ask a short clarifying question.
- Request at most one action per reply.
- Never claim to have done something unless you set the matching action in this same reply. The app confirms the result to the user after it runs.
- For anything you cannot do with the actions above, say so plainly in one sentence. Do not pretend.
- Keep replies brief: one to three sentences, plain text, no markdown.

Reply with a single JSON object matching the required schema.`;

/**
 * The schema Ollama constrains the reply to. title/subtitle are always
 * present (empty when unused) rather than conditional on `type`: a flat,
 * all-required object compiles into a far simpler grammar than a oneOf, and
 * small models follow it more reliably.
 */
export function assistantResponseSchema() {
  return {
    type: "object",
    properties: {
      reply: { type: "string" },
      action: {
        type: "object",
        properties: {
          type: { type: "string", enum: ACTION_TYPES },
          title: { type: "string" },
          subtitle: { type: "string" },
        },
        required: ["type", "title", "subtitle"],
      },
    },
    required: ["reply", "action"],
  };
}

/**
 * Validate the client-supplied conversation. Throws on anything malformed
 * rather than repairing it — a bad shape here is a client bug, not something
 * to paper over. Returns the last MAX_HISTORY turns.
 *
 * @param {unknown} raw
 * @returns {{role: "user"|"assistant", content: string}[]}
 */
export function normalizeHistory(raw) {
  if (raw == null) return [];
  if (!Array.isArray(raw)) throw new Error("history must be an array");
  return raw.slice(-MAX_HISTORY).map((entry, i) => {
    if (!entry || (entry.role !== "user" && entry.role !== "assistant")) {
      throw new Error(`history[${i}].role must be "user" or "assistant"`);
    }
    if (typeof entry.content !== "string") throw new Error(`history[${i}].content must be a string`);
    return { role: entry.role, content: entry.content.slice(0, MAX_MESSAGE_CHARS) };
  });
}

/**
 * Turn the model's parsed JSON into a reply plus at most one validated
 * action. Never throws: a reply that's missing or the wrong shape degrades
 * to "no action", because the grammar should have made it impossible and a
 * model that slipped through anyway shouldn't be able to trigger a write.
 *
 * @returns {{ reply: string, action: {type: "none"} | {type: "create_course", title: string, subtitle: string} }}
 */
export function parseAction(parsed) {
  let reply = typeof parsed?.reply === "string" ? parsed.reply.trim() : "";
  // Small models sometimes put the action name in `reply` ("create_course")
  // instead of a sentence. Drop it — the UI's confirmation says it better.
  if (ACTION_TYPES.includes(reply)) reply = "";
  const action = parsed?.action;

  if (action?.type === "create_course") {
    const title = typeof action.title === "string" ? stripQuotes(action.title.trim()) : "";
    const subtitle = typeof action.subtitle === "string" ? action.subtitle.trim() : "";
    // A create with no name is the model guessing, not the user asking.
    if (title) return { reply, action: { type: "create_course", title, subtitle } };
  }
  return { reply, action: { type: "none" } };
}

/** "Physics II" → Physics II. Models often keep the quotes the user typed. */
function stripQuotes(text) {
  const match = /^["'“‘](.*)["'”’]$/s.exec(text);
  return match ? match[1].trim() : text;
}
