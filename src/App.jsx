import React, { useEffect, useState } from "react";
import curriculum, { PALETTE, MONO, SANS } from "./data/curriculum";
import shuffle from "./utils/shuffle";
import Inline from "./components/Inline";
import FillBody from "./components/FillBody";
import Figure from "./components/Figure";
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

  // ── Master Set state ──────────────────────────────────────────────────────
  // selectMode  — when true, clicking topic cards on the list SELECTS them
  //               (for a combined quiz) instead of opening them.
  // selectedIds — the ids of the curriculum entries picked so far.
  // masterTopic — a synthetic topic holding the shuffled mix of every selected
  //               topic's questions; non-null while a Master Set quiz is open.
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [masterTopic, setMasterTopic] = useState(null);

  useEffect(() => {
    loadProgress().then(setProgress);
  }, []);

  // Only the topics belonging to this class (or all of them if no course given).
  const topics = course ? curriculum.filter((t) => t.course === course) : curriculum;
  const topic = topics.find((t) => t.id === topicId) || null;

  // Adjacent lessons in this course's list, used for the Prev/Next controls below.
  const topicIndex = topics.findIndex((t) => t.id === topicId);
  const prevTopic = topicIndex > 0 ? topics[topicIndex - 1] : null;
  const nextTopic = topicIndex >= 0 && topicIndex + 1 < topics.length ? topics[topicIndex + 1] : null;

  function openTopic(id) {
    setTopicId(id);
    setMode("learn");
  }

  function goPrev() {
    // No earlier lesson (we're at the first topic) — back goes to the topic list.
    if (prevTopic) openTopic(prevTopic.id);
    else setTopicId(null);
  }

  function goNext() {
    if (nextTopic) openTopic(nextTopic.id);
  }

  // ── Master Set handlers ───────────────────────────────────────────────────

  /** Turn selection mode on/off. Turning it off discards the current picks. */
  function toggleSelectMode() {
    setSelectMode((on) => {
      if (on) setSelectedIds([]);
      return !on;
    });
    // Selection happens on the topic list, so if the user hit Select while
    // inside a lesson, bring them back out to the list first.
    setTopicId(null);
  }

  /** Add or remove one curriculum entry from the current selection. */
  function toggleSelected(id) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  /**
   * The Master Set algorithm: gather every question from the selected topics
   * (in curriculum order), shuffle them into one interleaved pool, and open
   * the result as a synthetic quiz-only topic.
   */
  function buildMasterSet() {
    const picked = topics.filter((t) => selectedIds.includes(t.id));
    if (picked.length === 0) return;
    const questions = shuffle(picked.flatMap((t) => t.questions));
    setMasterTopic({
      id: "master-set",
      title: "Master Set",
      subtitle: `${picked.length} topic${picked.length > 1 ? "s" : ""} · ${questions.length} questions mixed`,
      showChart: false,
      questions,
    });
  }

  /** Leave the Master Set quiz and return to the topic list (picks are kept). */
  function exitMasterSet() {
    setMasterTopic(null);
  }

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
      <Header
        topic={masterTopic || topic}
        onHome={() => {
          setMasterTopic(null);
          setTopicId(null);
        }}
      />
      {masterTopic ? (
        <MasterQuizView topic={masterTopic} onExit={exitMasterSet} />
      ) : !topic ? (
        <Home
          topics={topics}
          progress={progress}
          onOpen={openTopic}
          selectMode={selectMode}
          selectedIds={selectedIds}
          onToggleSelect={toggleSelected}
          onToggleSelectMode={toggleSelectMode}
          onMasterSet={buildMasterSet}
        />
      ) : (
        <TopicView
          topic={topic}
          mode={mode}
          setMode={setMode}
          onFinish={recordRun}
          best={progress[topic.id]}
          onPrev={goPrev}
          onNext={goNext}
          prevTopic={prevTopic}
          nextTopic={nextTopic}
          onSelectMode={toggleSelectMode}
        />
      )}
    </div>
  );
}

