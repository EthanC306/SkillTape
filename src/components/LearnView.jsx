import React, { useState } from "react";
import { PALETTE, MONO, HEADING, RADII } from "../data/theme";
import Inline from "./Inline";
import FillBody from "./FillBody";
import Figure from "./Figure";
import ComplexityChart from "./ComplexityChart";
import ReferenceTable from "./ReferenceTable";

/** LearnView — the note cards for a topic, with an optional "Fill Mode" quiz-of-recall. */
export default function LearnView({ topic }) {
  const [fillMode, setFillMode] = useState(false);
  const [inputs, setInputs] = useState({});
  const [checked, setChecked] = useState(false);

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

  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 18 }}>
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
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 18 }}>
        {topic.cards.map((c, i) => (
          <div
            key={i}
            style={{
              background: PALETTE.panel,
              border: `1px solid ${PALETTE.line}`,
              borderRadius: RADII.lg,
              padding: "22px 24px",
              gridColumn: c.code ? "1 / -1" : undefined,
            }}
          >
            <div style={{ fontFamily: HEADING, fontSize: 16, fontWeight: 500, marginBottom: 12, color: PALETTE.accent, letterSpacing: 0.2 }}>
              {c.heading}
            </div>
            {c.body && (
              <div style={{ fontSize: 15, lineHeight: 1.8, letterSpacing: 0.2, color: PALETTE.text, marginBottom: c.code ? 16 : 0 }}>
                {fillMode ? (
                  <FillBody body={c.body} cardIndex={i} inputs={inputs} checked={checked} onChange={updateInput} />
                ) : (
                  <Inline text={c.body} />
                )}
              </div>
            )}
            {/* Optional full source listing, e.g. a complete class implementation. */}
            {c.code && (
              <pre
                style={{
                  background: PALETTE.bg,
                  border: `1px solid ${PALETTE.line}`,
                  borderRadius: RADII.md,
                  padding: 16,
                  overflowX: "auto",
                  fontFamily: MONO,
                  fontSize: 13,
                  lineHeight: 1.5,
                  color: PALETTE.text,
                  margin: 0,
                }}
              >
                <code>{c.code}</code>
              </pre>
            )}
            {/* Optional diagram beneath the card text (e.g. arrow diagrams). */}
            {c.figure && <Figure src={c.figure.src} alt={c.figure.alt} caption={c.figure.caption} />}
          </div>
        ))}
      </div>
      {topic.showChart && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 18 }}>
          <ComplexityChart highlight={null} />
          <ReferenceTable />
        </div>
      )}
    </div>
  );
}
