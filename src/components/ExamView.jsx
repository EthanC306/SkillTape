import React, { useEffect, useRef, useState } from "react";
import { PALETTE, MONO, HEADING, RADII } from "../data/theme";
import { FORMATS } from "../data/itemSchema";
import { getExamSet, getDrillStats, postDrillAttempt, getDrillExport } from "../api/client";
import PromptBody from "./PromptBody";
import Inline from "./Inline";

/**
 * ExamView — the exam simulator (ROADMAP.md A5, re-homed in-app per D6).
 *
 * Four phases, strictly sequential:
 *   setup     — show what's about to happen (item count, topic spread, time
 *               budget) before the clock starts. Nothing is graded yet.
 *   answering — one item at a time, hard-timed, NO feedback of any kind:
 *               MCQ selections aren't colored; every other format gets a
 *               blank textarea to write a real answer into (same rationale
 *               as DrillView's 2026-08-01 addition — self-report without
 *               ever producing anything is too easy to be honest about) but
 *               nothing is revealed or checked yet. This is the "closed-book
 *               test conditions" half.
 *   grading   — after time's up or "Finish exam": MCQ items are graded
 *               automatically (there was never anything to self-assess);
 *               every other format gets the same written-answer-next-to-the-
 *               key -> 0-3 self-grade DrillView uses, just done as a batch
 *               review against the whole exam instead of live per item. This
 *               IS "the end" the spec means by "no feedback until the end."
 *   report    — per-topic score, examWeight-weighted overall score, and a
 *               comparison against this course's closed-book drill accuracy
 *               (GET /api/drill/stats) — "directly comparable to a real exam
 *               breakdown" per A5's done-when.
 *
 * Every reached item (answered or skipped) is logged via the same
 * POST /api/drill/attempts DrillView uses, mode: "exam" — same scheduler,
 * same attempt log, just a different mode tag. Reusing that endpoint means a
 * graded exam item updates FSRS state exactly like a graded drill item would;
 * a review is a review regardless of which mode produced it.
 *
 * Props:
 *   course   — which course's item bank to sample.
 *   onExit() — return to the course topic list.
 */
