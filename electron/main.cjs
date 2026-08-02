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
const { app, BrowserWindow } = require("electron");
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

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  mainWindow.loadURL(`http://${HOST}:${PORT}/`);
}

function stopBackend() {
  if (serverProcess && !serverProcess.killed) {
    serverProcess.kill();
    serverProcess = null;
  }
}

// Two copies of this app fighting over one SQLite file is a real failure
// mode a browser tab never had — refuse a second instance outright and just
// focus the existing window instead.
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(async () => {
    try {
      await startBackend();
      createWindow();
    } catch (err) {
      console.error("Failed to start backend:", err);
      app.quit();
    }

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on("window-all-closed", () => {
    stopBackend();
    if (process.platform !== "darwin") app.quit();
  });

  app.on("before-quit", stopBackend);
}
