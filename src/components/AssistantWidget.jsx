import React, { useEffect, useRef, useState } from "react";
import { postAssistantChat } from "../api/client";
import useOllamaSettings from "../hooks/useOllamaSettings";
import { PALETTE, MONO, HEADING, RADII, SHADOWS } from "../data/theme";

/**
 * AssistantWidget — the floating chat assistant in the bottom-right corner.
 *
 * Shell renders it only while someone is signed in, so logging out unmounts
 * it and the conversation goes with it; nothing is persisted. Talks to
 * POST /api/assistant/chat, which runs the local Ollama model from Settings
 * (useOllamaSettings — the same host/model Practice grading uses).
 *
 * Carries `app-chrome`, so index.html hides it during Drill along with the
 * rest of the navigation: an AI helper one click away would quietly break
 * closed-book mode.
 *
 * Props:
 *   onCourseCreated(course) — the server created a course; refresh the list.
 *   onOpenCourse(id)        — the user clicked "Open" on a confirmation.
 */
export default function AssistantWidget({ onCourseCreated, onOpenCourse }) {
  const [open, setOpen] = useState(false);
  // { role: "user" | "assistant", content, action?, error? }
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const { host, model } = useOllamaSettings();
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, pending, open]);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    function handleKey(event) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  async function send(event) {
    event?.preventDefault();
    const message = draft.trim();
    if (!message || pending) return;

    // Error bubbles are UI only — the model never said them, so they don't go
    // back to it. A completed action is appended to the turn's content so a
    // follow-up like "add a subtitle to it" knows what "it" is.
    const history = messages
      .filter((entry) => !entry.error)
      .map((entry) => ({ role: entry.role, content: historyContent(entry) }));

    setMessages((current) => [...current, { role: "user", content: message }]);
    setDraft("");
    setPending(true);
    try {
      const result = await postAssistantChat({ message, history, host, model });
      setMessages((current) => [...current, { role: "assistant", content: result.reply, action: result.action }]);
      if (result.action?.type === "create_course" && result.action.ok) {
        onCourseCreated?.(result.action.course);
      }
    } catch (error) {
      setMessages((current) => [...current, { role: "assistant", content: error.message, error: true }]);
    } finally {
      setPending(false);
    }
  }

  function handleInputKey(event) {
    if (event.key === "Enter" && !event.shiftKey) send(event);
  }

  return (
    <div className="app-chrome" style={{ position: "fixed", right: 16, bottom: 8, zIndex: 900 }}>
      {open && (
        <section
          aria-label="Assistant"
          style={{
            position: "absolute",
            right: 0,
            bottom: 52,
            width: "min(360px, calc(100vw - 32px))",
            height: "min(480px, 70vh)",
            display: "flex",
            flexDirection: "column",
            border: `1px solid ${PALETTE.line}`,
            borderRadius: RADII.lg,
            background: PALETTE.panel,
            boxShadow: SHADOWS.lg,
            overflow: "hidden",
          }}
        >
          <header
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "10px 12px 10px 16px",
              borderBottom: `1px solid ${PALETTE.line}`,
            }}
          >
            <div>
              <div style={{ fontFamily: HEADING, fontSize: 14, fontWeight: 600 }}>Assistant</div>
              <div style={{ fontFamily: MONO, fontSize: 10, color: PALETTE.muted }}>{model} · local</div>
            </div>
            <button
              type="button"
              aria-label="Close assistant"
              onClick={() => setOpen(false)}
              style={iconButtonStyle}
            >
              ×
            </button>
          </header>

          <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: 12, display: "grid", alignContent: "start", gap: 8 }}>
            {messages.length === 0 && (
              <div style={{ fontFamily: MONO, fontSize: 12, color: PALETTE.muted, lineHeight: 1.6 }}>
                Ask me to do something in SkillTape. Try:
                <br />
                <span style={{ color: PALETTE.text }}>Create a new class called "Physics II"</span>
              </div>
            )}
            {messages.map((entry, i) => (
              <Bubble key={i} entry={entry} onOpenCourse={onOpenCourse} />
            ))}
            {pending && (
              <div aria-live="polite" style={{ fontFamily: MONO, fontSize: 12, color: PALETTE.muted }}>
                Thinking…
              </div>
            )}
          </div>

          <form onSubmit={send} style={{ display: "flex", gap: 8, padding: 10, borderTop: `1px solid ${PALETTE.line}` }}>
            <textarea
              ref={inputRef}
              rows={1}
              value={draft}
              maxLength={2000}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={handleInputKey}
              placeholder="Message the assistant"
              aria-label="Message the assistant"
              style={{
                flex: 1,
                resize: "none",
                boxSizing: "border-box",
                padding: "8px 10px",
                border: `1px solid ${PALETTE.line}`,
                borderRadius: RADII.md,
                background: PALETTE.bg,
                color: PALETTE.text,
                fontFamily: MONO,
                fontSize: 13,
              }}
            />
            <button
              type="submit"
              disabled={pending || !draft.trim()}
              style={{
                padding: "0 14px",
                border: `1px solid ${PALETTE.accent}`,
                borderRadius: RADII.md,
                background: PALETTE.accentSoft,
                color: PALETTE.accent,
                fontFamily: HEADING,
                fontSize: 13,
                cursor: "pointer",
                opacity: pending || !draft.trim() ? 0.5 : 1,
              }}
            >
              Send
            </button>
          </form>
        </section>
      )}

      <button
        type="button"
        aria-label={open ? "Close assistant" : "Open assistant"}
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        style={{
          width: 42,
          height: 42,
          display: "grid",
          placeItems: "center",
          padding: 0,
          borderRadius: "50%",
          border: `1px solid ${open ? PALETTE.accent : PALETTE.line}`,
          background: open ? PALETTE.accentSoft : PALETTE.panel2,
          color: PALETTE.accent,
          boxShadow: SHADOWS.md,
          cursor: "pointer",
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" />
          <path d="M8.5 12h.01M12 12h.01M15.5 12h.01" />
        </svg>
      </button>
    </div>
  );
}

