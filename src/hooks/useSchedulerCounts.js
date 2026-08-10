import { useCallback, useEffect, useState } from "react";
import { getDrillCounts } from "../api/client";

/**
 * Due / learning / new counts for one course, plus the per-topic breakdown.
 *
 * Home calls `refresh` when a Drill session ends, which is the whole point of
 * the strip: finish a session, come back, watch the number drop.
 *
 * Failure is silent. These counts decorate a screen that works without them,
 * so a dead server should not replace the topic grid with an error.
 */
export default function useSchedulerCounts(course) {
  const [counts, setCounts] = useState(null);

  const refresh = useCallback(() => {
    if (!course) return Promise.resolve();
    return getDrillCounts(course)
      .then(setCounts)
      .catch(() => setCounts(null));
  }, [course]);

  useEffect(() => {
    if (!course) return undefined;
    let cancelled = false;

    getDrillCounts(course)
      .then((c) => {
        if (!cancelled) setCounts(c);
      })
      .catch(() => {
        if (!cancelled) setCounts(null);
      });

    return () => {
      cancelled = true;
    };
  }, [course]);

  return { counts, refresh };
}
