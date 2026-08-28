import React, { useLayoutEffect, useRef, useState } from "react";
import { PALETTE, MONO, HEADING, RADII } from "../data/theme";
import Inline from "./Inline";
import { toggleBold, validateBody } from "../utils/blankEdit";
import MathKeyboard from "./MathKeyboard";

/**
 * CardEditor — one Learn card, editable in place.
 *
 * The B button is the whole point of this component. Because `**bold**` doubles
 * as the Fill Mode blank marker (see utils/fill.js), wrapping a selection in
 * asterisks is simultaneously "emphasize this" and "make this a blank" — so
 * marking recall terms never leaves the app.
 *
 * Props:
 *   card      — { heading, body, code?, accept?, figure? }
 *   index     — position in the deck, for the ↑↓ controls
 *   total     — deck length, so the ends can disable their arrow
 *   onChange  — (nextCard) => void
 *   onMove    — (index, delta) => void
 *   onDelete  — (index) => void
 */
export default function CardEditor({ card, index, total, onChange, onMove, onDelete, mathEnabled = false }) {
  const headingRef = useRef(null);
  const bodyRef = useRef(null);
  // Selection to restore after the next render. React re-renders the textarea
  // from `value` on every keystroke and that drops the caret to the end, so a
  // selection set during the event handler would be gone by the time the user
  // sees it. Stashing it here and reapplying in useLayoutEffect (before paint)
  // is what makes pressing B twice in a row actually work.
  const pendingSel = useRef(null);
  const [boldError, setBoldError] = useState(null);

  useLayoutEffect(() => {
    const sel = pendingSel.current;
    if (!sel || !bodyRef.current) return;
    pendingSel.current = null;
    bodyRef.current.focus();
    bodyRef.current.setSelectionRange(sel.start, sel.end);
  });

  const body = card.body ?? "";
  const check = validateBody(body);

  function set(patch) {
    onChange({ ...card, ...patch });
  }

  /** Wrap/unwrap the current selection in ** — i.e. toggle a Fill Mode blank. */
  function applyBold() {
    const el = bodyRef.current;
    if (!el) return;
    const result = toggleBold(body, el.selectionStart, el.selectionEnd);
    if (result.error) {
      setBoldError(result.error);
      return;
    }
    setBoldError(null);
    pendingSel.current = { start: result.selStart, end: result.selEnd };
    set({ body: result.text });
  }

  const smallBtn = (extra) => ({
    fontFamily: MONO,
    fontSize: 12,
    padding: "5px 10px",
    borderRadius: RADII.sm,
    cursor: "pointer",
    border: `1px solid ${PALETTE.line}`,
    background: "transparent",
    color: PALETTE.text,
    lineHeight: 1.2,
    ...extra,
  });

  const field = {
    width: "100%",
    boxSizing: "border-box",
    background: PALETTE.bg,
    border: `1px solid ${PALETTE.line}`,
    borderRadius: RADII.md,
    color: PALETTE.text,
    padding: "9px 11px",
    fontFamily: "inherit",
    fontSize: 15,
    lineHeight: 1.7,
  };

  return (
    <div style={{ display: "grid", gap: 10 }}>
      {/* Heading + card controls */}
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input
          ref={headingRef}
          value={card.heading ?? ""}
          onChange={(e) => set({ heading: e.target.value })}
          placeholder="Card heading"
          aria-label="card heading"
          style={{
            ...field,
            fontFamily: HEADING,
            fontSize: 16,
            fontWeight: 500,
            color: PALETTE.accent,
            letterSpacing: 0.2,
          }}
        />
        <button
          onClick={() => onMove(index, -1)}
          disabled={index === 0}
          title="Move up"
          style={smallBtn({ opacity: index === 0 ? 0.35 : 1, cursor: index === 0 ? "default" : "pointer" })}
        >
          ↑
        </button>
        <button
          onClick={() => onMove(index, 1)}
          disabled={index === total - 1}
          title="Move down"
          style={smallBtn({
            opacity: index === total - 1 ? 0.35 : 1,
            cursor: index === total - 1 ? "default" : "pointer",
          })}
        >
          ↓
        </button>
        <button
          onClick={() => onDelete(index)}
          title="Delete this card"
          style={smallBtn({ borderColor: PALETTE.bad, color: PALETTE.bad })}
        >
          ✕
        </button>
      </div>
      {mathEnabled && <MathKeyboard inputRef={headingRef} value={card.heading ?? ""} onChange={(heading) => set({ heading })} label="math keyboard for card heading" />}

      {/* Body */}
      <textarea
        ref={bodyRef}
        value={body}
        onChange={(e) => set({ body: e.target.value })}
        onKeyDown={(e) => {
          // Ctrl/Cmd-B, the shortcut every editor has trained people to expect.
          if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
            e.preventDefault();
            applyBold();
          }
        }}
        rows={Math.min(14, Math.max(4, Math.ceil(body.length / 60)))}
        placeholder="Card body. Select a term and press B to make it a blank."
        aria-label="card body"
        style={{ ...field, resize: "vertical" }}
      />
      {mathEnabled && <MathKeyboard inputRef={bodyRef} value={body} onChange={(nextBody) => set({ body: nextBody })} label="math keyboard for card body" />}

      {/* Toolbar + live blank count */}
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <button
          onClick={applyBold}
          title="Wrap the selection in ** — makes it bold in Learn and a blank in Fill Mode (Ctrl+B)"
          style={smallBtn({
            fontWeight: 700,
            minWidth: 30,
            borderColor: PALETTE.accent,
            color: PALETTE.accent,
          })}
        >
          B
        </button>

        {card.code == null ? (
          <button onClick={() => set({ code: "" })} style={smallBtn()} title="Attach a code block">
            + code
          </button>
        ) : (
          <button
            onClick={() => set({ code: undefined })}
            style={smallBtn({ color: PALETTE.muted })}
            title="Remove the code block"
          >
            − code
          </button>
        )}

        <span style={{ fontFamily: MONO, fontSize: 11, color: PALETTE.muted }}>
          {check.blanks} blank{check.blanks === 1 ? "" : "s"}
        </span>

        {/* Errors are real breakage; warnings are house-style nudges. */}
        {check.errors.map((msg) => (
          <span key={msg} style={{ fontFamily: MONO, fontSize: 11, color: PALETTE.bad }}>
            ⚠ {msg}
          </span>
        ))}
        {check.errors.length === 0 &&
          check.warnings.map((msg) => (
            <span key={msg} style={{ fontFamily: MONO, fontSize: 11, color: PALETTE.muted }}>
              {msg}
            </span>
          ))}
        {boldError && (
          <span style={{ fontFamily: MONO, fontSize: 11, color: PALETTE.bad }}>⚠ {boldError}</span>
        )}
      </div>

      {/* Optional code block. Kept a plain monospace textarea — the app has no
          syntax highlighting anywhere and adding it here would be the only one. */}
      {card.code != null && (
        <textarea
          value={card.code}
          onChange={(e) => set({ code: e.target.value })}
          rows={Math.min(20, Math.max(3, card.code.split("\n").length + 1))}
          placeholder="Code listing"
          aria-label="card code"
          spellCheck={false}
          style={{ ...field, fontFamily: MONO, fontSize: 13, lineHeight: 1.5, resize: "vertical" }}
        />
      )}

      {/* Live preview — the same <Inline> the read-only card uses, so what you
          see here is exactly what Learn mode will render. */}
      <div
        style={{
          borderTop: `1px solid ${PALETTE.line}`,
          paddingTop: 10,
          fontSize: 15,
          lineHeight: 1.8,
          letterSpacing: 0.2,
          color: PALETTE.muted,
        }}
      >
        <div style={{ fontFamily: MONO, fontSize: 10, color: PALETTE.muted, marginBottom: 6 }}>
          PREVIEW
        </div>
        <Inline text={body} />
      </div>

      {/* Figures stay hand-authored (no upload path yet), but say so rather than
          silently hiding one that exists — otherwise it looks like data loss. */}
      {card.figure && (
        <div style={{ fontFamily: MONO, fontSize: 11, color: PALETTE.muted }}>
          figure: {card.figure.src} — kept as-is, edit in the topic file
        </div>
      )}
    </div>
  );
}
