import React, { useMemo } from "react";
import CodeBlock from "./CodeBlock";

/**
 * PromptBody — renders an item's `prompt`, splitting fenced code out of it.
 *
 * The `items` bank has no `code` column (only `cards` and the legacy
 * `questions` table do), so an item whose question is about a snippet has to
 * carry that snippet inside `prompt`. The 2026-08-09 legacy-MCQ conversion
 * writes those as ``` fences (see migrateLegacyQuestion in itemSchema.js).
 *
 * Before this component, every prompt was rendered as
 * `<div style={{ whiteSpace: "pre-wrap" }}>{item.prompt}</div>`, which would
 * have shown those backticks on screen as literal characters. Here the fenced
 * segments go through the existing CodeBlock highlighter — the same one
 * QuizView uses for legacy `q.code` — so a converted MCQ reads the way it did
 * in Quiz mode.
 *
 * A prompt with no fence renders exactly as it did before: one pre-wrap div,
 * same styles. That makes this a no-op for the 80 hand-authored items and
 * keeps the three call sites (Practice, Drill, Exam) visually unchanged for
 * everything except the converted MCQs.
 *
 * Props:
 *   prompt    — the raw prompt string.
 *   style     — merged into each prose segment, so callers keep their own
 *               font size / line height / margins.
 *   codeStyle — merged into each CodeBlock.
 */
export default function PromptBody({ prompt, style, codeStyle }) {
  // Odd indices are inside a fence. Split on the fence token rather than
  // matching /```([\s\S]*?)```/ pairs so an unterminated fence still renders
  // everything after it (as a code block) instead of the unmatched tail being
  // dropped on the floor. Verified against all 24 fenced prompts in the bank:
  // each yields exactly [prose, code, ""].
  const segments = useMemo(() => (prompt ?? "").split(/```[a-zA-Z]*\n?/), [prompt]);

  return (
    <>
      {segments.map((segment, i) => {
        const isCode = i % 2 === 1;
        // Trailing newline before a closing fence is an artifact of the
        // fence syntax, not content — it would render as a blank line.
        const text = isCode ? segment.replace(/\n$/, "") : segment;
        if (!text.trim()) return null;
        return isCode ? (
          <CodeBlock key={i} code={text} style={{ padding: 14, margin: "10px 0", ...codeStyle }} />
        ) : (
          <div key={i} style={{ whiteSpace: "pre-wrap", ...style }}>
            {text}
          </div>
        );
      })}
    </>
  );
}
