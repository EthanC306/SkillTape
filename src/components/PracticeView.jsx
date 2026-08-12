import React, { useEffect, useRef, useState } from "react";
import { PALETTE, MONO, HEADING, RADII } from "../data/theme";
import { FORMATS, DIFFICULTY_LEVELS, CODE_FORMATS, applyWriteCap, MAX_WRITE_PER_SESSION } from "../data/itemSchema";
import {
  getTopics,
  postDrillAttempt,
  postPracticeGradeBatch,
  getSuspensions,
  postSuspensions,
  deleteSuspension,
  clearSuspensions,
} from "../api/client";
import useOllamaSettings from "../hooks/useOllamaSettings";
import shuffle from "../utils/shuffle";
import PromptBody from "./PromptBody";
import Inline from "./Inline";

/**
 * PracticeView - pick N questions on topics/difficulty you choose, answer the
 * whole set with free Back/Next nav, then grade everything at once. DrillView
 * is untouched and still owns the daily FSRS queue.
 *
 * MCQ is graded client-side, everything else goes to Ollama via
 * POST /api/drill/grade-batch, one item per call. Small local models get worse
 * when you hand them several items at once, so we eat the extra round trips.
 *
 * Attempts go through the same POST /api/drill/attempts as Drill/Exam with
 * mode "closed", so a Practice session feeds FSRS and the accuracy dashboard
 * normally. Anything Ollama couldn't grade is logged as abandoned instead, so
 * the typed answer is kept but the scheduler doesn't move.
 *
 * Attempts post when you leave the results screen, not when grading ends. That
 * way an override is just an edit to something unsent, and each item gets
 * exactly one attempt with the grade you agreed with. See OLLAMA_GRADING.md G1.
 * flushAttempts is idempotent and runs on every exit path (unmount, pagehide).
 *
 * Phases: setup -> quiz -> grading -> results.
 *
 * Results can also pull an item you got right out of rotation. That's a
 * per-user suspension (item_suspensions), not the shared items.retired column.
 * It shrinks candidatePool here and is enforced by Drill's /queue; the exam
 * simulator ignores it. FSRS state is left alone, so "Reset deck" restores
 * everything as it was.
 *
 * Props:
 *   course   - which course's item bank to sample.
 *   onExit() - return to the course topic list.
 */
