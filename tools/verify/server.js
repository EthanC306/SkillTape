/**
 * tools/verify/server.js
 *
 * Local review UI for the `verifiedByHuman` gate. Items enter the bank with the
 * flag false and stay out of drill rotation until a human reads them against
 * their source excerpt, so this serves every unverified item one card at a time
 * and flips the flag in the seed file on approval.
 *
 * Runs standalone. It does not touch the app database or the Electron shell.
 *
 *   npm run verify
 *   npm run verify -- --topic linked-lists
 *   npm run verify -- --topic cpp --port 4300
 */

import express from "express";
import fs from "node:fs";
import path from "node:path";
import { exec } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { setFlag, writeAtomic } from "./flag.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..", "..");
const topicsDir = path.join(repoRoot, "src", "data", "topics");
const rejectFile = path.join(repoRoot, "data", "needs-fixing.json");

function parseArgs(argv) {
  const args = { topic: null, port: 4200, only: null };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    let name = arg;
    let value = null;
    const eq = arg.indexOf("=");
    if (arg.startsWith("--") && eq !== -1) {
      name = arg.slice(0, eq);
      value = arg.slice(eq + 1);
    } else if (arg.startsWith("--")) {
      value = argv[i + 1];
      i++;
    }

    if (name === "--topic") {
      args.topic = value;
    } else if (name === "--port") {
      args.port = Number(value);
    } else if (name === "--only") {
      args.only = value;
    }
  }
  return args;
}

/**
 * Maps every authored item id to the file it lives in.
 *
 * Deliberately not built from src/data/curriculum.js: that gives topic objects
 * with no record of which file they came from, and the flag edit needs the path.
 */
async function buildIndex() {
  const index = new Map();

  for (const course of fs.readdirSync(topicsDir)) {
    const courseDir = path.join(topicsDir, course);
    if (!fs.statSync(courseDir).isDirectory()) continue;

    for (const file of fs.readdirSync(courseDir)) {
      if (!file.endsWith(".js")) continue;

      const filePath = path.join(courseDir, file);
      const mod = await import(pathToFileURL(filePath).href);
      const topic = mod.default;
      if (!topic || !topic.id) continue;

      const add = (entry) => {
        if (index.has(entry.item.id)) {
          console.warn(`duplicate id "${entry.item.id}", keeping the first`);
          return;
        }
        index.set(entry.item.id, {
          ...entry,
          filePath,
          course,
          topicId: topic.id,
          topicTitle: topic.title,
        });
      };

      for (const item of topic.items ?? []) {
        add({ item, legacy: false });
      }
      for (const question of topic.questions ?? []) {
        add({ item: question, legacy: true });
      }
    }
  }

  return index;
}

/**
 * Flattens both shapes into the one the card renders.
 *
 * Legacy questions[] rows name the correct choice `answer`, carry `explanation`
 * instead of criteria, and have no format, so they are normalized here rather
 * than teaching the frontend two vocabularies.
 */
function toCard(entry) {
  const card = {
    ...entry.item,
    legacy: entry.legacy,
    course: entry.course,
    topicId: entry.topicId,
    topicTitle: entry.topicTitle,
    file: path.relative(repoRoot, entry.filePath),
  };

  if (entry.legacy) {
    card.format = "mcq";
    card.answerIndex = entry.item.answer;
    card.difficulty = entry.item.difficulty ?? 2;
    card.origin = "legacy";
  }

  return card;
}

function matchesFilter(entry, args) {
  if (args.only === "items" && entry.legacy) return false;
  if (args.only === "legacy" && !entry.legacy) return false;
  if (!args.topic) return true;
  return entry.topicId === args.topic || entry.course === args.topic;
}

function isPending(entry, args) {
  if (entry.item.verifiedByHuman) return false;
  if (entry.item.retired) return false;
  return matchesFilter(entry, args);
}

