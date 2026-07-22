import React from "react";
import { COMPLEXITY } from "../data/complexity";
import { PALETTE, MONO, SANS, RADII } from "../data/theme";

export default function ReferenceTable() {
  const entries = Object.entries(COMPLEXITY);
  const COLS = "14px 104px 1fr";

  return (
    <div style={{ background: PALETTE.panel2, borderRadius: RADII.lg, padding: 16 }}>
      <div style={{ fontFamily: MONO, fontSize: 12, color: PALETTE.muted, marginBottom: 12, letterSpacing: 1 }}>
        COMMON BIG-O EXPRESSIONS
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: COLS,
          alignItems: "center",
          gap: 12,
          padding: "0 0 8px",
          borderBottom: `1px solid ${PALETTE.line}`,
          fontFamily: MONO,
          fontSize: 10,
          letterSpacing: 1,
          color: PALETTE.muted,
        }}
      >
        <span />
        <span>EXPRESSION</span>
        <span>NAME</span>
      </div>
      {entries.map(([expr, info], i) => (
        <div
          key={expr}
          style={{
            display: "grid",
            gridTemplateColumns: COLS,
            alignItems: "center",
            gap: 12,
            padding: "9px 0",
            borderBottom: i < entries.length - 1 ? `1px solid ${PALETTE.line}` : "none",
          }}
        >
          <span style={{ width: 10, height: 10, borderRadius: 3, background: info.color }} />
          <span style={{ fontFamily: MONO, fontSize: 14, color: PALETTE.text }}>{expr}</span>
          <span style={{ fontFamily: SANS, fontSize: 13, color: PALETTE.muted }}>{info.name}</span>
        </div>
      ))}
    </div>
  );
}
