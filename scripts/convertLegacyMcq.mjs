// One-shot conversion (2026-08-09): promotes a slice of each topic's legacy
// `questions[]` MCQs into real `items[]` entries, so Practice mode has MCQs to
// serve. Kept in scripts/ rather than run-and-deleted because the selection
// rule below is the only record of WHICH questions were promoted and why —
// rerunning it on an already-converted file is a no-op (see SKIP below).
//
// Why this exists: the `items` bank had zero MCQ items and never had any, while
// 285 hand-written MCQs sat in the legacy `questions` tables that only QuizView
// reads. itemSchema.js caps MCQ at 5% of a bank on the grounds that recognition
// is a weaker skill than production — a good default that the owner of this
// bank has explicitly overridden for these 12 topics.
//
// Usage:  node scripts/convertLegacyMcq.mjs [--dry-run]

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { migrateLegacyQuestion } from "../src/data/itemSchema.js";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const TOPICS_DIR = path.join(ROOT, "src", "data", "topics", "cpp");
const DRY_RUN = process.argv.includes("--dry-run");

// The 12 cpp topics that already have items. Deliberately not the other 9 cpp
// topics or any discrete topic: a topic with no production items would become
// MCQ-only in Practice, which inverts the difficulty mix rather than balancing
// it. Those topics get MCQs when ROADMAP A7 converts them properly.
const TARGET_TOPICS = [
  "derived-classes",
  "doubly-linked-lists",
  "dynamic-alloc",
  "dynamic-arrays",
  "dynamic-classes",
  "iterators",
  "linked-lists",
  "linked-lists-algorithms",
  "multidim-arrays",
  "queues",
  "stacks",
  "templates",
];

// Target share of each topic's resulting bank. Solving m/(n+m) = 0.4 for m
// gives m = (2/3)n, so a topic with 8 items takes 5 MCQs and lands at 38.5%.
// Applied per topic rather than as one global quota so every topic chip in
// Practice gains MCQs, instead of five topics absorbing the whole allocation.
const MCQ_SHARE = 0.4;
const takeFor = (existing) => Math.round((MCQ_SHARE / (1 - MCQ_SHARE)) * existing);

/** Words that carry no signal when comparing two prompts for near-duplication. */
const STOPWORDS = new Set([
  "the", "a", "an", "is", "are", "was", "were", "of", "to", "in", "on", "for",
  "and", "or", "what", "which", "does", "do", "this", "that", "it", "its",
  "you", "your", "how", "why", "when", "with", "at", "be", "by", "as", "if",
]);

function contentWords(s) {
  return new Set(
    s
      .toLowerCase()
      .replace(/```[\s\S]*?```/g, " ") // code blocks aren't prompt wording
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOPWORDS.has(w))
  );
}

/**
 * Jaccard overlap of content words. A legacy MCQ that restates an existing
 * item's question adds nothing but a recognition-mode version of a card you
 * already answer cold, so those are skipped in favour of the next candidate.
 */
function tooSimilar(prompt, existingPrompts) {
  const a = contentWords(prompt);
  if (a.size === 0) return false;
  for (const other of existingPrompts) {
    const b = contentWords(other);
    let shared = 0;
    for (const w of a) if (b.has(w)) shared++;
    if (shared / Math.min(a.size, b.size) >= 0.6) return true;
  }
  return false;
}

/** Serializes a value as JS source, matching the topic modules' formatting. */
function lit(value, indent) {
  const pad = " ".repeat(indent);
  if (Array.isArray(value)) {
    if (value.length === 0) return "[]";
    const inner = value.map((v) => `${pad}  ${lit(v, indent + 2)}`).join(",\n");
    return `[\n${inner},\n${pad}]`;
  }
  // JSON.stringify handles the escaping of newlines, quotes and backslashes
  // correctly for a double-quoted JS string, which matters because converted
  // prompts carry embedded code fences.
  return JSON.stringify(value);
}

/** One `makeItem({...})` entry, formatted like the hand-authored ones. */
function renderItem(item) {
  const lines = [
    "    makeItem({",
    `      id: ${JSON.stringify(item.id)},`,
    `      topicId: ${JSON.stringify(item.topicId)},`,
    "      format: FORMATS.MCQ,",
    "      origin: ITEM_ORIGIN.MANUAL,",
    `      prompt: ${lit(item.prompt, 6)},`,
    `      choices: ${lit(item.choices, 6)},`,
    `      answerIndex: ${item.answerIndex},`,
    `      expected: ${lit(item.expected, 6)},`,
  ];
  if (item.criteria?.length) lines.push(`      criteria: ${lit(item.criteria, 6)},`);
  lines.push(
    "      // Hand-authored course question promoted from this topic's legacy",
    "      // questions[]. No source excerpt exists to cite, so provenance stays",
    "      // null rather than being invented — see migrateLegacyQuestion.",
    "      provenance: null,",
    `      difficulty: ${item.difficulty},`,
    "      verifiedByHuman: true,",
    "    }),"
  );
  return lines.join("\n");
}

const summary = [];

for (const topicId of TARGET_TOPICS) {
  const file = path.join(TOPICS_DIR, `${topicId}.js`);
  const src = fs.readFileSync(file, "utf8");

  if (src.includes(`-mcq-01"`)) {
    summary.push({ topicId, added: 0, note: "SKIP — already converted" });
    continue;
  }

  const mod = (await import(file)).default;
  const existing = mod.items ?? [];
  const legacy = mod.questions ?? [];
  const want = takeFor(existing.length);

  const existingPrompts = existing.map((i) => i.prompt);
  const picked = [];
  for (const q of legacy) {
    if (picked.length >= want) break;
    if (!Array.isArray(q.choices) || q.choices.length < 2) continue;
    if (typeof q.answer !== "number" || q.answer < 0 || q.answer >= q.choices.length) continue;
    if (tooSimilar(q.prompt, existingPrompts)) continue;
    picked.push(q);
    existingPrompts.push(q.prompt); // don't pick two near-identical legacy questions either
  }

  const items = picked.map((q, i) =>
    migrateLegacyQuestion(q, topicId, i, {
      id: `${topicId}-mcq-${String(i + 1).padStart(2, "0")}`,
      verifiedByHuman: true,
    })
  );

  // Splice in before the items array's closing bracket. Every target file ends
  // `}),\n  ],\n};` with `items` as its last key — verified across all 12 before
  // writing this; the assertion below refuses to guess if that ever changes.
  const marker = "\n  ],\n};";
  if (!src.endsWith(marker + "\n") && !src.endsWith(marker)) {
    throw new Error(`${topicId}.js does not end with an items array — refusing to edit blindly`);
  }
  const block = items.map(renderItem).join("\n");
  const out = src.replace(/\n {2}\],\n};\s*$/, `\n${block}\n  ],\n};\n`);

  if (!DRY_RUN) fs.writeFileSync(file, out);
  summary.push({ topicId, existing: existing.length, available: legacy.length, added: items.length, short: items.length < want ? `WANTED ${want}` : "" });
}

let total = 0;
for (const r of summary) {
  total += r.added ?? 0;
  console.log(
    `${r.topicId.padEnd(24)} items:${String(r.existing ?? "-").padStart(2)}  legacy:${String(r.available ?? "-").padStart(3)}  +mcq:${String(r.added).padStart(2)}  ${r.note ?? r.short ?? ""}`
  );
}
console.log(`\n${DRY_RUN ? "[dry run] would add" : "added"} ${total} MCQ items`);
