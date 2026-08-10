import React from "react";
import { PALETTE, MONO } from "../../data/theme";
import { formatInterval } from "../../data/fsrsFormat";

/**
 * Recall probability falling from the last review, with the desired retention
 * target as a dashed line. It answers what the four stat numbers can't: why is
 * this card due then. Because that is where the curve crosses the line.
 *
 * The SVG is drawn in a normalized 0..100 space and stretched with
 * preserveAspectRatio="none", so it fills any width without a measuring hook.
 * That distorts everything inside it, which is why the strokes use
 * vector-effect="non-scaling-stroke" and every label is HTML positioned in
 * percentages on top instead of an <text> element.
 */
export default function RetrievabilityCurve({
  curve,
  target = 0.9,
  nowOffsetDays = null,
  dueOffsetDays = null,
  height = 150,
}) {
  if (!curve?.points?.length) {
    return (
      <Frame height={height}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "100%",
            fontFamily: MONO,
            fontSize: 11,
            color: PALETTE.muted,
            textAlign: "center",
            padding: "0 20px",
          }}
        >
          No curve yet. A card has to be reviewed once before it has a memory to forget.
        </div>
      </Frame>
    );
  }

  const { points, horizonDays } = curve;

  // Fitted to the data. A fixed 0..1 domain squeezes a curve that only falls
  // from 100% to 85% into the top sixth of the box, and so does any hardcoded
  // floor whenever the interval is short.
  const lowest = Math.min(...points.map((p) => p.retrievability));
  const yMin = Math.max(0, Math.min(lowest, target) - 0.06);
  const yMax = 1;

  const toX = (days) => (days / horizonDays) * 100;
  const toY = (r) => ((yMax - r) / (yMax - yMin)) * 100;

  const line = points.map((p) => `${toX(p.dayOffset).toFixed(3)},${toY(p.retrievability).toFixed(3)}`);
  const area = `M0,100 L${line.join(" L")} L100,100 Z`;
  const stroke = `M${line.join(" L")}`;
  const targetY = toY(target);

  const markers = [];
  if (dueOffsetDays != null && dueOffsetDays <= horizonDays) {
    markers.push({ at: dueOffsetDays, color: PALETTE.accent, label: "due", dashed: true });
  }
  if (nowOffsetDays != null && nowOffsetDays <= horizonDays) {
    markers.push({ at: nowOffsetDays, color: PALETTE.text, label: "now", dashed: false });
  }

  const endPercent = Math.round(points[points.length - 1].retrievability * 100);
  const targetPercent = Math.round(target * 100);

  return (
    <Frame height={height}>
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        width="100%"
        height={height}
        style={{ display: "block" }}
        role="img"
        aria-label={`Recall probability falling from 100% to ${endPercent}% over ${formatInterval(
          horizonDays * 1440
        )}, crossing the ${targetPercent}% target on the due date.`}
      >
        <path d={area} fill={PALETTE.warnSoft} stroke="none" />
        <line
          x1="0"
          x2="100"
          y1={targetY}
          y2={targetY}
          stroke={PALETTE.muted}
          strokeWidth="1"
          strokeDasharray="4 4"
          vectorEffect="non-scaling-stroke"
        />
        {markers.map((m) => (
          <line
            key={m.label}
            x1={toX(m.at)}
            x2={toX(m.at)}
            y1="0"
            y2="100"
            stroke={m.color}
            strokeWidth="1"
            strokeDasharray={m.dashed ? "3 3" : undefined}
            opacity="0.55"
            vectorEffect="non-scaling-stroke"
          />
        ))}
        <path
          d={stroke}
          fill="none"
          stroke={PALETTE.warn}
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      <Label style={{ top: `${targetY}%`, right: 6, transform: "translateY(-50%)" }}>
        target {targetPercent}%
      </Label>
      {markers.map((m) => (
        <Label key={m.label} style={{ top: 4, left: `${toX(m.at)}%`, color: m.color, transform: markerShift(toX(m.at)) }}>
          {m.label}
        </Label>
      ))}
      <Label style={{ bottom: 4, left: 6 }}>last review</Label>
      <Label style={{ bottom: 4, right: 6 }}>+{formatInterval(horizonDays * 1440)}</Label>
    </Frame>
  );
}

/** Pins marker labels inward at both edges. "now" sits at x=0 on a freshly reviewed card. */
function markerShift(xPercent) {
  if (xPercent > 88) return "translateX(-100%)";
  if (xPercent < 6) return "translateX(2px)";
  return "translateX(-50%)";
}

function Frame({ height, children }) {
  return (
    <div
      style={{
        position: "relative",
        height,
        background: PALETTE.bg,
        border: `1px solid ${PALETTE.line}`,
        borderRadius: 10,
        overflow: "hidden",
      }}
    >
      {children}
    </div>
  );
}

function Label({ style, children }) {
  return (
    <span
      style={{
        position: "absolute",
        fontFamily: MONO,
        fontSize: 10,
        color: PALETTE.muted,
        pointerEvents: "none",
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      {children}
    </span>
  );
}
