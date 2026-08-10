import React from "react";
import { PALETTE, MONO, HEADING } from "../../data/theme";
import {
  formatStability,
  formatDifficulty,
  formatRetrievability,
  formatDueLabel,
  NO_VALUE,
} from "../../data/fsrsFormat";

/**
 * The four column scheduler readout: stability, difficulty, retrievability,
 * reps/lapses.
 *
 * The captions are hardcoded rather than passed in. They are the only thing
 * making four unfamiliar words mean anything, and both screens that render
 * this need to teach the same vocabulary.
 */
export default function StatTiles({ review, now = Date.now() }) {
  const reps = review?.reps ?? 0;
  const lapses = review?.lapses ?? 0;

  return (
    <div
      style={{
        display: "grid",
        // auto-fit so this wraps to 2x2 in Drill's narrower column instead of
        // squeezing four 28px numbers into an unreadable strip.
        gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
        gap: 20,
      }}
    >
      <Tile label="Stability" value={formatStability(review?.stability)} caption="days of memory" />
      <Tile
        label="Difficulty"
        value={formatDifficulty(review?.difficulty)}
        caption="1 easy to 10 stubborn"
      />
      <Tile
        label="Retrievability"
        value={formatRetrievability(review?.retrievability)}
        caption="recall chance now"
      />
      <Tile
        label="Reps / lapses"
        value={`${reps} / ${lapses}`}
        caption={formatDueLabel(review?.dueOn ?? null, now)}
      />
    </div>
  );
}

function Tile({ label, value, caption }) {
  const empty = value === NO_VALUE;

  let valueColor = PALETTE.text;
  if (empty) {
    valueColor = PALETTE.muted;
  }

  return (
    <div>
      <div
        style={{
          fontFamily: HEADING,
          fontSize: 13,
          fontWeight: 600,
          color: PALETTE.text,
          marginBottom: 10,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: HEADING,
          fontSize: 28,
          fontWeight: 500,
          lineHeight: 1,
          color: valueColor,
          fontVariantNumeric: "tabular-nums",
          marginBottom: 8,
        }}
      >
        {value}
      </div>
      <div style={{ fontFamily: MONO, fontSize: 11, color: PALETTE.muted, lineHeight: 1.4 }}>
        {caption}
      </div>
    </div>
  );
}
