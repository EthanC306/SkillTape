import React from "react";
import { PALETTE, MONO, HEADING, RADII } from "../../data/theme";
import { GRADES, GRADE_LABELS } from "../../data/grading";
import { formatInterval, NO_VALUE } from "../../data/fsrsFormat";

// danger / warning / success / accent, in scale order. Hard gets its own
// colour rather than borrowing red or green: it is a pass that shortens the
// interval, and either of those would misreport what it does.
const ROLE = [PALETTE.bad, PALETTE.warn, PALETTE.good, PALETTE.accent];

/**
 * The four grade buttons, each labelled with the interval it produces.
 *
 * Intervals are not computed here. They arrive already derived from the
 * server's single repeat() call, which is what makes the number under the
 * button the number you actually get, fuzz included.
 */
export default function GradeBar({ preview, onGrade, suggested = null, disabled = false }) {
  return (
    <div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(96px, 1fr))",
          gap: 8,
        }}
      >
        {GRADES.map((grade) => {
          const label = GRADE_LABELS[grade];
          const outcome = preview?.[label.toLowerCase()];
          const color = ROLE[grade];
          const isSuggested = suggested === grade;

          let intervalText = NO_VALUE;
          if (outcome) {
            intervalText = formatInterval(outcome.intervalMinutes);
          }

          let title = `${label}, next review in ${intervalText}`;
          if (isSuggested) {
            title = `${label}, what the auto-grade chose. Next review in ${intervalText}.`;
          }

          return (
            <button
              key={label}
              onClick={() => onGrade(grade)}
              disabled={disabled}
              title={title}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 5,
                padding: "10px 8px 9px",
                borderRadius: RADII.md,
                cursor: disabled ? "default" : "pointer",
                // Emphasis is weight and fill, never a different colour. The
                // four colours already mean the rating; recolouring the
                // suggested one would overload them.
                border: `${isSuggested ? 2 : 1}px solid ${color}`,
                background: isSuggested ? PALETTE.panel2 : "transparent",
                color,
                opacity: disabled ? 0.5 : 1,
              }}
            >
              <span style={{ fontFamily: HEADING, fontSize: 13, fontWeight: 500 }}>{label}</span>
              <span
                style={{
                  fontFamily: MONO,
                  fontSize: 12,
                  color: PALETTE.muted,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {intervalText}
              </span>
            </button>
          );
        })}
      </div>
      {suggested != null && (
        <div style={{ fontFamily: MONO, fontSize: 11, color: PALETTE.muted, marginTop: 8 }}>
          auto-graded {GRADE_LABELS[suggested].toLowerCase()}, override it if that's not how it felt
        </div>
      )}
    </div>
  );
}
