//Express is a library that handles the tedious parts of HTTP.
import express from "express";
import cookieParser from "cookie-parser";
import topics from "./routes/topics.js";
import progress from "./routes/progress.js";
import auth from "./routes/auth.js";

//Returns an application object. Think of app as your servers rulebook, every route is a rule saying run that function if this happens
const app = express();

// Parses a JSON request body into req.body. Without it, req.body is undefined
// on every POST/PUT — the classic first bug when the editor starts saving.
// The limit is a guard: an unbounded body is a free denial-of-service.
app.use(express.json({ limit: "2mb" }));
// Reads the Cookie header into req.cookies. Used by the session middleware.
app.use(cookieParser());

app.get("/api/health", (req, res) => {
    res.json({ok:true });
});

app.use("/api/topics", topics);
// progress.js defines both /attempts and /progress itself (two unrelated
// collection names sharing one file, per docs/RESUME-EDIT-MODE.md), so it is
// mounted at the bare /api prefix rather than one fixed sub-path.
app.use("/api", progress);
app.use("/api/auth", auth);

// 404 for anything under /api that matched no route above. Without this, an
// unknown /api path falls through and returns Express's HTML error page, which
// makes res.json() blow up in the client with a confusing parse error.
app.use("/api", (req, res) => {
  res.status(404).json({ error: "not found" });
});

// Error handler. Express identifies it by its four arguments — dropping `next`
// silently turns it back into ordinary middleware.
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || "server error" });
});

//Start listening... Nothing above has opened a port until you listen
// 127.0.0.1 keeps this off the LAN, matching the note in vite.config.js — and
// it matters more here, since this process will hold password hashes.
app.listen(3001, "127.0.0.1", () => {
    console.log("SkillTape API on http://127.0.0.1:3001");
});
