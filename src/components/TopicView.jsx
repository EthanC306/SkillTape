import React, { useCallback, useRef, useState } from "react";
import { PALETTE, MONO, HEADING, RADII } from "../data/theme";
import LearnView from "./LearnView";
import QuizView from "./QuizView";
import FlashcardsView from "./FlashcardsView";

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
export default function TopicView({ topic, mode, setMode, onFinish, best, onPrev, onNext, prevTopic, nextTopic, onSelectMode, editMode, onToggleEdit, onSaveContent, saveState }) {
  // The open editor (Learn's or Flashcards') publishes its draft state here so
  // Done can commit it — see handleToggleEdit. Only one editor is mounted at a
  // time, since `mode` picks exactly one view below.
  const editorRef = useRef(null);
  const registerEditor = useCallback((handle) => {
    editorRef.current = handle;
  }, []);

  // True while Done is waiting on the save it kicked off.
  const [finishing, setFinishing] = useState(false);
  // Set when Done refused to leave because the draft is invalid. The editor
  // already flags *which* card is broken; this just explains why the click on
  // Done appeared to do nothing.
  const [blockedNote, setBlockedNote] = useState(false);

  /**
   * Edit/Done. Turning edit mode ON is just a toggle; turning it OFF saves
   * first — "Done" reads as "done editing", so silently dropping an uncommitted
   * draft is the one thing it must not do.
   *
   * Two ways it declines to leave, both keeping the draft on screen:
   *   - the editor is blocking (unclosed `**`, a blank flashcard side); it is
   *     already showing why, and exiting would discard the fix in progress.
   *   - the write failed; the error is on screen next to the Save button.
   */
  async function handleToggleEdit() {
    setBlockedNote(false);
    if (editMode) {
      const editor = editorRef.current;
      if (editor?.dirty) {
        if (editor.blocked) {
          setBlockedNote(true);
          return;
        }
        setFinishing(true);
        try {
          const ok = await editor.save();
          if (!ok) return;
        } finally {
          setFinishing(false);
        }
      }
    }
    onToggleEdit();
  }

  const navBtn = {
    fontFamily: HEADING,
    fontSize: 12,
    padding: "7px 14px",
    borderRadius: RADII.md,
    cursor: "pointer",
    border: `1px solid ${PALETTE.line}`,
    background: "transparent",
    color: PALETTE.text,
  };

  // Mode buttons. "Flashcards" normally only appears when this topic ships a
  // deck — but in edit mode it always does, otherwise there'd be no way to
  // create the first flashcard for a topic that doesn't have one yet.
  // "Quiz" only appears when there are questions to ask — QuizView indexes
  // into topic.questions unconditionally, so an empty bank (a flashcards-only
  // topic, e.g. a vocab deck authored entirely in Edit Mode) would crash it.
  const modes = [
    ["learn", "Learn"],
    ...(topic.questions?.length ? [["quiz", "Quiz"]] : []),
    ...(topic.flashcards?.length || editMode ? [["cards", "Flashcards"]] : []),
  ];

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18, flexWrap: "wrap" }}>
        {modes.map(([m, label]) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            style={{
              fontFamily: HEADING,
              fontSize: 13,
              padding: "7px 16px",
              borderRadius: RADII.md,
              cursor: "pointer",
              border: `1px solid ${mode === m ? PALETTE.accent : PALETTE.line}`,
              background: mode === m ? PALETTE.accentSoft : "transparent",
              color: mode === m ? PALETTE.accent : PALETTE.text,
              fontWeight: 500,
            }}
          >
            {label}
          </button>
        ))}
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          {/* Turns Learn and Flashcards into editors for this topic's content. */}
          <button
            onClick={handleToggleEdit}
            disabled={finishing}
            title={editMode ? "Save changes and leave edit mode" : "Edit this topic's cards"}
            style={{
              ...navBtn,
              border: `1px solid ${editMode ? PALETTE.accent : PALETTE.line}`,
              background: editMode ? PALETTE.accentSoft : "transparent",
              color: editMode ? PALETTE.accent : PALETTE.text,
              cursor: finishing ? "default" : "pointer",
              opacity: finishing ? 0.5 : 1,
            }}
          >
            {finishing ? "Saving…" : editMode ? "Done" : "Edit"}
          </button>
          {blockedNote && (
            <span style={{ alignSelf: "center", fontFamily: MONO, fontSize: 11, color: PALETTE.bad }}>
              fix the flagged card first
            </span>
          )}
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
        <LearnView
          topic={topic}
          editMode={editMode}
          onSave={onSaveContent}
          saveState={saveState}
          registerEditor={registerEditor}
        />
      ) : mode === "quiz" ? (
        // Quiz stays read-only: editing questions means editing four choices and
        // a correct-answer index, which is a different (and riskier) editor.
        <QuizView topic={topic} onFinish={onFinish} best={best} />
      ) : (
        <FlashcardsView
          topic={topic}
          editMode={editMode}
          onSave={onSaveContent}
          saveState={saveState}
          registerEditor={registerEditor}
        />
      )}
    </div>
  );
}
