import React, { useEffect, useRef, useState } from "react";
import { PALETTE, MONO, HEADING, RADII } from "../data/theme";
import { FORMATS, DIFFICULTY_LEVELS, CODE_FORMATS } from "../data/itemSchema";
import { getTopics, postDrillAttempt, postPracticeGradeBatch } from "../api/client";
import useOllamaSettings from "../hooks/useOllamaSettings";
import shuffle from "../utils/shuffle";

/**
 * PracticeView — a selective, batch-graded companion to DrillView
 * (docs/OLLAMA_GRADING.md). Additive: DrillView's FSRS-due-queue, one-item-
 * at-a-time, self-graded flow is unchanged and still owns the daily habit
 * loop. Practice is for "give me N questions on topics/difficulty I choose,
 * right now" — pick topics/difficulty/format/count, answer the whole deck
 * with free Back/Next navigation, then everything is graded at once: MCQ
 * instantly client-side, everything else by a local Ollama model
 * (server/ollama.js) via POST /api/drill/grade-batch, one item per call —
 * small local models degrade fast juggling several items in one prompt, so
 * this trades round-trips for judgment quality.
 *
 * Every graded item is logged through the same POST /api/drill/attempts
 * DrillView/ExamView use, mode: "closed" — server/fsrs.js's scheduleReview
 * takes a bare 0-3 grade and has no idea where it came from, so a session
 * built this way still feeds the FSRS scheduler and the closed-book
 * first-try accuracy dashboard exactly like a Drill session would. An item
 * Ollama couldn't grade (unreachable, bad response) is logged with
 * abandoned: true instead — the typed answer isn't lost, but nothing moves
 * the scheduler, since no real grade was ever confirmed.
 *
 * Five phases: setup (topic/difficulty/format/count chips) -> quiz (free
 * navigation, nothing revealed) -> grading (batch calls, a progress
 * counter) -> results (per-item verdict, feedback, collapsible reference).
 *
 * Props:
 *   course   — which course's item bank to sample.
 *   onExit() — return to the course topic list.
 */