function Header({ topic, onHome }) {
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

/**
 * Home — the topic list for the current class.
 *
 * Two ways to use the list:
 *   • Normal mode — click a topic card to open its Learn/Quiz view.
 *   • Select mode — after clicking the Select button, clicking cards TOGGLES
 *     them in/out of a selection instead. Once at least one topic is picked, a
 *     MASTER SET button appears at the top right; clicking it generates one
 *     combined quiz that mixes every selected topic's questions together.
 *
 * Props:
 *   topics   — the topics to list (already filtered to one class by App).
 *   progress — quiz progress keyed by topic id, for the per-card progress bar.
 *   onOpen(topicId)         — open a topic (normal mode click).
 *   selectMode              — whether selection mode is active.
 *   selectedIds             — ids of the currently selected topics.
 *   onToggleSelect(topicId) — add/remove a topic from the selection.
 *   onToggleSelectMode()    — turn selection mode on/off.
 *   onMasterSet()           — build & start the combined Master Set quiz.
 */
function Home({
  topics,
  progress,
  onOpen,
  selectMode,
  selectedIds,
  onToggleSelect,
  onToggleSelectMode,
  onMasterSet,
}) {
  const ctrlBtn = (active) => ({
    fontFamily: MONO,
    fontSize: 12,
    padding: "7px 14px",
    borderRadius: 8,
    cursor: "pointer",
    border: `1px solid ${active ? PALETTE.accent : PALETTE.line}`,
    background: active ? PALETTE.accent : "transparent",
    color: active ? PALETTE.bg : PALETTE.text,
    fontWeight: active ? 700 : 400,
  });

  return (
    <div>
      {/* Intro line on the left; Select + MASTER SET controls at the top right. */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18, flexWrap: "wrap" }}>
        <p style={{ color: PALETTE.muted, fontSize: 14, margin: 0, maxWidth: 560 }}>
          {selectMode
            ? "Click topics to add them to your set, then hit MASTER SET."
            : "Pick a topic to review the concepts or test yourself."}
        </p>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <button onClick={onToggleSelectMode} title="Select topics for a combined quiz" style={ctrlBtn(selectMode)}>
            {selectMode ? "Cancel" : "Select"}
          </button>
          {/* Only shown once selection mode is on AND something is selected. */}
          {selectMode && selectedIds.length > 0 && (
            <button
              onClick={onMasterSet}
              title={`Mix ${selectedIds.length} selected topic${selectedIds.length > 1 ? "s" : ""} into one quiz`}
              style={{
                fontFamily: MONO,
                fontSize: 12,
                padding: "7px 16px",
                borderRadius: 8,
                cursor: "pointer",
                border: "none",
                background: PALETTE.accent,
                color: PALETTE.bg,
                fontWeight: 700,
              }}
            >
              MASTER SET ({selectedIds.length})
            </button>
          )}
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 14 }}>
        {topics.map((t) => {
          const p = progress[t.id];
          const pct = p ? Math.round((p.best / p.total) * 100) : 0;
          const selected = selectMode && selectedIds.includes(t.id);
          return (
            <button
              key={t.id}
              // In select mode a click toggles the topic in/out of the set;
              // otherwise it opens the topic as usual.
              onClick={() => (selectMode ? onToggleSelect(t.id) : onOpen(t.id))}
              style={{
                position: "relative",
                textAlign: "left",
                background: selected ? PALETTE.panel2 : PALETTE.panel,
                border: `1px solid ${selected ? PALETTE.accent : PALETTE.line}`,
                borderRadius: 12,
                padding: 16,
                cursor: "pointer",
                color: PALETTE.text,
              }}
            >
              {/* Checkmark badge marking a selected card. */}
              {selected && (
                <span
                  style={{
                    position: "absolute",
                    top: 10,
                    right: 12,
                    fontFamily: MONO,
                    fontSize: 13,
                    fontWeight: 700,
                    color: PALETTE.accent,
                  }}
                >
                  ✓
                </span>
              )}
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

/**
 * TopicView — the Learn/Quiz shell for a single open topic.
 *
 * Always renders the mode toggle plus Prev/Next lesson controls, so the buttons
 * stay put whether you're in Learn, mid-quiz, or on the quiz results screen.
 *
 * Prev/Next props (passed down from App, which owns the course's topic order):
 *   onPrev, onNext   — navigate to the adjacent lesson.
 *   prevTopic        — the previous topic, or null if this is the first lesson
 *                       (in which case Prev goes back to the topic list instead).
 *   nextTopic        — the next topic, or null if this is the last lesson
 *                       (Next is hidden when there's nothing after this one).
 *   onSelectMode     — jump back to the topic list with selection mode already
 *                       on, ready to pick topics for a Master Set quiz.
 */
function TopicView({ topic, mode, setMode, onFinish, best, onPrev, onNext, prevTopic, nextTopic, onSelectMode }) {
  const navBtn = {
    fontFamily: MONO,
    fontSize: 12,
    padding: "7px 14px",
    borderRadius: 8,
    cursor: "pointer",
    border: `1px solid ${PALETTE.line}`,
    background: "transparent",
    color: PALETTE.text,
  };

  // Mode buttons. "Flashcards" only appears when this topic ships a deck.
  const modes = [
    ["learn", "Learn"],
    ["quiz", "Quiz"],
    ...(topic.flashcards?.length ? [["cards", "Flashcards"]] : []),
  ];

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18, flexWrap: "wrap" }}>
        {modes.map(([m, label]) => (
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
            {label}
          </button>
        ))}
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          {/* Jumps back to the topic list in selection mode (for Master Set). */}
          <button onClick={onSelectMode} title="Select topics for a combined quiz" style={navBtn}>
            Select
          </button>
          <button
            onClick={onPrev}
            title={prevTopic ? `Previous: ${prevTopic.title}` : "Back to topic list"}
            style={navBtn}
          >
            ‹ {prevTopic ? "Prev" : "Home"}
          </button>
          {nextTopic && (
            <button onClick={onNext} title={`Next: ${nextTopic.title}`} style={navBtn}>
              Next ›
            </button>
          )}
        </div>
      </div>
      {mode === "learn" ? (
        <LearnView topic={topic} />
      ) : mode === "quiz" ? (
        <QuizView topic={topic} onFinish={onFinish} best={best} />
      ) : (
        <FlashcardsView topic={topic} />
      )}
    </div>
  );
}

/**
 * MasterQuizView — the combined "Master Set" quiz screen.
 *
 * Renders the standard QuizView with a synthetic topic whose `questions` array
 * is the shuffled mix of every selected topic's questions (built by App's
 * buildMasterSet). Quiz-only — a mixed set has no Learn cards. Results are
 * deliberately NOT persisted: the mix changes from run to run, so writing it
 * into per-topic progress would make the best-score bars meaningless.
 *
 * Props:
 *   topic  — the synthetic master topic { id, title, subtitle, questions }.
 *   onExit — return to the topic list (the selection is kept, so the user can
 *            immediately reshuffle by hitting MASTER SET again).
 */
function MasterQuizView({ topic, onExit }) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18, flexWrap: "wrap" }}>
        <span style={{ fontFamily: MONO, fontSize: 12, color: PALETTE.muted }}>{topic.subtitle}</span>
        <button
          onClick={onExit}
          title="Back to topic list"
          style={{
            marginLeft: "auto",
            fontFamily: MONO,
            fontSize: 12,
            padding: "7px 14px",
            borderRadius: 8,
            cursor: "pointer",
            border: `1px solid ${PALETTE.line}`,
            background: "transparent",
            color: PALETTE.text,
          }}
        >
          ‹ Home
        </button>
      </div>
      <QuizView topic={topic} onFinish={() => { }} best={undefined} />
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
            {/* Optional diagram beneath the card text (e.g. arrow diagrams). */}
            {c.figure && <Figure src={c.figure.src} alt={c.figure.alt} caption={c.figure.caption} />}
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

