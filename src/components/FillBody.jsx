import React from "react";
import { PALETTE, MONO } from "../data/curriculum";
import { parseBold, normalize } from "../utils/fill";

// Renders a card body with every **bold** term replaced by a fillable input.
// Grading is live once `checked` is true: each box recomputes correct/wrong
// from its current value, so fixing a wrong box flips it to green instantly.
export default function FillBody({ body, cardIndex, inputs, checked, onChange }) {
  const tokens = parseBold(body);
  let blankIndex = -1;

  return (
    <span>
      {tokens.map((tok, i) => {
        if (tok.type === "text") {
          return <React.Fragment key={i}>{tok.value}</React.Fragment>;
        }

        blankIndex += 1;
        const id = `${cardIndex}:${blankIndex}`;
        const answer = tok.value;
        const value = inputs[id] ?? "";
        const ok = checked && normalize(value) === normalize(answer);
        const wrong = checked && !ok;

        const border = ok ? PALETTE.good : wrong ? PALETTE.bad : PALETTE.line;

        return (
          <span key={i} style={{ whiteSpace: "nowrap" }}>
            <input
              type="text"
              value={value}
              onChange={(e) => onChange(id, e.target.value)}
              aria-label="fill in the blank"
              style={{
                width: `${Math.max(answer.length, 3)}ch`,
                fontFamily: MONO,
                fontSize: 14,
                padding: "2px 6px",
                margin: "0 1px",
                borderRadius: 5,
                border: `1px solid ${border}`,
                background: PALETTE.panel2,
                color: ok ? PALETTE.good : PALETTE.text,
                outline: "none",
              }}
            />
            {wrong && (
              <span style={{ color: PALETTE.bad, fontFamily: MONO, fontSize: 12, margin: "0 2px" }}>
                ({answer})
              </span>
            )}
          </span>
        );
      })}
    </span>
  );
}
