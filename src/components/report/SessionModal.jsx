import React, { useEffect, useState } from "react";
import { PALETTE, MONO, HEADING, RADII, SHADOWS } from "../../data/theme";
import { FORMATS } from "../../data/itemSchema";
import { GRADE_LABELS } from "../../data/grading";
import { getSessionDetail } from "../../api/client";
import PromptBody from "../PromptBody";

/**
 * SessionModal — one past sitting, question by question.
 *
 * Structure copied from HistoryModal (backdrop, role="dialog", Escape to
 * close, 80vh internal scroll) rather than extracted into a shared Modal, which
 * is the house style — see the note at the bottom of PracticeView.jsx. The
 * per-question card follows PracticeView's ResultCard for the same reason: a
 * graded answer should look the same wherever you read it back.
 *
 * Loads its own detail on open. The list ships summaries only, because this
 * payload carries full prompt and answer text for every attempt.
 *
 * Props:
 *   course, sessionKey — what to fetch
 *   summary            — the list row already on screen, so the header can
 *                        render immediately instead of after the round trip
 *   label, onClose
 */
export default function SessionModal({ course, sessionKey, summary, label, onClose }) {
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;
    setDetail(null);
    setError(null);
    getSessionDetail(course, sessionKey)
      .then((d) => {
        if (!cancelled) setDetail(d);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      });
    return () => {
      cancelled = true;
    };
  }, [course, sessionKey]);

  const pct = summary.graded ? Math.round((summary.correct / summary.graded) * 100) : null;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(20,21,28,0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        zIndex: 1000,
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${label} session from ${new Date(summary.startedAt).toLocaleString()}`}
        onClick={(e) => e.stopPropagation()}
        style={{
          background: PALETTE.panel,
          border: `1px solid ${PALETTE.line}`,
          borderRadius: RADII.lg,
          boxShadow: SHADOWS.lg,
          padding: 22,
          // Wider than HistoryModal's 560: that one lists scores, this one lists
          // prompts and code, which wrap badly at narrow widths.
          width: "min(820px, 100%)",
          maxHeight: "80vh",
          overflowY: "auto",
          color: PALETTE.text,
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 4, flexWrap: "wrap" }}>
          <div style={{ fontFamily: HEADING, fontSize: 16, fontWeight: 500 }}>
            {label} session
          </div>
          <span
            style={{
              fontFamily: MONO,
              fontSize: 13,
              fontWeight: 700,
              fontVariantNumeric: "tabular-nums",
              color: pct == null ? PALETTE.muted : pct >= 85 ? PALETTE.good : PALETTE.bad,
            }}
          >
            {summary.graded ? `${summary.correct}/${summary.graded}` : "—"}
          </span>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              marginLeft: "auto",
              fontFamily: HEADING,
              fontSize: 12,
              padding: "6px 12px",
              borderRadius: RADII.md,
              cursor: "pointer",
              border: `1px solid ${PALETTE.line}`,
              background: "transparent",
              color: PALETTE.text,
            }}
          >
            Close
          </button>
        </div>

        <div style={{ fontFamily: MONO, fontSize: 11, color: PALETTE.muted, marginBottom: 18 }}>
          {new Date(summary.startedAt).toLocaleString()}
          {summary.derived && " · approximate boundaries (recorded before sessions were tracked)"}
        </div>

        {error && <div style={{ fontFamily: MONO, fontSize: 12, color: PALETTE.bad }}>{error}</div>}
        {!error && !detail && (
          <div style={{ fontFamily: MONO, fontSize: 12, color: PALETTE.muted }}>loading questions…</div>
        )}
        {detail?.questions.map((q, i) => (
          <QuestionCard key={q.attemptId} q={q} n={i + 1} />
        ))}
      </div>
    </div>
  );
}

/**
 * One question as it was answered.
 *
 * The three facts this view exists for, in order: what was asked, what you
 * answered, what was right.
 */
function QuestionCard({ q, n }) {
  const notReached = q.abandoned || q.grade == null;
  const correct = !notReached && q.grade >= 2;
  const color = notReached ? PALETTE.line : correct ? PALETTE.good : PALETTE.bad;

  const isMcq = q.format === FORMATS.MCQ;
  const mono = q.format === FORMATS.WRITE || q.format === FORMATS.TRACE;

  // Three distinct states, and they must not look alike:
  //   answered        — show it
  //   never answered  — you stopped before this one
  //   not recorded    — you DID answer, but this predates answer capture
  // Collapsing the last two into "(no answer)" would put words in your mouth
  // about sittings that happened before the app was storing this at all.
  let yourAnswer;
  if (isMcq) {
    yourAnswer =
      q.answerChoice != null && q.choices?.[q.answerChoice] != null
        ? `${String.fromCharCode(65 + q.answerChoice)}. ${q.choices[q.answerChoice]}`
        : notReached
        ? null
        : "not recorded";
  } else {
    yourAnswer = q.note?.trim() ? q.note : notReached ? null : "not recorded";
  }
  const unrecorded = yourAnswer === "not recorded";

  const rightAnswer =
    isMcq && q.choices?.[q.answerIndex] != null
      ? `${String.fromCharCode(65 + q.answerIndex)}. ${q.choices[q.answerIndex]}`
      : q.expected || null;

  return (
    <div
      style={{
        background: PALETTE.panel2,
        border: `1px solid ${PALETTE.line}`,
        borderLeft: `3px solid ${color}`,
        borderRadius: RADII.md,
        padding: 16,
        marginBottom: 12,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
        <span style={{ fontFamily: MONO, fontSize: 11, color: PALETTE.muted, letterSpacing: 0.5 }}>
          {n}. {q.topicTitle?.toUpperCase()} · {q.format?.toUpperCase()}
        </span>
        <span style={{ fontFamily: HEADING, fontSize: 11, color, letterSpacing: 0.5, fontWeight: 500 }}>
          {notReached ? "NOT REACHED" : GRADE_LABELS[q.grade].toUpperCase()}
        </span>
      </div>

      <PromptBody prompt={q.prompt} style={{ fontSize: 14, lineHeight: 1.6, marginBottom: 12 }} />

      {isMcq && q.choices?.length > 0 && (
        <ol type="A" style={{ margin: "0 0 12px", paddingLeft: 22, fontSize: 13, lineHeight: 1.7 }}>
          {q.choices.map((c, i) => (
            <li
              key={i}
              style={{
                color: i === q.answerIndex ? PALETTE.good : i === q.answerChoice ? PALETTE.bad : PALETTE.muted,
                fontWeight: i === q.answerIndex || i === q.answerChoice ? 600 : 400,
              }}
            >
              {c}
            </li>
          ))}
        </ol>
      )}

      {yourAnswer != null && (
        <>
          <div style={{ fontFamily: MONO, fontSize: 11, color: PALETTE.muted, marginBottom: 4 }}>
            YOUR ANSWER
          </div>
          <div
            style={{
              fontSize: 13,
              lineHeight: 1.6,
              padding: "10px 12px",
              borderRadius: RADII.md,
              background: PALETTE.panel,
              border: `1px solid ${PALETTE.line}`,
              whiteSpace: "pre-wrap",
              marginBottom: 10,
              fontFamily: mono && !unrecorded ? MONO : "inherit",
              color: unrecorded ? PALETTE.muted : PALETTE.text,
              fontStyle: unrecorded ? "italic" : "normal",
            }}
            title={
              unrecorded
                ? "This sitting predates answer capture — the grade was stored, the answer was not."
                : undefined
            }
          >
            {yourAnswer}
          </div>
        </>
      )}

      {rightAnswer && (
        <>
          <div style={{ fontFamily: MONO, fontSize: 11, color: PALETTE.muted, marginBottom: 4 }}>
            {isMcq ? "CORRECT ANSWER" : "REFERENCE ANSWER"}
          </div>
          <div
            style={{
              fontSize: 13,
              lineHeight: 1.6,
              padding: "10px 12px",
              borderRadius: RADII.md,
              background: PALETTE.panel,
              border: `1px solid ${PALETTE.line}`,
              borderLeft: `3px solid ${PALETTE.accent}`,
              whiteSpace: "pre-wrap",
              fontFamily: mono ? MONO : "inherit",
            }}
          >
            {rightAnswer}
          </div>
        </>
      )}

      {q.criteria?.length > 0 && (
        <ul style={{ margin: "10px 0 0", paddingLeft: 20, fontSize: 12, lineHeight: 1.6, color: PALETTE.muted }}>
          {q.criteria.map((c, i) => (
            <li key={i}>{c}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
