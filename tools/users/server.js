/**
 * tools/users/server.js
 *
 * Local read-only dashboard of SkillTape accounts and activity. Runs beside
 * the app, never inside it: it opens the database read-only and binds to
 * 127.0.0.1, so it can neither change data nor be reached from the network.
 *
 *   npm run users
 *   npm run users -- --port 4500
 */

import express from "express";
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..", "..");
const DB_PATH = process.env.SKILLTAPE_DB || path.join(repoRoot, "db", "skilltape.db");

const DAY_MS = 24 * 60 * 60 * 1000;
const CHART_DAYS = 14;

function parsePort(argv) {
  const i = argv.findIndex((a) => a === "--port" || a.startsWith("--port="));
  if (i === -1) return 4400;
  const value = argv[i].includes("=") ? argv[i].split("=")[1] : argv[i + 1];
  return Number(value) || 4400;
}

if (!fs.existsSync(DB_PATH)) {
  console.error(`No database at ${DB_PATH}. Start the app once first, or set SKILLTAPE_DB.`);
  process.exit(1);
}

// Not server/db.js: importing that would run the app's migrations against the live database.
const db = new Database(DB_PATH, { readonly: true, fileMustExist: true });

function hasColumn(table, column) {
  return db.prepare(`PRAGMA table_info(${table})`).all().some((c) => c.name === column);
}

// Older databases may predate these columns until the app has booted once with the new code.
const verifiedExpr = hasColumn("users", "email_verified") ? "u.email_verified" : "NULL";
const adminExpr = hasColumn("users", "is_admin") ? "u.is_admin" : "0";

const listUsers = db.prepare(`
  SELECT
    u.id,
    u.email,
    u.created_at,
    ${adminExpr} AS is_admin,
    ${verifiedExpr} AS email_verified,
    (SELECT COUNT(*) FROM sessions s WHERE s.user_id = u.id AND s.expires_at > @now) AS live_sessions,
    (SELECT MAX(created_at) FROM sessions s WHERE s.user_id = u.id) AS last_login,
    (SELECT COUNT(*) FROM item_attempts a WHERE a.user_id = u.id) AS reviews,
    (SELECT MAX(ts) FROM item_attempts a WHERE a.user_id = u.id) AS last_review,
    (SELECT COUNT(*) FROM attempts q WHERE q.user_id = u.id) AS quiz_answers,
    (SELECT MAX(created_at) FROM attempts q WHERE q.user_id = u.id) AS last_quiz
  FROM users u
  ORDER BY u.id
`);

const recentEvents = db.prepare(`
  SELECT user_id, ts FROM item_attempts WHERE ts >= @since
  UNION ALL
  SELECT user_id, created_at FROM attempts WHERE created_at >= @since AND user_id IS NOT NULL
  UNION ALL
  SELECT user_id, created_at FROM sessions WHERE created_at >= @since
`);

function localDayKey(ms) {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function dailyActive(now) {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (CHART_DAYS - 1));

  const days = [];
  for (let i = 0; i < CHART_DAYS; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    days.push({ date: localDayKey(d.getTime()), users: new Set() });
  }
  const byKey = new Map(days.map((d) => [d.date, d]));

  for (const { user_id, ts } of recentEvents.all({ since: start.getTime() })) {
    byKey.get(localDayKey(ts))?.users.add(user_id);
  }
  return days.map((d) => ({ date: d.date, active: d.users.size }));
}

function overview() {
  const now = Date.now();
  const users = listUsers.all({ now }).map((u) => {
    const lastActive = Math.max(u.created_at, u.last_login ?? 0, u.last_review ?? 0, u.last_quiz ?? 0);
    return {
      id: u.id,
      email: u.email,
      createdAt: u.created_at,
      isAdmin: Boolean(u.is_admin),
      emailVerified: u.email_verified === null ? null : Boolean(u.email_verified),
      signedIn: u.live_sessions > 0,
      lastActive,
      reviews: u.reviews,
      quizAnswers: u.quiz_answers,
    };
  });

  const activeWithin = (ms) => users.filter((u) => now - u.lastActive <= ms).length;

  return {
    generatedAt: now,
    totals: {
      users: users.length,
      signedIn: users.filter((u) => u.signedIn).length,
      active24h: activeWithin(DAY_MS),
      active7d: activeWithin(7 * DAY_MS),
      verified: users.filter((u) => u.emailVerified).length,
    },
    daily: dailyActive(now),
    users,
  };
}

const app = express();
app.disable("x-powered-by");
app.get("/api/overview", (req, res) => res.json(overview()));
app.use(express.static(path.join(here, "public")));

const port = parsePort(process.argv.slice(2));
app.listen(port, "127.0.0.1", () => {
  console.log(`SkillTape Users on http://127.0.0.1:${port}  (reading ${DB_PATH})`);
});
