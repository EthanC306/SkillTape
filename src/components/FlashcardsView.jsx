import React, { useState } from "react";
import { PALETTE, MONO, HEADING, RADII } from "../data/theme";

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
 */
export default function FlashcardsView({ topic }) {
  const [index, setIndex] = useState(0);   // which card is showing
  const [flipped, setFlipped] = useState(false); // false = front, true = back

  const cards = topic.flashcards;
  const card = cards[index];

  /** Step forward/back through the deck (wrapping), new card starts on FRONT. */
  function go(delta) {
    setIndex((i) => (i + delta + cards.length) % cards.length);
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
        <span>CARD {index + 1} / {cards.length}</span>
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
          <div style={{ fontSize: 17, lineHeight: 1.8, letterSpacing: 0.2, color: PALETTE.text }}>
            {card.back}
          </div>
        ) : (
          <div style={{ fontFamily: HEADING, fontSize: 42, fontWeight: 500, color: PALETTE.accent }}>
            {card.front}
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
