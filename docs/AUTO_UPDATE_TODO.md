# TODO: Working auto-update for SkillTape (Electron + GitHub releases)

> **Status: planned, not implemented.** Written 2026-08-06. Diagnosis below is
> verified against the live GitHub API and against the vendored
> `electron-updater` / `electron-publish` source — it is not speculation. Nothing
> in "Changes" has been written yet; `electron/main.cjs`, `electron/preload.cjs`,
> `electron-builder.yml`, and `index.html` are still in the pre-fix state
> described here. Pick this up by working through "Changes" 1-9 in order.
>
> The uncommitted working-tree edits at the time of writing (version bump to
> `1.0.1`, `releaseType: release` in `electron-builder.yml`, the purple smoke-test
> bar in `index.html`) are **superseded** by this plan — see Changes 1 and 7.

## Context

The app ships `electron-updater` (`electron/main.cjs:145-153`) but the update loop
has never completed once. Two independent problems:

**1. The GitHub side never publishes.** Verified against the live API:

| Check | Result |
|---|---|
| `GET /repos/EthanC306/SkillTape/releases` | `[]` |
| `GET /repos/EthanC306/SkillTape/tags` | `[]` |
| `GET /repos/EthanC306/SkillTape/releases/latest` | `404` |
| `github.com/EthanC306/SkillTape/releases.atom` | feed with **zero `<entry>`** |

`GitHubProvider.getLatestVersion()` (`node_modules/electron-updater/out/providers/GitHubProvider.js:40`)
reads `releases.atom` first and throws `ERR_UPDATER_NO_PUBLISHED_VERSIONS` on an
empty feed; drafts are omitted from that feed and from unauthenticated API reads.
So the releases you can see logged in are **drafts**, and the app is correct to
see nothing.

Adding `releaseType: release` (already uncommitted in `electron-builder.yml`) does
**not** fix this. `gitHubPublisher.js:66-68`:

```js
if (release.draft) {
    return release;   // reuses the existing draft, never flips it
}
```

`releaseType` only applies when *creating* a release. Any stale draft for a tag
poisons that tag permanently. This is the single reason the current attempt failed.

**2. The app side has no UI and no diagnostics.** `preload.cjs` is empty, so the
renderer cannot learn anything. `checkForUpdatesAndNotify()` swallows failures into
`console.error`, invisible in a packaged Windows app.

**Outcome:** a scripted release that cannot silently produce an invisible release,
and an in-app banner (`Downloading… %` → `Update ready — Restart now`) that proves
the loop end to end.

---

## Changes

### 1. `electron-builder.yml` — space-free artifact name

`resolveFiles` (`GitHubProvider.js:181`) rewrites spaces to `-` when building the
download URL, but `gitHubPublisher.js:129` uploads with `?name=SkillTape Setup 1.0.1.exe`
and GitHub renames spaces on its own. Remove the mismatch class entirely:

```yaml
nsis:
  artifactName: ${productName}-Setup-${version}.${ext}
```

Keep `releaseType: draft` (the default) — step 2 owns the flip. Drop the
uncommitted `releaseType: release` line and rewrite that comment block to explain
the draft/atom-feed trap and that the release script publishes the draft.

### 2. `scripts/release.mjs` (new) + `package.json` script

No new deps — Node 18+ global `fetch`. `npm run release:win`:

1. **Preflight, fail fast:** `GH_TOKEN`/`GITHUB_TOKEN` set; `package.json` version
   is valid semver and `>` the currently published latest; **no existing release
   (draft or published) for tag `v<version>`** — the trap above, reported with the
   fix ("delete it at /releases or bump version"); git tree clean.
2. `npm run build && npm run electron:clean-native && electron-builder --win --x64 --publish always`
   (reuse existing scripts — do not re-implement the Wine/native-module handling
   documented in README:120-180).
