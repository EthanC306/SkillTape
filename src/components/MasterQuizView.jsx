import React from "react";
import { PALETTE, MONO, HEADING, RADII } from "../data/theme";
import QuizView from "./QuizView";

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
export default function MasterQuizView({ topic, onExit }) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18, flexWrap: "wrap" }}>
        <span style={{ fontFamily: MONO, fontSize: 12, color: PALETTE.muted }}>{topic.subtitle}</span>
        <button
          onClick={onExit}
          title="Back to topic list"
          style={{
            marginLeft: "auto",
            fontFamily: HEADING,
            fontSize: 12,
            padding: "7px 14px",
            borderRadius: RADII.md,
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
