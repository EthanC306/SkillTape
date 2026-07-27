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

import { auditBank, CONTENT_POLICY } from "../src/data/itemSchema.js";

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

let totalErrors = 0;
let totalWarnings = 0;
let totalLive = 0;
let totalEligible = 0;

for (const topic of topics) {
  // Accept both the new `items` array and the legacy `questions` array.
  const items = topic.items ?? topic.questions ?? [];
  if (!items.length) {
    console.log(`${YEL}⚠${OFF}  ${topic.id} — no items`);
    totalWarnings++;
    continue;
  }

  const result = auditBank(items, {
    policy: policyFor(topic),
    allowlist: ALLOWLIST[topic.course] ?? [],
  });

  totalErrors += result.errors.length;
  totalWarnings += result.warnings.length;
  totalLive += result.live;
  totalEligible += result.rotationEligible;

  const mark = result.ok ? `${GRN}✓${OFF}` : `${RED}✗${OFF}`;
  console.log(
    `${mark}  ${topic.id} ${DIM}— ${result.live} live, ` +
      `${result.rotationEligible} in rotation${OFF}`
  );

  for (const e of result.errors) console.log(`   ${RED}error${OFF}  ${e}`);
  for (const w of result.warnings) console.log(`   ${YEL}warn ${OFF}  ${w}`);
}

console.log(
  `\n${totalLive} live items · ${totalEligible} verified for rotation · ` +
    `${totalErrors} error(s) · ${totalWarnings} warning(s)`
);

if (totalLive && totalEligible / totalLive < 0.5) {
  console.log(
    `${YEL}Fewer than half the bank is human-verified. Verification is itself ` +
      `a study rep — batch-review before drilling.${OFF}`
  );
}

process.exit(totalErrors > 0 ? 1 : 0);
