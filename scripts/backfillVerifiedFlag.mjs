/**
 * scripts/backfillVerifiedFlag.mjs
 *
 * One-time migration. Legacy questions[] rows were authored before
 * `verifiedByHuman` existed, so "not verified" was expressed as the key being
 * absent. That is invisible in the file: you cannot read a question and see
 * that it still needs review, and you cannot grep for what is left.
 *
 * This writes `verifiedByHuman: false` into every legacy question that has no
 * flag, so the state is on the page like it already is on makeItem() items.
 * The review tool then flips false to true, and never inserts.
 *
 *   node scripts/backfillVerifiedFlag.mjs --dry-run
 *   node scripts/backfillVerifiedFlag.mjs
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { setFlag, writeAtomic } from "../tools/verify/flag.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..");
const topicsDir = path.join(repoRoot, "src", "data", "topics");

const dryRun = process.argv.includes("--dry-run");

let scanned = 0;
let written = 0;
let skipped = 0;

for (const course of fs.readdirSync(topicsDir)) {
  const courseDir = path.join(topicsDir, course);
  if (!fs.statSync(courseDir).isDirectory()) continue;

  for (const file of fs.readdirSync(courseDir)) {
    if (!file.endsWith(".js")) continue;

    const filePath = path.join(courseDir, file);
    const mod = await import(pathToFileURL(filePath).href);
    const questions = mod.default?.questions ?? [];
    if (!questions.length) continue;

    let src = fs.readFileSync(filePath, "utf8");
    let touched = 0;

    for (const question of questions) {
      scanned++;
      if (question.verifiedByHuman !== undefined) {
        skipped++;
        continue;
      }

      const result = setFlag(src, question.id, false);
      if (!result.ok) {
        console.error(`  ${question.id}: ${result.reason}`);
        continue;
      }

      src = result.src;
      touched++;
    }

    if (touched === 0) continue;

    if (!dryRun) writeAtomic(filePath, src);
    written += touched;
    console.log(`  ${touched.toString().padStart(3)}  ${path.relative(repoRoot, filePath)}`);
  }
}

console.log("");
console.log(`${scanned} legacy questions scanned`);
console.log(`${written} flagged verifiedByHuman: false`);
console.log(`${skipped} already carried a flag`);
if (dryRun) console.log("\ndry run, nothing written");
