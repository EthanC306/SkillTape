#!/usr/bin/env node
/**
 * scripts/auditBank.js — run with `npm run audit:bank`
 *
 * Loads the curriculum, audits every topic's item bank, prints findings, and
 * exits non-zero on any error so it can gate a commit hook or CI step.
 *
 * Reminder: a clean run proves STRUCTURE, not accuracy. Only `verifiedByHuman`
 * establishes that an item is factually correct.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { auditBank, CONTENT_POLICY } from "../src/data/itemSchema.js";

// ---------------------------------------------------------------------------
// Source integrity — CS_DRILL §7 checks 2 (dead anchor) and 3 (excerpt
// drift), wired here rather than in itemSchema.js because they need `fs` to
// read sources/ — itemSchema.js is dependency-free on purpose (its own
// header comment: "drops straight into the existing Vite app"), and adding a
// Node-only import there would break the browser bundle DrillView etc. pull
// FORMATS/SELF_GRADED from. This script is Node-only already, so the
// boundary belongs here.
//
// sources/ is gitignored (private, copyrighted course material) — a fresh
// checkout or CI runner won't have it. Both checks no-op cleanly when the
// directory is absent rather than reporting spurious errors for content
// nobody but the local machine can see.
// ---------------------------------------------------------------------------

const SOURCES_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "sources");
const HEADING_RE = /^##\s+.*\{#([a-zA-Z0-9_-]+)\}\s*$/gm;
const FRONTMATTER_RE = /^---\n([\s\S]*?)\n---/;
const SOURCE_ID_RE = /^source_id:\s*(.+)$/m;

/** Collapse whitespace so incidental reformatting doesn't read as drift. */
function normalize(s) {
  return s.replace(/\s+/g, " ").trim();
}

/**
 * @returns {Map<string, {file: string, sections: Map<string, string>}> | null}
 *   null means sources/ isn't checked out at all (checks should no-op).
 */
function loadSourceIndex() {
  if (!fs.existsSync(SOURCES_DIR)) return null;

  const index = new Map();
  for (const courseDir of fs.readdirSync(SOURCES_DIR, { withFileTypes: true })) {
    if (!courseDir.isDirectory()) continue;
    const courseDirPath = path.join(SOURCES_DIR, courseDir.name);
    for (const file of fs.readdirSync(courseDirPath)) {
      if (!file.endsWith(".md")) continue;
      const fullPath = path.join(courseDirPath, file);
      const text = fs.readFileSync(fullPath, "utf8");

      const fm = text.match(FRONTMATTER_RE);
      const sourceId = fm?.[1].match(SOURCE_ID_RE)?.[1]?.trim();
      if (!sourceId) continue; // malformed source file — not this script's job to fix

      const headings = [];
      let m;
      HEADING_RE.lastIndex = 0;
      while ((m = HEADING_RE.exec(text))) {
        headings.push({ anchor: m[1], start: m.index, bodyStart: m.index + m[0].length });
      }
      const sections = new Map();
      headings.forEach((h, i) => {
        const bodyEnd = i + 1 < headings.length ? headings[i + 1].start : text.length;
        sections.set(h.anchor, text.slice(h.bodyStart, bodyEnd));
      });

      index.set(sourceId, { file: path.relative(process.cwd(), fullPath), sections });
    }
  }
  return index;
}

/**
 * Checks 2 + 3 for one topic's items against the source index.
 * @returns {{errors: string[], warnings: string[]}}
 */