3. **Verify assets** on the draft via the API: `latest.yml`,
   `SkillTape-Setup-<v>.exe`, `SkillTape-Setup-<v>.exe.blockmap` all present and
   non-zero. Also assert `latest.yml`'s `path:` matches the uploaded asset name.
4. **Flip draft → published** (`PATCH /releases/:id`, `{draft:false}`). Only now is
   the release visible to `releases.atom`, so the feed never advertises a
   half-uploaded release.
5. Print the release URL.

Add `"release:win": "node scripts/release.mjs"`. Keep `electron:publish:win` as-is.

### 3. `electron/main.cjs` — real updater state machine

Replace `checkForUpdates()` (lines 133-153) with an `UpdateController`:

- `app.setAppUserModelId("com.skilltape.app")` before `whenReady`.
- `autoUpdater.logger = require("electron-log")`; `logger.transports.file.level = "info"`.
  Writes to `%APPDATA%\SkillTape\logs\main.log`.
- `autoUpdater.autoDownload = true`, `autoInstallOnAppQuit = true`.
- **Single source of truth**: a module-level `updateState` object
  `{ status, version, percent, error }` with `status` ∈
  `idle | checking | available | downloading | ready | error | unsupported`.
  Every event handler mutates it, then pushes to `mainWindow?.webContents.send("updater:state", updateState)`.
