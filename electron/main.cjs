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
const { fork, spawn } = require("node:child_process");
const path = require("node:path");
const http = require("node:http");
const fs = require("node:fs");
const os = require("node:os");

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

function pipeOutput(child, label) {
  if (child.stdout) {
    child.stdout.on("data", (d) => process.stdout.write("[" + label + "] " + d));
  }
  if (child.stderr) {
    child.stderr.on("data", (d) => process.stderr.write("[" + label + "] " + d));
  }
}

function runToCompletion(child, label) {
  return new Promise((resolve, reject) => {
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(label + " exited with code " + code));
      }
    });
  });
}

async function startBackend() {

  const seed = forkScript(path.join(ROOT, "server", "seed.js"), childEnv);
  pipeOutput(seed, "seed");
  await runToCompletion(seed, "seed");

  serverProcess = forkScript(path.join(ROOT, "server", "index.js"), childEnv);
  pipeOutput(serverProcess, "server");

  await waitForServer("http://" + HOST + ":" + PORT + "/api/health");
}

// ---------------------------------------------------------------------------
// Local Ollama
// ---------------------------------------------------------------------------
//
// Practice grading (server/routes/drill.js) posts to a local Ollama server and
// FAILS OPEN when it can't reach one: every answer comes back "ungraded", with
// no error shown anywhere in the UI. That silence is deliberate there — a dead
// grader must never block a study session — but it means the overwhelmingly
// common cause, "nobody started Ollama", looks like a grading bug instead of a
// missing process. Starting it here removes that failure entirely.
//
// Started from THIS process specifically, so it lands on the same OS the app
// runs on. A WSL Ollama and a Windows Ollama both answer on 127.0.0.1:11434
// and are completely invisible to each other, so "is one running somewhere on
// this machine" is the wrong question — only this process's own loopback
// counts, and it's the one we probe and bind.
//
// Best-effort throughout: not installed, not on PATH, slow to bind, already
// running under someone else — all of it logs and moves on. Ollama is an
// optional dependency and grading already degrades gracefully without it, so
// nothing in here is allowed to fail a launch.

const OLLAMA_ORIGIN = (() => {
  // Mirrors server/ollama.js's DEFAULT_HOST, including the OLLAMA_HOST
  // override, so we probe and start whatever the server will actually call.
  const configured = process.env.OLLAMA_HOST?.trim();
  if (configured) {
    try {
      return new URL(configured).origin;
    } catch {
      /* not a URL — fall through to the default, same as the server does */
    }
  }
  return "http://127.0.0.1:11434";
})();

const OLLAMA_READY_TIMEOUT_MS = 20000;

// Set ONLY when this process spawned Ollama itself. An Ollama that was already
// running belongs to the user (or to a system service) and must survive us —
// stopOllama checks this, never the port.
let ollamaProcess = null;

function isLoopbackOrigin(origin) {
  try {
    const { hostname } = new URL(origin);
    return hostname === "localhost" || hostname === "[::1]" || /^127(\.\d{1,3}){3}$/.test(hostname);
  } catch {
    return false;
  }
}

/**
 * Resolves true/false, never rejects — "is Ollama serving its API at OLLAMA_ORIGIN".
 *
 * A 5xx counts as NOT ready, not merely as "answered": Ollama binds its port
 * before it finishes discovering GPUs and answers /api/tags with a 500 for a
 * few hundred ms in between (observed on a cold start here). Treating that as
 * ready would have this function return while the very next call could still
 * fail — polling through it costs one extra 250ms tick.
 */
