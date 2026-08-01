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

  const load = useCallback(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getTopics()
      .then((data) => {
        if (!cancelled) setTopics(data);
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e.message);
          // Don't leave a rejected promise cached — otherwise every later
          // getTopics() replays the same failure and Retry can never work.
          invalidateTopics();
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(load, [load]);

  /** Refetch from the server, bypassing the cache. Used after an edit saves. */
  const reload = useCallback(() => {
    invalidateTopics();
    return load();
  }, [load]);

  return { topics, loading, error, reload };
}
