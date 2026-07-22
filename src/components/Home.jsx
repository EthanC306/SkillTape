import React from "react";
import { PALETTE, MONO, HEADING, RADII } from "../data/theme";

/**
 * Home — the topic list for the current class.
 *
 * Two ways to use the list:
 *   • Normal mode — click a topic card to open its Learn/Quiz view.
 *   • Select mode — after clicking the Select button, clicking cards TOGGLES
 *     them in/out of a selection instead. Once at least one topic is picked, a
 *     MASTER SET button appears at the top right; clicking it generates one
 *     combined quiz that mixes every selected topic's questions together.
 *
 * Props:
 *   topics   — the topics to list (already filtered to one class by App).
 *   progress — quiz progress keyed by topic id, for the per-card progress bar.
 *   onOpen(topicId)         — open a topic (normal mode click).
 *   selectMode              — whether selection mode is active.
 *   selectedIds             — ids of the currently selected topics.
 *   onToggleSelect(topicId) — add/remove a topic from the selection.
 *   onToggleSelectMode()    — turn selection mode on/off.
 *   onMasterSet()           — build & start the combined Master Set quiz.
 *   onShowHistory(topicId)  — open the "older quizzes" history modal for a topic.
 */
export default function Home({
  topics,
  progress,
  onOpen,
  selectMode,
  selectedIds,
  onToggleSelect,
  onToggleSelectMode,
  onMasterSet,
  onShowHistory,
}) {
  const ctrlBtn = (active) => ({
    fontFamily: HEADING,
    fontSize: 12,
    padding: "7px 14px",
    borderRadius: RADII.md,
    cursor: "pointer",
    border: `1px solid ${active ? PALETTE.accent : PALETTE.line}`,
    background: active ? PALETTE.accentSoft : "transparent",
    color: active ? PALETTE.accent : PALETTE.text,
    fontWeight: 500,
  });

  return (
    <div>
      {/* Intro line on the left; Select + MASTER SET controls at the top right. */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18, flexWrap: "wrap" }}>
        <p style={{ color: PALETTE.muted, fontSize: 14, margin: 0, maxWidth: 560 }}>
          {selectMode
            ? "Click topics to add them to your set, then hit MASTER SET."
            : "Pick a topic to review the concepts or test yourself."}
        </p>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <button onClick={onToggleSelectMode} title="Select topics for a combined quiz" style={ctrlBtn(selectMode)}>
            {selectMode ? "Cancel" : "Select"}
          </button>
          {/* Only shown once selection mode is on AND something is selected. */}
          {selectMode && selectedIds.length > 0 && (
            <button
              onClick={onMasterSet}
              title={`Mix ${selectedIds.length} selected topic${selectedIds.length > 1 ? "s" : ""} into one quiz`}
              style={{
                fontFamily: HEADING,
                fontSize: 12,
                padding: "7px 16px",
                borderRadius: RADII.md,
                cursor: "pointer",
                border: `1px solid ${PALETTE.accent}`,
                background: PALETTE.accentSoft,
                color: PALETTE.accent,
                fontWeight: 500,
              }}
            >
              MASTER SET ({selectedIds.length})
            </button>
          )}
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 14 }}>
        {topics.map((t) => {
          const p = progress[t.id];
          const pct = p ? Math.round((p.best / p.total) * 100) : 0;
          const selected = selectMode && selectedIds.includes(t.id);
          const history = p?.history ?? [];
          const last = history.length ? history[history.length - 1] : null;
          return (
            <div
              key={t.id}
              role="button"
              tabIndex={0}
              // In select mode a click toggles the topic in/out of the set;
              // otherwise it opens the topic as usual.
              onClick={() => (selectMode ? onToggleSelect(t.id) : onOpen(t.id))}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  selectMode ? onToggleSelect(t.id) : onOpen(t.id);
                }
              }}
              style={{
                position: "relative",
                textAlign: "left",
                background: selected ? PALETTE.panel2 : PALETTE.panel,
                border: `1px solid ${selected ? PALETTE.accent : PALETTE.line}`,
                borderRadius: RADII.lg,
                padding: 16,
                cursor: "pointer",
                color: PALETTE.text,
              }}
            >
              {/* Checkmark badge marking a selected card. */}
              {selected && (
                <span
                  style={{
                    position: "absolute",
                    top: 10,
                    right: 12,
                    fontFamily: MONO,
                    fontSize: 13,
                    fontWeight: 700,
                    color: PALETTE.accent,
                  }}
                >
                  ✓
                </span>
              )}
              <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>{t.title}</div>
              <div style={{ fontFamily: MONO, fontSize: 12, color: PALETTE.muted, marginBottom: 14 }}>
                {t.subtitle}
              </div>
              <div style={{ fontFamily: MONO, fontSize: 11, color: PALETTE.muted, marginBottom: 6 }}>
                {t.questions.length} questions{p ? ` · best ${p.best}/${p.total}` : " · not attempted"}
              </div>
              <div style={{ height: 6, background: PALETTE.panel2, borderRadius: 4, overflow: "hidden", marginBottom: last ? 10 : 0 }}>
                <div
                  style={{
                    height: "100%",
                    width: `${pct}%`,
                    background: pct >= 80 ? PALETTE.good : PALETTE.accent,
                    transition: "width 0.3s",
                  }}
                />
              </div>
              {last && (
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <div
                    role="img"
                    aria-label={`Last quiz: ${last.correct} of ${last.total} correct, question by question: ${(last.results || [])
                      .map((r, i) => `${i + 1} ${r ? "correct" : "incorrect"}`)
                      .join(", ")}`}
                    title={`Last quiz: ${last.correct}/${last.total} · ${new Date(last.date).toLocaleString()}`}
                    style={{ display: "flex", gap: 2 }}
                  >
                    {(last.results || []).map((r, i) => (
                      <span
                        key={i}
                        style={{
                          width: 7,
                          height: 7,
                          borderRadius: 2,
                          background: r ? PALETTE.good : PALETTE.bad,
                          display: "inline-block",
                        }}
                      />
                    ))}
                  </div>
                  {history.length > 1 && (
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation();
                        onShowHistory(t.id);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          e.stopPropagation();
                          onShowHistory(t.id);
                        }
                      }}
                      title="View every past quiz attempt for this topic"
                      style={{
                        marginLeft: "auto",
                        fontFamily: MONO,
                        fontSize: 10,
                        color: PALETTE.accent,
                        cursor: "pointer",
                        textDecoration: "underline",
                      }}
                    >
                      Older quizzes ({history.length})
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
