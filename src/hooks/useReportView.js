import { useCallback, useEffect, useState } from "react";
import { getReportView, putReportView } from "../api/client";

/**
 * Which reading the Report's Stats tab opens in: "grid" or "sessions".
 *
 * Server side, unlike useTheme, useSchedulerFlags and useOllamaSettings, which
 * are the app's other display preferences. Those are per-device by nature (a
 * theme belongs to the screen you are looking at); this is a statement about
 * how you want to read your own history, and it should follow the history
 * rather than the browser profile. See the ui_settings comment in schema.sql.
 *
 * Starts at "grid" and updates once the stored value arrives, so the panel
 * always has something to render — a null here would mean a loading spinner on
 * a tab that already has its data.
 *
 * The write is optimistic and its failure is deliberately swallowed: the toggle
 * has already done the thing you asked (the view switched), and the only cost
 * of a failed save is that next time it opens the other way. Surfacing an
 * error banner over a working panel for that would be worse than the bug.
 */
export default function useReportView() {
  const [view, setViewState] = useState("grid");

  useEffect(() => {
    let cancelled = false;
    getReportView()
      .then((r) => {
        if (!cancelled && (r.view === "grid" || r.view === "sessions")) setViewState(r.view);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const setView = useCallback((next) => {
    setViewState(next);
    putReportView(next).catch(() => {});
  }, []);

  return [view, setView];
}