/** What a turn looked like, for the model's benefit on the next request. */
function historyContent(entry) {
  const action = entry.action;
  if (action?.type === "create_course" && action.ok) {
    return `${entry.content}\n(App: created course "${action.course.title}".)`.trim();
  }
  if (action && !action.ok) {
    return `${entry.content}\n(App: the ${action.type} action failed — ${action.error})`.trim();
  }
  return entry.content;
}

function Bubble({ entry, onOpenCourse }) {
  const mine = entry.role === "user";
  const action = entry.action;
  return (
    <div style={{ justifySelf: mine ? "end" : "start", maxWidth: "85%", display: "grid", gap: 6 }}>
      {entry.content && (
        <div
          role={entry.error ? "alert" : undefined}
          style={{
            padding: "8px 11px",
            borderRadius: RADII.md,
            background: entry.error ? PALETTE.badSoft : mine ? PALETTE.accentSoft : PALETTE.panel2,
            color: entry.error ? PALETTE.bad : PALETTE.text,
            fontFamily: MONO,
            fontSize: 12.5,
            lineHeight: 1.5,
            whiteSpace: "pre-wrap",
            overflowWrap: "anywhere",
          }}
        >
          {entry.content}
        </div>
      )}
      {action?.type === "create_course" && action.ok && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
            padding: "8px 10px",
            border: `1px solid ${PALETTE.good}`,
            borderRadius: RADII.md,
            background: PALETTE.goodSoft,
            fontFamily: MONO,
            fontSize: 12,
          }}
        >
          <span>Created class “{action.course.title}”</span>
          <button type="button" onClick={() => onOpenCourse?.(action.course.id)} style={{ ...iconButtonStyle, width: "auto", padding: "2px 10px", fontSize: 12 }}>
            Open
          </button>
        </div>
      )}
      {action && !action.ok && (
        <div role="alert" style={{ fontFamily: MONO, fontSize: 11, color: PALETTE.bad }}>
          Couldn't {action.type.replace(/_/g, " ")}: {action.error}
        </div>
      )}
    </div>
  );
}

const iconButtonStyle = {
  width: 28,
  height: 28,
  display: "grid",
  placeItems: "center",
  padding: 0,
  border: `1px solid ${PALETTE.line}`,
  borderRadius: RADII.sm,
  background: "transparent",
  color: PALETTE.text,
  cursor: "pointer",
  fontSize: 16,
};
