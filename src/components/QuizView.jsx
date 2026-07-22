import React, { useState } from "react";
import { PALETTE, MONO, HEADING, RADII } from "../data/theme";
import Inline from "./Inline";
import Figure from "./Figure";
import ComplexityChart from "./ComplexityChart";

/** QuizView — one question at a time, then a results screen with a restart button. */
export default function QuizView({ topic, onFinish, best }) {
  const [qIndex, setQIndex] = useState(0);
  const [selected, setSelected] = useState(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [results, setResults] = useState([]);
  const [finished, setFinished] = useState(false);

  const questions = topic.questions;
  const q = questions[qIndex];
  const revealed = selected !== null;

  function choose(i) {
    if (revealed) return;
    setSelected(i);
    if (i === q.answer) setCorrectCount((c) => c + 1);
  }

  function next() {
    const runResults = [...results, selected === q.answer];
    if (qIndex + 1 < questions.length) {
      setResults(runResults);
      setQIndex(qIndex + 1);
      setSelected(null);
    } else {
      setResults(runResults);
      setFinished(true);
      onFinish(topic.id, correctCount, questions.length, runResults);
    }
  }

  function restart() {
    setQIndex(0);
    setSelected(null);
    setCorrectCount(0);
    setResults([]);
    setFinished(false);
  }

  if (finished) {
    const pct = Math.round((correctCount / questions.length) * 100);
    return (
      <div
        style={{
          background: PALETTE.panel,
          border: `1px solid ${PALETTE.line}`,
          borderRadius: RADII.lg,
          padding: 28,
          textAlign: "center",
        }}
      >
        <div style={{ fontFamily: MONO, fontSize: 13, color: PALETTE.muted, marginBottom: 8 }}>
          QUIZ COMPLETE
        </div>
        <div style={{ fontFamily: HEADING, fontSize: 44, fontWeight: 500, color: pct >= 80 ? PALETTE.good : PALETTE.accent }}>
          {correctCount}/{questions.length}
        </div>
        <div style={{ color: PALETTE.muted, marginTop: 4, marginBottom: 20 }}>
          {pct}% · {pct >= 80 ? "Solid. You've got this cold." : pct >= 50 ? "Getting there — run it again." : "Hit Learn, then come back."}
          {best && <> · best {best.best}/{best.total}</>}
        </div>
        <button
          onClick={restart}
          style={{
            fontFamily: HEADING,
            fontSize: 14,
            padding: "10px 24px",
            borderRadius: RADII.md,
            border: `1px solid ${PALETTE.accent}`,
            background: PALETTE.accentSoft,
            color: PALETTE.accent,
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: topic.showChart ? "repeat(auto-fit, minmax(280px, 1fr))" : "1fr", gap: 16, alignItems: "start" }}>
      <div style={{ background: PALETTE.panel, border: `1px solid ${PALETTE.line}`, borderRadius: RADII.lg, padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontFamily: MONO, fontSize: 12, color: PALETTE.muted, marginBottom: 14 }}>
          <span>QUESTION {qIndex + 1} / {questions.length}</span>
          <span>{correctCount} correct</span>
        </div>
        <div style={{ fontSize: 16, lineHeight: 1.5, marginBottom: q.code ? 12 : 18 }}>{q.prompt}</div>
        {q.code && (
          <pre
            style={{
              background: PALETTE.bg,
              border: `1px solid ${PALETTE.line}`,
              borderRadius: RADII.md,
              padding: 14,
              overflowX: "auto",
              fontFamily: MONO,
              fontSize: 13,
              lineHeight: 1.5,
              color: PALETTE.text,
              marginBottom: 18,
              marginTop: 0,
            }}
          >
            <code>{q.code}</code>
          </pre>
        )}
        {/* Optional diagram the question refers to (e.g. "which arrow diagram…"). */}
        {q.figure && <Figure src={q.figure.src} alt={q.figure.alt} caption={q.figure.caption} />}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {q.choices.map((choice, i) => {
            let bg = PALETTE.panel2,
              border = PALETTE.line,
              weight = 400;
            if (revealed && i === q.answer) {
              bg = PALETTE.goodSoft;
              border = PALETTE.good;
              weight = 600;
            } else if (revealed && i === selected) {
              bg = PALETTE.badSoft;
              border = PALETTE.bad;
            }
            return (
              <button
                key={i}
                onClick={() => choose(i)}
                disabled={revealed}
                style={{
                  textAlign: "left",
                  fontFamily: MONO,
                  fontSize: 14,
                  padding: "11px 14px",
                  borderRadius: RADII.md,
                  border: `1px solid ${border}`,
                  background: bg,
                  color: PALETTE.text,
                  fontWeight: weight,
                  cursor: revealed ? "default" : "pointer",
                }}
              >
                <span style={{ color: PALETTE.muted, marginRight: 8 }}>{String.fromCharCode(65 + i)}</span>
                {choice}
              </button>
            );
          })}
        </div>
        {revealed && (
          <div style={{ marginTop: 16 }}>
            <div
              style={{
                fontSize: 14,
                lineHeight: 1.7,
                letterSpacing: 0.2,
                padding: "14px 16px",
                borderRadius: RADII.md,
                background: PALETTE.panel2,
                borderLeft: `3px solid ${selected === q.answer ? PALETTE.good : PALETTE.bad}`,
              }}
            >
              <strong style={{ color: selected === q.answer ? PALETTE.good : PALETTE.bad }}>
                {selected === q.answer ? "Correct. " : "Not quite. "}
              </strong>
              <Inline text={q.explanation} />
            </div>
            <button
              onClick={next}
              style={{
                fontFamily: HEADING,
                fontSize: 14,
                padding: "10px 22px",
                borderRadius: RADII.md,
                border: `1px solid ${PALETTE.accent}`,
                background: PALETTE.accentSoft,
                color: PALETTE.accent,
                fontWeight: 500,
                cursor: "pointer",
                marginTop: 14,
              }}
            >
              {qIndex + 1 < questions.length ? "Next question" : "See results"}
            </button>
          </div>
        )}
      </div>
      {topic.showChart && (
        <div style={{ position: "sticky", top: 8 }}>
          <ComplexityChart highlight={revealed ? q.tag : null} />
          <div style={{ fontFamily: MONO, fontSize: 11, color: PALETTE.muted, textAlign: "center", marginTop: 8 }}>
            {revealed && q.tag ? `highlighting ${q.tag}` : "answer to highlight the relevant curve"}
          </div>
        </div>
      )}
    </div>
  );
}