export default function PracticeView({ course, onExit }) {
  const [topics, setTopics] = useState(null); // null = loading
  const [error, setError] = useState(null);
  const [phase, setPhase] = useState("setup"); // setup | quiz | grading | results

  const [selectedTopicIds, setSelectedTopicIds] = useState(null); // null = "everything" (not yet customized)
  const [selectedDifficulties, setSelectedDifficulties] = useState(null);
  const [selectedFormats, setSelectedFormats] = useState(null);
  const [sessionLength, setSessionLength] = useState(20);

  const [deck, setDeck] = useState([]);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState({}); // itemId -> { choiceIndex?, text? }, never cleared by Back/Next
  const [gradedCount, setGradedCount] = useState(0);
  const [results, setResults] = useState([]); // { item, grade, verdict, criteriaMet, rationale, answerText?, choiceIndex? }

  const itemStartedAtRef = useRef({ itemId: null, startedAt: null });
  const timeSpentByItemId = useRef({});
  const tabBlursByItemId = useRef({});

  const { host, model, codeModel } = useOllamaSettings();

  // Same shared chrome-hiding flag DrillView/ExamView use (index.html's CSS
  // hides Shell's tab bar for as long as this attribute is set), cleared on
  // unmount so leaving Practice by any path restores it.
  useEffect(() => {
    document.body.dataset.drillActive = "true";
    return () => {
      delete document.body.dataset.drillActive;
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
    return () => {
      cancelled = true;
    };
  }, []);

  // Page Visibility as an honesty aid, attributed to whichever item is on
  // screen — same stance as DrillView/ExamView, just per-item since Practice
  // allows revisiting items instead of a single current one.
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

  // getTopics() is the same module-level cache Home/TopicView already fetch
  // — buildTopic() (server/routes/topics.js) already serializes everything
  // needed to build this picker (format/difficulty/verifiedByHuman/retired
  // per item), so no new "counts" or "filtered sampling" endpoint is needed.
  const candidatePool = topics
    ? topics
        .filter((t) => !course || t.course === course)
        .flatMap((t) => (t.items ?? []).map((it) => ({ ...it, topicTitle: t.title })))
        .filter((it) => it.verifiedByHuman && !it.retired)
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
    setGradedCount(0);
    setPhase("quiz");
  }

  function startPractice() {
    const sampled = sessionLength === "all" ? shuffle(filteredPool) : shuffle(filteredPool).slice(0, sessionLength);
    launchDeck(sampled);
  }

  /** Credits elapsed time on whichever item was on screen into the per-item accumulator, before navigating away from it. */
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

  /** Every item Practice sent to Ollama or graded locally, logged via the existing, unmodified attempts endpoint. mode: "closed" throughout — see the file header. */
  async function submitAllAndFinish(finalResults) {
    const submissions = finalResults.map((r) => {
      const seconds = timeSpentByItemId.current[r.item.id] ?? 0;
      const tabBlurs = tabBlursByItemId.current[r.item.id] ?? 0;
      const note = r.answerText?.trim() || undefined;
      return r.grade == null
        ? postDrillAttempt({ itemId: r.item.id, mode: "closed", note, seconds, tabBlurs, abandoned: true }).catch(() => {})
        : postDrillAttempt({ itemId: r.item.id, mode: "closed", grade: r.grade, note, seconds, tabBlurs }).catch(() => {});
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

    // Blank free-text answers never go to Ollama — grade 0 directly.
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

    // One item per Ollama call, not a batch — small local models grade
    // reliably per-question but degrade fast juggling several at once. Also
    // load-bearing for per-format model routing right below: chunkModel
    // reads chunk[0]'s format, which is only correct because a chunk is
    // exactly one item.
    const CHUNK_SIZE = 1;
    for (let i = 0; i < toGrade.length; i += CHUNK_SIZE) {
      const chunk = toGrade.slice(i, i + CHUNK_SIZE);
      // WRITE/TRACE/ERROR items go to the coder model, not the general one —
      // verified directly (see itemSchema.js's CODE_FORMATS comment) that a
      // same-size generalist model judges code correctness meaningfully
      // worse than a coder-tuned one, even at temperature 0.
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
        // Whole request failed (not just a graded-as-ungraded response from
        // the server, which already fails open on its own) — every item in
        // this chunk falls back the same way. Distinct from the server's own
        // fail-open reasons: this one never reached the server at all, so it
        // says so rather than blaming Ollama for something upstream of it.
        const reason = `Couldn't reach SkillTape's own server${err?.message ? ` (${err.message})` : ""}.`;
        chunkResults = chunk.map((c) => ({ itemId: c.item.id, grade: null, verdict: "ungraded", criteriaMet: [], rationale: null, reason }));
      }
      const merged = chunk.map((c) => {
        const r = chunkResults.find((x) => x.itemId === c.item.id) ?? {
          grade: null,
          verdict: "ungraded",
          criteriaMet: [],
          rationale: null,
          // Only reachable if the server answered without this item at all —
          // no server-supplied reason exists to pass through here.
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

    await submitAllAndFinish(collected);
    setPhase("results");
  }

  /** Cancel mid-quiz: nothing was graded yet, so there's nothing meaningful to log per item — just discard and go back to setup, chip picks kept. */
  function abandonQuiz() {
    setDeck([]);
    setAnswers({});
    setPhase("setup");
  }

  function backToSetup() {
    setDeck([]);
    setAnswers({});
    setResults([]);
    setPhase("setup");
  }

  function retryMissed() {
    const missed = orderedResults.filter((r) => r.verdict !== "correct").map((r) => r.item);
    if (missed.length === 0) {
      setPhase("setup");
      return;
    }
    launchDeck(missed);
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

  // ── loading / error ──────────────────────────────────────────────────────

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

  // ── setup ────────────────────────────────────────────────────────────────

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
            {[10, 20, 30].map((n) => (
              <Chip key={n} active={sessionLength === n} onClick={() => setSessionLength(n)}>
                {n}
              </Chip>
            ))}
            <Chip active={sessionLength === "all"} onClick={() => setSessionLength("all")}>
              ALL
            </Chip>
          </ChipRow>

          <div style={{ fontFamily: MONO, fontSize: 12, color: PALETTE.muted, margin: "20px 0 14px" }}>
            {filteredPool.length} item{filteredPool.length === 1 ? "" : "s"} match this selection
          </div>

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
              : `Start ${Math.min(sessionLength === "all" ? filteredPool.length : sessionLength, filteredPool.length)} questions`}
          </button>
        </div>
      </PracticeShell>
    );
  }

  // ── quiz ─────────────────────────────────────────────────────────────────

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

          <div style={{ fontSize: 16, lineHeight: 1.6, whiteSpace: "pre-wrap", marginBottom: 20 }}>{item.prompt}</div>

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

  // ── grading ──────────────────────────────────────────────────────────────

  if (phase === "grading") {
    return (
      <PracticeShell>
        <Status text={`Grading · ${gradedCount} / ${deck.length}`} />
      </PracticeShell>
    );
  }

  // ── results ──────────────────────────────────────────────────────────────

  const correctCount = orderedResults.filter((r) => r.verdict === "correct").length;
  const partialCount = orderedResults.filter((r) => r.verdict === "partial").length;
  const ungradedCount = orderedResults.filter((r) => r.verdict === "ungraded").length;
  const missedCount = orderedResults.length - correctCount;

  // Partial credit counts as .5 toward the headline score — a "partial" isn't
  // a zero, it's half of one. (Exact in floating point: every term here is a
  // whole number or a whole number of .5s, so this never needs rounding.)
  const scoreSum = correctCount + partialCount * 0.5;
  const scoreLabel = Number.isInteger(scoreSum) ? String(scoreSum) : scoreSum.toFixed(1);

  // When a whole session fails to grade it's one cause, not N — every item
  // carries the same reason string. Surfaced once here, at the top, because
  // the per-card copy is easy to read past when EVERY card says it, which is
  // exactly the case where the reason matters most. Distinct reasons across
  // items (a per-item contract miss alongside a real outage) leave this out
  // and let the cards speak for themselves.
  const ungradedReasons = new Set(orderedResults.filter((r) => r.verdict === "ungraded" && r.reason).map((r) => r.reason));
  const sharedUngradedReason = ungradedReasons.size === 1 ? [...ungradedReasons][0] : null;

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
              // A pull command or a host URL must stay copyable and unwrapped
              // mid-token, but the sentence around it still has to wrap.
              wordBreak: "break-word",
            }}
          >
            {ungradedCount} {ungradedCount === 1 ? "answer" : "answers"} couldn't be graded — {sharedUngradedReason}
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "center", gap: 10, flexWrap: "wrap" }}>
          {missedCount > 0 && (
            <button onClick={retryMissed} style={primaryBtn}>
              Retry {missedCount} missed
            </button>
          )}
          <button onClick={backToSetup} style={navBtn}>
            Back to setup
          </button>
          <button onClick={onExit} style={navBtn}>
            Exit
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        {orderedResults.map((r) => (
          <ResultCard key={r.item.id} result={r} />
        ))}
      </div>
    </div>
  );
}

