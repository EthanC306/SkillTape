// Intentionally empty. The renderer only ever talks to the local API over
// plain fetch("/api/...") — same as it does today against Vite's dev proxy
// or nginx — so there's nothing to expose via contextBridge. Kept as a real
// file (referenced from main.cjs's webPreferences.preload) so
// contextIsolation/nodeIntegration stay explicit rather than implied.
