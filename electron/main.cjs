// Electron main process.
//
// .cjs (not .js) is deliberate: package.json has "type": "module", and
// mixing that with Electron's main-process expectations is an easy way to
// hit ESM/CJS edge cases. Naming this file .cjs makes it unambiguously
// CommonJS regardless of the package-level setting.
//
// This process does three things: reseeds the DB (idempotent, see
// server/seed.js), starts the existing Express API as a child process, and
// opens a window pointed at it. server/index.js is untouched as a runnable
// script — it's spawned, not imported — so `node server/index.js` (the dev
// and Docker path) keeps working exactly as before.
//
// ELECTRON VERSION FLOOR — Electron >=35 is required, not just "latest".
// better-sqlite3's prebuilt native addon is compiled with NAPI_VERSION=10,
// which needs Node 22's N-API surface (process.versions.napi === 10).
// Electron <=34 bundles Node 20 (napi === 9); loading the addon there
// doesn't error cleanly — it segfaults the moment the addon initializes,
// inside better-sqlite3's own native code, not this app's. Confirmed via
// strace: SIGSEGV right after the addon's shared libs resolve, on Electron
// 32 and 34; clean load and a working DB round-trip on Electron 36. Same
// constraint the Dockerfile already documents for plain Node ("Node 22,
// not 20") — this is that same requirement showing up again here.
const { app, BrowserWindow, ipcMain, session } = require("electron");
const { autoUpdater } = require("electron-updater");
const log = require("electron-log");
const { fork } = require("node:child_process");
const path = require("node:path");
const http = require("node:http");

const ROOT = path.join(__dirname, "..");
const PORT = "3001";
const HOST = "127.0.0.1";

// Real per-OS user-data directory (e.g. ~/.config/SkillTape on Linux), not
// the repo's own db/ folder — there is no "repo" once this is installed.
const dbPath = path.join(app.getPath("userData"), "skilltape.db");

const childEnv = {
  ...process.env,
  // Runs the forked script under Electron's own bundled Node instead of
  // requiring a system Node install — the whole point of packaging this.
  ELECTRON_RUN_AS_NODE: "1",
  SKILLTAPE_DB: dbPath,
  PORT,
  HOST,
};

let serverProcess = null;
let mainWindow = null;

function forkScript(scriptPath, env) {
  return fork(scriptPath, {
    execPath: process.execPath,
    env,
    stdio: ["ignore", "pipe", "pipe", "ipc"],
  });
}

// Polls /api/health (server/index.js already exposes this) instead of
// guessing a startup delay — the server's actual readiness, not a timer.
function waitForServer(url, { intervalMs = 150, timeoutMs = 15000 } = {}) {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    (function attempt() {
      const req = http.get(url, (res) => {
        res.resume();
        resolve();
      });
      req.on("error", () => {
        if (Date.now() > deadline) {
          reject(new Error(`Server never became ready at ${url}`));
        } else {
          setTimeout(attempt, intervalMs);
        }
      });
    })();
  });
}

