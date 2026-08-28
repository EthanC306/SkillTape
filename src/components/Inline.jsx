import React from "react";
import { PALETTE } from "../data/theme";
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
              // Inherit the family rather than pinning it: an emphasized term
              // should bolden whatever it sits in, not switch face mid-line.
              // This was invisible while every context was Inter (HEADING and
              // SANS are the same stack), but card headings now render in
              // DISPLAY, where a pinned sans would break the line in half.
              style={{ fontFamily: "inherit", fontWeight: 600, color: PALETTE.text }}
            >
              <MathText text={p.slice(2, -2)} />
            </strong>
          ) : (
            <MathText key={`${s}:${i}`} text={p} />
          )
        );
      })}
    </>
  );
}

/** Find a balanced {...} group beginning at `open`, including nested groups. */
function readGroup(text, open) {
  if (text[open] !== "{") return null;
  let depth = 0;
  for (let i = open; i < text.length; i += 1) {
    if (text[i] === "{") depth += 1;
    if (text[i] === "}") depth -= 1;
    if (depth === 0) return { value: text.slice(open + 1, i), end: i + 1 };
  }
  return null;
}

/**
 * Render the small math dialect produced by the Calculus II editor. Fractions
 * are stored as \frac{numerator}{denominator}, which stays readable as source,
 * supports arbitrary text and nested fractions, and needs no external parser.
 */
function MathText({ text }) {
  const source = String(text);
  const parts = [];
  let cursor = 0;
  let key = 0;

  while (cursor < source.length) {
    const escapedStart = source.indexOf("\\frac", cursor);
    const plainStart = source.indexOf("frac", cursor);
    const start = escapedStart < 0 ? plainStart : plainStart < 0 ? escapedStart : Math.min(escapedStart, plainStart);
    if (start < 0) {
      parts.push(source.slice(cursor));
      break;
    }
    // Accept plain frac{...}{...} as well as the canonical \frac form. This
    // repairs expressions authored before the visual fraction composer existed.
    const tokenLength = source.startsWith("\\frac", start) ? 5 : 4;
    const numerator = readGroup(source, start + tokenLength);
    const denominator = numerator && readGroup(source, numerator.end);
    if (!numerator || !denominator) {
      parts.push(source.slice(cursor, start + tokenLength));
      cursor = start + tokenLength;
      continue;
    }
    if (start > cursor) parts.push(source.slice(cursor, start));
    parts.push(
      <span
        key={`fraction-${key++}`}
        aria-label={`${numerator.value} over ${denominator.value}`}
        style={{ display: "inline-flex", flexDirection: "column", alignItems: "stretch", verticalAlign: "middle", textAlign: "center", lineHeight: 1.12, margin: "0 0.18em" }}
      >
        <span style={{ padding: "0 0.22em 0.08em", borderBottom: `1px solid ${PALETTE.text}` }}><MathText text={numerator.value || "□"} /></span>
        <span style={{ padding: "0.08em 0.22em 0" }}><MathText text={denominator.value || "□"} /></span>
      </span>
    );
    cursor = denominator.end;
  }

  return <>{parts}</>;
}
