import React, { useEffect, useState } from "react";
import { PALETTE, MONO, HEADING, DISPLAY, RADII } from "../data/theme";
import Inline from "./Inline";
import MathKeyboard from "./MathKeyboard";

/**
 * FlashcardsView — a flip-through deck for a topic's `flashcards` array.
 *
 * One card is shown at a time. The FRONT side holds the prompt (e.g. "O(1)");
 * clicking the card — or the Flip button — reveals the BACK (the name and
 * classic examples). Prev/Next step through the deck and wrap around at the
 * ends, always landing on the next card front-side-up.
 *
 * Props:
 *   topic — the open topic; its `flashcards` [{ front, back }] drive the deck.
 *
 * In edit mode the flip-card carousel is replaced by a plain list (see
 * FlashcardEditor below): the card container sets `userSelect: "none"` and
 * flips on any click, both of which fight text selection.
 */
export default function FlashcardsView({ topic, editMode, onSave, saveState, registerEditor }) {
  const [index, setIndex] = useState(0);   // which card is showing
  const [flipped, setFlipped] = useState(false); // false = front, true = back

  const cards = topic.flashcards ?? [];

  // Deleting cards (or opening a topic with no deck at all) can leave `index`
  // past the end, and the old `cards[index]` read would throw on the next line.
  const safeIndex = cards.length ? Math.min(index, cards.length - 1) : 0;
  const card = cards[safeIndex];

  if (editMode) {
    return (
      <FlashcardEditor
        topic={topic}
        onSave={onSave}
        saveState={saveState}
        registerEditor={registerEditor}
      />
    );
  }

  if (!card) {
    return (
      <div style={{ fontFamily: MONO, fontSize: 13, color: PALETTE.muted, textAlign: "center", padding: 40 }}>
        No flashcards in this topic yet — hit Edit to add some.
      </div>
    );
  }

  // Fronts range from a bare "O(1)" to a full sentence ("Why does prefix
  // operator++ return Iterator&?"). Scale the type down as they get longer so a
  // question-shaped front still fits the card instead of overflowing it.
  const frontSize =
    card.front.length <= 14 ? 42 : card.front.length <= 40 ? 27 : card.front.length <= 90 ? 21 : 18;

  /** Step forward/back through the deck (wrapping), new card starts on FRONT. */
  function go(delta) {
    setIndex((i) => {
      const from = Math.min(i, cards.length - 1);
      return (from + delta + cards.length) % cards.length;
    });
    setFlipped(false);
  }

  const navBtn = {
    fontFamily: HEADING,
    fontSize: 13,
    padding: "9px 18px",
    borderRadius: RADII.md,
    cursor: "pointer",
    border: `1px solid ${PALETTE.line}`,
    background: "transparent",
    color: PALETTE.text,
  };

  return (
    <div style={{ maxWidth: 620, margin: "0 auto" }}>
      {/* Deck position + which side is up. */}
      <div style={{ display: "flex", justifyContent: "space-between", fontFamily: MONO, fontSize: 12, color: PALETTE.muted, marginBottom: 12 }}>
        <span>CARD {safeIndex + 1} / {cards.length}</span>
        <span>{flipped ? "BACK" : "FRONT"}</span>
      </div>

      {/* The card itself — click anywhere on it to flip. */}
      <div
        onClick={() => setFlipped((f) => !f)}
        title="Click to flip"
        style={{
          background: PALETTE.panel,
          border: `1px solid ${flipped ? PALETTE.accent : PALETTE.line}`,
          borderRadius: RADII.lg,
          minHeight: 240,
          padding: "32px 36px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          cursor: "pointer",
          userSelect: "none",
        }}
      >
        {flipped ? (
          // pre-wrap so a code answer keeps its line breaks and indentation.
          <div style={{ fontSize: 17, lineHeight: 1.8, letterSpacing: 0.2, color: PALETTE.text, whiteSpace: "pre-wrap" }}>
            <Inline text={card.back} />
          </div>
        ) : (
          <div style={{ fontFamily: DISPLAY, fontSize: frontSize, lineHeight: 1.4, fontWeight: 500, color: PALETTE.accent }}>
            <Inline text={card.front} />
          </div>
        )}
      </div>
      <div style={{ fontFamily: MONO, fontSize: 11, color: PALETTE.muted, textAlign: "center", marginTop: 8 }}>
        click the card to flip it
      </div>

      {/* Deck controls. */}
      <div style={{ display: "flex", justifyContent: "center", gap: 10, marginTop: 16 }}>
        <button onClick={() => go(-1)} style={navBtn}>
          ‹ Prev
        </button>
        <button
          onClick={() => setFlipped((f) => !f)}
          style={{
            ...navBtn,
            border: `1px solid ${PALETTE.accent}`,
            background: PALETTE.accentSoft,
            color: PALETTE.accent,
            fontWeight: 500,
          }}
        >
          Flip
        </button>
        <button onClick={() => go(1)} style={navBtn}>
          Next ›
        </button>
      </div>
    </div>
  );
}

