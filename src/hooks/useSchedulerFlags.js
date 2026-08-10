import { useState } from "react";

const STRIP_KEY = "skilltape:scheduler:strip";
const INSPECTOR_KEY = "skilltape:scheduler:inspector";

/**
 * The two visual scheduler toggles. localStorage rather than the server,
 * unlike useSchedulerSettings, because neither one changes a scheduling
 * decision.
 *
 *   dueStrip  off restores the previous home screen exactly.
 *   inspector the diagnostics row under each Drill item.
 */
export default function useSchedulerFlags() {
  // Absent key and explicit "1" both have to read as on, so this tests against
  // "0" rather than for truthiness.
  const [dueStrip, setStripState] = useState(() => localStorage.getItem(STRIP_KEY) !== "0");
  const [inspector, setInspectorState] = useState(() => localStorage.getItem(INSPECTOR_KEY) === "1");

  function setDueStrip(on) {
    localStorage.setItem(STRIP_KEY, on ? "1" : "0");
    setStripState(on);
  }

  function setInspector(on) {
    localStorage.setItem(INSPECTOR_KEY, on ? "1" : "0");
    setInspectorState(on);
  }

  return { dueStrip, inspector, setDueStrip, setInspector };
}
