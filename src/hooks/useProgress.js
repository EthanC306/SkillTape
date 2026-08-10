import { useEffect, useState } from "react";
import { getProgress, postAttempts } from "../api/client";

// Legacy localStorage key from before progress moved to the SQL `attempts`
// table (server/routes/progress.js). Only read once, by the importer below.
const STORAGE_KEY = "cppquiz:progress";
// Marks the one-time import done so it doesn't repeat on every load once the
// legacy key itself is gone (or if importing it failed and it's still there).
const IMPORTED_KEY = "cppquiz:progress:imported";

// React.StrictMode (main.jsx) double-invokes mount effects in dev — calling
// the async importLocalHistory() twice back to back, synchronously, before
// either call's first `await` yields. Both would pass the IMPORTED_KEY check
// below (it isn't set until every POST finishes) and double-import every
// run. A plain module-level flag closes that window: it's set synchronously
// before the first await, so StrictMode's second call sees it immediately.
// It intentionally does NOT replace IMPORTED_KEY — that one still governs
// real reloads/retries across page loads; this only dedupes within one.
let importStarted = false;

/**
 * One-time importer — existing users have real quiz history sitting in
 * localStorage["cppquiz:progress"] that must not be silently discarded now
 * that progress is backed by SQL. POSTs each historical run to
 * /api/attempts, then removes the legacy key so it never reimports.
 *
 * Old history entries only ever recorded booleans (no question ids of any
 * kind), so every imported result is sent with questionId: null and no
 * questionStableId — those columns are nullable for exactly this case. That
 * history genuinely cannot say which question was answered, and no later
 * change can recover it (docs/STABLE_QUESTION_IDS.md).
 *
 * Deliberately simple, not robust: if a POST fails partway (API down, one bad
 * run), the whole import is left to retry from scratch next load rather than
 * tracked per-run. That risks re-posting runs that already succeeded on a
 * flaky connection, but this is a one-time migration, not a sync engine.
 */
async function importLocalHistory() {
  if (importStarted) return;
  importStarted = true;

  if (typeof window === "undefined" || !window.localStorage) return;
  if (window.localStorage.getItem(IMPORTED_KEY)) return;

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    window.localStorage.setItem(IMPORTED_KEY, "1");
    return;
  }

  let old;
  try {
    old = JSON.parse(raw);
  } catch {
    // Unreadable — nothing to import, don't keep retrying forever.
    window.localStorage.setItem(IMPORTED_KEY, "1");
    return;
  }

  for (const [topicId, entry] of Object.entries(old || {})) {
    for (const run of entry?.history ?? []) {
      const results = (run.results || []).map((r) => ({
        questionId: null,
        correct: Boolean(r),
      }));
      if (results.length === 0) continue;
      await postAttempts({ topicId, runId: crypto.randomUUID(), results });
    }
  }

  window.localStorage.setItem(IMPORTED_KEY, "1");
  window.localStorage.removeItem(STORAGE_KEY);
}

export default function useProgress() {
  const [progress, setProgress] = useState({});

  useEffect(() => {
    importLocalHistory()
      .catch(() => {}) // best-effort; a failed import just retries next load
      .then(() => getProgress())
      .then(setProgress)
      .catch(() => {}); // API unreachable — same "just show nothing" as the old code
  }, []);

  /**
   * recordRun(topicId, correct, total, results) — the exact call QuizView has
   * always made: `onFinish(topic.id, correctCount, questions.length, runResults)`.
   * `results` is now an array of
   * `{ questionId, questionStableId, questionRevision, correct }`
   * (QuizView.jsx), not bare booleans — this is where they turn into the POST
   * body and into the flattened boolean array `history[n].results` that
   * HistoryModal.jsx and Home.jsx read (they only check truthiness per entry).
   *
   * Updates local state optimistically so the results screen, Home, and
   * HistoryModal reflect the new run immediately, then reconciles against the
   * server's own aggregation — the actual source of truth once persisted.
   */
  async function recordRun(topicId, correct, total, results) {
    const runId = crypto.randomUUID();
    const booleans = results.map((r) => r.correct);

    setProgress((prev) => {
      const prevBest = prev[topicId]?.best ?? -1;
      const prevHistory = prev[topicId]?.history ?? [];
      const entry = { correct, total, results: booleans, date: Date.now() };
      return {
        ...prev,
        [topicId]: {
          best: Math.max(prevBest, correct),
          total,
          runs: (prev[topicId]?.runs ?? 0) + 1,
          history: [...prevHistory, entry].slice(-50),
        },
      };
    });

    try {
      await postAttempts({
        topicId,
        runId,
        results: results.map((r) => ({
          questionId: r.questionId ?? null,
          questionStableId: r.questionStableId ?? null,
          questionRevision: r.questionRevision ?? null,
          correct: r.correct,
        })),
      });
      // Refetch so server-side aggregation reconciles the optimistic guess
      // above (e.g. another tab having written a run in between).
      setProgress(await getProgress());
    } catch (err) {
      // The optimistic update above already reflects the run locally; a
      // failed write just means it won't survive a reload — matches the old
      // code's silence on storage failures rather than surfacing a toast.
      console.error("Failed to save quiz attempt:", err);
    }
  }

  return { progress, recordRun };
}