/**
 * A brand-new card's permanent id, minted the moment "+ Add flashcard" is
 * clicked rather than waiting for the server to name the row.
 *
 * Doing it here is what makes the id genuinely stable: the card has one
 * identity from the instant it appears on screen, the React key below never
 * changes under it, and the save is an ordinary "here is this card" rather than
 * a "create something and tell me what you called it" the client then has to
 * reconcile. The server validates and stores the id as sent, and mints its own
 * only for a card that arrives without one (server/routes/topics.js).
 *
 * randomUUID needs a secure context. That covers every way this app is served
 * — localhost counts as one, as does Electron's file origin — but the fallback
 * keeps a card from being unaddable if it is ever missing, and its ids are
 * still unique enough for the only job they have: naming one card in one deck.
 */
function newCardId() {
  const uuid =
    globalThis.crypto?.randomUUID?.() ??
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  return `fc-${uuid}`;
}

/**
 * FlashcardEditor — the deck as an editable list.
 *
 * Deliberately not the flip card: authoring a deck means seeing front and back
 * together, and the carousel shows one side of one card at a time. Fronts and
 * backs are plain strings with no `**bold**` markup (AUTHORING §5), so there is
 * no B button here — that only belongs on Learn cards.
 */
function FlashcardEditor({ topic, onSave, saveState, registerEditor }) {
  const [draft, setDraft] = useState(null);
  const fieldRefs = React.useRef({});

  // Every card in the draft is guaranteed to have an id, so the React key below
  // can rely on one. The server backfilled the deck it serves, so the `??` only
  // covers a card reaching this editor from somewhere that predates ids — and
  // minting on arrival means it gets a permanent one on the next save rather
  // than being the single card the list cannot track.
  //
  // Shared with Revert, which rebuilds the draft from the same source and must
  // not produce a subtly different one.
  const draftFromTopic = () =>
    (topic.flashcards ?? []).map((c) => ({ ...c, id: c.id ?? newCardId() }));

  useEffect(() => {
    setDraft(draftFromTopic());
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the deck's identity, not the closure's
  }, [topic.id, topic.flashcards]);

  // Compare only the fields a save actually writes, in a fixed order, rather
  // than JSON.stringify-ing the two objects whole. Key order is not part of
  // what makes two decks the same deck, and a card minted here has its keys in
  // a different order from one the server sent back — which a raw stringify
  // would report as an unsaved change forever.
  const fingerprint = (cards) =>
    JSON.stringify((cards ?? []).map((c) => [c.id ?? null, c.front ?? "", c.back ?? ""]));

  const dirty = !!draft && fingerprint(draft) !== fingerprint(topic.flashcards);
  // The server rejects blank front/back, so catch it here rather than letting
  // the save round-trip into a 400.
  const blank = !!draft && draft.some((c) => !c.front?.trim() || !c.back?.trim());
  const canSave = dirty && !blank && saveState !== "saving";

  // Hand the live draft up to TopicView, so Done commits it instead of dropping
  // it. Declared before the early return below — hooks can't sit behind one.
  useEffect(() => {
    if (!registerEditor || !draft) return;
    registerEditor({ dirty, blocked: blank, save: () => onSave({ flashcards: draft }) });
    return () => registerEditor(null);
  });

  if (!draft) return null;

  function update(i, patch) {
    setDraft((prev) => prev.map((c, j) => (j === i ? { ...c, ...patch } : c)));
  }

  function move(i, delta) {
    setDraft((prev) => {
      const j = i + delta;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
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

  const smallBtn = (extra) => ({
    fontFamily: MONO,
    fontSize: 12,
    padding: "5px 10px",
    borderRadius: RADII.sm,
    cursor: "pointer",
    border: `1px solid ${PALETTE.line}`,
    background: "transparent",
    color: PALETTE.text,
    ...extra,
  });

  const field = {
    width: "100%",
    boxSizing: "border-box",
    background: PALETTE.bg,
    border: `1px solid ${PALETTE.line}`,
    borderRadius: RADII.md,
    color: PALETTE.text,
    padding: "8px 10px",
    fontFamily: "inherit",
    fontSize: 14,
    lineHeight: 1.6,
  };

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <button
          onClick={() => onSave({ flashcards: draft })}
          disabled={!canSave}
          style={{ ...btn(canSave), cursor: canSave ? "pointer" : "default", opacity: canSave ? 1 : 0.5 }}
        >
          {saveState === "saving" ? "Saving…" : "Save"}
        </button>
        <button
          onClick={() => setDraft(draftFromTopic())}
          disabled={!dirty}
          style={{ ...btn(false), opacity: dirty ? 1 : 0.5, cursor: dirty ? "pointer" : "default" }}
        >
          Revert
        </button>
        <span style={{ fontFamily: MONO, fontSize: 11, color: PALETTE.muted }}>
          {draft.length} card{draft.length === 1 ? "" : "s"}
          {dirty ? " · unsaved changes" : ""}
        </span>
        {blank && (
          <span style={{ fontFamily: MONO, fontSize: 11, color: PALETTE.bad }}>
            ⚠ every card needs a front and a back
          </span>
        )}
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

      {draft.map((c, i) => (
        <div
          // The card's own id, never the array index. With an index key, React
          // reuses one card's DOM for whatever slot number it now holds, so
          // deleting or reordering leaves the focused textarea attached to a
          // different card — you keep typing into the wrong one. Every card has
          // an id from the moment it exists, so there is no gap to cover.
          key={c.id}
          style={{
            background: PALETTE.panel,
            border: `1px solid ${PALETTE.line}`,
            borderRadius: RADII.lg,
            padding: "16px 18px",
            display: "grid",
            gap: 8,
          }}
        >
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ fontFamily: MONO, fontSize: 11, color: PALETTE.muted, minWidth: 28 }}>
              {i + 1}
            </span>
            <input
              ref={(node) => { fieldRefs.current[`${c.id}:front`] = node; }}
              value={c.front ?? ""}
              onChange={(e) => update(i, { front: e.target.value })}
              placeholder="Front — the prompt"
              aria-label="flashcard front"
              style={{ ...field, fontFamily: HEADING, color: PALETTE.accent, fontWeight: 500 }}
            />
            <button
              onClick={() => move(i, -1)}
              disabled={i === 0}
              title="Move up"
              style={smallBtn({ opacity: i === 0 ? 0.35 : 1 })}
            >
              ↑
            </button>
            <button
              onClick={() => move(i, 1)}
              disabled={i === draft.length - 1}
              title="Move down"
              style={smallBtn({ opacity: i === draft.length - 1 ? 0.35 : 1 })}
            >
              ↓
            </button>
            <button
              onClick={() => setDraft((prev) => prev.filter((_, j) => j !== i))}
              title="Delete this flashcard"
              style={smallBtn({ borderColor: PALETTE.bad, color: PALETTE.bad })}
            >
              ✕
            </button>
          </div>
          {topic.course === "calcII" && (
            <MathKeyboard inputRef={{ get current() { return fieldRefs.current[`${c.id}:front`]; } }} value={c.front ?? ""} onChange={(front) => update(i, { front })} label={`math keyboard for flashcard ${i + 1} front`} />
          )}
          {/* pre-wrap in the reader, so keep it a textarea — backs carry line breaks. */}
          <textarea
            ref={(node) => { fieldRefs.current[`${c.id}:back`] = node; }}
            value={c.back ?? ""}
            onChange={(e) => update(i, { back: e.target.value })}
            rows={Math.min(8, Math.max(2, Math.ceil((c.back?.length ?? 0) / 70)))}
            placeholder="Back — the reveal"
            aria-label="flashcard back"
            style={{ ...field, resize: "vertical" }}
          />
          {topic.course === "calcII" && (
            <MathKeyboard inputRef={{ get current() { return fieldRefs.current[`${c.id}:back`]; } }} value={c.back ?? ""} onChange={(back) => update(i, { back })} label={`math keyboard for flashcard ${i + 1} back`} />
          )}
        </div>
      ))}

      <button
        onClick={() => setDraft((prev) => [...prev, { id: newCardId(), front: "", back: "" }])}
        style={{
          background: "transparent",
          border: `1px dashed ${PALETTE.line}`,
          borderRadius: RADII.lg,
          padding: "16px 20px",
          cursor: "pointer",
          fontFamily: HEADING,
          fontSize: 14,
          color: PALETTE.muted,
        }}
      >
        + Add flashcard
      </button>
    </div>
  );
}
