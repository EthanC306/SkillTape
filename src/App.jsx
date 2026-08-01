import React, { useMemo, useState } from "react";
import { PALETTE, SANS, RADII, MONO } from "./data/theme";
import shuffle from "./utils/shuffle";
import useProgress from "./hooks/useProgress";
import useTopics from "./hooks/useTopics";
import useAuth from "./hooks/useAuth";
import { putCards, putFlashcards } from "./api/client";
import Header from "./components/Header";
import Home from "./components/Home";
import TopicView from "./components/TopicView";
import MasterQuizView from "./components/MasterQuizView";
import HistoryModal from "./components/HistoryModal";

/**
 * Status — the panel shown while the curriculum is loading, or when it can't
 * be reached. Content arrives over HTTP now, so "no topics yet" is a normal
 * first render rather than a bug.
 */
function Status({ text, tone, onRetry }) {
  return (
    <div
      style={{
        background: PALETTE.panel,
        border: `1px solid ${tone === "bad" ? PALETTE.bad : PALETTE.line}`,
        borderRadius: RADII.lg,
        padding: "28px 30px",
        fontFamily: MONO,
        fontSize: 13,
        color: tone === "bad" ? PALETTE.bad : PALETTE.muted,
        display: "flex",
        alignItems: "center",
        gap: 14,
        flexWrap: "wrap",
      }}
    >
      <span>{text}</span>
      {onRetry && (
        <button
          onClick={onRetry}
          style={{
            fontFamily: MONO,
            fontSize: 12,
            padding: "6px 14px",
            borderRadius: RADII.md,
            cursor: "pointer",
            border: `1px solid ${PALETTE.line}`,
            background: "transparent",
            color: PALETTE.text,
          }}
        >
          Retry
        </button>
      )}
    </div>
  );
}

/**
 * App — the tutor for a single class.
 *
 * Props:
 *   course — which class to show (matches a `course` field in the curriculum,
 *            e.g. "cpp" or "discrete"). When omitted, every topic is shown.
 */
export default function App({ course }) {
  const { progress, recordRun } = useProgress();
  const { topics: allTopics, loading, error, reload } = useTopics();
  const auth = useAuth();
  const [topicId, setTopicId] = useState(null);
  const [mode, setMode] = useState("learn");

  // Edit mode — when true, Learn/Flashcards render their content as editable
  // fields instead of read-only text. Scoped to the open topic; reset on the
  // way into a different one.
  const [editMode, setEditMode] = useState(false);
  const [saveState, setSaveState] = useState(null); // null | "saving" | "saved" | error string

  // ── Master Set state ──────────────────────────────────────────────────────
  // selectMode  — when true, clicking topic cards on the list SELECTS them
  //               (for a combined quiz) instead of opening them.
  // selectedIds — the ids of the curriculum entries picked so far.
  // masterTopic — a synthetic topic holding the shuffled mix of every selected
  //               topic's questions; non-null while a Master Set quiz is open.
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [masterTopic, setMasterTopic] = useState(null);

  // id of the topic whose "older quizzes" history log is currently open (or null)
  const [historyTopicId, setHistoryTopicId] = useState(null);

  // Only the topics belonging to this class (or all of them if no course given).
  const topics = useMemo(
    () => (course ? allTopics.filter((t) => t.course === course) : allTopics),
    [allTopics, course]
  );
  const topic = topics.find((t) => t.id === topicId) || null;

  // Adjacent lessons in this course's list, used for the Prev/Next controls below.
  const topicIndex = topics.findIndex((t) => t.id === topicId);
  const prevTopic = topicIndex > 0 ? topics[topicIndex - 1] : null;
  const nextTopic = topicIndex >= 0 && topicIndex + 1 < topics.length ? topics[topicIndex + 1] : null;

  function openTopic(id) {
    setTopicId(id);
    setMode("learn");
    setEditMode(false);
    setSaveState(null);
  }

  // ── Edit mode ─────────────────────────────────────────────────────────────

  /**
   * Persist edited content for the open topic, then refetch so every view —
   * including the Master Set pool — sees the saved version.
   *
   * `patch` is { cards } or { flashcards }. The server validates independently;
   * this is not the boundary, just the caller.
   */
  async function saveContent(patch) {
    if (!topic) return;
    setSaveState("saving");
    try {
      if (patch.cards) await putCards(topic.id, patch.cards);
      if (patch.flashcards) await putFlashcards(topic.id, patch.flashcards);
      await reload();
      setSaveState("saved");
    } catch (e) {
      setSaveState(e.message);
    }
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

  return (
    <div
      style={{
        background: PALETTE.bg,
        color: PALETTE.text,
        fontFamily: SANS,
        minHeight: 560,
        borderRadius: RADII.lg,
        padding: 20,
      }}
    >
      <Header
        topic={masterTopic || topic}
        onHome={() => {
          setMasterTopic(null);
          setTopicId(null);
        }}
        auth={auth}
      />
      {loading ? (
        <Status text="loading curriculum…" />
      ) : error ? (
        <Status text={error} tone="bad" onRetry={reload} />
      ) : masterTopic ? (
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
          onShowHistory={setHistoryTopicId}
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
          editMode={editMode}
          onToggleEdit={() => {
            setEditMode((on) => !on);
            setSaveState(null);
          }}
          onSaveContent={saveContent}
          saveState={saveState}
        />
      )}
      {historyTopicId && (
        <HistoryModal
          topic={topics.find((t) => t.id === historyTopicId)}
          history={progress[historyTopicId]?.history ?? []}
          onClose={() => setHistoryTopicId(null)}
        />
      )}
    </div>
  );
}
