import React, { useEffect, useRef, useState } from "react";
import { PALETTE, MONO, HEADING, RADII } from "../data/theme";
import { FORMATS } from "../data/itemSchema";
import { deriveGrade, GRADE_LABELS } from "../data/grading";
import {
  formatInterval,
  formatDueLabel,
  formatStability,
  formatDifficulty,
  formatRetrievability,
} from "../data/fsrsFormat";
import { getDrillQueue, postDrillAttempt, getDrillExport, postDrillImport } from "../api/client";
import newSessionId from "../utils/sessionId";
import PromptBody from "./PromptBody";
import Inline from "./Inline";
import GradeBar from "./fsrs/GradeBar";

/**
 * DrillView — closed-book recall practice (ROADMAP.md A4).
 *
 * Closed-book enforcement is by VISIBILITY, not by lock (CORR §4.2): the tab
 * bar and every other nav chrome is hidden for as long as this component is
 * mounted (via `document.body.dataset.drillActive`, wired to CSS in
 * index.html since A1), and the Page Visibility API counts — but never
 * penalizes — tab switches. There is no code here that prevents opening a
 * new tab; the honesty is the point, not the enforcement.
 *
 * One item is shown at a time, sampled from the FSRS due queue
 * (GET /api/drill/queue). MCQ items are machine-graded on click; every other
 * format gets a blank textarea to actually write an answer into (2026-08-01
 * addition — silent recall + self-report was too easy to be honest about,
 * in tension with ROADMAP.md §7 rule 3's "production over recognition")
 * before "Show answer" reveals the key next to what you wrote, then a 0-3
 * self-grade (Again/Hard/Good/Easy) — the same four buttons FSRS's `next()`
 * expects, off by one (ROADMAP.md A4 "Rating alignment"). The written answer
 * itself isn't auto-graded (free text has no reliable checker); it rides
 * along in the attempt log as `note`.
 *
 * Since 1.0.16 (plans/fsrs_ui.md Phase 5) the four grade buttons carry the
 * interval each one produces, so the scheduling decision is legible at the
 * moment it's made rather than discovered days later. MCQ items still
 * auto-grade, but the derived rating is now shown as a suggestion on the same
 * bar and can be overridden, since the machine's read of a click is not always the
 * user's read of how the recall felt.
 *
 * Props:
 *   course   — which course's due items to pull ("cpp" | "discrete").
 *   onExit() — return to the course topic list.
 *   ahead    - pull the next-soonest items instead of only what's due.
 *   inspector - render the per-item scheduler readout, off by default.
 */
