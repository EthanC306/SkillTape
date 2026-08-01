import React from "react";
import { PALETTE, HEADING } from "../data/theme";
import { BOLD_RE } from "../utils/fill";

export default function Inline({ text }) {
  // One shared regex so Learn mode and Fill Mode can never disagree on what a
  // blank is. BOLD_RE is global, and a global regex carries a mutable lastIndex
  // across calls — but split() neither reads nor writes it, so sharing is safe
  // here. Anything that reaches for .test() or .exec() must clone it first:
  // new RegExp(BOLD_RE.source, "g").
  const parts = String(text).split(BOLD_RE);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith("**") && p.endsWith("**") ? (
          <strong key={i} style={{ fontFamily: HEADING, fontWeight: 600, color: PALETTE.text }}>
            {p.slice(2, -2)}
          </strong>
        ) : (
          <React.Fragment key={i}>{p}</React.Fragment>
        )
      )}
    </>
  );
}
