// Shared helpers for the Learn-view "Fill Mode" fill-in-the-blank practice.

// Same split as Inline.jsx — the **bold** segments are the blanks to fill.
const BOLD_RE = /(\*\*[^*]+\*\*)/g;

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

// Canonical comparison form so a typed answer can match the hidden word
// regardless of case, spacing, or how exponents are written:
// "O(n²)", "O(n^2)", and "o(n 2)" all normalize to "o(n2)".
export function normalize(str) {
  return String(str)
    .replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹ⁿ]/g, (c) => SUPERSCRIPTS[c])
    .replace(/\^/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}