export default function PracticeView({ course, onExit }) {
  const [topics, setTopics] = useState(null); // null = loading
  const [error, setError] = useState(null);
  const [phase, setPhase] = useState("setup"); // setup | quiz | grading | results

  const [selectedTopicIds, setSelectedTopicIds] = useState(null); // null = everything, not customized yet
  const [selectedDifficulties, setSelectedDifficulties] = useState(null);
  const [selectedFormats, setSelectedFormats] = useState(null);
  const [sessionLength, setSessionLength] = useState(20);

  const [deck, setDeck] = useState([]);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState({}); // itemId -> { choiceIndex?, text? }, survives Back/Next
  const [gradedCount, setGradedCount] = useState(0);
  const [results, setResults] = useState([]); // { item, grade, verdict, criteriaMet, rationale, answerText?, choiceIndex? }

  const [suspendedIds, setSuspendedIds] = useState(() => new Set());
  const [suspendError, setSuspendError] = useState(null);

  const itemStartedAtRef = useRef({ itemId: null, startedAt: null });
  const timeSpentByItemId = useRef({});
  const tabBlursByItemId = useRef({});

  // What flushAttempts reads. resultsRef mirrors `results` because the unmount
  // cleanup has empty deps and would close over a stale array. submittedRef
  // keeps the flush idempotent since a few exits can race.
  const resultsRef = useRef([]);
  const submittedRef = useRef(true);

  const { host, model, codeModel } = useOllamaSettings();

  // Same flag DrillView/ExamView set to hide Shell's tab bar (CSS lives in
  // index.html). Cleared on unmount so any exit path restores it.
  useEffect(() => {
    document.body.dataset.drillActive = "true";

    // React cleanup doesn't run when the tab or Electron window closes, and
    // since attempts are held until you leave results, that would drop a whole
    // session. pagehide is the one event that fires on a real close, and
    // keepalive lets the requests outlive the page.
    const onPageHide = () => flushAttempts({ keepalive: true });
    window.addEventListener("pagehide", onPageHide);

    return () => {
      window.removeEventListener("pagehide", onPageHide);
      delete document.body.dataset.drillActive;
      // Catch-all for leaving Practice some way that isn't one of its own
      // buttons (course tab switch, App unmounting this). Refs only, state is
      // already gone here.
      flushAttempts();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    getTopics()
      .then((all) => {
        if (!cancelled) setTopics(all);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      });
    // Kept out of the setError path above on purpose: a failed suspensions read
    // shouldn't block studying. Worst case a few parked items show up again.
    getSuspensions()
      .then(({ itemIds }) => {
        if (!cancelled) setSuspendedIds(new Set(itemIds));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // Page Visibility as an honesty aid, same as Drill/Exam. Tracked per item
  // here since Practice lets you revisit questions.
  useEffect(() => {
    function onVisibility() {
      if (document.hidden && phase === "quiz") {
        const id = deck[index]?.id;
        if (id != null) tabBlursByItemId.current[id] = (tabBlursByItemId.current[id] ?? 0) + 1;
      }
    }
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [phase, deck, index]);

  // Reuses the module-level getTopics cache Home/TopicView already hit.
  // buildTopic() in server/routes/topics.js already sends format, difficulty,
  // verifiedByHuman and retired per item, so no extra endpoint is needed.
  const candidatePool = topics
    ? topics
        .filter((t) => !course || t.course === course)
        .flatMap((t) => (t.items ?? []).map((it) => ({ ...it, topicTitle: t.title })))
        .filter((it) => it.verifiedByHuman && !it.retired && !suspendedIds.has(it.id))
    : [];

  const topicOptions = [];
  const seenTopics = new Set();
  for (const it of candidatePool) {
    if (!seenTopics.has(it.topicId)) {
      seenTopics.add(it.topicId);
      topicOptions.push([it.topicId, it.topicTitle]);
    }
  }

  const activeTopicIds = selectedTopicIds ?? new Set(topicOptions.map(([id]) => id));
  const activeDifficulties = selectedDifficulties ?? new Set([1, 2, 3]);
  const activeFormats = selectedFormats ?? new Set(Object.values(FORMATS));

  const filteredPool = candidatePool.filter(
    (it) => activeTopicIds.has(it.topicId) && activeDifficulties.has(it.difficulty) && activeFormats.has(it.format)
  );

  const writeCount = filteredPool.filter((it) => it.format === FORMATS.WRITE).length;
  const writeCapApplies = writeCount > MAX_WRITE_PER_SESSION && writeCount < filteredPool.length;
  const cappedPoolSize = writeCapApplies ? filteredPool.length - (writeCount - MAX_WRITE_PER_SESSION) : filteredPool.length;

  function toggleTopic(id) {
    setSelectedTopicIds((prev) => {
      const next = new Set(prev ?? topicOptions.map(([tid]) => tid));
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }
  function toggleDifficulty(value) {
    setSelectedDifficulties((prev) => {
      const next = new Set(prev ?? [1, 2, 3]);
      next.has(value) ? next.delete(value) : next.add(value);
      return next;
    });
  }
  function toggleFormat(f) {
    setSelectedFormats((prev) => {
      const next = new Set(prev ?? Object.values(FORMATS));
      next.has(f) ? next.delete(f) : next.add(f);
      return next;
    });
  }

  function launchDeck(items) {
    const newDeck = shuffle(items);
    setDeck(newDeck);
    setAnswers({});
    setIndex(0);
    timeSpentByItemId.current = {};
    tabBlursByItemId.current = {};
    itemStartedAtRef.current = { itemId: newDeck[0]?.id ?? null, startedAt: Date.now() };
    setResults([]);
    resultsRef.current = [];
    submittedRef.current = true; // nothing pending until this deck is graded
    setGradedCount(0);
    setPhase("quiz");
  }

  function startPractice() {
    // Cap first, then slice. Capping after the slice would turn a 20-item deck
    // that happened to draw eight WRITEs into a 15-item session; trimming the
    // pool first lets the slice backfill with other formats. applyWriteCap
    // no-ops when WRITE is the only format left, which is how "WRITE only"
    // stays uncapped.
    const capped = applyWriteCap(shuffle(filteredPool));
    const sampled = sessionLength === "all" ? capped : capped.slice(0, sessionLength);
    launchDeck(sampled);
  }

  /** Adds the time spent on the current item to its accumulator before nav. */
  function flushTime() {
    const cur = itemStartedAtRef.current;
    if (cur.itemId != null) {
      const elapsed = Math.max(0, Math.round((Date.now() - cur.startedAt) / 1000));
      timeSpentByItemId.current[cur.itemId] = (timeSpentByItemId.current[cur.itemId] ?? 0) + elapsed;
    }
  }

  function goTo(nextIndex) {
    flushTime();
    setIndex(nextIndex);
    itemStartedAtRef.current = { itemId: deck[nextIndex]?.id ?? null, startedAt: Date.now() };
  }

  function setChoice(itemId, choiceIndex) {
    setAnswers((prev) => ({ ...prev, [itemId]: { ...prev[itemId], choiceIndex } }));
  }
  function setText(itemId, text) {
    setAnswers((prev) => ({ ...prev, [itemId]: { ...prev[itemId], text } }));
  }

  const answeredCount = deck.filter((it) => {
    const a = answers[it.id];
    if (!a) return false;
    return it.format === FORMATS.MCQ ? a.choiceIndex != null : Boolean(a.text?.trim());
  }).length;

  /**
   * Post the session's attempts once. Fire-and-forget on purpose: every caller
   * is the user leaving results, and blocking that on a round trip feels
   * broken. submitAllAndFinish already swallows per-item failures.
   */
  function flushAttempts({ keepalive = false } = {}) {
    if (submittedRef.current) return;
    submittedRef.current = true;
    submitAllAndFinish(resultsRef.current, { keepalive });
  }

  /**
   * Logs every item through the existing attempts endpoint. mode "closed"
   * throughout — Practice is closed-book, same as Drill, which is exactly why
   * `surface: "practice"` rides along: the two were indistinguishable in the
   * log until it existed (server/schema.sql, `item_attempts.surface`).
   */
  async function submitAllAndFinish(finalResults, { keepalive = false } = {}) {
    const submissions = finalResults.map((r) => {
      const seconds = timeSpentByItemId.current[r.item.id] ?? 0;
      const tabBlurs = tabBlursByItemId.current[r.item.id] ?? 0;
      const note = r.answerText?.trim() || undefined;
      return r.grade == null
        ? postDrillAttempt({ itemId: r.item.id, mode: "closed", surface: "practice", note, seconds, tabBlurs, abandoned: true }, { keepalive }).catch(() => {})
        : postDrillAttempt({ itemId: r.item.id, mode: "closed", surface: "practice", grade: r.grade, note, seconds, tabBlurs }, { keepalive }).catch(() => {});
    });
    await Promise.all(submissions);
  }

  async function submitQuiz() {
    flushTime();
    setPhase("grading");
    setGradedCount(0);

    const mcqResults = deck
      .filter((it) => it.format === FORMATS.MCQ)
      .map((item) => {
        const choiceIndex = answers[item.id]?.choiceIndex ?? null;
        const grade = choiceIndex === item.answerIndex ? 2 : 0;
        return { item, grade, verdict: grade >= 2 ? "correct" : "incorrect", criteriaMet: [], rationale: null, choiceIndex };
      });

    const collected = [...mcqResults];
    setResults(collected);
    setGradedCount(collected.length);

    // Blank free-text answers never go to Ollama, just grade 0.
    const toGrade = [];
    for (const item of deck.filter((it) => it.format !== FORMATS.MCQ)) {
      const text = (answers[item.id]?.text ?? "").trim();
      if (!text) {
        collected.push({ item, grade: 0, verdict: "incorrect", criteriaMet: [], rationale: "No answer submitted.", answerText: "" });
      } else {
        toGrade.push({ item, answerText: text });
      }
    }
    setResults([...collected]);
    setGradedCount(collected.length);

    // One item per call. Small local models grade fine per question but fall
    // apart juggling several. Also matters for the model routing below, since
    // chunkModel reads chunk[0]'s format.
    const CHUNK_SIZE = 1;
    for (let i = 0; i < toGrade.length; i += CHUNK_SIZE) {
      const chunk = toGrade.slice(i, i + CHUNK_SIZE);
      // WRITE/TRACE/ERROR go to the coder model. Tested this directly (see the
      // CODE_FORMATS comment in itemSchema.js): a same-size generalist judges
      // code noticeably worse even at temperature 0.
      const chunkModel = CODE_FORMATS.has(chunk[0].item.format) ? codeModel : model;
      let chunkResults;
      try {
        const res = await postPracticeGradeBatch({
          items: chunk.map((c) => ({ itemId: c.item.id, answer: c.answerText })),
          model: chunkModel,
          host,
        });
        chunkResults = res.results;
      } catch (err) {
        // The request itself failed, so we never reached the server at all.
        // Different from the server's own fail-open path, hence the different
        // wording; blaming Ollama here would be wrong.
        const reason = `Couldn't reach SkillTape's own server${err?.message ? ` (${err.message})` : ""}.`;
        chunkResults = chunk.map((c) => ({ itemId: c.item.id, grade: null, verdict: "ungraded", criteriaMet: [], rationale: null, reason }));
      }
      const merged = chunk.map((c) => {
        const r = chunkResults.find((x) => x.itemId === c.item.id) ?? {
          grade: null,
          verdict: "ungraded",
          criteriaMet: [],
          rationale: null,
          // Only happens if the server replied without this item, so there's no
          // server-supplied reason to pass along.
          reason: "The grader didn't return a result for this item.",
        };
        return {
          item: c.item,
          answerText: c.answerText,
          grade: r.grade,
          verdict: r.verdict,
          criteriaMet: r.criteriaMet ?? [],
          rationale: r.rationale ?? null,
          reason: r.reason ?? null,
        };
      });
      collected.push(...merged);
      setResults([...collected]);
      setGradedCount(collected.length);
    }

    // Nothing is submitted here. Holding attempts until you leave results is
    // what makes an override an edit rather than a correction, so each item is
    // logged once with the grade you agreed with. flushAttempts handles every
    // exit, unmount included.
    resultsRef.current = collected;
    submittedRef.current = false;
    setPhase("results");
  }

  /** Cancel mid-quiz. Nothing was graded, so there's nothing to log. Chip picks are kept. */
  function abandonQuiz() {
    setDeck([]);
    setAnswers({});
    setPhase("setup");
  }

  function backToSetup() {
    flushAttempts();
    setDeck([]);
    setAnswers({});
    setResults([]);
    setPhase("setup");
  }

  function retryMissed() {
    // Flush first: launchDeck clears results, and the retry deck logs its own
    // attempts, so the first sitting has to be banked before rebuilding.
    flushAttempts();
    const missed = orderedResults.filter((r) => r.verdict !== "correct").map((r) => r.item);
    if (missed.length === 0) {
      setPhase("setup");
      return;
    }
    launchDeck(missed);
  }

  /** Leave Practice from results. Unmount would flush anyway, but doing it here keeps the order obvious. */
  function exitPractice() {
    flushAttempts();
    onExit();
  }

  /**
   * Replace the grader's verdict with your own on the same 0-3 scale DrillView
   * uses. Nothing has been posted yet, so this is an edit, not a correction.
   *
   * Works on ungraded results too, which is the case that matters most: an
   * Ollama outage would otherwise log the item as abandoned and move nothing.
   */
  function overrideGrade(itemId, grade) {
    const verdict = grade >= 2 ? "correct" : grade === 1 ? "partial" : "incorrect";
    const apply = (list) => list.map((r) => (r.item.id === itemId ? { ...r, grade, verdict, overridden: true } : r));
    resultsRef.current = apply(resultsRef.current);
    setResults(apply);
  }

  // suspensions
  // All three writes are optimistic: the set updates first so buttons feel
  // instant, and a failure rolls back to the snapshot taken beforehand.
  // Restoring the snapshot (instead of undoing one change) is what keeps a
  // failed bulk remove from leaving half the cards marked.

  function applySuspensions(nextIds, request) {
    const previous = suspendedIds;
    setSuspendedIds(nextIds);
    setSuspendError(null);
    request().catch((err) => {
      setSuspendedIds(previous);
      setSuspendError(err.message);
    });
  }

  function suspendItems(itemIds) {
    // POST is INSERT OR IGNORE server-side, but filtering here keeps the count
    // honest and skips the request when it's a no-op.
    const ids = itemIds.filter((id) => !suspendedIds.has(id));
    if (ids.length === 0) return;
    const next = new Set(suspendedIds);
    for (const id of ids) next.add(id);
    applySuspensions(next, () => postSuspensions(ids));
  }

  function unsuspendItem(itemId) {
    const next = new Set(suspendedIds);
    next.delete(itemId);
    applySuspensions(next, () => deleteSuspension(itemId));
  }

  function resetDeck() {
    if (suspendedIds.size === 0) return;
    applySuspensions(new Set(), clearSuspensions);
  }

  const orderedResults = deck.map((it) => results.find((r) => r.item.id === it.id)).filter(Boolean);

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

  // loading / error

  if (error) {
    return (
      <PracticeShell onEnd={onExit} label="Exit">
        <Status text={error} tone="bad" />
      </PracticeShell>
    );
  }
  if (topics === null) {
    return (
      <PracticeShell onEnd={onExit} label="Exit">
        <Status text="loading curriculum…" />
      </PracticeShell>
    );
  }

  // setup

  if (phase === "setup") {
    return (
      <PracticeShell onEnd={onExit} label="Exit">
        <div style={{ background: PALETTE.panel, border: `1px solid ${PALETTE.line}`, borderRadius: RADII.lg, padding: 24, maxWidth: 720, margin: "0 auto" }}>
          <div style={{ fontFamily: MONO, fontSize: 13, color: PALETTE.muted, marginBottom: 8 }}>PRACTICE</div>
          <div style={{ fontFamily: HEADING, fontSize: 18, fontWeight: 500, marginBottom: 4 }}>
            Pick topics, difficulty, and format.
          </div>
          <p style={{ color: PALETTE.muted, fontSize: 13, lineHeight: 1.6, marginTop: 4, marginBottom: 18 }}>
            Answer the whole set with free navigation, then submit — everything is graded at once, MCQ instantly and
            everything else by the local Ollama model configured in Settings.
          </p>

          <SectionLabel>Topics</SectionLabel>
          <ChipRow>
            {topicOptions.map(([id, title]) => (
              <Chip key={id} active={activeTopicIds.has(id)} onClick={() => toggleTopic(id)}>
                {title}
              </Chip>
            ))}
          </ChipRow>

          <SectionLabel>Difficulty</SectionLabel>
          <ChipRow>
            {DIFFICULTY_LEVELS.map(([value, label]) => (
              <Chip key={value} active={activeDifficulties.has(value)} onClick={() => toggleDifficulty(value)}>
                {label}
              </Chip>
            ))}
          </ChipRow>

          <SectionLabel>Format</SectionLabel>
          <ChipRow>
            {Object.values(FORMATS).map((f) => (
              <Chip key={f} active={activeFormats.has(f)} onClick={() => toggleFormat(f)}>
                {f.toUpperCase()}
              </Chip>
            ))}
          </ChipRow>

          <SectionLabel>Session length</SectionLabel>
          <ChipRow>
            {[[10, "10"], [20, "20"], [30, "30"], [1, "WRITE"]].map(([value, label]) => (
              <Chip key={label} active={sessionLength === value} onClick={() => setSessionLength(value)}>
                {label}
              </Chip>
            ))}
            <Chip active={sessionLength === "all"} onClick={() => setSessionLength("all")}>
              ALL
            </Chip>
          </ChipRow>

          <div style={{ fontFamily: MONO, fontSize: 12, color: PALETTE.muted, margin: "20px 0 14px" }}>
            {filteredPool.length} item{filteredPool.length === 1 ? "" : "s"} match this selection
            {writeCapApplies && (
              <div style={{ marginTop: 6 }}>
                max {MAX_WRITE_PER_SESSION} WRITE per session ({writeCount} available) — deselect every other format to
                drill WRITE on its own
              </div>
            )}
          </div>

          {/* Reset lives here as well as on results, otherwise putting items
              back would mean sitting through a whole session first. */}
          {suspendedIds.size > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", margin: "0 0 14px" }}>
              <span style={{ fontFamily: MONO, fontSize: 12, color: PALETTE.muted }}>
                {suspendedIds.size} item{suspendedIds.size === 1 ? "" : "s"} removed from circulation
              </span>
              <button onClick={resetDeck} style={navBtn}>
                Reset deck
              </button>
            </div>
          )}

          {suspendError && <SuspendError message={suspendError} />}

          <button
            onClick={startPractice}
            disabled={filteredPool.length === 0}
            style={{
              ...primaryBtn,
              padding: "10px 24px",
              fontSize: 14,
              opacity: filteredPool.length === 0 ? 0.5 : 1,
              cursor: filteredPool.length === 0 ? "default" : "pointer",
            }}
          >
            {filteredPool.length === 0
              ? "No items match this selection"
              : `Start ${Math.min(sessionLength === "all" ? cappedPoolSize : sessionLength, cappedPoolSize)} questions`}
          </button>
        </div>
      </PracticeShell>
    );
  }

  // quiz

  if (phase === "quiz") {
    const item = deck[index];
    return (
      <PracticeShell onEnd={abandonQuiz} label="Cancel">
        <div style={{ background: PALETTE.panel, border: `1px solid ${PALETTE.line}`, borderRadius: RADII.lg, padding: 20, maxWidth: 720, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontFamily: MONO, fontSize: 12, color: PALETTE.muted, marginBottom: 10 }}>
            <span>
              ITEM {index + 1} / {deck.length} · {item.format.toUpperCase()}
            </span>
            <span>
              {answeredCount} / {deck.length} answered
            </span>
          </div>
          <div style={{ height: 6, background: PALETTE.panel2, borderRadius: 4, overflow: "hidden", marginBottom: 18 }}>
            <div
              style={{
                height: "100%",
                width: `${deck.length ? (answeredCount / deck.length) * 100 : 0}%`,
                background: PALETTE.accent,
                transition: "width 200ms ease",
              }}
            />
          </div>

          <PromptBody prompt={item.prompt} style={{ fontSize: 16, lineHeight: 1.6, marginBottom: 20 }} />

          {item.format === FORMATS.MCQ ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
              {item.choices.map((choice, i) => {
                const picked = answers[item.id]?.choiceIndex === i;
                return (
                  <button
                    key={i}
                    onClick={() => setChoice(item.id, i)}
                    style={{
                      textAlign: "left",
                      fontFamily: MONO,
                      fontSize: 14,
                      padding: "11px 14px",
                      borderRadius: RADII.md,
                      border: `1px solid ${picked ? PALETTE.accent : PALETTE.line}`,
                      background: picked ? PALETTE.accentSoft : PALETTE.panel2,
                      color: PALETTE.text,
                      cursor: "pointer",
                    }}
                  >
                    <span style={{ color: PALETTE.muted, marginRight: 8 }}>{String.fromCharCode(65 + i)}</span>
                    {choice}
                  </button>
                );
              })}
            </div>
          ) : (
            <textarea
              value={answers[item.id]?.text ?? ""}
              onChange={(e) => setText(item.id, e.target.value)}
              placeholder="Type your answer. Code is fine."
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
                marginBottom: 20,
              }}
            />
          )}

          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => goTo(Math.max(0, index - 1))}
              disabled={index === 0}
              style={{ ...navBtn, opacity: index === 0 ? 0.4 : 1, cursor: index === 0 ? "default" : "pointer" }}
            >
              Back
            </button>
            <button
              onClick={() => goTo(Math.min(deck.length - 1, index + 1))}
              disabled={index === deck.length - 1}
              style={{ ...navBtn, opacity: index === deck.length - 1 ? 0.4 : 1, cursor: index === deck.length - 1 ? "default" : "pointer" }}
            >
              Next
            </button>
            <div style={{ flex: 1 }} />
            <button onClick={submitQuiz} style={primaryBtn}>
              Submit quiz
            </button>
          </div>
        </div>
      </PracticeShell>
    );
  }

  // grading

  if (phase === "grading") {
    return (
      <PracticeShell>
        <Status text={`Grading · ${gradedCount} / ${deck.length}`} />
      </PracticeShell>
    );
  }

  // results

  const correctCount = orderedResults.filter((r) => r.verdict === "correct").length;
  const partialCount = orderedResults.filter((r) => r.verdict === "partial").length;
  const ungradedCount = orderedResults.filter((r) => r.verdict === "ungraded").length;
  const missedCount = orderedResults.length - correctCount;

  // Partial counts as half toward the headline score. Every term is a whole
  // number or a multiple of .5, so the float math is exact and never needs
  // rounding.
  const scoreSum = correctCount + partialCount * 0.5;
  const scoreLabel = Number.isInteger(scoreSum) ? String(scoreSum) : scoreSum.toFixed(1);

  // A whole session failing to grade is one cause, not N, and every item ends
  // up with the same reason string. Show it once up top, since per-card copy is
  // easy to skim past when every card says the same thing. If the reasons
  // differ, skip this and let the cards speak.
  const ungradedReasons = new Set(orderedResults.filter((r) => r.verdict === "ungraded" && r.reason).map((r) => r.reason));
  const sharedUngradedReason = ungradedReasons.size === 1 ? [...ungradedReasons][0] : null;

  // Only what this session got right and hasn't been parked already, so the
  // bulk button disappears once you've removed them one by one.
  const removableIds = orderedResults.filter((r) => r.verdict === "correct" && !suspendedIds.has(r.item.id)).map((r) => r.item.id);

  return (
    <div>
      <div style={{ background: PALETTE.panel, border: `1px solid ${PALETTE.line}`, borderRadius: RADII.lg, padding: 24, textAlign: "center", maxWidth: 680, margin: "0 auto 16px" }}>
        <div style={{ fontFamily: MONO, fontSize: 13, color: PALETTE.muted, marginBottom: 8 }}>PRACTICE RESULTS</div>
        <div style={{ fontFamily: HEADING, fontSize: 44, fontWeight: 500, color: PALETTE.accent }}>
          {scoreLabel}/{orderedResults.length}
        </div>
        <div style={{ display: "flex", justifyContent: "center", gap: 16, fontFamily: MONO, fontSize: 12, color: PALETTE.muted, margin: "10px 0 20px", flexWrap: "wrap" }}>
          <span>correct {correctCount}</span>
          <span>partial {partialCount}</span>
          <span>incorrect {orderedResults.length - correctCount - partialCount - ungradedCount}</span>
          {ungradedCount > 0 && <span style={{ color: PALETTE.bad }}>ungraded {ungradedCount}</span>}
        </div>
        {ungradedCount > 0 && sharedUngradedReason && (
          <div
            style={{
              border: `1px solid ${PALETTE.bad}`,
              borderRadius: RADII.md,
              padding: "10px 14px",
              margin: "0 0 16px",
              fontFamily: MONO,
              fontSize: 12,
              lineHeight: 1.5,
              color: PALETTE.bad,
              textAlign: "left",
              // Keeps a pull command or host URL copyable without breaking
              // mid-token, while the sentence around it still wraps.
              wordBreak: "break-word",
            }}
          >
            {ungradedCount} {ungradedCount === 1 ? "answer" : "answers"} couldn't be graded — {sharedUngradedReason}
          </div>
        )}
        {/* Without this line, overriding looks like arguing with a number
            that's already been recorded. */}
        <div style={{ fontFamily: MONO, fontSize: 11, color: PALETTE.muted, lineHeight: 1.6, margin: "0 0 16px" }}>
          Disagree with a verdict? Override it on the card. Nothing is logged until you leave this screen.
        </div>

        {suspendError && <SuspendError message={suspendError} />}

        <div style={{ display: "flex", justifyContent: "center", gap: 10, flexWrap: "wrap" }}>
          {missedCount > 0 && (
            <button onClick={retryMissed} style={primaryBtn}>
              Retry {missedCount} missed
            </button>
          )}
          {removableIds.length > 0 && (
            <button onClick={() => suspendItems(removableIds)} style={primaryBtn}>
              Remove {removableIds.length} correct from deck
            </button>
          )}
          {suspendedIds.size > 0 && (
            <button onClick={resetDeck} style={navBtn}>
              Reset deck
            </button>
          )}
          <button onClick={backToSetup} style={navBtn}>
            Back to setup
          </button>
          <button onClick={exitPractice} style={navBtn}>
            Exit
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        {orderedResults.map((r) => (
          // Removing an item doesn't pull its card off this screen. These are
          // the answers you just gave and shouldn't rearrange under you. The
          // removal kicks in on the next deck, and the card says so.
          <ResultCard
            key={r.item.id}
            result={r}
            suspended={suspendedIds.has(r.item.id)}
            onSuspend={r.verdict === "correct" ? () => suspendItems([r.item.id]) : null}
            onUnsuspend={() => unsuspendItem(r.item.id)}
            onOverride={(grade) => overrideGrade(r.item.id, grade)}
          />
        ))}
      </div>
    </div>
  );
}

/** Shared frame with an optional escape hatch on top. Left out during grading, same as ExamView does. */
function PracticeShell({ onEnd, label = "Cancel", children }) {
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

/** The 0-3 scale, copied from DrillView's gradeBtns rather than shared, since the two rows are styled for different contexts. Index IS the grade FSRS gets. */
const GRADE_BUTTONS = [
  ["Again", PALETTE.bad],
  ["Hard", PALETTE.accent],
  ["Good", PALETTE.good],
  ["Easy", PALETTE.good],
];

/** Shown wherever a removal control lives when a suspension write fails. Same red box as the ungraded banner: the button lied about what's stored. */
function SuspendError({ message }) {
  return (
    <div
      style={{
        border: `1px solid ${PALETTE.bad}`,
        borderRadius: RADII.md,
        padding: "10px 14px",
        margin: "0 0 14px",
        fontFamily: MONO,
        fontSize: 12,
        lineHeight: 1.5,
        color: PALETTE.bad,
        textAlign: "left",
        wordBreak: "break-word",
      }}
    >
      Couldn't update the deck — {message}
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <div
      style={{
        fontFamily: HEADING,
        fontSize: 11,
        fontWeight: 500,
        letterSpacing: 1,
        textTransform: "uppercase",
        color: PALETTE.muted,
        margin: "16px 0 8px",
      }}
    >
      {children}
    </div>
  );
}

function ChipRow({ children }) {
  return <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>{children}</div>;
}

/** Same toggle-button styling already used in Home.jsx, TopicView.jsx and SettingsMenu.jsx. Hand-rolled here to match that precedent instead of extracting a shared component. */
function Chip({ active, onClick, children, title }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-pressed={active}
      style={{
        fontFamily: HEADING,
        fontSize: 12,
        padding: "7px 14px",
        borderRadius: RADII.md,
        cursor: "pointer",
        border: `1px solid ${active ? PALETTE.accent : PALETTE.line}`,
        background: active ? PALETTE.accentSoft : "transparent",
        color: active ? PALETTE.accent : PALETTE.text,
        fontWeight: 500,
      }}
    >
      {children}
    </button>
  );
}

/**
 * One result card: verdict badge, the question, what you typed, feedback, and
 * a collapsible reference answer with the criteria annotated.
 *
 * onSuspend is null for anything not graded correct, since parking an item is
 * a claim that you know it. onUnsuspend is always available so something
 * removed by the bulk button can be put back from its own card.
 *
 * onOverride is offered on every card including MCQ. MCQ grading is
 * deterministic, but the item itself can be wrong, and "the key is wrong and I
 * can't say so" is the worse failure.
 */
function ResultCard({ result, suspended = false, onSuspend = null, onUnsuspend = null, onOverride = null }) {
  const [showRef, setShowRef] = useState(false);
  const [showGrades, setShowGrades] = useState(false);
  const { item, verdict, grade, overridden, rationale, criteriaMet, answerText, choiceIndex, reason } = result;

  const color =
    verdict === "correct" ? PALETTE.good : verdict === "partial" ? PALETTE.accent : verdict === "ungraded" ? PALETTE.line : PALETTE.bad;

  const yourAnswer =
    item.format === FORMATS.MCQ
      ? choiceIndex != null
        ? `${String.fromCharCode(65 + choiceIndex)}. ${item.choices[choiceIndex]}`
        : "(no answer)"
      : answerText?.trim()
      ? answerText
      : "(no answer)";

  const feedback =
    item.format === FORMATS.MCQ
      ? verdict === "correct"
        ? "Correct."
        : choiceIndex == null
        ? "No option selected."
        : `Incorrect — the correct answer was "${item.choices[item.answerIndex]}".`
      : verdict === "ungraded"
      ? // reason comes from gradingFailureReason in server/routes/drill.js and
        // names the real cause. "Ollama isn't running" and "Ollama has no model
        // named X" need opposite fixes, and this card used to claim the first
        // for both. The fallback only hits results from older builds.
        `Auto-grade unavailable — ${reason ?? "Ollama didn't respond."} Compare against the reference answer below.`
      : rationale || "";

  return (
    <div
      style={{
        background: PALETTE.panel,
        border: `1px solid ${PALETTE.line}`,
        borderLeft: `3px solid ${color}`,
        borderRadius: RADII.md,
        padding: 18,
        marginBottom: 12,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
        <span style={{ fontFamily: MONO, fontSize: 11, color: PALETTE.muted, letterSpacing: 0.5 }}>
          {item.topicTitle?.toUpperCase()} · {item.format.toUpperCase()}
        </span>
        <span style={{ fontFamily: HEADING, fontSize: 11, color, letterSpacing: 0.5, fontWeight: 500 }}>
          {verdict.toUpperCase()}
          {overridden && <span style={{ color: PALETTE.muted, fontWeight: 400 }}> · YOUR GRADE</span>}
        </span>
      </div>

      <PromptBody prompt={item.prompt} style={{ fontSize: 15, lineHeight: 1.6, marginBottom: 12 }} />

      <div style={{ fontFamily: MONO, fontSize: 11, color: PALETTE.muted, marginBottom: 4 }}>YOUR ANSWER</div>
      <div
        style={{
          fontSize: 14,
          lineHeight: 1.6,
          padding: "10px 12px",
          borderRadius: RADII.md,
          background: PALETTE.panel2,
          border: `1px solid ${PALETTE.line}`,
          whiteSpace: "pre-wrap",
          marginBottom: 10,
          fontFamily: item.format === FORMATS.WRITE || item.format === FORMATS.TRACE ? MONO : "inherit",
        }}
      >
        {yourAnswer}
      </div>

      {feedback && (
        <p style={{ color: overridden ? PALETTE.muted : color, fontSize: 13, lineHeight: 1.6, margin: "0 0 12px" }}>
          {/* Kept after an override, just dimmed and labelled, since it's now
              the losing opinion rather than the card's verdict. */}
          {overridden && <span style={{ fontFamily: MONO, fontSize: 11 }}>GRADER SAID: </span>}
          {feedback}
        </p>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        <button
          onClick={() => setShowRef((s) => !s)}
          style={{ fontFamily: HEADING, fontSize: 11, color: PALETTE.accent, background: "transparent", border: "none", cursor: "pointer", padding: 0, letterSpacing: 0.5 }}
        >
          {showRef ? "HIDE REFERENCE ANSWER" : "SHOW REFERENCE ANSWER"}
        </button>

        {suspended ? (
          <button
            onClick={onUnsuspend}
            title="Put this item back into Practice and Drill rotation"
            style={{ fontFamily: HEADING, fontSize: 11, color: PALETTE.muted, background: "transparent", border: "none", cursor: "pointer", padding: 0, letterSpacing: 0.5 }}
          >
            REMOVED FROM DECK · UNDO
          </button>
        ) : (
          onSuspend && (
            <button
              onClick={onSuspend}
              title="Stop showing this item in Practice and Drill. Reset deck brings it back."
              style={{ fontFamily: HEADING, fontSize: 11, color: PALETTE.accent, background: "transparent", border: "none", cursor: "pointer", padding: 0, letterSpacing: 0.5 }}
            >
              REMOVE FROM DECK
            </button>
          )
        )}

        {onOverride && (
          <button
            onClick={() => setShowGrades((s) => !s)}
            title="Disagree with this verdict? Set the grade yourself. Nothing is logged until you leave this screen."
            style={{ fontFamily: HEADING, fontSize: 11, color: PALETTE.accent, background: "transparent", border: "none", cursor: "pointer", padding: 0, letterSpacing: 0.5 }}
          >
            {showGrades ? "CANCEL" : overridden ? "CHANGE GRADE" : "OVERRIDE GRADE"}
          </button>
        )}
      </div>

      {onOverride && showGrades && (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontFamily: MONO, fontSize: 11, color: PALETTE.muted, marginBottom: 8 }}>
            YOUR GRADE — replaces the verdict above, and is what gets logged
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {/* Same labels and colors as DrillView's self-grade row, on the
                0-3 scale server/fsrs.js consumes. */}
            {GRADE_BUTTONS.map(([label, gradeColor], g) => {
              const picked = grade === g;
              return (
                <button
                  key={label}
                  onClick={() => {
                    onOverride(g);
                    setShowGrades(false);
                  }}
                  style={{
                    fontFamily: HEADING,
                    fontSize: 12,
                    padding: "7px 16px",
                    borderRadius: RADII.md,
                    cursor: "pointer",
                    border: `1px solid ${gradeColor}`,
                    background: picked ? PALETTE.accentSoft : "transparent",
                    color: gradeColor,
                    fontWeight: 500,
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {showRef && (
        <div style={{ marginTop: 10 }}>
          <div
            style={{
              fontSize: 14,
              lineHeight: 1.6,
              padding: "12px 14px",
              borderRadius: RADII.md,
              background: PALETTE.panel2,
              borderLeft: `3px solid ${PALETTE.accent}`,
              whiteSpace: "pre-wrap",
              marginBottom: 10,
            }}
          >
            {item.expected}
          </div>
          {item.criteria?.length > 0 && (
            <ul style={{ margin: 0, padding: "0 0 0 20px", fontSize: 13, color: PALETTE.muted, lineHeight: 1.8 }}>
              {item.criteria.map((c, i) => (
                <li key={i} style={{ color: criteriaMet[i] === true ? PALETTE.good : criteriaMet[i] === false ? PALETTE.bad : PALETTE.muted }}>
                  {criteriaMet[i] === true ? "✓ " : criteriaMet[i] === false ? "✗ " : ""}
                  <Inline text={c} />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