/**
 * FlashcardsView — a flip-through deck for a topic's `flashcards` array.
 *
 * One card is shown at a time. The FRONT side holds the prompt (e.g. "O(1)");
 * clicking the card — or the Flip button — reveals the BACK (the name and
 * classic examples). Prev/Next step through the deck and wrap around at the
 * ends, always landing on the next card front-side-up.
 *
 * Props:
 *   topic — the open topic; its `flashcards` [{ front, back }] drive the deck.
 */
function FlashcardsView({ topic }) {
  const [index, setIndex] = useState(0);   // which card is showing
  const [flipped, setFlipped] = useState(false); // false = front, true = back

  const cards = topic.flashcards;
  const card = cards[index];

  /** Step forward/back through the deck (wrapping), new card starts on FRONT. */
  function go(delta) {
    setIndex((i) => (i + delta + cards.length) % cards.length);
    setFlipped(false);
  }

  const navBtn = {
    fontFamily: MONO,
    fontSize: 13,
    padding: "9px 18px",
    borderRadius: 8,
    cursor: "pointer",
    border: `1px solid ${PALETTE.line}`,
    background: "transparent",
    color: PALETTE.text,
  };

  return (
    <div style={{ maxWidth: 620, margin: "0 auto" }}>
      {/* Deck position + which side is up. */}
      <div style={{ display: "flex", justifyContent: "space-between", fontFamily: MONO, fontSize: 12, color: PALETTE.muted, marginBottom: 12 }}>
        <span>CARD {index + 1} / {cards.length}</span>
        <span>{flipped ? "BACK" : "FRONT"}</span>
      </div>

      {/* The card itself — click anywhere on it to flip. */}
      <div
        onClick={() => setFlipped((f) => !f)}
        title="Click to flip"
        style={{
          background: PALETTE.panel,
          border: `1px solid ${flipped ? PALETTE.accent : PALETTE.line}`,
          borderRadius: 14,
          minHeight: 240,
          padding: "32px 36px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          cursor: "pointer",
          userSelect: "none",
        }}
      >
        {flipped ? (
          <div style={{ fontSize: 17, lineHeight: 1.8, letterSpacing: 0.2, color: PALETTE.text }}>
            {card.back}
          </div>
        ) : (
          <div style={{ fontFamily: MONO, fontSize: 42, fontWeight: 700, color: PALETTE.accent }}>
            {card.front}
          </div>
        )}
      </div>
      <div style={{ fontFamily: MONO, fontSize: 11, color: PALETTE.muted, textAlign: "center", marginTop: 8 }}>
        click the card to flip it
      </div>

      {/* Deck controls. */}
      <div style={{ display: "flex", justifyContent: "center", gap: 10, marginTop: 16 }}>
        <button onClick={() => go(-1)} style={navBtn}>
          ‹ Prev
        </button>
        <button
          onClick={() => setFlipped((f) => !f)}
          style={{
            ...navBtn,
            border: "none",
            background: PALETTE.accent,
            color: PALETTE.bg,
            fontWeight: 700,
          }}
        >
          Flip
        </button>
        <button onClick={() => go(1)} style={navBtn}>
          Next ›
        </button>
      </div>
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
        {/* Optional diagram the question refers to (e.g. "which arrow diagram…"). */}
        {q.figure && <Figure src={q.figure.src} alt={q.figure.alt} caption={q.figure.caption} />}
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