- Handlers: `checking-for-update`, `update-available`, `update-not-available`,
  `download-progress` (→ `percent`), `update-downloaded` (→ `ready`), `error`
  (→ `error`, message only; keep the existing `.catch()` so an offline launch
  can't kill the app — that guard is load-bearing, see the current comment).
- **Race fix:** the renderer mounts after the first events fire. Expose
  `ipcMain.handle("updater:getState", () => updateState)` so the banner pulls
  current state on mount and subscribes for deltas. Without this the banner is
  silently empty on a fast check.
- `ipcMain.handle("updater:quitAndInstall", ...)` → `stopBackend()`, then
  `autoUpdater.quitAndInstall()`.
- `ipcMain.handle("app:getVersion", () => app.getVersion())` for the badge.
- Use `autoUpdater.checkForUpdates()`, not `...AndNotify()` — we render our own UI.
- Check on launch (after `createWindow`) and re-check every 6 h via `setInterval`,
  skipping while `status` is `downloading`/`ready`.
- Dev guard: `if (!app.isPackaged) status = "unsupported"` — surfaces "dev build"
  instead of a silent no-op.
- **Shutdown ordering:** `autoInstallOnAppQuit` installs on Electron's `quit`
  event (`BaseUpdater.js:74 app.onQuit`), which fires after `before-quit`. Make
  `stopBackend()` deterministic — kill `serverProcess` and await its `exit` (short
  timeout, then `SIGKILL`) so the forked `SkillTape.exe` isn't holding install-dir
  file handles when NSIS runs.

### 4. `electron/preload.cjs` — replace the "intentionally empty" bridge

```js
const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("skilltape", {
  getVersion: () => ipcRenderer.invoke("app:getVersion"),
  updater: {
    getState: () => ipcRenderer.invoke("updater:getState"),
    onState: (cb) => {
      const h = (_e, s) => cb(s);
      ipcRenderer.on("updater:state", h);
      return () => ipcRenderer.removeListener("updater:state", h);
    },
    quitAndInstall: () => ipcRenderer.invoke("updater:quitAndInstall"),
  },
});
```
Narrow, explicit channels — no `ipcRenderer` exposure. Rewrite the file's header
comment (it currently asserts there is nothing to expose). `contextIsolation: true`
already set (`main.cjs:119`); preload applies to the `http://127.0.0.1:3001/` window.

### 5. `src/hooks/useUpdater.js` (new)

Matches the existing hook style (`src/hooks/useTheme.js`). Returns
`{ status, version, percent, error, restart }`. On mount: `getState()`, then
`onState()`; cleanup unsubscribes. If `window.skilltape` is absent (browser/Docker),
return `status: "unsupported"` so the banner never renders outside Electron.

### 6. `src/components/UpdateBanner.jsx` (new) + mount in `src/Shell.jsx`

Fixed strip at the top, themed with `PALETTE`/`MONO`/`RADII`/`HEADING` from
`src/data/theme.js` (`accentSoft` bg, `accent` border — never a flood fill, per the
theme file's Nocturne note). States:

- `downloading` → `⟳ Downloading update {version}… {percent}%`
- `ready` → `✓ Update {version} ready — installs when you close SkillTape.`
  + `[ Restart now ]` (→ `restart()`) + a dismiss `×`
- `error` → muted one-liner, dismissible
- everything else → renders `null`

Mount in `Shell.jsx` above the `flex:1` content div (line 35), so it shows on the
home page and inside both course tabs.

### 7. `src/Shell.jsx` — version badge; `index.html` — delete purple bar

Small muted `v{version}` (from `useUpdater`/`getVersion`) beside the "View on
GitHub" link (`Shell.jsx:90-123`), hidden when not in Electron. Remove the
`AUTO-UPDATE SMOKE TEST MARKER` div (`index.html:131-151`) — the badge replaces it
permanently.

### 8. `package.json`

Add `electron-log` to `dependencies` (pure JS, no native rebuild — safe for the
Wine cross-build path). Add `release:win`.

### 9. `README.md` — new "Releasing an update" subsection under "Desktop app (Electron)" (~line 199)

Document, in the file's existing why-not-just-what voice: the draft/atom-feed trap
and the `if (release.draft) return release` reuse bug (the thing that cost this
cycle); `GH_TOKEN` scope (`repo` classic, or fine-grained with Contents: RW);
`npm run release:win`; where `main.log` lives; and that the build is **unsigned**,
so Windows SmartScreen warns on first install — `electron-updater` still verifies
each download's sha512 against `latest.yml`, and code signing is the remaining
enterprise gap.

---

## Verification

**Prerequisite — one manual cleanup.** Delete every existing draft release at
https://github.com/EthanC306/SkillTape/releases (drafts for `v1.0.0`/`v1.0.1` are
invisible to the API but block those tags forever). Confirm clean:
`curl -s https://api.github.com/repos/EthanC306/SkillTape/releases` → `[]`.

1. **Preflight is real:** run `npm run release:win` with `GH_TOKEN` unset → must
   abort with a named reason, not a stack trace.
2. **Publish a baseline:** `export GH_TOKEN=…`, set version `1.0.1`,
   `npm run release:win`. Then assert the app-visible feed, not the web UI:
   ```bash
   curl -s https://api.github.com/repos/EthanC306/SkillTape/releases/latest | grep tag_name   # v1.0.1
   curl -s https://github.com/EthanC306/SkillTape/releases.atom | grep -c '<entry'            # >= 1
   curl -sIL https://github.com/EthanC306/SkillTape/releases/download/v1.0.1/latest.yml | head -1
   ```
   All three must pass — that trio is exactly what failed before.
3. Install `SkillTape-Setup-1.0.1.exe` on Windows. Home page shows `v1.0.1`.
4. **Publish 1.0.2:** bump version, make one visible change, `npm run release:win`.
5. **Observe the loop:** relaunch the installed 1.0.1. Within seconds the banner
   shows `Downloading update 1.0.2… n%`, then `Update 1.0.2 ready`. Click
   **Restart now** → app relaunches showing `v1.0.2` and the visible change.
6. **Passive path:** repeat for 1.0.3 but *close* the app instead of clicking
   Restart. Reopen → `v1.0.3`.
7. **Diagnostics:** `%APPDATA%\SkillTape\logs\main.log` contains the
   checking/available/downloaded lines.
8. **Offline safety (regression guard):** disconnect the network and launch. App
   must start normally, banner stays hidden, log records the failed check. This is
   the guard the existing `main.cjs` comment calls load-bearing.
9. `npm test` still passes; `npm run dev` in a browser shows no banner and no
   version badge (`window.skilltape` absent).
