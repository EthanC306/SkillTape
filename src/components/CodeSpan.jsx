import React, { useMemo } from "react";
import { PALETTE, MONO, RADII, SYNTAX } from "../data/theme";
import { tokenize } from "./CodeBlock";

/**
 * CodeSpan — an inline `code` run inside prose, colored by the same C++
 * tokenizer <CodeBlock> uses for full listings.
 *
 * Card bodies, prompts, and explanations quote code constantly ("the
 * assignment intPtr = numbers; makes intPtr point to..."), and in plain prose
 * those fragments are indistinguishable from the sentence around them. Marking
 * them with backticks in the topic files and rendering them here gives them the
 * same colors they'd have in a listing, at prose size.
 *
 * Sized in `em` rather than `px` so one component works in the 15px card body,
 * the 16px quiz prompt, and the 14px explanation box without per-call tuning.
 */
export default function CodeSpan({ code }) {
  const tokens = useMemo(() => tokenize(String(code)), [code]);

  return (
    <code
      style={{
        fontFamily: MONO,
        fontSize: "0.92em",
        background: PALETTE.bg,
        border: `1px solid ${PALETTE.line}`,
        borderRadius: RADII.sm,
        padding: "1px 5px",
        color: SYNTAX.plain,
        whiteSpace: "pre-wrap",
      }}
    >
      {tokens.map((t, i) => (
        <span key={i} style={{ color: t.color, fontStyle: t.italic ? "italic" : undefined }}>
          {t.text}
        </span>
      ))}
    </code>
  );
}
