// Authoring-side helpers for the `**bold**` markup, used by Edit Mode.
//
// The thing to keep in mind everywhere below: in SkillTape `**double asterisks**`
// are not decoration. They are simultaneously the bold run in Learn mode and the
// fill-in-the-blank in Fill Mode, so an author editing a card body is editing the
// quiz at the same time. Two consequences drive this file:
//
//   1. The delimiter is worth a toolbar button — nobody should be counting
//      asterisks by hand. That is toggleBold().
//   2. Broken markup fails *silently*. The blank regex is /(\*\*[^*]+\*\*)/, so
//      a stray asterisk does not raise anything; the text simply stops being a
//      blank and renders as literal asterisks. That is validateBody().
//
// Everything here is pure: strings and indices in, strings and indices out. No
// React, no DOM — the caller owns the <textarea>.

// Extension included so this module also loads under bare Node, which is what
// lets these pure helpers be exercised without a browser or a bundler.
import { BOLD_RE, parseBold } from "./fill.js";

// BOLD_RE is global, so its lastIndex is mutable shared state. Any use other
// than split() gets a fresh copy.
function boldRe() {
  return new RegExp(BOLD_RE.source, "g");
}

// What counts as one "word" when the button is pressed with nothing selected.
// Deliberately wider than \w, because the terms worth blanking in this
// curriculum read as a single token to a human even when they are full of
// punctuation: O(n²), ~ClassName, operator<<, std::vector, size_t.
// Note the two exclusions: whitespace (the obvious boundary) and `*` itself, so
// a caret sitting inside an existing **blank** expands to just the inner text.
const WORD_CHAR = /[A-Za-z0-9_⁰¹²³⁴⁵⁶⁷⁸⁹ⁿ()[\]{}<>:.,~^&+#$'-]/;

// Punctuation that may end a sentence rather than the term. Trimmed off the
// right edge of an auto-expanded word so bolding "destructor." in prose gives
// **destructor** and leaves the period outside.
const TRAILING_PUNCT = /[.,;:!?]/;

// Toggle `**` around a <textarea> selection — the "B" toolbar button.
//
// Returns the whole new body plus the selection to restore, or { error } when
// the request cannot be honoured without producing markup that would break.
// The returned selection always covers the INNER text, never the asterisks, so
// pressing B twice is an exact round-trip back to the original string.
//
//   text       full textarea value
//   start/end  selectionStart / selectionEnd (start === end means a bare caret)
export function toggleBold(text, start, end) {
  const body = String(text ?? "");
  let a = clamp(start, body.length);
  let b = clamp(end, body.length);
  if (a > b) [a, b] = [b, a];

  const caretOnly = a === b;

  // A bare caret means "bold the word I'm standing in".
  if (caretOnly) {
    const word = wordAt(body, a);
    if (!word) return insertEmptyPair(body, a);
    a = word.start;
    b = word.end;
  }

  // Pull the edges inward past whitespace, so dragging across " foo " gives
  // **foo** rather than the ragged ** foo **.
  while (a < b && /\s/.test(body[a])) a++;
  while (b > a && /\s/.test(body[b - 1])) b--;
  if (a === b) return insertEmptyPair(body, clamp(start, body.length));

  const sel = body.slice(a, b);

  // --- Unwrap, case 1: the asterisks are inside the selection ------------
  // Checked before the stray-`*` guard below: removing markup is always safe,
  // even when the text it wrapped is itself malformed.
  if (sel.length >= 4 && sel.startsWith("**") && sel.endsWith("**")) {
    const inner = sel.slice(2, -2);
    return {
      text: body.slice(0, a) + inner + body.slice(b),
      selStart: a,
      selEnd: a + inner.length,
    };
  }

  // --- Unwrap, case 2: the asterisks are just outside the selection ------
  // This is the round-trip path. Wrapping returns a selection over the inner
  // text, so pressing B again lands here.
  if (body.slice(a - 2, a) === "**" && body.slice(b, b + 2) === "**") {
    return {
      text: body.slice(0, a - 2) + sel + body.slice(b + 2),
      selStart: a - 2,
      selEnd: a - 2 + sel.length,
    };
  }

  // --- Wrap -------------------------------------------------------------
  // The blank pattern is [^*]+, so an asterisk anywhere inside would stop the
  // result from being a blank at all — and it would fail quietly. Refuse.
  if (sel.includes("*")) {
    return {
      error:
        `Cannot bold "${ellipsis(sel)}" — it contains a "*". A blank's text ` +
        `cannot contain an asterisk, so the markup would render as literal ` +
        `characters instead of a blank. Remove the "*" first.`,
    };
  }

  return {
    text: body.slice(0, a) + "**" + sel + "**" + body.slice(b),
    selStart: a + 2,
    selEnd: a + 2 + sel.length,
  };
}

// Nothing to wrap: drop an empty pair in and park the caret between them, ready
// for the author to type the answer.
function insertEmptyPair(body, at) {
  return {
    text: body.slice(0, at) + "****" + body.slice(at),
    selStart: at + 2,
    selEnd: at + 2,
  };
}

// The run of word characters containing (or immediately touching) `pos`, with
// any sentence punctuation trimmed off the end. Null when the caret is in open
// space or on a bare punctuation mark.
function wordAt(body, pos) {
  let s = pos;
  let e = pos;
  while (s > 0 && WORD_CHAR.test(body[s - 1])) s--;
  while (e < body.length && WORD_CHAR.test(body[e])) e++;
  while (e > s && TRAILING_PUNCT.test(body[e - 1])) e--;
  return e > s ? { start: s, end: e } : null;
}

function clamp(n, max) {
  const v = Number.isFinite(n) ? Math.trunc(n) : 0;
  return Math.max(0, Math.min(max, v));
}

// Author guidance for one card body.
//
// Returns { blanks, errors, warnings }. Errors are markup that will not do what
// the author meant; warnings are style advice from docs/AUTHORING.md.
//
// The whole point is that the blank regex never complains. `**operator***` looks
// finished, but /(\*\*[^*]+\*\*)/ consumes `**operator**` and leaves the third
// asterisk behind as ordinary text — Learn mode renders a bold word followed by
// a naked "*", Fill Mode makes a blank out of it, and nothing anywhere says so.
// The checks below are what turns that silence into a message.
export function validateBody(text) {
  const body = String(text ?? "");
  const errors = [];
  const warnings = [];
  const blanks = parseBold(body).filter((t) => t.type === "blank").length;

  const matches = [...body.matchAll(boldRe())];

  // Check 1: an asterisk pressed up against a blank that otherwise parsed fine.
  // A `*` neighbouring a match is only innocent when it belongs to the adjacent
  // match — `**a****b**` is two legal blanks touching, `**a***` is not.
  for (let i = 0; i < matches.length; i++) {
    const m = matches[i];
    const from = m.index;
    const to = m.index + m[0].length;
    const prev = matches[i - 1];
    const next = matches[i + 1];
    const strayBefore =
      body[from - 1] === "*" && !(prev && prev.index + prev[0].length === from);
    const strayAfter = body[to] === "*" && !(next && next.index === to);
    if (strayBefore || strayAfter) {
      errors.push(
        `Broken blank near "${context(body, from, to)}" — an extra "*" is ` +
          `stuck to ${m[0].length > 24 ? "this blank" : `"${m[0]}"`}. The ` +
          `delimiters pair off from the left, so the leftover asterisk is ` +
          `dropped into the text and shown literally. Delete it.`
      );
    }
  }

  // Check 2: asterisks left over once every well-formed blank is removed. Runs
  // are read by length: 4+ is an empty blank, 2–3 is a `**` that never closed.
  // A lone `*` is left alone on purpose — the curriculum uses single asterisks
  // for *emphasis* and for pointer declarations like `Node *head`.
  const remainder = mask(body, matches);
  for (const run of remainder.matchAll(/\*+/g)) {
    if (run[0].length >= 4) {
      errors.push(
        `Empty blank near "${context(body, run.index, run.index + run[0].length)}" ` +
          `— "****" has nothing between the delimiters. Put the answer inside, ` +
          `or delete the asterisks.`
      );
    } else if (run[0].length >= 2) {
      errors.push(
        `Unclosed blank near "${context(body, run.index, run.index + run[0].length)}" ` +
          `— this "**" has no matching "**" after it. A blank is written ` +
          `**like this**, and the text between the delimiters cannot contain "*".`
      );
    }
  }

  // Advice, not breakage: docs/AUTHORING.md §3.2 asks for roughly 3–6 blanks per
  // card. Too few and Fill Mode has nothing to ask; too many and the card is
  // more hole than sentence. Silent on an empty body — a card being written is
  // not a card being wrong.
  if (body.trim()) {
    if (blanks === 0) {
      warnings.push(
        `No blanks — Fill Mode has nothing to ask here. Bold the terms worth ` +
          `recalling cold (AUTHORING §3.2 suggests roughly 3–6 per card).`
      );
    } else if (blanks < 3) {
      warnings.push(
        `Only ${blanks} blank${blanks === 1 ? "" : "s"} — AUTHORING §3.2 ` +
          `suggests roughly 3–6 per card.`
      );
    } else if (blanks > 6) {
      warnings.push(
        `${blanks} blanks — AUTHORING §3.2 suggests roughly 3–6 per card. ` +
          `"A card that's half-bold becomes unfillable noise."`
      );
    }
  }

  return { blanks, errors, warnings };
}

// Blank out the matched spans so what remains is only the markup nobody claimed.
// Spaces rather than deletion, so indices still line up with the original text.
function mask(body, matches) {
  let out = body;
  for (const m of matches) {
    out =
      out.slice(0, m.index) +
      " ".repeat(m[0].length) +
      out.slice(m.index + m[0].length);
  }
  return out;
}

// A short, single-line quote of the text around [from, to) for error messages —
// enough for the author to find the spot without dumping the paragraph.
function context(body, from, to, pad = 18) {
  const s = Math.max(0, from - pad);
  const e = Math.min(body.length, to + pad);
  const quoted = body.slice(s, e).replace(/\s+/g, " ").trim();
  return (s > 0 ? "…" : "") + quoted + (e < body.length ? "…" : "");
}

function ellipsis(str, max = 40) {
  const flat = str.replace(/\s+/g, " ");
  return flat.length > max ? flat.slice(0, max - 1) + "…" : flat;
}
