/**
 * src/data/itemSchema.js
 *
 * The current question shape — { prompt, choices, answer, explanation } — can
 * only express multiple choice. That is a schema-level constraint forcing the
 * one format least likely to move a closed-book exam score. This module makes
 * the shape polymorphic and makes provenance mandatory.
 *
 * No dependencies, so it drops straight into the existing Vite app.
 */

// ---------------------------------------------------------------------------
// Formats
// ---------------------------------------------------------------------------

export const FORMATS = {
  RECALL: "recall", // cold definition/rule/theorem, blank page
  WRITE: "write", // produce a function or proof from a spec, no IDE
  TRACE: "trace", // given code, produce output or final state
  ERROR: "error", // locate the bug / invalid proof step and name the rule
  CLOZE: "cloze", // one load-bearing token blanked in a skeleton
  COMPARE: "compare", // state the discriminating difference between two concepts
  COMPLEXITY: "complexity", // Big-O plus the justification
  MCQ: "mcq", // selection — capped, see QUOTAS
};

/**
 * Target share of a topic's item bank, per format.
 *
 * MCQ is capped at 0.05. Recognizing the right answer among four options is a
 * different skill from producing it on a blank page, and it inflates
 * confidence without moving exam performance.
 */
export const QUOTAS = {
  [FORMATS.RECALL]: 0.25,
  [FORMATS.WRITE]: 0.2,
  [FORMATS.TRACE]: 0.15,
  [FORMATS.ERROR]: 0.1,
  [FORMATS.CLOZE]: 0.1,
  [FORMATS.COMPARE]: 0.1,
  [FORMATS.COMPLEXITY]: 0.05,
  [FORMATS.MCQ]: 0.05,
};

/** Formats that are self-graded free text rather than machine-checked. */
export const SELF_GRADED = new Set([
  FORMATS.RECALL,
  FORMATS.WRITE,
  FORMATS.ERROR,
  FORMATS.COMPARE,
  FORMATS.COMPLEXITY,
]);

// ---------------------------------------------------------------------------
// Content policy
// ---------------------------------------------------------------------------

/**
 * The axis that matters is GROUNDING, not authorship.
 *
 * Generation is permitted. What is not permitted is an item whose answer can't
 * be checked against real source text. A model reformatting a zyBooks sentence
 * into a question is fine; a model recalling something about linked lists from
 * its own weights is not, because there is nothing to verify it against.
 *
 *   REQUIRE_PROVENANCE — any origin allowed, including generated, but every
 *                        item must carry an anchored verbatim excerpt and pass
 *                        human sign-off before entering rotation.
 *   OPEN               — provenance optional. For platform users pasting loose
 *                        notes with no citable source.
 */
export const CONTENT_POLICY = {
  REQUIRE_PROVENANCE: "require_provenance",
  OPEN: "open",

  // Deprecated alias — earlier drafts forbade generation outright.
  EXTRACTED_ONLY: "require_provenance",
  ALLOW_GENERATED: "open",
};

/** Extends the `source` enum already sketched in PLAN_PLATFORMIZE §2. */
export const ITEM_ORIGIN = {
  EXTRACTED: "extracted",   // deterministic transform of source text (fill.js)
  MANUAL: "manual",         // hand-authored
  GENERATED: "generated",   // model-phrased from a supplied excerpt
};

// ---------------------------------------------------------------------------
// Shapes
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} Provenance
 * @property {string} sourceId   e.g. "zybooks-cs2401-ch03"
 * @property {string} anchor     e.g. "#s3-5" — must resolve in the source file
 * @property {string} excerpt    VERBATIM source text, >= 1 full sentence
 * @property {string} citation   human-readable, e.g. "Epp 5e, §5.2"
 */