function probeOllama({ timeoutMs = 1500 } = {}) {
  return new Promise((resolve) => {
    const req = http.get(`${OLLAMA_ORIGIN}/api/tags`, (res) => {
      res.resume();
      resolve(res.statusCode >= 200 && res.statusCode < 500);
    });
    req.setTimeout(timeoutMs, () => req.destroy());
    req.on("error", () => resolve(false));
  });
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// A bare name first (found via PATH), then the per-OS install locations. The
// absolute fallbacks are the load-bearing half: a GUI-launched app inherits a
// minimal PATH — on macOS and Linux it typically does NOT include /usr/local/bin
// or a user-local bin dir — so PATH-only lookup works when you launch from a
// terminal and silently fails from the desktop icon, which is how the app is
// actually started.
function ollamaCandidates() {
  const home = os.homedir();
  if (process.platform === "win32") {
    const localAppData = process.env.LOCALAPPDATA || path.join(home, "AppData", "Local");
    return ["ollama.exe", path.join(localAppData, "Programs", "Ollama", "ollama.exe")];
  }
  if (process.platform === "darwin") {
    return [
      "ollama",
      "/opt/homebrew/bin/ollama",
      "/usr/local/bin/ollama",
      "/Applications/Ollama.app/Contents/Resources/ollama",
    ];
  }
  return [
    "ollama",
    "/usr/local/bin/ollama",
    "/usr/bin/ollama",
    path.join(home, ".local", "bin", "ollama"),
    path.join(home, "ollama", "bin", "ollama"),
  ];
}

async function startOllama() {
  if (!isLoopbackOrigin(OLLAMA_ORIGIN)) {
    // A remote OLLAMA_HOST is someone else's server to run, not ours to spawn.
    log.info(`[ollama] ${OLLAMA_ORIGIN} is not loopback — not starting one locally`);
    return;
  }

  if (await probeOllama()) {
    log.info(`[ollama] already running at ${OLLAMA_ORIGIN}`);
    return;
  }

  for (const bin of ollamaCandidates()) {
    // Absolute candidates are checked first so a missing one costs no spawn;
    // the bare name has to be attempted, since only PATH can resolve it.
    if (path.isAbsolute(bin) && !fs.existsSync(bin)) continue;

    const child = spawn(bin, ["serve"], {
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });

    // ENOENT (not on PATH) arrives here asynchronously, not as a throw.
    let spawnError = null;
    child.once("error", (err) => {
      spawnError = err;
    });
    pipeOutput(child, "ollama");

    const deadline = Date.now() + OLLAMA_READY_TIMEOUT_MS;
    while (Date.now() < deadline) {
      await delay(250);
      if (spawnError) break;
      // Exited on its own — most often "address already in use" from a race
      // with another launcher, which the probe below still resolves happily.
      const exited = child.exitCode !== null || child.signalCode !== null;
      if (await probeOllama()) {
        if (!exited) {
          ollamaProcess = child;
          log.info(`[ollama] started via ${bin} at ${OLLAMA_ORIGIN}`);
        } else {
          log.info(`[ollama] ${OLLAMA_ORIGIN} came up under another process — leaving it alone`);
        }
        return;
      }
      if (exited) break;
    }

    log.info(`[ollama] ${bin} did not come up${spawnError ? `: ${spawnError.message}` : ""}`);
    try {
      child.kill();
    } catch {
      /* already gone */
    }
  }

  // The one case worth a warning rather than an info: the app works, but every
  // Practice answer will come back "ungraded" until Ollama is installed/started.
  log.warn(
    `[ollama] no local Ollama found or started — Practice grading will report "ungraded" until one is running at ${OLLAMA_ORIGIN}`
  );
}

// Only ever kills an Ollama this process started (see ollamaProcess). Worth
// doing rather than leaking it: the grading model is ~6GB resident in VRAM,
// held for server/ollama.js's KEEP_ALIVE window after the last call.
function stopOllama({ timeoutMs = 2000 } = {}) {
  const proc = ollamaProcess;
  ollamaProcess = null;
  if (!proc || proc.killed || proc.exitCode !== null) return Promise.resolve();

  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      try {
        proc.kill("SIGKILL");
      } catch {
        /* already gone */
      }
      resolve();
    }, timeoutMs);
    proc.once("exit", () => {
      clearTimeout(timer);
      resolve();
    });
    try {
      proc.kill();
    } catch {
      clearTimeout(timer);
      resolve();
    }
  });
}


const ICON_PATH = path.join(ROOT, "build", "icons", "256x256.png");

// Old installs cached index.html before the no-store header existed and
// will serve it from disk forever. Clearing on launch is the only way the
// fix reaches them. Cheap since everything is local.
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

// Both children, in parallel — Ollama is a separate process tree with no
// handles inside the install directory, so it has no bearing on the NSIS
// handoff that stopBackend's own comment is about.
function shutdown() {
  return Promise.all([stopBackend(), stopOllama()]);
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
    await shutdown();
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
      // Deliberately not awaited: a cold Ollama takes a couple of seconds to
      // bind, and grading isn't called until the user has actually answered
      // something. Blocking the window on it would trade a real delay at every
      // launch for a saved second on an optional feature.
      startOllama().catch((err) => log.warn("[ollama] startup failed:", err));
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
    shutdown().finally(() => app.quit());
  });
}
