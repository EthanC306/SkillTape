// Shared helpers for the Learn-view "Fill Mode" fill-in-the-blank practice.
//
// Grading is deliberately forgiving. A blank is recall practice, not a spelling
// test, so a typed answer is accepted when it means the same thing as the hidden
// word. Three layers do that work, cheapest first:
//
//   1. normalize()  — canonical form: case, spacing, hyphens, exponents,
//                     surrounding punctuation, and number words ("two" -> "2").
//   2. variants()   — other spellings of the same canonical form, chiefly
//                     singular/plural ("program" <-> "programs").
//   3. aliases      — declared synonyms that no rule could derive, either
//                     site-wide (ALIAS_GROUPS below) or per card (`accept`).
//
// Layers 1 and 2 are automatic and need no changes to the topic files.

// Same split as Inline.jsx — the **bold** segments are the blanks to fill.
export const BOLD_RE = /(\*\*[^*]+\*\*)/g;

// Break a card body into tokens: plain text and fillable blanks.
// Returns [{ type: "text" | "blank", value }]. For blanks, value is the
// inner word(s) with the surrounding ** stripped.
export function parseBold(text) {
  return String(text)
    .split(BOLD_RE)
    .filter((p) => p !== "")
    .map((p) =>
      p.startsWith("**") && p.endsWith("**")
        ? { type: "blank", value: p.slice(2, -2) }
        : { type: "text", value: p }
    );
}

const SUPERSCRIPTS = {
  "⁰": "0", "¹": "1", "²": "2", "³": "3", "⁴": "4",
  "⁵": "5", "⁶": "6", "⁷": "7", "⁸": "8", "⁹": "9",
  "ⁿ": "n",
};

// Spelled-out numbers are folded to digits so "two" and "2" are the same answer.
// Only the range that actually shows up in prose is covered.
const NUMBER_WORDS = {
  zero: "0", one: "1", two: "2", three: "3", four: "4", five: "5",
  six: "6", seven: "7", eight: "8", nine: "9", ten: "10", eleven: "11",
  twelve: "12", thirteen: "13", fourteen: "14", fifteen: "15",
  sixteen: "16", seventeen: "17", eighteen: "18", nineteen: "19",
  twenty: "20", thirty: "30", forty: "40", fifty: "50", sixty: "60",
  seventy: "70", eighty: "80", ninety: "90", hundred: "100",
};

// Plurals no rule can reach. Keys are already-normalized plural forms.
const IRREGULAR_PLURALS = {
  indices: "index",
  indexes: "index",
  vertices: "vertex",
  matrices: "matrix",
  children: "child",
  leaves: "leaf",
  people: "person",
};

// Site-wide synonym groups: every member of a group is accepted for any other.
// Use this only for terms that are genuinely interchangeable everywhere in the
// curriculum — anything course- or card-specific belongs in a card's `accept`
// map instead. Entries are compared after normalize(), so write them lowercase.
// e.g. ["o(1)", "constant time"] would let either spelling satisfy the other.
const ALIAS_GROUPS = [];

// Canonical comparison form. Folds away everything that carries no meaning for
// recall: case, surrounding punctuation and quotes, exponent notation, internal
// hyphens, repeated whitespace, and number words.
// "O(n²)", "O(n^2)", and "o(n 2)" all reduce to the same string, and so do
// "linked-list" and "Linked List".
export function normalize(str) {
  return String(str)
    .replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹ⁿ]/g, (c) => SUPERSCRIPTS[c])
    .replace(/\^/g, "")
    .toLowerCase()
    // Hyphen only between word characters, so a leading minus ("-1") survives
    // and stays distinct from "1".
    .replace(/(?<=[a-z0-9])[-–—](?=[a-z0-9])/g, " ")
    // Quotes, backticks, and trailing sentence punctuation are noise here.
    // Parentheses are left alone: "O(n)" needs them.
    .replace(/[`"“”'‘’]/g, "")
    // Trailing sentence punctuation goes, unless that is the whole answer —
    // a card may legitimately bold a bare ";" or "?".
    .replace(/(?<=.)[.,;:!?]+$/, "")
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .map((w) => NUMBER_WORDS[w] ?? w)
    .join(" ")
    .trim();
}

// Best-effort singular of one already-normalized word.
function singularize(word) {
  if (IRREGULAR_PLURALS[word]) return IRREGULAR_PLURALS[word];
  // Words that merely end in s are not plurals: class, status, basis, this.
  if (/(ss|us|is)$/.test(word)) return word;
  if (/(ch|sh|s|x|z)es$/.test(word)) return word.slice(0, -2);
  if (/[^aeiou]ies$/.test(word)) return word.slice(0, -3) + "y";
  if (/s$/.test(word)) return word.slice(0, -1);
  return word;
}

// Every spelling of `str` that should count as the same answer: the normalized
// form, its singular, and both with whitespace removed (so "o(n 2)" reaches
// "o(n2)"). Comparing two strings means intersecting their variant sets.
export function variants(str) {
  const base = normalize(str);
  const singular = base.split(" ").map(singularize).join(" ");
  const out = new Set([base, singular]);
  for (const v of [base, singular]) out.add(v.replace(/\s+/g, ""));
  return out;
}

// Declared synonyms for one answer, from the card's `accept` map plus any
// site-wide alias group the answer belongs to.
function aliasesFor(answer, accept) {
  const key = normalize(answer);
  const out = [];

  if (accept) {
    // The map may be keyed by the raw bold text or by its normalized form.
    for (const [k, v] of Object.entries(accept)) {
      if (normalize(k) === key) out.push(...(Array.isArray(v) ? v : [v]));
    }
  }
  for (const group of ALIAS_GROUPS) {
    if (group.some((g) => normalize(g) === key)) out.push(...group);
  }
  return out;
}

// Does `input` count as a correct answer for the hidden `answer`?
// `accept` is the optional per-card map of extra accepted spellings.
export function isCorrect(input, answer, accept) {
  if (!String(input).trim()) return false;
  const typed = variants(input);
  return [answer, ...aliasesFor(answer, accept)].some((candidate) => {
    for (const v of variants(candidate)) if (typed.has(v)) return true;
    return false;
  });
}