/**
 * @typedef {Object} Item
 * @property {string}   id
 * @property {string}   topicId
 * @property {string}   format          one of FORMATS
 * @property {string}   origin          one of ITEM_ORIGIN
 * @property {string}   prompt
 * @property {string}   expected        the model answer (free text or code)
 * @property {string[]} criteria        must-hit points for honest self-grading
 * @property {Provenance|null} provenance  required unless origin === MANUAL
 * @property {number}   difficulty      1..3
 * @property {boolean}  verifiedByHuman gate for entering drill rotation
 * @property {string[]} [choices]       MCQ only
 * @property {number}   [answerIndex]   MCQ only
 * @property {number}   [timeBudgetSec] WRITE items must set this
 * @property {string[]} [extraAtoms]    COMPARE only — additional source refs
 * @property {boolean}  [retired]
 */

/** Field defaults so migrated legacy questions don't explode on read. */
export function makeItem(partial) {
  return {
    id: partial.id,
    topicId: partial.topicId,
    format: partial.format ?? FORMATS.MCQ,
    origin: partial.origin ?? ITEM_ORIGIN.MANUAL,
    prompt: partial.prompt ?? "",
    expected: partial.expected ?? "",
    criteria: partial.criteria ?? [],
    provenance: partial.provenance ?? null,
    difficulty: partial.difficulty ?? 2,
    verifiedByHuman: partial.verifiedByHuman ?? false,
    retired: partial.retired ?? false,
    ...partial,
  };
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const STOPWORDS = new Set(
  ("a an the and or but if then of to in on for with is are was were be been " +
    "this that these those it its as at by from not no you your we our can " +
    "will would should may might must each every any all both which what when " +
    "where why how than into over under between about after before during")
    .split(" ")
);

/**
 * Content words in `text` that appear in neither the excerpt nor the allowlist.
 *
 * A HEURISTIC TRIPWIRE, NOT A PROOF. It flags candidates for human review. A
 * clean result does not mean an item is factually correct — only human sign-off
 * (`verifiedByHuman`) establishes that.
 */
export function novelTokens(text, excerpt, allowlist = []) {
  const allowed = new Set(allowlist.map((t) => t.toLowerCase()));
  const norm = (s) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9_→∀∃¬∧∨()<>*&.:-]+/g, " ")
      .split(/\s+/)
      .filter(Boolean);

  const inSource = new Set(norm(excerpt));
  return [
    ...new Set(
      norm(text).filter(
        (t) =>
          t.length > 2 &&
          !STOPWORDS.has(t) &&
          !inSource.has(t) &&
          !allowed.has(t)
      )
    ),
  ];
}

/**
 * @returns {{ errors: string[], warnings: string[] }}
 */
