import React, { useEffect } from "react";
import { PALETTE, MONO, HEADING, RADII, SHADOWS } from "../data/theme";

/**
 * HistoryModal — accessible log of every past quiz attempt for one topic.
 *
 * Renders as a modal dialog (role="dialog", focus-trapped by Escape-to-close
 * and a visible close button) listing each attempt newest-first, each with
 * its score and a row of red/green bars for that attempt's questions.
 */
export default function HistoryModal({ topic, history, onClose }) {
  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const ordered = [...history].reverse();

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(20,21,28,0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        zIndex: 1000,
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Older quizzes for ${topic?.title ?? "topic"}`}
        onClick={(e) => e.stopPropagation()}
        style={{
          background: PALETTE.panel,
          border: `1px solid ${PALETTE.line}`,
          borderRadius: RADII.lg,
          boxShadow: SHADOWS.lg,
          padding: 22,
          width: "min(560px, 100%)",
          maxHeight: "80vh",
          overflowY: "auto",
          color: PALETTE.text,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <div style={{ fontFamily: HEADING, fontSize: 16, fontWeight: 500 }}>{topic?.title} — quiz history</div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              marginLeft: "auto",
              fontFamily: HEADING,
              fontSize: 12,
              padding: "6px 12px",
              borderRadius: RADII.md,
              cursor: "pointer",
              border: `1px solid ${PALETTE.line}`,
              background: "transparent",
              color: PALETTE.text,
            }}
          >
            Close
          </button>
        </div>
        {ordered.length === 0 ? (
          <div style={{ color: PALETTE.muted, fontFamily: MONO, fontSize: 12 }}>No attempts recorded yet.</div>
        ) : (
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
            {ordered.map((run, i) => {
              const pct = Math.round((run.correct / run.total) * 100);
              return (
                <li
                  key={i}
                  style={{
                    background: PALETTE.panel2,
                    border: `1px solid ${PALETTE.line}`,
                    borderRadius: RADII.md,
                    padding: "10px 12px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 6, flexWrap: "wrap" }}>
                    <span style={{ fontFamily: MONO, fontSize: 13, fontWeight: 700, color: pct >= 80 ? PALETTE.good : PALETTE.accent }}>
                      {run.correct}/{run.total}
                    </span>
                    <span style={{ fontFamily: MONO, fontSize: 11, color: PALETTE.muted }}>
                      {run.date ? new Date(run.date).toLocaleString() : ""}
                    </span>
                  </div>
                  <div
                    role="img"
                    aria-label={`Question by question: ${(run.results || [])
                      .map((r, qi) => `${qi + 1} ${r ? "correct" : "incorrect"}`)
                      .join(", ")}`}
                    style={{ display: "flex", gap: 3, flexWrap: "wrap" }}
                  >
                    {(run.results || []).map((r, qi) => (
                      <span
                        key={qi}
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: 2,
                          background: r ? PALETTE.good : PALETTE.bad,
                          display: "inline-block",
                        }}
                      />
                    ))}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
