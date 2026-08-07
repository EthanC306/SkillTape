// The renderer's only channel to the main process.
//
// Everything the app *does* still goes over plain fetch("/api/...") to the
// local Express server — same as in the browser, in Docker, and behind nginx.
// This bridge exists for the one thing that has no HTTP equivalent because it
// isn't part of the app at all: the Electron shell's own auto-update state,
// plus the installed version number the banner and the home page display.
//
// Deliberately a small fixed surface, not a generic ipcRenderer escape hatch.
// The window loads http://127.0.0.1:3001/, i.e. real remote-ish content over a
// network protocol, so exposing `ipcRenderer` (or `invoke` with a caller-chosen
// channel) would hand every main-process handler to anything that ends up
// running in that page. Three named calls and one subscription is all the
// renderer needs; contextIsolation: true (main.cjs) keeps this the only path.
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("skilltape", {
  getVersion: () => ipcRenderer.invoke("app:getVersion"),
  updater: {
    // Pull-then-subscribe: the main process may have finished checking (or be
    // mid-download) before React mounts, and those events are gone by then.
    // See the race note on ipcMain.handle("updater:getState") in main.cjs.
    getState: () => ipcRenderer.invoke("updater:getState"),
    onState: (cb) => {
      const handler = (_event, state) => cb(state);
      ipcRenderer.on("updater:state", handler);
      // Returns its own unsubscribe so a React effect can clean up without
      // needing a second exposed method to remove listeners by name.
      return () => ipcRenderer.removeListener("updater:state", handler);
    },
    quitAndInstall: () => ipcRenderer.invoke("updater:quitAndInstall"),
  },
});