export function validateItem(item, opts = {}) {
  const policy = opts.policy ?? CONTENT_POLICY.EXTRACTED_ONLY;
  const allowlist = opts.allowlist ?? [];
  const errors = [];
  const warnings = [];
  const at = `item ${item.id ?? "<no id>"}`;

  if (!item.id) errors.push("missing id");
  if (!item.topicId) errors.push(`${at}: missing topicId`);
  if (!Object.values(FORMATS).includes(item.format))
    errors.push(`${at}: unknown format "${item.format}"`);
  if (!item.prompt?.trim()) errors.push(`${at}: empty prompt`);

  // --- provenance ---
  if (policy === CONTENT_POLICY.REQUIRE_PROVENANCE) {
    // Generated items are allowed, but must record what produced them so a bad
    // prompt or model version can be traced and the batch regenerated.
    if (item.origin === ITEM_ORIGIN.GENERATED && !item.generationMeta)
      errors.push(`${at}: generated item missing generationMeta`);

    const p = item.provenance;
    if (!p) {
      errors.push(`${at}: provenance required: no source excerpt to verify the answer against`);
    } else {
      if (!p.sourceId) errors.push(`${at}: provenance.sourceId missing`);
      if (!p.anchor) errors.push(`${at}: provenance.anchor missing`);
      if (!p.excerpt || p.excerpt.trim().length < 20)
        errors.push(`${at}: provenance.excerpt missing or too short`);
      if (!p.citation) warnings.push(`${at}: no human-readable citation`);
    }

    // Human sign-off is the only real accuracy guarantee. Generated items get
    // no benefit of the doubt.
    if (item.origin === ITEM_ORIGIN.GENERATED && !item.verifiedByHuman)
      warnings.push(`${at}: generated and unverified — review before drilling`);
  }

  // --- format-specific ---
  if (item.format === FORMATS.MCQ) {
    if (!Array.isArray(item.choices) || item.choices.length < 2)
      errors.push(`${at}: mcq needs >= 2 choices`);
    if (
      typeof item.answerIndex !== "number" ||
      item.answerIndex < 0 ||
      item.answerIndex >= (item.choices?.length ?? 0)
    )
      errors.push(`${at}: mcq answerIndex out of range`);
  } else {
    if (item.choices || typeof item.answerIndex === "number")
      warnings.push(`${at}: non-mcq item carries mcq fields`);
    if (!item.expected?.trim())
      errors.push(`${at}: ${item.format} requires an expected answer`);
  }

  if (item.format === FORMATS.WRITE && !item.timeBudgetSec)
    errors.push(`${at}: write items must set timeBudgetSec`);

  if (item.format === FORMATS.COMPARE && !item.extraAtoms?.length)
    warnings.push(`${at}: compare item references only one source`);

  if (SELF_GRADED.has(item.format) && (item.criteria?.length ?? 0) < 2)
    errors.push(
      `${at}: self-graded ${item.format} needs >= 2 criteria (checklist, not vibes)`
    );

  // --- tripwire ---
  if (item.provenance?.excerpt && item.expected) {
    const novel = novelTokens(item.expected, item.provenance.excerpt, allowlist);
    if (novel.length)
      warnings.push(`${at}: expected answer has novel tokens: ${novel.join(", ")}`);
  }

  return { errors, warnings };
}

/**
 * Bank-level audit: per-item validity, format distribution vs QUOTAS, and
 * rotation eligibility.
 */
export function auditBank(items, opts = {}) {
  const errors = [];
  const warnings = [];

  for (const item of items) {
    const r = validateItem(item, opts);
    errors.push(...r.errors);
    warnings.push(...r.warnings);
  }

  const live = items.filter((i) => !i.retired);
  const counts = {};
  for (const f of Object.values(FORMATS)) counts[f] = 0;
  for (const i of live) if (counts[i.format] !== undefined) counts[i.format]++;

  const distribution = {};
  for (const [f, n] of Object.entries(counts)) {
    const share = live.length ? n / live.length : 0;
    distribution[f] = { count: n, share, target: QUOTAS[f] };
    if (f === FORMATS.MCQ && share > QUOTAS[f] + 0.02) {
      warnings.push(
        `bank: mcq is ${(share * 100).toFixed(0)}% of items, cap is ${
          QUOTAS[f] * 100
        }%`
      );
    }
  }

  const unverifiedLive = live.filter((i) => !i.verifiedByHuman);
  if (unverifiedLive.length)
    warnings.push(
      `bank: ${unverifiedLive.length} unverified item(s) eligible for rotation`
    );

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    total: items.length,
    live: live.length,
    distribution,
    rotationEligible: live.filter((i) => i.verifiedByHuman).length,
  };
}

/**
 * Migrates a legacy { prompt, choices, answer, explanation } question.
 *
 * Deliberately does NOT invent provenance. Legacy items land as MANUAL +
 * unverified so the audit lists them for backfill instead of silently
 * laundering hand-written content into "extracted".
 */
export function migrateLegacyQuestion(q, topicId, index) {
  return makeItem({
    id: `${topicId}-legacy-${index}`,
    topicId,
    format: FORMATS.MCQ,
    origin: ITEM_ORIGIN.MANUAL,
    prompt: q.prompt,
    choices: q.choices,
    answerIndex: typeof q.answer === "number" ? q.answer : q.answerIndex,
    expected: q.choices?.[q.answer ?? q.answerIndex] ?? "",
    criteria: q.explanation ? [q.explanation] : [],
    provenance: null,
    verifiedByHuman: false,
  });
}
