import React, { useEffect, useState } from "react";
import { PALETTE, MONO, HEADING, DISPLAY, RADII } from "../data/theme";
import Inline from "./Inline";
import FillBody from "./FillBody";
import Figure from "./Figure";
import CodeBlock from "./CodeBlock";
import ComplexityChart from "./ComplexityChart";
import ReferenceTable from "./ReferenceTable";
import CardEditor from "./CardEditor";
import { validateBody } from "../utils/blankEdit";

/** LearnView — the note cards for a topic, with an optional "Fill Mode" quiz-of-recall. */
export default function LearnView({ topic, editMode, onSave, saveState, registerEditor }) {
  const [fillMode, setFillMode] = useState(false);
  const [inputs, setInputs] = useState({});
  const [checked, setChecked] = useState(false);

  // Working copy of the cards while editing; null when not editing, so the
  // read-only path below is completely untouched. Rebuilt whenever edit mode
  // toggles, the topic changes, or a save lands (App refetches and hands down
  // a new array, which is exactly when the draft should follow the server).
  const [draft, setDraft] = useState(null);
  useEffect(() => {
    setDraft(editMode ? (topic.cards ?? []).map((c) => ({ ...c })) : null);
  }, [editMode, topic.id, topic.cards]);

  function toggleFillMode() {
    setFillMode((on) => !on);
    setInputs({});
    setChecked(false);
  }

  function updateInput(id, value) {
    setInputs((prev) => ({ ...prev, [id]: value }));
  }

  function reset() {
    setInputs({});
    setChecked(false);
  }

  const btn = (active) => ({
    fontFamily: HEADING,
    fontSize: 13,
    padding: "7px 16px",
    borderRadius: RADII.md,
    cursor: "pointer",
    border: `1px solid ${active ? PALETTE.accent : PALETTE.line}`,
    background: active ? PALETTE.accentSoft : "transparent",
    color: active ? PALETTE.accent : PALETTE.text,
    fontWeight: 500,
  });

  // ── Edit mode ──────────────────────────────────────────────────────────────

  const editing = editMode && draft !== null;
  const cards = editing ? draft : topic.cards ?? [];

  const dirty = editing && JSON.stringify(draft) !== JSON.stringify(topic.cards ?? []);

  // An unclosed ** renders as literal asterisks instead of a blank, so block the
  // save rather than let broken markup reach the database.
  const blocking = editing
    ? draft.flatMap((c, i) =>
        validateBody(c.body ?? "").errors.map((e) => `card ${i + 1}: ${e}`)
      )
    : [];

  const canSave = dirty && blocking.length === 0 && saveState !== "saving";

  // Hand the live draft up to TopicView so its Done button can commit it. No
  // dependency array on purpose: this is a ref write, and it has to describe
  // the draft as of the *last* render, not as of whenever the deps last moved.
  useEffect(() => {
    if (!registerEditor || !editing) return;
    registerEditor({
      dirty,
      blocked: blocking.length > 0,
      save: () => onSave({ cards: draft }),
    });
    return () => registerEditor(null);
  });

  function updateCard(i, next) {
    setDraft((prev) => prev.map((c, j) => (j === i ? next : c)));
  }

  function moveCard(i, delta) {
    setDraft((prev) => {
      const j = i + delta;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  function deleteCard(i) {
    setDraft((prev) => prev.filter((_, j) => j !== i));
  }

  function addCard() {
    setDraft((prev) => [...prev, { heading: "New card", body: "" }]);
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 18 }}>
      {editing ? (
        // Edits stay local until Save — no request per keystroke, and Revert is
        // always a way back to what the server actually has.
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <button
            onClick={() => onSave({ cards: draft })}
            disabled={!canSave}
            style={{
              ...btn(canSave),
              cursor: canSave ? "pointer" : "default",
              opacity: canSave ? 1 : 0.5,
            }}
          >
            {saveState === "saving" ? "Saving…" : "Save"}
          </button>
          <button
            onClick={() => setDraft((topic.cards ?? []).map((c) => ({ ...c })))}
            disabled={!dirty}
            style={{ ...btn(false), opacity: dirty ? 1 : 0.5, cursor: dirty ? "pointer" : "default" }}
          >
            Revert
          </button>
          <span style={{ fontFamily: MONO, fontSize: 11, color: PALETTE.muted }}>
            {dirty ? "unsaved changes" : "select a term and press B to make it a blank"}
          </span>
          {blocking.map((msg) => (
            <span key={msg} style={{ fontFamily: MONO, fontSize: 11, color: PALETTE.bad }}>
              ⚠ {msg}
            </span>
          ))}
          {saveState && saveState !== "saving" && (
            <span
              style={{
                fontFamily: MONO,
                fontSize: 11,
                color: saveState === "saved" ? PALETTE.good : PALETTE.bad,
              }}
            >
              {saveState === "saved" ? "saved ✓" : saveState}
            </span>
          )}
        </div>
      ) : (
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <button onClick={toggleFillMode} style={btn(fillMode)}>
            Fill Mode
          </button>
          {fillMode && (
            <>
              <button onClick={() => setChecked(true)} style={btn(false)}>
                CHECK
              </button>
              <button onClick={reset} style={btn(false)}>
                Reset
              </button>
              <span style={{ fontFamily: MONO, fontSize: 11, color: PALETTE.muted }}>
                hide the key words and fill them in from memory
              </span>
            </>
          )}
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 18 }}>
        {cards.map((c, i) => (
          <div
            key={i}
            style={{
              background: PALETTE.panel,
              border: `1px solid ${PALETTE.line}`,
              borderRadius: RADII.lg,
              padding: "22px 24px",
              // Editors need the room: one card per row while editing, rather
              // than squeezing a textarea into a narrow grid column.
              gridColumn: c.code || editing ? "1 / -1" : undefined,
            }}
          >
            {editing ? (
              <CardEditor
                card={c}
                index={i}
                total={cards.length}
                onChange={(next) => updateCard(i, next)}
                onMove={moveCard}
                onDelete={deleteCard}
              />
            ) : (
              <>
                {/* No letterSpacing here, unlike the body below: the +0.2px was
                    tuned for Inter, and positive tracking on a serif at display
                    size pulls the glyphs apart from their intended fit. */}
                <div style={{ fontFamily: DISPLAY, fontSize: 18, fontWeight: 500, marginBottom: 12, color: PALETTE.accent }}>
                  <Inline text={c.heading} />
                </div>
                {c.body && (
                  <div style={{ fontSize: 15, lineHeight: 1.8, letterSpacing: 0.2, color: PALETTE.text, marginBottom: c.code || c.art ? 16 : 0 }}>
                    {fillMode ? (
                      <FillBody body={c.body} cardIndex={i} inputs={inputs} checked={checked} accept={c.accept} onChange={updateInput} />
                    ) : (
                      <Inline text={c.body} />
                    )}
                  </div>
                )}
                {/* Optional full source listing, e.g. a complete class implementation. */}
                {c.code && <CodeBlock code={c.code} />}
                {/* Optional monospace diagram, e.g. an ASCII tree. Unlike `code`
                    it does not widen the card: the block scrolls inside its own
                    track rather than forcing one open. */}
                {c.art && <CodeBlock code={c.art} />}
                {/* Optional diagram beneath the card text (e.g. arrow diagrams). */}
                {c.figure && <Figure src={c.figure.src} alt={c.figure.alt} caption={c.figure.caption} />}
              </>
            )}
          </div>
        ))}
        {editing && (
          <button
            onClick={addCard}
            style={{
              gridColumn: "1 / -1",
              background: "transparent",
              border: `1px dashed ${PALETTE.line}`,
              borderRadius: RADII.lg,
              padding: "18px 24px",
              cursor: "pointer",
              fontFamily: HEADING,
              fontSize: 14,
              color: PALETTE.muted,
            }}
          >
            + Add card
          </button>
        )}
      </div>
      {topic.showChart && !editing && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 18 }}>
          <ComplexityChart highlight={null} />
          <ReferenceTable />
        </div>
      )}
    </div>
  );
}
