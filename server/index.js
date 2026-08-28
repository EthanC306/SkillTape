//Express is a library that handles the tedious parts of HTTP.
import express from "express";
import cookieParser from "cookie-parser";
import path from "node:path";
import { fileURLToPath } from "node:url";
import topics from "./routes/topics.js";
import progress from "./routes/progress.js";
import auth from "./routes/auth.js";
import drill from "./routes/drill.js";
import stats from "./routes/stats.js";
import { attachUser } from "./userScope.js";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

//Returns an application object. Think of app as your servers rulebook, every route is a rule saying run that function if this happens
const app = express();

// The credential rate limiters in routes/auth.js key on `req.ip`. Express
// reports the SOCKET's address unless told otherwise, so behind the nginx in
// docker-compose every request would look like it came from the proxy and land
// in one shared bucket — the first user to mistype a password would lock out
// everyone. Setting this makes Express read X-Forwarded-For instead.
//
// Off by default, and it must stay that way for the direct-to-Express cases
// (dev, Electron): with no proxy in front, X-Forwarded-For is attacker-supplied
// and trusting it lets a caller mint a fresh rate-limit bucket per request by
// spoofing the header. Only enable it when something trustworthy really is in
// front — TRUST_PROXY=1 for a single hop, or a subnet/CIDR.
if (process.env.TRUST_PROXY) {
  const value = process.env.TRUST_PROXY;
  app.set("trust proxy", /^\d+$/.test(value) ? Number(value) : value);
}

// Express sends `X-Powered-By: Express` on every response by default. It tells
// an attacker what to look up CVEs for and does nothing for anyone else.
app.disable("x-powered-by");

// Three headers Express does not send on its own. None of them are a
// substitute for the checks in the routes; they close off browser-side ways of
// abusing a response that is otherwise correct.
app.use((req, res, next) => {
  // Stops a browser MIME-sniffing a response into something executable — the
  // reason a JSON endpoint can otherwise be coerced into running as script.
  res.setHeader("X-Content-Type-Options", "nosniff");
  // No page here is ever meant to be embedded, and the app is one origin, so
  // denying frames outright costs nothing and removes clickjacking.
  res.setHeader("X-Frame-Options", "DENY");
  // Referrer would otherwise carry the in-app path to any external link the
  // user follows (the GitHub link on the home screen is one).
  res.setHeader("Referrer-Policy", "no-referrer");
  next();
});

// Parses a JSON request body into req.body. Without it, req.body is undefined
// on every POST/PUT — the classic first bug when the editor starts saving.
// The limit is a guard: an unbounded body is a free denial-of-service.
app.use(express.json({ limit: "2mb" }));
// Reads the Cookie header into req.cookies. Used by the session middleware.
app.use(cookieParser());

// Resolve the session ONCE, for every /api request, into req.userId (or null).
// Mounted here rather than app-wide on purpose: express.static(dist) and the
// SPA catch-all live below these routes, and a global mount would run a
// sessions-table lookup for every asset the page loads. See server/userScope.js.
app.use("/api", attachUser);

app.get("/api/health", (req, res) => {
    res.json({ok:true });
});

app.use("/api/topics", topics);
// progress.js defines both /attempts and /progress itself (two unrelated
// collection names sharing one file, per docs/RESUME-EDIT-MODE.md), so it is
// mounted at the bare /api prefix rather than one fixed sub-path.
app.use("/api", progress);
app.use("/api/auth", auth);
app.use("/api/drill", drill);
// Reads both attempt tables, so it belongs under neither /api/drill nor the
// bare /api progress prefix. See routes/stats.js.
app.use("/api/stats", stats);

// 404 for anything under /api that matched no route above. Without this, an
// unknown /api path falls through and returns Express's HTML error page, which
// makes res.json() blow up in the client with a confusing parse error.
app.use("/api", (req, res) => {
  res.status(404).json({ error: "not found" });
});

// Serves the built frontend (dist/) when it exists — needed for the Electron
// desktop build, which has no separate Vite dev server or nginx in front of
// it. Harmless everywhere else: in dev there's usually no dist/ yet, and in
// Docker nginx already serves the frontend and never reaches this process
// for non-/api paths, so this simply goes unused there. The catch-all comes
// after every /api route above, so an API 404 is never shadowed by it.
//
// CACHING IS NOT OPTIONAL TO GET RIGHT HERE — it broke a shipped update.
// express.static sends ETag/Last-Modified but no Cache-Control, and with no
// explicit directive Chromium falls back to HEURISTIC freshness (RFC 9111
// §4.2.2: ~10% of the age since Last-Modified) and will serve index.html from
// its own disk cache WITHOUT revalidating. In the browser that's invisible;
// in Electron the cache lives in the user-data dir and OUTLIVES the update,
// so after installing 1.0.2 the window still rendered 1.0.1's index.html,
// whose <script src="/assets/index-<oldhash>.js"> no longer existed in the
// new dist — 404, React never mounted, blank window. Confirmed by finding the
// stale HTML in AppData/Roaming/SkillTape/Cache/Cache_Data.
//
// The split below is the standard fix, and it works precisely because Vite
// content-hashes asset filenames:
//   /assets/*  — the hash IS the version, so a given URL's bytes can never
//                change. Cache hard, forever, no revalidation.
//   index.html — the one unhashed, mutable entry point, and the file that
//                names the current asset hashes. Never cache it.
const NO_STORE = "no-store, no-cache, must-revalidate";
app.use(
  express.static(path.join(ROOT, "dist"), {
    setHeaders(res, filePath) {
      if (filePath.includes(`${path.sep}assets${path.sep}`)) {
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      } else {
        res.setHeader("Cache-Control", NO_STORE);
      }
    },
  })
);
// Express 5's router (path-to-regexp v8) rejects a bare "*" — it needs a
// named wildcard or, as here, a real RegExp — so this isn't the Express 4
// catch-all pattern this codebase's older docs/examples might suggest.
//
// sendFile does NOT go through the setHeaders hook above (that's static's
// own), so the shell's no-store has to be repeated here — this path serves
// the very same index.html for every client-side route.
app.get(/.*/, (req, res) => {
  res.setHeader("Cache-Control", NO_STORE);
  res.sendFile(path.join(ROOT, "dist", "index.html"));
});

// Error handler. Express identifies it by its four arguments — dropping `next`
// silently turns it back into ordinary middleware.
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || "server error" });
});

//Start listening... Nothing above has opened a port until you listen
// 127.0.0.1 keeps this off the LAN, matching the note in vite.config.js — and
// it matters more here, since this process will hold password hashes. In a
// container, 127.0.0.1 is only the container's own loopback, so HOST=0.0.0.0
// is required there for other containers to reach it — the docker-compose
// setup never publishes this port to the host, so it stays off the LAN either way.
const HOST = process.env.HOST || "127.0.0.1";
const PORT = process.env.PORT || 3001;
app.listen(PORT, HOST, () => {
    console.log(`SkillTape API on http://${HOST}:${PORT}`);
});