function checkSourceIntegrity(items, sourceIndex) {
  const errors = [];
  if (sourceIndex === null) return { errors, warnings: [] };

  for (const item of items) {
    const p = item.provenance;
    if (!p?.sourceId || !p?.anchor) continue; // itemSchema's own validation already flags missing provenance

    const source = sourceIndex.get(p.sourceId);
    if (!source) {
      errors.push(`item ${item.id}: dead anchor — sourceId "${p.sourceId}" not found in sources/`);
      continue;
    }
    // provenance.anchor is stored WITH its leading "#" (itemSchema.js:
    // `@property {string} anchor e.g. "#s3-5"`); the heading parser's
    // capture group below is without one — normalize before the lookup.
    const anchorName = p.anchor.replace(/^#/, "");
    const section = source.sections.get(anchorName);
    if (section === undefined) {
      errors.push(`item ${item.id}: dead anchor — ${p.anchor} not found in ${source.file}`);
      continue;
    }
    if (p.excerpt && !normalize(section).includes(normalize(p.excerpt))) {
      errors.push(
        `item ${item.id}: excerpt drift — provenance.excerpt no longer appears verbatim under ${p.anchor} in ${source.file} (source was edited since this item was written, or the excerpt was mistyped)`
      );
    }
  }
  return { errors, warnings: [] };
}

/**
 * Length bias: a multiple-choice item whose correct answer is visibly the
 * longest choice can be answered without knowing anything about the subject.
 * Measured across this bank on 2026-08-09, the correct answer was the strictly
 * longest choice in 58% of rows — against ~25% for four choices if length
 * carried no signal — because a correct answer tends to get written with all
 * its qualifications attached while the distractors stay throwaway one-liners.
 *
 * The fix is per-item, not global: either trim the correct answer to its claim
 * or give the distractors the same specificity. Both are cheap; what isn't
 * cheap is a bank that quietly trains recognition of long text.
 *
 * A warning, not an error, and only past a margin — some questions have
 * genuinely uneven choices (a list of member names, a code fragment) where
 * padding a distractor would be worse than the tell it removes.
 */
const LENGTH_BIAS_MARGIN = 5;

function checkChoiceLengthBias(items) {
  const warnings = [];
  for (const item of items) {
    // Handles both shapes this script already accepts: promoted mcq items
    // (choices/answerIndex) and legacy questions[] rows (choices/answer).
    const choices = item.choices;
    const answer = item.answerIndex ?? item.answer;
    if (!Array.isArray(choices) || typeof answer !== "number") continue;
    if (!choices[answer]) continue;

    const lengths = choices.map((c) => String(c).length);
    const others = lengths.filter((_, i) => i !== answer);
    if (!others.length) continue;

    const gap = lengths[answer] - Math.max(...others);
    if (gap >= LENGTH_BIAS_MARGIN) {
      warnings.push(
        `item ${item.id ?? item.prompt?.slice(0, 40)}: length bias — the correct choice is ${gap} characters longer than the next longest, which is answerable without the material`
      );
    }
  }
  return warnings;
}

// Per-course allowlists for notation the tripwire would otherwise flag.
// Keyed by `topic.course` — the ids in src/data/courses.js, not the course
// numbers those cards display.
const ALLOWLIST = {
  cpp: [
    "o(1)", "o(n)", "o(log", "o(n^2)", "nullptr", "new", "delete", "cout",
    "endl", "const", "struct", "class", "->", "amortized", "big-o",
  ],
  discrete: [
    "∀", "∃", "¬", "∧", "∨", "→", "↔", "≡", "qed", "iff", "modulo",
    "contrapositive", "vacuously",
  ],
  spring:[
    "@springbootapplication", "@restcontroller", "@service", "@repository",
    "@autowired", "@component", "@bean", "@entity", "bean", "pom.xml",
    "maven", "gradle", "jpa", "http", "rest", "json",
  ],
  calcII: [
    "dx", "dy", "du", "dv", "d/dx", "f'(x)", "f''(x)", "∫", "∑", "lim",
    "sin", "cos", "tan", "sec", "csc", "cot", "arcsin", "arctan",
    "ln", "e^x", "chain rule", "product rule", "quotient rule",
  ],
};

async function loadTopics() {
  const mod = await import("../src/data/curriculum.js");
  const topics = mod.curriculum ?? mod.default ?? [];
  if (!Array.isArray(topics)) {
    throw new Error(
      "curriculum.js did not export an array — expected `curriculum` or a default export"
    );
  }
  return topics;
}

function policyFor(topic) {
  // Courses default to extracted_only; a topic can opt out explicitly.
  return topic.contentPolicy ?? CONTENT_POLICY.EXTRACTED_ONLY;
}

const RED = "\x1b[31m";
const YEL = "\x1b[33m";
const GRN = "\x1b[32m";
const DIM = "\x1b[2m";
const OFF = "\x1b[0m";

const topics = await loadTopics();
const sourceIndex = loadSourceIndex();

let totalErrors = 0;
let totalWarnings = 0;
let totalLive = 0;
let totalEligible = 0;

for (const topic of topics) {
  let items;

  if (topic.items) {
    items = topic.items;
  }
  else if (topic.questions) {
    items = topic.questions;   // older topics still use this name
  }
  else {
    items = [];
  }

  if (items.length === 0) {
    console.log(YEL + "⚠" + OFF + "  " + topic.id + " — no items");
    totalWarnings++;
    continue;
  }

 // Figure out the two settings first, so the call below is plain.
  const policy = policyFor(topic);
  const allowlist = ALLOWLIST[topic.course] ?? [];

// Run the schema audit.
  const result = auditBank(items, { policy: policy, allowlist: allowlist });

// Run the source-file checks separately.
  const integrity = checkSourceIntegrity(items, sourceIndex);

// Merge the second set of errors into the first.
  for (const err of integrity.errors) {
    result.errors.push(err);
  }

// And the choice-length tell, which is a warning rather than an error.
  for (const warning of checkChoiceLengthBias(items)) {
    result.warnings.push(warning);
  }

  totalErrors += result.errors.length;
  totalWarnings += result.warnings.length;
  totalLive += result.live;
  totalEligible += result.rotationEligible;

  // Green check if nothing failed, red X otherwise.
  let mark;
  if (result.errors.length === 0) {
    mark = GRN + "✓" + OFF;
  }
  else {
    mark = RED + "✗" + OFF;
  }

  // Summary line for this topic.
  console.log(
    mark + "  " + topic.id + " " + DIM +
    "— " + result.live + " live, " +
    result.rotationEligible + " in rotation" + OFF
  );

  // Then every error, then every warning, one per line.
  for (const e of result.errors) {
    console.log("   " + RED + "error" + OFF + "  " + e);
  }

  for (const w of result.warnings) {
    console.log("   " + YEL + "warn " + OFF + "  " + w);
  }
}

console.log(
  `\n${totalLive} live items · ${totalEligible} verified for rotation · ` +
    `${totalErrors} error(s) · ${totalWarnings} warning(s)`
);
if (sourceIndex === null) {
  console.log(
    `${DIM}sources/ not present locally — dead-anchor and excerpt-drift checks (CS_DRILL §7 checks 2/3) skipped.${OFF}`
  );
}

if (totalLive && totalEligible / totalLive < 0.5) {
  console.log(
    `${YEL}Fewer than half the bank is human-verified. Verification is itself ` +
      `a study rep — batch-review before drilling.${OFF}`
  );
}

process.exit(totalErrors > 0 ? 1 : 0);
