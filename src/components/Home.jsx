import React, { useState } from "react";
import { PALETTE, MONO, HEADING, RADII } from "../data/theme";
import DueStrip from "./fsrs/DueStrip";

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
 *   onDrill()               — open a closed-book Drill session (ROADMAP.md A4)
 *                              over this course's due items.
 *   onExam()                — open the timed Exam simulator (ROADMAP.md A5)
 *                              over this course's item bank.
 *   onPractice()             — open Practice mode (docs/OLLAMA_GRADING.md):
 *                              a custom topic/difficulty/format session,
 *                              batch-graded at the end by a local Ollama model.
 *   onReport()              — open the reporting dashboard (ROADMAP.md A6):
 *                              coverage, accuracy, and leeches for this course.
 *   counts                  - FSRS due/learning/new counts for this course, or
 *                              null (plans/fsrs_ui.md Phase 4). Feeds the strip
 *                              above the grid and the per-topic due figures.
 *   onReviewAhead()         - start a Drill session over the next-soonest items
 *                              when nothing is actually due.
 *   onLab()                 - open the scheduler sandbox.
 *   showDueStrip            - feature flag. When false the strip is
 *                              gone and this is exactly the pre-1.0.16 screen.
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
  onDrill,
  onExam,
  onPractice,
  onReport,
  counts,
  onReviewAhead,
  onLab,
  showDueStrip = true,
  onAddDeck,
  onRenameDeck,
}) {
  const [addingDeck, setAddingDeck] = useState(false);
  const [deckTitle, setDeckTitle] = useState("");
  const [deckSubtitle, setDeckSubtitle] = useState("");
  const [deckState, setDeckState] = useState(null);
  const [hoveredTopic, setHoveredTopic] = useState(null);
  const [editingTopic, setEditingTopic] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editSubtitle, setEditSubtitle] = useState("");
  const [editState, setEditState] = useState(null);

  function closeDeckDialog() {
    if (deckState === "saving") return;
    setAddingDeck(false);
    setDeckTitle("");
    setDeckSubtitle("");
    setDeckState(null);
  }

  async function submitDeck(event) {
    event?.preventDefault();
    if (!deckTitle.trim() || deckState === "saving") return;
    setDeckState("saving");
    try {
      const created = await onAddDeck({ title: deckTitle.trim(), subtitle: deckSubtitle.trim() });
      if (!created?.id) throw new Error("The topic was not confirmed by the database.");
      setAddingDeck(false);
      setDeckTitle("");
      setDeckSubtitle("");
      setDeckState(null);
    } catch (error) {
      setDeckState(error.message);
    }
  }

  function openTopicEditor(event, topic) {
    event.stopPropagation();
    setEditingTopic(topic);
    setEditTitle(topic.title);
    setEditSubtitle(topic.subtitle ?? "");
    setEditState(null);
  }

  async function submitTopicEdit(event) {
    event.preventDefault();
    if (!editTitle.trim() || editState === "saving") return;
    setEditState("saving");
    try {
      await onRenameDeck(editingTopic.id, { title: editTitle.trim(), subtitle: editSubtitle.trim() });
      setEditingTopic(null);
      setEditState(null);
    } catch (error) {
      setEditState(error.message);
    }
  }
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
      {/* What's actually due, and one click into it. Hidden in select mode:
          the screen is being used to build a Master Set then, not to review. */}
      {showDueStrip && !selectMode && (
        <DueStrip counts={counts} onReview={onDrill} onAhead={onReviewAhead} onLab={onLab} />
      )}
      {/* Intro line on the left; Select + MASTER SET controls at the top right. */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18, flexWrap: "wrap" }}>
        <p style={{ color: PALETTE.muted, fontSize: 14, margin: 0, maxWidth: 560 }}>
          {selectMode
            ? "Click topics to add them to your set, then hit MASTER SET."
            : "Pick a topic to review the concepts or test yourself."}
        </p>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          {!selectMode && (
            <>
              <button
                onClick={onDrill}
                title="Closed-book review of items due right now (ROADMAP.md A4)"
                style={ctrlBtn(false)}
              >
                Drill 
              </button>
              <button
                onClick={onExam}
                title="Timed exam simulator, sampled by exam weight (ROADMAP.md A5)"
                style={ctrlBtn(false)}
              >
                Exam
              </button>
              <button
                onClick={onPractice}
                title="Pick topics, difficulty, and format for a custom closed-book session, auto-graded by a local Ollama model"
                style={ctrlBtn(false)}
              >
                Practice
              </button>
              <button onClick={onReport} title="Coverage, accuracy, and leeches (ROADMAP.md A6)" style={ctrlBtn(false)}>
                Report
              </button>
            </>
          )}
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
          const topicCounts = counts?.byTopic?.[t.id];
          return (
            <div
              key={t.id}
              role="button"
              tabIndex={0}
              // In select mode a click toggles the topic in/out of the set;
              // otherwise it opens the topic as usual.
              onClick={() => (selectMode ? onToggleSelect(t.id) : onOpen(t.id))}
              onMouseEnter={() => setHoveredTopic(t.id)}
              onMouseLeave={() => setHoveredTopic((current) => current === t.id ? null : current)}
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
              {hoveredTopic === t.id && !selectMode && (
                <button
                  type="button"
                  aria-label={`Edit ${t.title}`}
                  title="Edit topic name"
                  onClick={(event) => openTopicEditor(event, t)}
                  onKeyDown={(event) => event.stopPropagation()}
                  style={{ position: "absolute", top: 9, right: 10, zIndex: 2, width: 30, height: 30, display: "grid", placeItems: "center", padding: 0, border: `1px solid ${PALETTE.line}`, borderRadius: RADII.sm, background: PALETTE.panel2, color: PALETTE.accent, cursor: "pointer", fontSize: 15 }}
                >
                  ✎
                </button>
              )}
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
              {/* ONE scheduler slot per card, top-right, showing the most
                  urgent thing only: due beats unseen, and a card with nothing
                  outstanding says nothing at all. An earlier pass put "N due"
                  here AND "· N new" inline on the count line below; two slots
                  for one idea wrapped that line on most cards and left the grid
                  visibly ragged. */}
              {showDueStrip && topicCounts && (
                <div
                  style={{
                    position: "absolute",
                    top: 12,
                    right: 14,
                    display: "flex",
                    gap: 6,
                    fontFamily: MONO,
                    fontSize: 11,
                    whiteSpace: "nowrap",
                  }}
                >
                  {topicCounts.leeches > 0 && (
                    <span
                      style={{ color: PALETTE.bad }}
                      title={`${topicCounts.leeches} leech${
                        topicCounts.leeches === 1 ? "" : "es"
                      }, pulled from rotation. Triage them in Report.`}
                    >
                      {topicCounts.leeches}⚑
                    </span>
                  )}
                  {topicCounts.due > 0 ? (
                    <span style={{ color: PALETTE.accent }} title="Items due for review right now">
                      {topicCounts.due} due
                    </span>
                  ) : topicCounts.fresh > 0 ? (
                    <span style={{ color: PALETTE.muted }} title="Items you haven't seen yet">
                      {topicCounts.fresh} new
                    </span>
                  ) : null}
                </div>
              )}
              <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4, paddingRight: 62 }}>{t.title}</div>
              <div style={{ fontFamily: MONO, fontSize: 12, color: PALETTE.muted, marginBottom: 14 }}>
                {t.subtitle}
              </div>
              {/* The existing best-score line, untouched. It is earned progress;
                  the scheduler badge supplements it rather than crowding it. */}
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
        {/* Reserved topic action. Intentionally inert for now: this establishes
            its position and visual footprint before any creation flow exists. */}
        <button
          type="button"
          aria-label="Add topic"
          onClick={() => setAddingDeck(true)}
          style={{
            width: 128,
            height: 128,
            margin: "0 0 0 8px",
            justifySelf: "start",
            alignSelf: "center",
            display: "grid",
            placeItems: "center",
            padding: 0,
            border: `1px solid ${PALETTE.line}`,
            borderRadius: RADII.lg,
            background: "transparent",
            color: PALETTE.muted,
            fontFamily: MONO,
            fontSize: 48,
            fontWeight: 300,
            lineHeight: 1,
            cursor: "pointer",
          }}
        >
          +
        </button>
      </div>
      {addingDeck && (
        <div
          role="presentation"
          onMouseDown={(event) => { if (event.target === event.currentTarget) closeDeckDialog(); }}
          style={{ position: "fixed", inset: 0, zIndex: 1000, display: "grid", placeItems: "center", padding: 20, background: "rgba(8, 9, 16, 0.72)" }}
        >
          <form
            role="dialog"
            aria-modal="true"
            aria-labelledby="new-deck-title"
            onSubmit={submitDeck}
            style={{ width: "min(440px, 100%)", boxSizing: "border-box", display: "grid", gap: 16, padding: "24px 26px", border: `1px solid ${PALETTE.line}`, borderRadius: RADII.lg, background: PALETTE.panel, color: PALETTE.text }}
          >
            <div>
              <div id="new-deck-title" style={{ fontFamily: HEADING, fontSize: 20, fontWeight: 600, marginBottom: 5 }}>New card deck</div>
              <div style={{ fontFamily: MONO, fontSize: 11, color: PALETTE.muted }}>Create an empty deck in this course, then open it to add cards.</div>
            </div>
            <label style={{ display: "grid", gap: 6, fontFamily: MONO, fontSize: 11, color: PALETTE.muted }}>
              TITLE
              <input
                autoFocus
                required
                value={deckTitle}
                onChange={(event) => setDeckTitle(event.target.value)}
                maxLength={200}
                placeholder="Integration techniques"
                style={{ boxSizing: "border-box", width: "100%", padding: "10px 12px", border: `1px solid ${PALETTE.line}`, borderRadius: RADII.md, background: PALETTE.bg, color: PALETTE.text, fontFamily: HEADING, fontSize: 15 }}
              />
            </label>
            <label style={{ display: "grid", gap: 6, fontFamily: MONO, fontSize: 11, color: PALETTE.muted }}>
              SUBTITLE
              <input
                value={deckSubtitle}
                onChange={(event) => setDeckSubtitle(event.target.value)}
                maxLength={200}
                placeholder="Methods and common forms"
                style={{ boxSizing: "border-box", width: "100%", padding: "10px 12px", border: `1px solid ${PALETTE.line}`, borderRadius: RADII.md, background: PALETTE.bg, color: PALETTE.text, fontFamily: MONO, fontSize: 13 }}
              />
            </label>
            {deckState && deckState !== "saving" && <div role="alert" style={{ fontFamily: MONO, fontSize: 11, color: PALETTE.bad }}>{deckState}</div>}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button type="button" onClick={closeDeckDialog} disabled={deckState === "saving"} style={ctrlBtn(false)}>Cancel</button>
              <button type="button" onClick={submitDeck} disabled={!deckTitle.trim() || deckState === "saving"} style={{ ...ctrlBtn(Boolean(deckTitle.trim())), opacity: deckTitle.trim() && deckState !== "saving" ? 1 : 0.5 }}>
                {deckState === "saving" ? "Adding…" : "Add +"}
              </button>
            </div>
          </form>
        </div>
      )}
      {editingTopic && (
        <div onMouseDown={(event) => { if (event.target === event.currentTarget && editState !== "saving") setEditingTopic(null); }} style={{ position: "fixed", inset: 0, zIndex: 1000, display: "grid", placeItems: "center", padding: 20, background: "rgba(8, 9, 16, 0.72)" }}>
          <form role="dialog" aria-modal="true" aria-labelledby="edit-topic-title" onSubmit={submitTopicEdit} style={{ width: "min(440px, 100%)", boxSizing: "border-box", display: "grid", gap: 16, padding: "24px 26px", border: `1px solid ${PALETTE.line}`, borderRadius: RADII.lg, background: PALETTE.panel, color: PALETTE.text }}>
            <div>
              <div id="edit-topic-title" style={{ fontFamily: HEADING, fontSize: 20, fontWeight: 600, marginBottom: 5 }}>Edit topic</div>
              <div style={{ fontFamily: MONO, fontSize: 11, color: PALETTE.muted }}>Update the name shown on this topic card.</div>
            </div>
            <label style={{ display: "grid", gap: 6, fontFamily: MONO, fontSize: 11, color: PALETTE.muted }}>
              TITLE
              <input autoFocus required value={editTitle} onChange={(event) => setEditTitle(event.target.value)} maxLength={200} style={{ boxSizing: "border-box", width: "100%", padding: "10px 12px", border: `1px solid ${PALETTE.line}`, borderRadius: RADII.md, background: PALETTE.bg, color: PALETTE.text, fontFamily: HEADING, fontSize: 15 }} />
            </label>
            <label style={{ display: "grid", gap: 6, fontFamily: MONO, fontSize: 11, color: PALETTE.muted }}>
              SUBTITLE
              <input value={editSubtitle} onChange={(event) => setEditSubtitle(event.target.value)} maxLength={200} style={{ boxSizing: "border-box", width: "100%", padding: "10px 12px", border: `1px solid ${PALETTE.line}`, borderRadius: RADII.md, background: PALETTE.bg, color: PALETTE.text, fontFamily: MONO, fontSize: 13 }} />
            </label>
            {editState && editState !== "saving" && <div role="alert" style={{ fontFamily: MONO, fontSize: 11, color: PALETTE.bad }}>{editState}</div>}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button type="button" disabled={editState === "saving"} onClick={() => setEditingTopic(null)} style={ctrlBtn(false)}>Cancel</button>
              <button type="submit" disabled={!editTitle.trim() || editState === "saving"} style={{ ...ctrlBtn(Boolean(editTitle.trim())), opacity: editTitle.trim() && editState !== "saving" ? 1 : 0.5 }}>{editState === "saving" ? "Saving…" : "Save"}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
