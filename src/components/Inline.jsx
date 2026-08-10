import React from "react";
import { PALETTE, HEADING } from "../data/theme";
import { BOLD_RE, CODE_RE } from "../utils/fill";
import CodeSpan from "./CodeSpan";

/**
 * Inline — the prose renderer for card bodies, quiz prompts, and explanations.
 *
 * Two kinds of markup, in one pass:
 *   `code`   -> a syntax-colored <CodeSpan> (and, in Fill Mode, never a blank)
 *   **term** -> an emphasized key term, which Fill Mode turns into a blank
 *
 * Code is split off first, so a backtick run is opaque to the bold pass: a `*`
 * inside a snippet (int *ptr) can't be mistaken for emphasis.
 */
export default function Inline({ text }) {
  // One shared regex so Learn mode and Fill Mode can never disagree on what a
  // blank is. BOLD_RE is global, and a global regex carries a mutable lastIndex
  // across calls — but split() neither reads nor writes it, so sharing is safe
  // here. Anything that reaches for .test() or .exec() must clone it first:
  // new RegExp(BOLD_RE.source, "g").
  const segments = String(text).split(CODE_RE);

  return (
    <>
      {segments.map((seg, s) => {
        if (seg.startsWith("`") && seg.endsWith("`") && seg.length > 1) {
          return <CodeSpan key={s} code={seg.slice(1, -1)} />;
        }
        return seg.split(BOLD_RE).map((p, i) =>
          p.startsWith("**") && p.endsWith("**") ? (
            <strong
              key={`${s}:${i}`}
              style={{ fontFamily: HEADING, fontWeight: 600, color: PALETTE.text }}
            >
              {p.slice(2, -2)}
            </strong>
          ) : (
            <React.Fragment key={`${s}:${i}`}>{p}</React.Fragment>
          )
        );
      })}
    </>
  );
}
