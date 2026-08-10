import { useCallback, useEffect, useState } from "react";
import { getSchedulerSettings, putSchedulerSettings, getSchedulerImpact } from "../api/client";

/**
 * The four FSRS parameters.
 *
 * Server side, unlike useTheme and useOllamaSettings. These are inputs to a
 * calculation that runs on the server, so a copy in the browser would be a
 * second source of truth for something only one side can act on.
 */
export default function useSchedulerSettings() {
  const [settings, setSettings] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    getSchedulerSettings()
      .then((s) => {
        if (!cancelled) setSettings(s);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  /** Resolves with the saved set, including `rescheduled`: how many due dates the change moved. */
  const save = useCallback(async (patch) => {
    setSaving(true);
    setError(null);
    try {
      const saved = await putSchedulerSettings(patch);
      setSettings(saved);
      return saved;
    } catch (e) {
      setError(e.message);
      throw e;
    } finally {
      setSaving(false);
    }
  }, []);

  /** Asked before saving, so a confirmation can name the number of cards it would move. */
  const impact = useCallback(() => {
    return getSchedulerImpact()
      .then((r) => r.scheduledCards)
      .catch(() => 0);
  }, []);

  return { settings, save, impact, saving, error };
}
