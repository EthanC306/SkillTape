import { useEffect, useState } from "react";

/**
 * useUpdater — the Electron shell's auto-update state, as the renderer sees it.
 *
 * Returns { status, version, percent, error, appVersion, restart }, where
 * status is one of:
 *   idle | checking | available | downloading | ready | error | unsupported
 *
 * "unsupported" covers both non-Electron hosts (the Vite dev server, Docker,
 * any plain browser — `window.skilltape` simply isn't there) and unpacked
 * Electron runs, where electron-updater refuses to check at all. Callers can
 * treat it as one thing: there is no update loop here, render nothing.
 *
 * The mount sequence is pull-then-subscribe on purpose. Update events fire from
 * the main process as soon as the window exists, which on a fast check is
 * before React has mounted — a subscribe-only hook would miss "available" and
 * the early "download-progress" events entirely and sit at idle through a live
 * download. getState() closes that gap; onState() carries everything after.
 */
export default function useUpdater() {
  const [state, setState] = useState({
    status: "unsupported",
    version: null,
    percent: 0,
    error: null,
  });
  const [appVersion, setAppVersion] = useState(null);

  useEffect(() => {
    const bridge = window.skilltape;
    if (!bridge) return;

    let alive = true;
    bridge.updater.getState().then((s) => {
      if (alive) setState(s);
    });
    bridge.getVersion().then((v) => {
      if (alive) setAppVersion(v);
    });

    const unsubscribe = bridge.updater.onState((s) => setState(s));
    return () => {
      alive = false;
      unsubscribe();
    };
  }, []);

  return {
    ...state,
    appVersion,
    restart: () => window.skilltape?.updater.quitAndInstall(),
  };
}
