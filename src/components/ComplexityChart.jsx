import React, { useMemo } from "react";
import { COMPLEXITY } from "../data/complexity";
import { PALETTE, MONO, RADII } from "../data/theme";

export default function ComplexityChart({ highlight }) {
  const W = 480,
    H = 300,
    PAD = 36;
  const N = 20;
  const curves = useMemo(() => {
    const fns = {
      "O(1)": () => 1,
      "O(log n)": (n) => Math.log2(n + 1),
      "O(n)": (n) => n,
      "O(n log n)": (n) => n * Math.log2(n + 1),
      "O(n²)": (n) => n * n,
      "O(2ⁿ)": (n) => Math.pow(2, n),
    };
    const maxY = N * N;
    const x = (i) => PAD + (i / (N - 1)) * (W - PAD * 2);
    const y = (v) => H - PAD - (Math.min(v, maxY) / maxY) * (H - PAD * 2);
    return Object.entries(fns).map(([key, fn]) => {
      const pts = [];
      for (let i = 0; i < N; i++) {
        pts.push(`${x(i).toFixed(1)},${y(fn(i + 1)).toFixed(1)}`);
      }
      return { key, color: COMPLEXITY[key].color, d: "M" + pts.join(" L ") };
    });
  }, []);

  return (
    <div style={{ background: PALETTE.panel2, borderRadius: RADII.lg, padding: 12 }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }}>
        {[0, 0.25, 0.5, 0.75, 1].map((t, i) => (
          <line
            key={i}
            x1={PAD}
            x2={W - PAD}
            y1={PAD + t * (H - PAD * 2)}
            y2={PAD + t * (H - PAD * 2)}
            stroke={PALETTE.line}
            strokeWidth="1"
          />
        ))}
        <line x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} stroke={PALETTE.muted} strokeWidth="1.5" />
        <line x1={PAD} y1={PAD} x2={PAD} y2={H - PAD} stroke={PALETTE.muted} strokeWidth="1.5" />
        <text x={W / 2} y={H - 6} fill={PALETTE.muted} fontSize="12" fontFamily={MONO} textAnchor="middle">
          input size  n  →
        </text>
        <text
          x={14}
          y={H / 2}
          fill={PALETTE.muted}
          fontSize="12"
          fontFamily={MONO}
          textAnchor="middle"
          transform={`rotate(-90 14 ${H / 2})`}
        >
          operations →
        </text>
        {curves.map((c) => {
          const dimmed = highlight && highlight !== c.key;
          return (
            <path
              key={c.key}
              d={c.d}
              fill="none"
              stroke={c.color}
              strokeWidth={highlight === c.key ? 3.5 : 2}
              opacity={dimmed ? 0.18 : 1}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          );
        })}
      </svg>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 6, justifyContent: "center" }}>
        {curves.map((c) => (
          <span
            key={c.key}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              fontFamily: MONO,
              fontSize: 11,
              color: highlight && highlight !== c.key ? PALETTE.muted : PALETTE.text,
              opacity: highlight && highlight !== c.key ? 0.5 : 1,
            }}
          >
            <span style={{ width: 12, height: 3, background: c.color, borderRadius: 2 }} />
            {c.key}
          </span>
        ))}
      </div>
    </div>
  );
}