async function startBackend() {
  // Reseed on every launch — cheap and idempotent (upserts), and it's the
  // only way a packaged app's content ever gets into a fresh install's DB;
  // there's no terminal here to run `npm run db:seed` from by hand.
  const seed = forkScript(path.join(ROOT, "server", "seed.js"), childEnv);
  seed.stdout?.on("data", (d) => process.stdout.write(`[seed] ${d}`));
  seed.stderr?.on("data", (d) => process.stderr.write(`[seed] ${d}`));
  await new Promise((resolve, reject) => {
    seed.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Seed process exited with code ${code}`));
    });
  });

  serverProcess = forkScript(path.join(ROOT, "server", "index.js"), childEnv);
  serverProcess.stdout?.on("data", (d) => process.stdout.write(`[server] ${d}`));
  serverProcess.stderr?.on("data", (d) => process.stderr.write(`[server] ${d}`));

  await waitForServer(`http://${HOST}:${PORT}/api/health`);
}

// The same PNG electron-builder packages from (see electron-builder.yml).
// ROOT resolves inside the asar when packaged and to the repo in dev, so one
// path covers both. This is what the WINDOW and its taskbar entry show while
// the app is running — on Windows and macOS that's cosmetic (the shell takes
// its icon from the .exe / .app bundle, which electron-builder stamps at
// package time), but on Linux nothing sets a window icon for you, so without
// this the running app falls back to Electron's own default logo.
// 256 rather than the 1254x1254 master: it is the largest size any window
// manager actually asks for, and it is 39 kB instead of 850 kB.
const ICON_PATH = path.join(ROOT, "build", "icons", "256x256.png");

// RECOVERY PATH for caches that are already poisoned. server/index.js now
// sends `no-store` on index.html, which stops this happening again — but that
// header only helps a client that actually asks. An install carrying a
// heuristically-cached 1.0.1 index.html from BEFORE the fix will keep serving
// it from disk without ever hitting the server, so the fix alone would never
// reach the machines that need it. Clearing on launch guarantees the first
// request after an update is a real one.
//
// Unconditional rather than version-gated on purpose: the whole frontend is
// served from 127.0.0.1 off the local disk, so a cold cache costs a few
// milliseconds of re-read and nothing else. There is no network fetch to
// re-pay for, which is what would normally make clearing every launch a bad
// trade.
async function createWindow() {
  try {
    await session.defaultSession.clearCache();
  } catch (err) {
    // Never fatal: a window with a cold cache is strictly better than no
    // window, and the no-store headers make the stale-shell bug unreachable
    // on any client that does reach the server.
    log.warn("[startup] could not clear HTTP cache:", err);
  }

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: ICON_PATH,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  mainWindow.loadURL(`http://${HOST}:${PORT}/`);
}

// Deterministic, not fire-and-forget — and that matters specifically because of
// the updater. autoInstallOnAppQuit hands off to the NSIS installer on
// Electron's `quit` event, which fires AFTER `before-quit`. If the forked
// SkillTape.exe (running server/index.js under ELECTRON_RUN_AS_NODE) is still
// alive at that moment it holds open file handles inside the install directory,
// and NSIS either fails or silently leaves a half-replaced install behind.
// So: signal, wait for the actual `exit`, and escalate to SIGKILL rather than
// assuming .kill() took effect.
function stopBackend({ timeoutMs = 2000 } = {}) {
  const proc = serverProcess;
  serverProcess = null;
  if (!proc || proc.killed || proc.exitCode !== null) return Promise.resolve();

  return new Promise((resolve) => {
    const done = () => {
      clearTimeout(timer);
      resolve();
    };
    const timer = setTimeout(() => {
      log.warn("[shutdown] backend did not exit in time — SIGKILL");
      try {
        proc.kill("SIGKILL");
      } catch {
        /* already gone */
      }
      resolve();
    }, timeoutMs);
    proc.once("exit", done);
    try {
      proc.kill();
    } catch {
      done();
    }
  });
}

// ---------------------------------------------------------------------------
// Auto-update
// ---------------------------------------------------------------------------
//
// Polls the GitHub release feed named by the `publish` block in
// electron-builder.yml, downloads anything newer in the background, and
// installs it on quit. Unpacked runs (npm run electron:dev) skip the check
// entirely — app.isPackaged is false, so electron-updater logs "Skip
// checkForUpdates" and returns null. Seeing nothing happen in dev is correct,
// not a broken config; the state below reports that as "unsupported" so it
// reads as a deliberate skip instead of a silent no-op.
//
// One object is the single source of truth for the whole feature. Every event
// handler mutates it and then pushes the same shape to the renderer, so the
// banner can never disagree with the main process about what's happening.
const RECHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;

// status: idle | checking | available | downloading | ready | error | unsupported
const updateState = {
  status: "idle",
  version: null,
  percent: 0,
  error: null,
};

function pushState(patch) {
  Object.assign(updateState, patch);
  // `?.` throughout: an update event can land after the window is gone (quit
  // races the final download), and a destroyed webContents throws on send.
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("updater:state", { ...updateState });
  }
}

function initUpdater() {
  // Writes to %APPDATA%\SkillTape\logs\main.log (~/.config/SkillTape/logs on
  // Linux). Non-negotiable for a packaged Windows app: there is no console to
  // read, so without this a failed update is completely undiagnosable — which
  // is half of why this feature went unnoticed-broken for as long as it did.
  log.transports.file.level = "info";
  autoUpdater.logger = log;

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  if (!app.isPackaged) {
    pushState({ status: "unsupported" });
    log.info("[updater] unpacked run — update checks are skipped");
    return;
  }

  autoUpdater.on("checking-for-update", () => pushState({ status: "checking", error: null }));
  autoUpdater.on("update-available", (info) =>
    pushState({ status: "available", version: info?.version ?? null, percent: 0 })
  );
  autoUpdater.on("update-not-available", () => pushState({ status: "idle", percent: 0 }));
  autoUpdater.on("download-progress", (p) =>
    pushState({ status: "downloading", percent: Math.round(p?.percent ?? 0) })
  );
  autoUpdater.on("update-downloaded", (info) =>
    pushState({ status: "ready", version: info?.version ?? updateState.version, percent: 100 })
  );

  // A failed update check is the ORDINARY case here, not an exotic one —
  // launching offline is enough to trigger it. electron-updater reports the
  // failure twice: it emits "error" AND rejects the promise returned by
  // checkForUpdates(). An EventEmitter with no "error" listener rethrows, and
  // an unhandled rejection can take down the main process, so both this
  // listener and the .catch() in runCheck() are load-bearing — without them a
  // launch with no network could kill an otherwise working app.
  autoUpdater.on("error", (err) => {
    pushState({ status: "error", error: err?.message ?? String(err) });
  });

  runCheck();
  setInterval(runCheck, RECHECK_INTERVAL_MS);
}

function runCheck() {
  // Re-checking mid-download restarts the differential download from scratch,
  // and re-checking after "ready" would drop a staged install on the floor.
  if (updateState.status === "downloading" || updateState.status === "ready") return;
  autoUpdater.checkForUpdates().catch(() => {
    // Already surfaced by the "error" listener above; swallowed here only so
    // the rejection doesn't surface as an unhandled one.
  });
}

function registerUpdaterIpc() {
  // RACE FIX, not a convenience: on a fast check the "update-available" and
  // "download-progress" events fire before the renderer has even finished
  // mounting, so a subscribe-only banner would sit silently empty through the
  // entire download. The renderer pulls current state on mount and subscribes
  // for everything after it.
  ipcMain.handle("updater:getState", () => ({ ...updateState }));

  ipcMain.handle("updater:quitAndInstall", async () => {
    await stopBackend();
    autoUpdater.quitAndInstall();
  });

  ipcMain.handle("app:getVersion", () => app.getVersion());
}

// Two copies of this app fighting over one SQLite file is a real failure
// mode a browser tab never had — refuse a second instance outright and just
// focus the existing window instead.
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  // Must be set before whenReady. On Windows this is what ties the running
  // process to the Start-menu shortcut electron-builder's NSIS installer
  // creates; without it the taskbar treats a relaunched-after-update app as a
  // different application and update notifications lose their identity.
  app.setAppUserModelId("com.skilltape.app");

  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  registerUpdaterIpc();

  app.whenReady().then(async () => {
    try {
      await startBackend();
      await createWindow();
      initUpdater();
    } catch (err) {
      log.error("Failed to start backend:", err);
      app.quit();
    }

    app.on("activate", () => {
      // Floating promise by design — "activate" handlers can't be awaited,
      // and createWindow swallows its own cache-clear failure.
      if (BrowserWindow.getAllWindows().length === 0) void createWindow();
    });
  });

  app.on("window-all-closed", () => {
    // No stopBackend() here — app.quit() fires before-quit, which owns the
    // shutdown. On macOS the app stays resident with its backend alive, so the
    // "activate" handler above can reopen a window against a running server.
    if (process.platform !== "darwin") app.quit();
  });

  // The backend shutdown has to actually COMPLETE before Electron emits `quit`,
  // because that is when electron-updater runs the NSIS installer
  // (autoInstallOnAppQuit). before-quit is synchronous, so the only way to wait
  // is to cancel this quit, stop the backend, and quit again — `quitting`
  // guards against the loop that would otherwise create.
  let quitting = false;
  app.on("before-quit", (event) => {
    if (quitting) return;
    quitting = true;
    event.preventDefault();
    stopBackend().finally(() => app.quit());
  });
}