export default function DrillView({ course, onExit, ahead = false, inspector = false }) {
  const [queue, setQueue] = useState(null); // null = loading
  const [error, setError] = useState(null);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [selected, setSelected] = useState(null); // MCQ choice index
  const [writtenAnswer, setWrittenAnswer] = useState(""); // self-graded formats: typed before reveal
  const [tabBlurs, setTabBlurs] = useState(0); // for the current item
  const [startedAt, setStartedAt] = useState(() => Date.now());
  const [now, setNow] = useState(() => Date.now()); // ticks once/sec for the on-screen timer
  const [session, setSession] = useState({
    reviewed: 0,
    grades: [0, 0, 0, 0],
    leeches: 0,
    tabBlurs: 0,
    // The soonest due date any item in this session came away with, for the
    // "when does the next one come back" line on the summary.
    nextDueOn: null,
  });
  const [finished, setFinished] = useState(false);
  // One id for this whole sitting, minted once at mount. A ref rather than
  // state: nothing renders it, and a re-render must not mint a new one or the
  // Report would split one drill into several sessions.
  const sessionId = useRef(newSessionId()).current;
  const [submitting, setSubmitting] = useState(false);
  const [importState, setImportState] = useState(null); // null | "importing" | "done" | error string
  const fileInputRef = useRef(null);

  // Drill-active chrome hiding (A1's index.html CSS hook). Cleared on
  // unmount so leaving Drill mode by ANY path — Done, End drill, browser
  // back — restores the tab bar.
  useEffect(() => {
    document.body.dataset.drillActive = "true";
    return () => {
      delete document.body.dataset.drillActive;
    };
  }, []);

  // Page Visibility API — an honesty aid, not a lock (CORR §4.2): count tab
  // blurs, never fail the item over one. A blur might be a notification.
  useEffect(() => {
    function onVisibility() {
      if (document.hidden) setTabBlurs((n) => n + 1);
    }
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  // On-screen elapsed timer. The *recorded* seconds field is always computed
  // fresh from Date.now() - startedAt at submit time — this interval only
  // drives the live display, so a backgrounded tab throttling setInterval
  // never desyncs what gets sent to the server.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let cancelled = false;
    getDrillQueue(course, 20, { ahead })
      .then((items) => {
        if (!cancelled) setQueue(items);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [course, ahead]);

  const item = queue?.[index] ?? null;
  const elapsedSec = Math.floor((now - startedAt) / 1000);
  const overBudget = item?.timeBudgetSec != null && elapsedSec > item.timeBudgetSec;

  function resetForNextItem() {
    setRevealed(false);
    setSelected(null);
    setWrittenAnswer("");
    setTabBlurs(0);
    setStartedAt(Date.now());
  }

  /** Send one attempt and fold the result into the session summary. Does not advance. */
  async function recordAttempt({ grade, abandoned = false }) {
    const seconds = Math.max(0, Math.round((Date.now() - startedAt) / 1000));
    try {
      const res = await postDrillAttempt({
        itemId: item.id,
        note: writtenAnswer.trim() || undefined,
        mode: "closed",
        // `mode` is the book condition and Practice is closed-book too, so it
        // cannot say which screen this came from. `surface` can. See the
        // column comment in server/schema.sql.
        surface: "drill",
        sessionId,
        // Only meaningful for MCQ items; `selected` is null for every other
        // format, where the typed answer rides along as `note` above.
        answerChoice: selected ?? undefined,
        grade: abandoned ? undefined : grade,
        seconds,
        tabBlurs,
        abandoned,
      });
      const dueOn = res.review?.dueOn ?? null;
      setSession((s) => ({
        reviewed: s.reviewed + (abandoned ? 0 : 1),
        grades: abandoned ? s.grades : s.grades.map((n, i) => (i === grade ? n + 1 : n)),
        leeches: s.leeches + (res.review?.leech ? 1 : 0),
        tabBlurs: s.tabBlurs + tabBlurs,
        nextDueOn:
          dueOn == null ? s.nextDueOn : s.nextDueOn == null ? dueOn : Math.min(s.nextDueOn, dueOn),
      }));
    } catch {
      // Best-effort, matching useProgress.js's stance: a failed write doesn't
      // block the session, it just won't be reflected in next time's queue.
    }
  }

  /** Normal path: record a real grade, then move to the next item or the summary. */
  async function submit({ grade }) {
    // Guards the double-click the server also guards against, one layer earlier:
    // here it stops the SECOND item from being graded with the first item's
    // click, which no server-side check could catch.
    if (submitting) return;
    setSubmitting(true);
    try {
      await recordAttempt({ grade });
      if (index + 1 < queue.length) {
        setIndex((i) => i + 1);
        resetForNextItem();
      } else {
        setFinished(true);
      }
    } finally {
      setSubmitting(false);
    }
  }

  function chooseMcq(i) {
    if (revealed) return;
    setSelected(i);
    setRevealed(true);
  }

  /**
   * What the auto-grader makes of this item, or null where nothing was
   * machine-graded. MCQ is a clean binary; a free-text answer the user typed
   * has no checker, so the four buttons stand on their own there.
   */
  const suggestedGrade =
    revealed && item?.format === FORMATS.MCQ && selected != null
      ? deriveGrade({ correct: selected === item.answerIndex })
      : null;

  // 1-4 to grade, Enter to take the suggestion. A drill session is dozens of
  // items of read-think-grade, and reaching for the mouse on every one of them
  // is most of the friction. Bound only while the grade bar is actually up, so
  // typing "4" into the answer textarea can never submit an Easy.
  useEffect(() => {
    if (!revealed || finished || submitting) return undefined;
    function onKey(e) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key >= "1" && e.key <= "4") {
        e.preventDefault();
        submit({ grade: Number(e.key) - 1 });
      } else if (e.key === "Enter" && suggestedGrade != null) {
        e.preventDefault();
        submit({ grade: suggestedGrade });
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  /** Escape hatch (A4): end the session NOW, not after the current item — but
   * log an in-progress item as abandoned rather than silently discarding it. */
  async function endDrill() {
    if (item && !finished) {
      await recordAttempt({ abandoned: true });
    }
    setFinished(true);
  }

  async function exportJson() {
    const data = await getDrillExport();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `skilltape-drill-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function importJson(e) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file later
    if (!file) return;
    setImportState("importing");
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const attempts = Array.isArray(parsed) ? parsed : parsed.attempts;
      const res = await postDrillImport({ attempts });
      setImportState(`imported ${res.imported} attempt${res.imported === 1 ? "" : "s"}`);
    } catch (err) {
      setImportState(err.message || "import failed");
    }
  }

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

  // ── Loading / error / empty-queue states ──────────────────────────────────

  if (error) {
    return (
      <DrillShell onEnd={onExit} label="Exit">
        <Status text={error} tone="bad" />
      </DrillShell>
    );
  }

  if (queue === null) {
    return (
      <DrillShell onEnd={onExit} label="Exit">
        <Status text="loading due items…" />
      </DrillShell>
    );
  }

  if (queue.length === 0 && !finished) {
    return (
      <DrillShell onEnd={onExit} label="Exit">
        <Status text="Nothing due right now. Everything verified is scheduled for later — check back after a review's due date." />
      </DrillShell>
    );
  }

  // ── Session summary ────────────────────────────────────────────────────────

  if (finished) {
    return (
      <div>
        <div
          style={{
            background: PALETTE.panel,
            border: `1px solid ${PALETTE.line}`,
            borderRadius: RADII.lg,
            padding: 28,
            textAlign: "center",
          }}
        >
          <div style={{ fontFamily: MONO, fontSize: 13, color: PALETTE.muted, marginBottom: 8 }}>
            DRILL SESSION COMPLETE
          </div>
          <div style={{ fontFamily: HEADING, fontSize: 44, fontWeight: 500, color: PALETTE.accent }}>
            {session.reviewed}
          </div>
          <div style={{ color: PALETTE.muted, marginTop: 4, marginBottom: 6 }}>
            item{session.reviewed === 1 ? "" : "s"} reviewed, closed-book
          </div>
          {/* Phase 5: close the loop out loud. The point of grading was to move
              these items somewhere, and this is where that lands. */}
          {session.nextDueOn != null && (
            <div style={{ fontFamily: MONO, fontSize: 12, color: PALETTE.muted, marginBottom: 18 }}>
              soonest back {formatDueLabel(session.nextDueOn)}
              {session.nextDueOn > Date.now()
                ? ` · in ${formatInterval((session.nextDueOn - Date.now()) / 60000)}`
                : ""}
            </div>
          )}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: 18,
              fontFamily: MONO,
              fontSize: 12,
              color: PALETTE.muted,
              marginBottom: 20,
              flexWrap: "wrap",
            }}
          >
            {GRADE_LABELS.map((label, g) => (
              <span key={label}>
                {label.toLowerCase()} {session.grades[g]}
              </span>
            ))}
            <span>tab blurs {session.tabBlurs}</span>
            {session.leeches > 0 && (
              <span style={{ color: PALETTE.bad }}>
                {session.leeches} new leech{session.leeches === 1 ? "" : "es"} — pulled from rotation
              </span>
            )}
          </div>
          <div style={{ display: "flex", justifyContent: "center", gap: 10, flexWrap: "wrap" }}>
            <button onClick={onExit} style={{ ...navBtn, border: `1px solid ${PALETTE.accent}`, background: PALETTE.accentSoft, color: PALETTE.accent, fontWeight: 500 }}>
              Done
            </button>
            <button onClick={exportJson} style={navBtn}>
              Export JSON
            </button>
            <button onClick={() => fileInputRef.current?.click()} style={navBtn}>
              Import JSON
            </button>
            <input ref={fileInputRef} type="file" accept="application/json" onChange={importJson} style={{ display: "none" }} />
          </div>
          {importState && (
            <div style={{ fontFamily: MONO, fontSize: 11, color: PALETTE.muted, marginTop: 10 }}>
              {importState}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── One item ────────────────────────────────────────────────────────────

  return (
    <DrillShell onEnd={endDrill}>
      <div style={{ background: PALETTE.panel, border: `1px solid ${PALETTE.line}`, borderRadius: RADII.lg, padding: 20, maxWidth: 720, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontFamily: MONO, fontSize: 12, color: PALETTE.muted, marginBottom: 14 }}>
          <span>
            ITEM {index + 1} / {queue.length} · {item.format.toUpperCase()}
          </span>
          <span style={{ color: overBudget ? PALETTE.bad : PALETTE.muted }}>
            {String(Math.floor(elapsedSec / 60)).padStart(2, "0")}:{String(elapsedSec % 60).padStart(2, "0")}
            {overBudget ? ` · over ${item.timeBudgetSec}s budget` : ""}
          </span>
        </div>

        <PromptBody prompt={item.prompt} style={{ fontSize: 16, lineHeight: 1.6, marginBottom: 20 }} />

        {item.format === FORMATS.MCQ ? (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {item.choices.map((choice, i) => {
                let bg = PALETTE.panel2,
                  border = PALETTE.line;
                if (revealed && i === item.answerIndex) {
                  bg = PALETTE.goodSoft;
                  border = PALETTE.good;
                } else if (revealed && i === selected) {
                  bg = PALETTE.badSoft;
                  border = PALETTE.bad;
                }
                return (
                  <button
                    key={i}
                    onClick={() => chooseMcq(i)}
                    disabled={revealed}
                    style={{
                      textAlign: "left",
                      fontFamily: MONO,
                      fontSize: 14,
                      padding: "11px 14px",
                      borderRadius: RADII.md,
                      border: `1px solid ${border}`,
                      background: bg,
                      color: PALETTE.text,
                      cursor: revealed ? "default" : "pointer",
                    }}
                  >
                    <span style={{ color: PALETTE.muted, marginRight: 8 }}>{String.fromCharCode(65 + i)}</span>
                    {choice}
                  </button>
                );
              })}
            </div>
            {revealed && (
              <div style={{ marginTop: 16 }}>
                <GradeBar
                  preview={item.preview}
                  onGrade={(grade) => submit({ grade })}
                  suggested={suggestedGrade}
                  disabled={submitting}
                />
              </div>
            )}
          </>
        ) : !revealed ? (
          <div>
            {/* A blank page to actually write on, not just think about — the
                app's own "production over recognition" rule (ROADMAP.md §7
                rule 3) means self-grading against a silently-recalled answer
                is too easy to be honest about. Not graded automatically
                (free text has no reliable auto-checker); it's here so you
                commit to something concrete before comparing against the key. */}
            <textarea
              value={writtenAnswer}
              onChange={(e) => setWrittenAnswer(e.target.value)}
              placeholder="Write your answer here before revealing…"
              rows={item.format === FORMATS.WRITE ? 6 : 4}
              style={{
                width: "100%",
                boxSizing: "border-box",
                background: PALETTE.bg,
                border: `1px solid ${PALETTE.line}`,
                borderRadius: RADII.md,
                color: PALETTE.text,
                padding: "10px 12px",
                fontFamily: item.format === FORMATS.WRITE || item.format === FORMATS.TRACE ? MONO : "inherit",
                fontSize: 14,
                lineHeight: 1.6,
                resize: "vertical",
                marginBottom: 12,
              }}
            />
            <button
              onClick={() => setRevealed(true)}
              style={{ ...navBtn, border: `1px solid ${PALETTE.accent}`, background: PALETTE.accentSoft, color: PALETTE.accent, fontWeight: 500 }}
            >
              Show answer
            </button>
          </div>
        ) : (
          <div>
            {writtenAnswer.trim() && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontFamily: MONO, fontSize: 11, color: PALETTE.muted, marginBottom: 4 }}>YOUR ANSWER</div>
                <div
                  style={{
                    fontSize: 14,
                    lineHeight: 1.7,
                    padding: "12px 14px",
                    borderRadius: RADII.md,
                    background: PALETTE.panel2,
                    border: `1px solid ${PALETTE.line}`,
                    whiteSpace: "pre-wrap",
                    fontFamily: item.format === FORMATS.WRITE || item.format === FORMATS.TRACE ? MONO : "inherit",
                  }}
                >
                  {writtenAnswer}
                </div>
              </div>
            )}
            <div style={{ fontFamily: MONO, fontSize: 11, color: PALETTE.muted, marginBottom: 4 }}>ANSWER KEY</div>
            <div
              style={{
                fontSize: 14,
                lineHeight: 1.7,
                letterSpacing: 0.2,
                padding: "14px 16px",
                borderRadius: RADII.md,
                background: PALETTE.panel2,
                borderLeft: `3px solid ${PALETTE.accent}`,
                whiteSpace: "pre-wrap",
                marginBottom: 12,
              }}
            >
              {item.expected}
            </div>
            {item.criteria?.length > 0 && (
              <ul style={{ margin: "0 0 12px", padding: "0 0 0 20px", fontSize: 13, color: PALETTE.muted, lineHeight: 1.8 }}>
                {item.criteria.map((c, i) => (
                  <li key={i}><Inline text={c} /></li>
                ))}
              </ul>
            )}
            {item.provenance?.citation && (
              <div style={{ fontFamily: MONO, fontSize: 11, color: PALETTE.muted, marginBottom: 16 }}>
                {item.provenance.citation}
                {item.provenance.page != null ? `, p.${item.provenance.page}` : ""}
              </div>
            )}
            <div style={{ fontFamily: MONO, fontSize: 12, color: PALETTE.muted, marginBottom: 8 }}>
              Hit 3 of 4 checklist points? That's a 2 (Good), not a 3 (Easy).
            </div>
            <GradeBar
              preview={item.preview}
              onGrade={(grade) => submit({ grade })}
              suggested={null}
              disabled={submitting}
            />
          </div>
        )}

        {inspector && <Inspector item={item} now={now} />}
      </div>
    </DrillShell>
  );
}

/**
 * Phase 7's diagnostics row: everything the scheduler is holding about this
 * item, on one line, off unless switched on in settings.
 *
 * Rendered under the item rather than above it on purpose. Seeing "stability
 * 0.2, 3 lapses" before you answer tells you the answer is going to be hard,
 * which is a hint the closed-book rule is supposed to deny you.
 */
function Inspector({ item, now }) {
  const r = item.review;
  const fields = [
    ["state", r?.stateName ?? "new"],
    ["stability", formatStability(r?.stability)],
    ["difficulty", formatDifficulty(r?.difficulty)],
    ["retrievability", formatRetrievability(r?.retrievability)],
    ["reps", r?.reps ?? 0],
    ["lapses", r?.lapses ?? 0],
    ["due", formatDueLabel(r?.dueOn ?? null, now)],
  ];
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "4px 14px",
        marginTop: 18,
        paddingTop: 12,
        borderTop: `1px solid ${PALETTE.line}`,
        fontFamily: MONO,
        fontSize: 11,
        color: PALETTE.muted,
      }}
    >
      <span style={{ color: PALETTE.line }}>{item.id}</span>
      {fields.map(([k, v]) => (
        <span key={k}>
          {k} <span style={{ color: PALETTE.text }}>{v}</span>
        </span>
      ))}
    </div>
  );
}

/** Shared frame: the "End drill" escape hatch, always reachable, above whatever's showing. */
function DrillShell({ onEnd, label = "End drill", children }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 14 }}>
        <button
          onClick={onEnd}
          style={{
            fontFamily: HEADING,
            fontSize: 12,
            padding: "6px 14px",
            borderRadius: RADII.md,
            cursor: "pointer",
            border: `1px solid ${PALETTE.bad}`,
            background: "transparent",
            color: PALETTE.bad,
          }}
        >
          {label}
        </button>
      </div>
      {children}
    </div>
  );
}

function Status({ text, tone }) {
  return (
    <div
      style={{
        background: PALETTE.panel,
        border: `1px solid ${tone === "bad" ? PALETTE.bad : PALETTE.line}`,
        borderRadius: RADII.lg,
        padding: "28px 30px",
        fontFamily: MONO,
        fontSize: 13,
        color: tone === "bad" ? PALETTE.bad : PALETTE.muted,
        textAlign: "center",
      }}
    >
      {text}
    </div>
  );
}
