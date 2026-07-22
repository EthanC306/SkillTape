import { useEffect, useState } from "react";

const STORAGE_KEY = "cppquiz:progress";

async function loadProgress() {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    }
  } catch (_) { }
  return {};
}

async function saveProgress(progress) {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    }
  } catch (_) { }
}

/**
 * useProgress — quiz progress persisted to localStorage, keyed by topic id.
 *
 * Loads once on mount, and returns:
 *   progress   — { [topicId]: { best, total, runs, history } }
 *   recordRun  — call after a quiz finishes to save a new attempt.
 */
export default function useProgress() {
  const [progress, setProgress] = useState({});

  useEffect(() => {
    loadProgress().then(setProgress);
  }, []);

  function recordRun(id, correct, total, results) {
    setProgress((prev) => {
      const prevBest = prev[id]?.best ?? -1;
      const prevHistory = prev[id]?.history ?? [];
      const entry = { correct, total, results, date: Date.now() };
      const next = {
        ...prev,
        [id]: {
          best: Math.max(prevBest, correct),
          total,
          runs: (prev[id]?.runs ?? 0) + 1,
          history: [...prevHistory, entry].slice(-50),
        },
      };
      saveProgress(next);
      return next;
    });
  }

  return { progress, recordRun };
}