function pendingCards(index, args) {
  const cards = [];
  for (const entry of index.values()) {
    if (isPending(entry, args)) cards.push(toCard(entry));
  }
  return cards;
}

function countPending(index, args) {
  let n = 0;
  for (const entry of index.values()) {
    if (isPending(entry, args)) n++;
  }
  return n;
}

/**
 * Rewrites one `verifiedByHuman` line without reserializing the module.
 *
 * The file is re-read on every call because it is also open in the editor, and
 * a stale buffer would silently drop whatever was typed there.
 */
function flipFlag(entry) {
  const src = fs.readFileSync(entry.filePath, "utf8");
  const result = setFlag(src, entry.item.id, true);
  if (!result.ok) return result;

  writeAtomic(entry.filePath, result.src);
  entry.item.verifiedByHuman = true;

  return { ok: true };
}

function readRejects() {
  if (!fs.existsSync(rejectFile)) return {};
  try {
    return JSON.parse(fs.readFileSync(rejectFile, "utf8"));
  } catch {
    console.warn(`${rejectFile} is not valid JSON, starting a fresh log`);
    return {};
  }
}

function logReject(entry, reason) {
  const log = readRejects();
  log[entry.item.id] = {
    topicId: entry.topicId,
    file: path.relative(repoRoot, entry.filePath),
    reason: reason || "",
    ts: new Date().toISOString(),
  };
  fs.mkdirSync(path.dirname(rejectFile), { recursive: true });
  writeAtomic(rejectFile, `${JSON.stringify(log, null, 2)}\n`);
}

function openBrowser(url) {
  let cmd;
  if (process.platform === "darwin") {
    cmd = `open "${url}"`;
  } else if (process.platform === "win32") {
    cmd = `start "" "${url}"`;
  } else {
    cmd = `xdg-open "${url}"`;
  }
  exec(cmd, () => {});
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const index = await buildIndex();

  let items = 0;
  let legacy = 0;
  let verified = 0;
  for (const entry of index.values()) {
    if (entry.legacy) {
      legacy++;
    } else {
      items++;
    }
    if (entry.item.verifiedByHuman) verified++;
  }
  const remaining = countPending(index, args);

  const app = express();
  app.use(express.json());
  app.use(express.static(path.join(here, "public")));

  app.get("/api/questions", (req, res) => {
    res.json({ questions: pendingCards(index, args), topic: args.topic });
  });

  app.post("/api/verify", (req, res) => {
    const entry = index.get(req.body?.id);
    if (!entry) {
      res.status(404).json({ error: `unknown item "${req.body?.id}"` });
      return;
    }

    const result = flipFlag(entry);
    if (!result.ok) {
      res.status(result.status).json({ error: result.reason });
      return;
    }

    console.log(`verified ${entry.item.id}`);
    res.json({ ok: true, remaining: countPending(index, args) });
  });

  app.post("/api/reject", (req, res) => {
    const entry = index.get(req.body?.id);
    if (!entry) {
      res.status(404).json({ error: `unknown item "${req.body?.id}"` });
      return;
    }

    logReject(entry, req.body?.reason);
    console.log(`flagged ${entry.item.id}: ${req.body?.reason || "no reason"}`);
    res.json({ ok: true, remaining: countPending(index, args) });
  });

  const url = `http://127.0.0.1:${args.port}`;
  app.listen(args.port, "127.0.0.1", () => {
    console.log("");
    console.log(`  ${items} items and ${legacy} legacy questions, ${verified} already verified`);
    if (args.topic) {
      console.log(`  topic: ${args.topic}`);
    }
    if (args.only) {
      console.log(`  only: ${args.only}`);
    }
    console.log(`  ${remaining} to review`);
    console.log("");
    console.log(`  ${url}`);
    console.log("");
    console.log("  Each click writes straight to the seed file, so Ctrl-C is safe.");
    console.log("  Run `npm run db:seed` afterwards for the app to pick these up.");
    console.log("");
    openBrowser(url);
  });
}

main();