export default function ExamView({ course, onExit }) {
  const [phase, setPhase] = useState("loading"); // loading | setup | answering | grading | report | error
  const [error, setError] = useState(null);
  const [exam, setExam] = useState(null); // { items, topics, minutes }

  // ── answering phase ──────────────────────────────────────────────────────
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState(null); // MCQ choice index for the current item
  const [writtenAnswer, setWrittenAnswer] = useState(""); // self-graded formats: typed during answering, shown back during grading
  const [tabBlurs, setTabBlurs] = useState(0);
  const [itemStartedAt, setItemStartedAt] = useState(null);
  const [deadline, setDeadline] = useState(null);
  const [now, setNow] = useState(() => Date.now());
  // One entry per REACHED item: { item, choiceIndex, answerText, seconds, tabBlurs }
  const answersRef = useRef([]);

  // ── grading phase ────────────────────────────────────────────────────────
  const [gradeQueue, setGradeQueue] = useState([]); // self-graded answers still needing a grade
  const [gradeRevealed, setGradeRevealed] = useState(false);
  const [gradedResults, setGradedResults] = useState([]); // { item, grade, seconds, tabBlurs, skipped }

  // ── report phase ─────────────────────────────────────────────────────────
  const [drillStats, setDrillStats] = useState(null);

  useEffect(() => {
    document.body.dataset.drillActive = "true";
    return () => {
      delete document.body.dataset.drillActive;
    };
  }, []);

  useEffect(() => {
    function onVisibility() {
      if (document.hidden) setTabBlurs((n) => n + 1);
    }
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let cancelled = false;
    getExamSet(course, { count: 20, minutes: 50 })
      .then((data) => {
        if (cancelled) return;
        setExam(data);
        setPhase(data.items.length ? "setup" : "empty");
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message);
          setPhase("error");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [course]);

  // Auto-finish when the clock runs out, from whatever item is on screen.
  useEffect(() => {
    if (phase === "answering" && deadline != null && now >= deadline) {
      finishAnswering();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [now, phase, deadline]);

  function beginExam() {
    answersRef.current = [];
    setIndex(0);
    setSelected(null);
    setWrittenAnswer("");
    setTabBlurs(0);
    setItemStartedAt(Date.now());
    setDeadline(Date.now() + exam.minutes * 60 * 1000);
    setPhase("answering");
  }

  /** The current item was actually shown and reached (Next or Finish clicked on it). */
  function recordCurrentItem() {
    const item = exam.items[index];
    const seconds = Math.max(0, Math.round((Date.now() - itemStartedAt) / 1000));
    answersRef.current.push({ item, choiceIndex: selected, answerText: writtenAnswer, seconds, tabBlurs });
  }

  function nextItem() {
    recordCurrentItem();
    if (index + 1 < exam.items.length) {
      setIndex((i) => i + 1);
      setSelected(null);
      setWrittenAnswer("");
      setTabBlurs(0);
      setItemStartedAt(Date.now());
    } else {
      startGrading(answersRef.current);
    }
  }

  /** "Finish exam" escape hatch and the auto-timeout path — stop right here.
   * Anything after the current item in `exam.items` was never shown at all —
   * that tail is computed in submitAllAndFinish, once grading is done, and
   * logged as abandoned rather than silently dropped. */
  function finishAnswering() {
    recordCurrentItem();
    startGrading(answersRef.current);
  }

  function startGrading(answers) {
    const mcq = [];
    const selfGraded = [];
    for (const a of answers) {
      if (a.item.format === FORMATS.MCQ) mcq.push(a);
      else selfGraded.push(a);
    }
    // MCQ needs no interactive review — grade it immediately, same
    // correct-maps-to-Good(2)/incorrect-maps-to-Again(0) mapping DrillView
    // uses (there's no partial credit on a stored choice index).
    const mcqResults = mcq.map((a) => ({
      item: a.item,
      grade: a.choiceIndex === a.item.answerIndex ? 2 : 0,
      seconds: a.seconds,
      tabBlurs: a.tabBlurs,
    }));

    // An all-MCQ sample has nothing left to review interactively — go
    // straight to the report instead of parking in "grading" with an empty
    // queue and nothing left to ever call submitAllAndFinish.
    if (selfGraded.length === 0) {
      setGradedResults(mcqResults);
      setPhase("grading"); // shows "scoring…" for the brief async gap below
      submitAllAndFinish(mcqResults);
      return;
    }

    setGradedResults(mcqResults);
    setGradeQueue(selfGraded);
    setGradeRevealed(false);
    setPhase("grading");
  }

  function revealCurrent() {
    setGradeRevealed(true);
  }

  async function gradeCurrent(grade) {
    const [current, ...rest] = gradeQueue;
    const result = { item: current.item, grade, answerText: current.answerText, seconds: current.seconds, tabBlurs: current.tabBlurs };
    const all = [...gradedResults, result];
    setGradedResults(all);
    setGradeRevealed(false);

    if (rest.length) {
      setGradeQueue(rest);
    } else {
      await submitAllAndFinish(all);
    }
  }

  /** Every item — graded or never reached (deadline/Finish hit early) — gets logged, matching DrillView's append-only stance. */
  async function submitAllAndFinish(results) {
    // Everything from answersRef.current.length onward in exam.items was
    // never shown at all — not "skipped" by choice, just never reached.
    const unreached = exam.items.slice(answersRef.current.length);

    const submissions = [
      ...results.map((r) =>
        postDrillAttempt({
          itemId: r.item.id,
          mode: "exam",
          grade: r.grade,
          note: r.answerText?.trim() || undefined,
          seconds: r.seconds,
          tabBlurs: r.tabBlurs,
        }).catch(() => {})
      ),
      ...unreached.map((item) =>
        postDrillAttempt({
          itemId: item.id,
          mode: "exam",
          seconds: 0,
          tabBlurs: 0,
          abandoned: true,
        }).catch(() => {})
      ),
    ];
    await Promise.all(submissions);

    try {
      setDrillStats(await getDrillStats(course));
    } catch {
      setDrillStats({});
    }
    setPhase("report");
  }

  async function exportJson() {
    const data = await getDrillExport();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `skilltape-exam-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
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
  const primaryBtn = {
    ...navBtn,
    border: `1px solid ${PALETTE.accent}`,
    background: PALETTE.accentSoft,
    color: PALETTE.accent,
    fontWeight: 500,
  };

  // ── loading / error / empty ──────────────────────────────────────────────

  if (phase === "loading") {
    return (
      <ExamShell onEnd={onExit} label="Exit">
        <Status text="loading exam set…" />
      </ExamShell>
    );
  }
  if (phase === "error") {
    return (
      <ExamShell onEnd={onExit} label="Exit">
        <Status text={error} tone="bad" />
      </ExamShell>
    );
  }
  if (phase === "empty") {
    return (
      <ExamShell onEnd={onExit} label="Exit">
        <Status text="No verified items available for this course yet — there's nothing to sample an exam from. Migrate and verify a topic first (ROADMAP.md A3)." />
      </ExamShell>
    );
  }

  // ── setup ─────────────────────────────────────────────────────────────────

  if (phase === "setup") {
    const topicRows = Object.entries(exam.topics);
    return (
      <ExamShell onEnd={onExit} label="Exit">
        <div style={{ background: PALETTE.panel, border: `1px solid ${PALETTE.line}`, borderRadius: RADII.lg, padding: 28, maxWidth: 620, margin: "0 auto" }}>
          <div style={{ fontFamily: MONO, fontSize: 13, color: PALETTE.muted, marginBottom: 8 }}>EXAM SIMULATOR</div>
          <div style={{ fontFamily: HEADING, fontSize: 22, fontWeight: 500, marginBottom: 16 }}>
            {exam.items.length} items · {exam.minutes} minutes · closed-book
          </div>
          <p style={{ color: PALETTE.muted, fontSize: 14, lineHeight: 1.7, marginBottom: 16 }}>
            Items are sampled across topics weighted by exam importance. No feedback of any kind during the
            exam — no reveal, no correct/incorrect coloring. Once time runs out (or you hit "Finish exam"),
            you'll grade yourself against the answer key and get a per-topic report.
          </p>
          <div style={{ display: "grid", gap: 6, marginBottom: 20 }}>
            {topicRows.map(([id, t]) => (
              <div key={id} style={{ display: "flex", justifyContent: "space-between", fontFamily: MONO, fontSize: 12, color: PALETTE.muted }}>
                <span>{t.title}</span>
                <span>
                  {t.sampled} item{t.sampled === 1 ? "" : "s"} · weight {t.examWeight}
                </span>
              </div>
            ))}
          </div>
          <button onClick={beginExam} style={{ ...primaryBtn, padding: "10px 24px", fontSize: 14 }}>
            Begin exam
          </button>
        </div>
      </ExamShell>
    );
  }

  // ── answering ────────────────────────────────────────────────────────────

  if (phase === "answering") {
    const item = exam.items[index];
    const remainingSec = Math.max(0, Math.round((deadline - now) / 1000));
    const lowTime = remainingSec <= 300; // last 5 minutes

    return (
      <ExamShell onEnd={finishAnswering} label="Finish exam">
        <div style={{ background: PALETTE.panel, border: `1px solid ${PALETTE.line}`, borderRadius: RADII.lg, padding: 20, maxWidth: 720, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontFamily: MONO, fontSize: 12, color: PALETTE.muted, marginBottom: 14 }}>
            <span>
              ITEM {index + 1} / {exam.items.length} · {item.format.toUpperCase()}
            </span>
            <span style={{ color: lowTime ? PALETTE.bad : PALETTE.muted, fontWeight: lowTime ? 700 : 400 }}>
              {String(Math.floor(remainingSec / 60)).padStart(2, "0")}:{String(remainingSec % 60).padStart(2, "0")} left
            </span>
          </div>

          <PromptBody prompt={item.prompt} style={{ fontSize: 16, lineHeight: 1.6, marginBottom: 20 }} />

          {item.format === FORMATS.MCQ ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
              {item.choices.map((choice, i) => (
                <button
                  key={i}
                  onClick={() => setSelected(i)}
                  style={{
                    textAlign: "left",
                    fontFamily: MONO,
                    fontSize: 14,
                    padding: "11px 14px",
                    borderRadius: RADII.md,
                    border: `1px solid ${selected === i ? PALETTE.accent : PALETTE.line}`,
                    background: selected === i ? PALETTE.accentSoft : PALETTE.panel2,
                    color: PALETTE.text,
                    cursor: "pointer",
                  }}
                >
                  <span style={{ color: PALETTE.muted, marginRight: 8 }}>{String.fromCharCode(65 + i)}</span>
                  {choice}
                  {/* No correctness feedback here on purpose — A5's "no feedback until the end". */}
                </button>
              ))}
            </div>
          ) : (
            <div style={{ marginBottom: 16 }}>
              <textarea
                value={writtenAnswer}
                onChange={(e) => setWrittenAnswer(e.target.value)}
                placeholder="Write your answer here — you'll grade it against the key once the exam ends."
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
                }}
              />
            </div>
          )}

          <button onClick={nextItem} style={primaryBtn}>
            {index + 1 < exam.items.length ? "Next item" : "Finish and grade"}
          </button>
        </div>
      </ExamShell>
    );
  }

  // ── grading ──────────────────────────────────────────────────────────────

  if (phase === "grading") {
    if (gradeQueue.length === 0) {
      return (
        <ExamShell>
          <Status text="scoring…" />
        </ExamShell>
      );
    }
    const current = gradeQueue[0];
    const item = current.item;
    const gradeBtns = [
      ["Again", PALETTE.bad],
      ["Hard", PALETTE.accent],
      ["Good", PALETTE.good],
      ["Easy", PALETTE.good],
    ];

    return (
      <ExamShell>
        <div style={{ background: PALETTE.panel, border: `1px solid ${PALETTE.line}`, borderRadius: RADII.lg, padding: 20, maxWidth: 720, margin: "0 auto" }}>
          <div style={{ fontFamily: MONO, fontSize: 12, color: PALETTE.muted, marginBottom: 14 }}>
            GRADING · {gradedResults.length + 1} / {gradedResults.length + gradeQueue.length} · {item.format.toUpperCase()}
          </div>
          <PromptBody prompt={item.prompt} style={{ fontSize: 16, lineHeight: 1.6, marginBottom: 20 }} />

          {current.answerText?.trim() && (
            <div style={{ marginBottom: 16 }}>
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
                {current.answerText}
              </div>
            </div>
          )}

          {!gradeRevealed ? (
            <button onClick={revealCurrent} style={primaryBtn}>
              Show answer
            </button>
          ) : (
            <div>
              <div style={{ fontFamily: MONO, fontSize: 11, color: PALETTE.muted, marginBottom: 4 }}>ANSWER KEY</div>
              <div
                style={{
                  fontSize: 14,
                  lineHeight: 1.7,
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
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {gradeBtns.map(([label, color], g) => (
                  <button
                    key={label}
                    onClick={() => gradeCurrent(g)}
                    style={{ ...navBtn, border: `1px solid ${color}`, color, fontFamily: HEADING, fontWeight: 500 }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </ExamShell>
    );
  }

  // ── report ───────────────────────────────────────────────────────────────

  const byTopic = {};
  for (const r of gradedResults) {
    const t = (byTopic[r.item.topicId] ??= { title: r.item.topicTitle, examWeight: r.item.examWeight, correct: 0, total: 0 });
    t.total += 1;
    if (r.grade >= 2) t.correct += 1;
  }
  const skippedCount = exam.items.length - gradedResults.length;
  const topicEntries = Object.entries(byTopic);
  const weightSum = topicEntries.reduce((s, [, t]) => s + t.examWeight, 0);
  const weightedScore = weightSum
    ? topicEntries.reduce((s, [, t]) => s + (t.correct / t.total) * t.examWeight, 0) / weightSum
    : 0;

  return (
    <div>
      <div style={{ background: PALETTE.panel, border: `1px solid ${PALETTE.line}`, borderRadius: RADII.lg, padding: 28, textAlign: "center", maxWidth: 680, margin: "0 auto" }}>
        <div style={{ fontFamily: MONO, fontSize: 13, color: PALETTE.muted, marginBottom: 8 }}>EXAM REPORT</div>
        <div style={{ fontFamily: HEADING, fontSize: 44, fontWeight: 500, color: weightedScore >= 0.8 ? PALETTE.good : PALETTE.accent }}>
          {Math.round(weightedScore * 100)}%
        </div>
        <div style={{ color: PALETTE.muted, marginTop: 4, marginBottom: 24 }}>
          weighted by exam importance · {gradedResults.length} graded
          {skippedCount > 0 ? ` · ${skippedCount} skipped` : ""}
        </div>

        <div style={{ display: "grid", gap: 8, textAlign: "left", marginBottom: 24 }}>
          {topicEntries.map(([id, t]) => {
            const pct = Math.round((t.correct / t.total) * 100);
            const drill = drillStats?.[id];
            return (
              <div
                key={id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  fontFamily: MONO,
                  fontSize: 12,
                  padding: "8px 12px",
                  borderRadius: RADII.md,
                  background: PALETTE.panel2,
                }}
              >
                <span style={{ color: PALETTE.text }}>{t.title}</span>
                <span style={{ display: "flex", gap: 14, color: PALETTE.muted }}>
                  <span style={{ color: pct >= 80 ? PALETTE.good : PALETTE.text }}>
                    {t.correct}/{t.total} ({pct}%)
                  </span>
                  <span>weight {t.examWeight}</span>
                  <span>
                    drill:{" "}
                    {drill?.accuracy != null ? `${Math.round(drill.accuracy * 100)}% (${drill.attempts})` : "no closed-book history"}
                  </span>
                </span>
              </div>
            );
          })}
        </div>

        <div style={{ display: "flex", justifyContent: "center", gap: 10, flexWrap: "wrap" }}>
          <button onClick={onExit} style={primaryBtn}>
            Done
          </button>
          <button onClick={exportJson} style={navBtn}>
            Export JSON
          </button>
        </div>
      </div>
    </div>
  );
}

function ExamShell({ onEnd, label = "Finish exam", children }) {
  return (
    <div>
      {onEnd && (
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
      )}
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
