import React, { useEffect, useState } from "react";
import curriculum, { PALETTE, MONO, SANS } from "./data/curriculum";
import Inline from "./components/Inline";
import FillBody from "./components/FillBody";
import ComplexityChart from "./components/ComplexityChart";
import ReferenceTable from "./components/ReferenceTable";

const STORAGE_KEY = "cppquiz:progress";

async function loadProgress() {
  try {
    if (typeof window !== "undefined" && window.storage) {
      const r = await window.storage.get(STORAGE_KEY);
      return r && r.value ? JSON.parse(r.value) : {};
    }
  } catch (_) { }
  return {};
}

async function saveProgress(progress) {
  try {
    if (typeof window !== "undefined" && window.storage) {
      await window.storage.set(STORAGE_KEY, JSON.stringify(progress));
    }
  } catch (_) { }
}

/**
 * App — the tutor for a single class.
 *
 * Props:
 *   course — which class to show (matches a `course` field in the curriculum,
 *            e.g. "cpp" or "discrete"). When omitted, every topic is shown.
 */
export default function App({ course }) {
  const [progress, setProgress] = useState({});
  const [topicId, setTopicId] = useState(null);
  const [mode, setMode] = useState("learn");

  useEffect(() => {
    loadProgress().then(setProgress);
  }, []);

  // Only the topics belonging to this class (or all of them if no course given).
  const topics = course ? curriculum.filter((t) => t.course === course) : curriculum;
  const topic = topics.find((t) => t.id === topicId) || null;

  function recordRun(id, correct, total) {
    setProgress((prev) => {
      const prevBest = prev[id]?.best ?? -1;
      const next = {
        ...prev,
        [id]: {
          best: Math.max(prevBest, correct),
          total,
          runs: (prev[id]?.runs ?? 0) + 1,
        },
      };
      saveProgress(next);
      return next;
    });
  }

  return (
    <div
      style={{
        background: PALETTE.bg,
        color: PALETTE.text,
        fontFamily: SANS,
        minHeight: 560,
        borderRadius: 16,
        padding: 20,
      }}
    >
      <Header topic={topic} onHome={() => setTopicId(null)} />
      {!topic ? (
        <Home
          topics={topics}
          progress={progress}
          onOpen={(id) => {
            setTopicId(id);
            setMode("learn");
          }}
        />
      ) : (
        <TopicView topic={topic} mode={mode} setMode={setMode} onFinish={recordRun} best={progress[topic.id]} />
      )}
    </div>
  );
}

function Header({ topic, onHome }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 18 }}>
      <span
        onClick={onHome}
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

/**
 * Home — the topic list for the current class.
 *
 * Props:
 *   topics   — the topics to list (already filtered to one class by App).
 *   progress — quiz progress keyed by topic id, for the per-card progress bar.
 *   onOpen(topicId) — called when a topic card is clicked.
 */
