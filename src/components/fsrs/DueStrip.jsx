import React from "react";
import { PALETTE, MONO, HEADING, RADII } from "../../data/theme";
import { formatDueLabel } from "../../data/fsrsFormat";

/**
 * The home screen's scheduler strip: what is due on the left, one click into
 * it on the right. It adds a path, it does not replace one. The topic grid
 * below is untouched.
 */
export default function DueStrip({ counts, onReview, onAhead, onLab }) {
  // Nothing rather than a row of zeros. On a fresh install, or with the API
  // down, an empty readout is noise above the thing the user came for.
  if (!counts) return null;

  const { due, learning, new: fresh, reviewable, later, nextDueOn } = counts;
  const nothingDue = reviewable === 0;

  let laterText = "no items scheduled yet";
  if (later > 0) {
    laterText = `${later} item${later === 1 ? "" : "s"} scheduled, next ${formatDueLabel(nextDueOn)}`;
  }

  let actionLabel = `Start review (${reviewable})`;
  let actionTitle = `Review the ${reviewable} item${reviewable === 1 ? "" : "s"} due right now`;
  let onAction = onReview;
  if (nothingDue) {
    actionLabel = "Review ahead";
    actionTitle = "Pull the next-soonest items forward and review them early";
    onAction = onAhead;
  }

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 16,
        flexWrap: "wrap",
        padding: "14px 18px",
        marginBottom: 18,
        background: PALETTE.panel,
        border: `1px solid ${nothingDue ? PALETTE.line : PALETTE.accent}`,
        borderRadius: RADII.lg,
      }}
    >
      {nothingDue ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <span style={{ fontFamily: HEADING, fontSize: 14, color: PALETTE.text }}>
            Nothing due. You're caught up.
          </span>
          <span style={{ fontFamily: MONO, fontSize: 11, color: PALETTE.muted }}>{laterText}</span>
        </div>
      ) : (
        <div style={{ display: "flex", alignItems: "baseline", gap: 14, flexWrap: "wrap" }}>
          <Count n={due} label="due" activeColor={PALETTE.text} />
          <Dot />
          <Count n={learning} label="learning" activeColor={PALETTE.warn} />
          <Dot />
          <Count n={fresh} label="new" activeColor={PALETTE.accent} />
        </div>
      )}

      <div style={{ marginLeft: "auto", display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button
          onClick={onLab}
          title="A sandbox: grade a scratch card, move the clock, watch the scheduler react"
          style={{
            fontFamily: HEADING,
            fontSize: 12,
            padding: "8px 14px",
            borderRadius: RADII.md,
            cursor: "pointer",
            border: `1px solid ${PALETTE.line}`,
            background: "transparent",
            color: PALETTE.text,
          }}
        >
          How scheduling works
        </button>
        <button
          onClick={onAction}
          title={actionTitle}
          style={{
            fontFamily: HEADING,
            fontSize: 12,
            fontWeight: 500,
            padding: "8px 18px",
            borderRadius: RADII.md,
            cursor: "pointer",
            border: `1px solid ${nothingDue ? PALETTE.line : PALETTE.accent}`,
            background: nothingDue ? "transparent" : PALETTE.accentSoft,
            color: nothingDue ? PALETTE.text : PALETTE.accent,
          }}
        >
          {actionLabel}
        </button>
      </div>
    </div>
  );
}

function Count({ n, label, activeColor }) {
  const color = n > 0 ? activeColor : PALETTE.muted;
  return (
    <span style={{ display: "inline-flex", alignItems: "baseline", gap: 5 }}>
      <span
        style={{
          fontFamily: HEADING,
          fontSize: 20,
          fontWeight: 500,
          color,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {n}
      </span>
      <span style={{ fontFamily: MONO, fontSize: 11, color: PALETTE.muted }}>{label}</span>
    </span>
  );
}

function Dot() {
  return <span style={{ color: PALETTE.line, fontSize: 12 }}>·</span>;
}
