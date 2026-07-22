import React from "react";
import { PALETTE, MONO } from "../data/theme";

/** Header — top bar with the app logo (click = home) and the open topic's title. */
export default function Header({ topic, onHome }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 18 }}>
      <span
        onClick={onHome}
        title="Back to topic list"
        style={{ cursor: "pointer", fontFamily: MONO, fontSize: 18, fontWeight: 700, color: PALETTE.accent }}
      >
        &gt;_ cs.tutor
      </span>
      {topic && (
        <span style={{ fontFamily: MONO, fontSize: 13, color: PALETTE.muted }}>
          / {topic.title}
        </span>
      )}
      <span style={{ marginLeft: "auto", fontFamily: MONO, fontSize: 11, color: PALETTE.muted }}>
        question what you know
      </span>
    </div>
  );
}