function Home({ topics, progress, onOpen }) {
  return (
    <div>
      <p style={{ color: PALETTE.muted, fontSize: 14, marginTop: 0, marginBottom: 18, maxWidth: 560 }}>
        Pick a topic to review the concepts or test yourself.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 14 }}>
        {topics.map((t) => {
          const p = progress[t.id];
          const pct = p ? Math.round((p.best / p.total) * 100) : 0;
          return (
            <button
              key={t.id}
              onClick={() => onOpen(t.id)}
              style={{
                textAlign: "left",
                background: PALETTE.panel,
                border: `1px solid ${PALETTE.line}`,
                borderRadius: 12,
                padding: 16,
                cursor: "pointer",
                color: PALETTE.text,
              }}
            >
              <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>{t.title}</div>
              <div style={{ fontFamily: MONO, fontSize: 12, color: PALETTE.muted, marginBottom: 14 }}>
                {t.subtitle}
              </div>
              <div style={{ fontFamily: MONO, fontSize: 11, color: PALETTE.muted, marginBottom: 6 }}>
                {t.questions.length} questions{p ? ` · best ${p.best}/${p.total}` : " · not attempted"}
              </div>
              <div style={{ height: 6, background: PALETTE.panel2, borderRadius: 4, overflow: "hidden" }}>
                <div
                  style={{
                    height: "100%",
                    width: `${pct}%`,
                    background: pct >= 80 ? PALETTE.good : PALETTE.accent,
                    transition: "width 0.3s",
                  }}
                />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function TopicView({ topic, mode, setMode, onFinish, best }) {
  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
        {["learn", "quiz"].map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            style={{
              fontFamily: MONO,
              fontSize: 13,
              padding: "7px 16px",
              borderRadius: 8,
              cursor: "pointer",
              border: `1px solid ${mode === m ? PALETTE.accent : PALETTE.line}`,
              background: mode === m ? PALETTE.accent : "transparent",
              color: mode === m ? PALETTE.bg : PALETTE.text,
              fontWeight: mode === m ? 700 : 400,
            }}
          >
            {m === "learn" ? "Learn" : "Quiz"}
          </button>
        ))}
      </div>
      {mode === "learn" ? <LearnView topic={topic} /> : <QuizView topic={topic} onFinish={onFinish} best={best} />}
    </div>
  );
}

function LearnView({ topic }) {
  const [fillMode, setFillMode] = useState(false);
  const [inputs, setInputs] = useState({});
  const [checked, setChecked] = useState(false);

  function toggleFillMode() {
    setFillMode((on) => !on);
    setInputs({});
    setChecked(false);
  }

  function updateInput(id, value) {
    setInputs((prev) => ({ ...prev, [id]: value }));
  }

  function reset() {
    setInputs({});
    setChecked(false);
  }

  const btn = (active) => ({
    fontFamily: MONO,
    fontSize: 13,
    padding: "7px 16px",
    borderRadius: 8,
    cursor: "pointer",
    border: `1px solid ${active ? PALETTE.accent : PALETTE.line}`,
    background: active ? PALETTE.accent : "transparent",
    color: active ? PALETTE.bg : PALETTE.text,
    fontWeight: active ? 700 : 400,
  });

  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 18 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <button onClick={toggleFillMode} style={btn(fillMode)}>
          Fill Mode
        </button>
        {fillMode && (
          <>
            <button onClick={() => setChecked(true)} style={btn(false)}>
              CHECK
            </button>
            <button onClick={reset} style={btn(false)}>
              Reset
            </button>
            <span style={{ fontFamily: MONO, fontSize: 11, color: PALETTE.muted }}>
              hide the key words and fill them in from memory
            </span>
          </>
        )}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 18 }}>
        {topic.cards.map((c, i) => (
          <div
            key={i}
            style={{
              background: PALETTE.panel,
              border: `1px solid ${PALETTE.line}`,
              borderRadius: 12,
              padding: "22px 24px",
            }}
          >
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 12, color: PALETTE.accent, letterSpacing: 0.2 }}>
              {c.heading}
            </div>
            <div style={{ fontSize: 15, lineHeight: 1.8, letterSpacing: 0.2, color: PALETTE.text }}>
              {fillMode ? (
                <FillBody body={c.body} cardIndex={i} inputs={inputs} checked={checked} onChange={updateInput} />
              ) : (
                <Inline text={c.body} />
              )}
            </div>
          </div>
        ))}
      </div>
      {topic.showChart && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 18 }}>
          <ComplexityChart highlight={null} />
          <ReferenceTable />
        </div>
      )}
    </div>
  );
}

function QuizView({ topic, onFinish, best }) {
  const [qIndex, setQIndex] = useState(0);
  const [selected, setSelected] = useState(null);
  const [correctCount, setCorrectCount] = useState(0);
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
    if (qIndex + 1 < questions.length) {
      setQIndex(qIndex + 1);
      setSelected(null);
    } else {
      setFinished(true);
      onFinish(topic.id, correctCount, questions.length);
    }
  }

  function restart() {
    setQIndex(0);
    setSelected(null);
    setCorrectCount(0);
    setFinished(false);
  }

  if (finished) {
    const pct = Math.round((correctCount / questions.length) * 100);
    return (
      <div
        style={{
          background: PALETTE.panel,
          border: `1px solid ${PALETTE.line}`,
          borderRadius: 12,
          padding: 28,
          textAlign: "center",
        }}
      >
        <div style={{ fontFamily: MONO, fontSize: 13, color: PALETTE.muted, marginBottom: 8 }}>
          QUIZ COMPLETE
        </div>
        <div style={{ fontSize: 44, fontWeight: 700, color: pct >= 80 ? PALETTE.good : PALETTE.accent }}>
          {correctCount}/{questions.length}
        </div>
        <div style={{ color: PALETTE.muted, marginTop: 4, marginBottom: 20 }}>
          {pct}% · {pct >= 80 ? "Solid. You've got this cold." : pct >= 50 ? "Getting there — run it again." : "Hit Learn, then come back."}
          {best && <> · best {best.best}/{best.total}</>}
        </div>
        <button
          onClick={restart}
          style={{
            fontFamily: MONO,
            fontSize: 14,
            padding: "10px 24px",
            borderRadius: 8,
            border: "none",
            background: PALETTE.accent,
            color: PALETTE.bg,
            fontWeight: 700,
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
      <div style={{ background: PALETTE.panel, border: `1px solid ${PALETTE.line}`, borderRadius: 12, padding: 20 }}>
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
              borderRadius: 8,
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
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {q.choices.map((choice, i) => {
            let bg = PALETTE.panel2,
              border = PALETTE.line,
              weight = 400;
            if (revealed && i === q.answer) {
              bg = "rgba(61,220,151,0.15)";
              border = PALETTE.good;
              weight = 600;
            } else if (revealed && i === selected) {
              bg = "rgba(226,59,59,0.13)";
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
                  borderRadius: 8,
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
                borderRadius: 8,
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
                fontFamily: MONO,
                fontSize: 14,
                padding: "10px 22px",
                borderRadius: 8,
                border: "none",
                background: PALETTE.accent,
                color: PALETTE.bg,
                fontWeight: 700,
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
