import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Not present in the uploaded project. Without @vitejs/plugin-react, Vite still
// compiles .jsx via esbuild (classic transform — which is why every file needs
// `import React from "react"`), but there is no React Fast Refresh: editing a
// component full-reloads the page and wipes component state. That means losing
// your place mid-quiz on every save.
export default defineConfig({
  plugins: [react()],

  server: {
    port: 5173,
    open: false,
    // Vite's dev server is HTTP and binds localhost only by default. Leave it
    // that way — `host: true` exposes the server (and `fs` reads) to your LAN.

    // Everything under /api is forwarded to the Express API on 3001, so the
    // browser only ever talks to one origin and CORS never comes up. It also
    // means frontend code writes fetch("/api/…") with no hostname to change
    // when this stops being localhost.
    proxy: {
      "/api": {
        target: "http://127.0.0.1:3001",
        changeOrigin: true,
      },
    },
  },

  build: {
    outDir: "dist",
    sourcemap: true,
  },

  // Alias so imports don't turn into ../../.. chains as src/ grows.
  resolve: {
    alias: {
      "@": new URL("./src", import.meta.url).pathname,
    },
  },
});