/** Shared frame: an optional escape hatch above whatever's showing — omitted entirely during grading, matching ExamView's stance of not interrupting a brief async step. */
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

/** Active/inactive toggle-button formula already used identically in Home.jsx, TopicView.jsx, and SettingsMenu.jsx — hand-rolled here rather than promoted to a shared component, matching this codebase's existing precedent for this exact visual pattern. */
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

/** One graded-result card: verdict color/badge, the question, what was typed, feedback, and a collapsible reference answer with criteria annotated from the model's own per-criterion judgments. */
function ResultCard({ result }) {
  const [showRef, setShowRef] = useState(false);
  const { item, verdict, rationale, criteriaMet, answerText, choiceIndex, reason } = result;

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
      ? // The reason comes from the server (gradingFailureReason in
        // server/routes/drill.js) and names the actual cause — "Ollama isn't
        // running" and "Ollama has no model named X" have opposite fixes, and
        // this card used to claim the first one for both. The generic fallback
        // only applies to results from a build older than that field.
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
        <span style={{ fontFamily: HEADING, fontSize: 11, color, letterSpacing: 0.5, fontWeight: 500 }}>{verdict.toUpperCase()}</span>
      </div>

      <div style={{ fontSize: 15, lineHeight: 1.6, whiteSpace: "pre-wrap", marginBottom: 12 }}>{item.prompt}</div>

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

      {feedback && <p style={{ color, fontSize: 13, lineHeight: 1.6, margin: "0 0 12px" }}>{feedback}</p>}

      <button
        onClick={() => setShowRef((s) => !s)}
        style={{ fontFamily: HEADING, fontSize: 11, color: PALETTE.accent, background: "transparent", border: "none", cursor: "pointer", padding: 0, letterSpacing: 0.5 }}
      >
        {showRef ? "HIDE REFERENCE ANSWER" : "SHOW REFERENCE ANSWER"}
      </button>

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
                  {c}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
