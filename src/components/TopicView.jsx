import React from "react";
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
  const modes = [
    ["learn", "Learn"],
    ["quiz", "Quiz"],
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
            onClick={onToggleEdit}
            title="Edit this topic's cards"
            style={{
              ...navBtn,
              border: `1px solid ${editMode ? PALETTE.accent : PALETTE.line}`,
              background: editMode ? PALETTE.accentSoft : "transparent",
              color: editMode ? PALETTE.accent : PALETTE.text,
            }}
          >
            {editMode ? "Done" : "Edit"}
          </button>
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
        <LearnView topic={topic} editMode={editMode} onSave={onSaveContent} saveState={saveState} />
      ) : mode === "quiz" ? (
        // Quiz stays read-only: editing questions means editing four choices and
        // a correct-answer index, which is a different (and riskier) editor.
        <QuizView topic={topic} onFinish={onFinish} best={best} />
      ) : (
        <FlashcardsView topic={topic} editMode={editMode} onSave={onSaveContent} saveState={saveState} />
      )}
    </div>
  );
}
