import { useCallback, useEffect, useState } from "react";
import { getTopics, invalidateTopics } from "../api/client";

/**
 * useTopics — the curriculum, loaded from the API.
 *
 * Replaces the old `import curriculum from "./data/curriculum"`. The content is
 * identical; it just arrives over HTTP now, which means callers have to cope
 * with `topics` being empty on the first render.
 *
 * Returns { topics, loading, error, reload }.
 */
export default function useTopics() {
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Split in two on purpose. `fetchInto` is the work and RESOLVES when the
  // topics are in state; `load` is the effect body and returns a cleanup
  // function. Collapsing them, as this once did, made reload() return that
  // cleanup function — so `await reload()` in App's saveContent awaited a
  // function, resolved instantly, and reported "saved ✓" while the refetch it
  // was supposed to be waiting for was still in flight.
  const fetchInto = useCallback((isCancelled) => {
    setLoading(true);
    setError(null);
    return getTopics()
      .then((data) => {
        if (!isCancelled()) setTopics(data);
      })
      .catch((e) => {
        if (!isCancelled()) {
          setError(e.message);
          // Don't leave a rejected promise cached — otherwise every later
          // getTopics() replays the same failure and Retry can never work.
          invalidateTopics();
        }
      })
      .finally(() => {
        if (!isCancelled()) setLoading(false);
      });
  }, []);

  const load = useCallback(() => {
    let cancelled = false;
    fetchInto(() => cancelled);
    return () => {
      cancelled = true;
    };
  }, [fetchInto]);

  useEffect(load, [load]);

  /**
   * Refetch from the server, bypassing the cache. Used after an edit saves —
   * and awaited there, which is why this returns the fetch's own promise. It is
   * deliberately not cancellable: a save's refetch has to land, or the editor
   * keeps showing a draft the database has already moved past.
   */
  const reload = useCallback(() => {
    invalidateTopics();
    return fetchInto(() => false);
  }, [fetchInto]);

  return { topics, loading, error, reload };
}
