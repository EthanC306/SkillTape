import React, { useMemo } from "react";
import { PALETTE, MONO, RADII, SYNTAX } from "../data/theme";

/**
 * CodeBlock — a <pre> listing with IDE-style C++ syntax coloring.
 *
 * The bank's `code` fields are all C++ snippets lifted from lecture slides, so
 * the highlighter is a small hand-rolled tokenizer rather than a dependency:
 * comments, string/char literals, preprocessor lines, numbers, keywords, types,
 * and called identifiers. Anything it doesn't recognize falls through as plain
 * text, which keeps a mis-tokenized snippet readable instead of broken.
 */

const KEYWORDS = new Set([
  "alignas", "alignof", "auto", "break", "case", "catch", "class", "const", "constexpr",
  "continue", "default", "delete", "do", "else", "enum", "explicit", "export", "extern",
  "false", "for", "friend", "goto", "if", "inline", "mutable", "namespace", "new",
  "noexcept", "nullptr", "operator", "private", "protected", "public", "return",
  "sizeof", "static", "struct", "switch", "template", "this", "throw", "true", "try",
  "typedef", "typename", "union", "using", "virtual", "while",
]);

const TYPES = new Set([
  "bool", "char", "double", "float", "int", "long", "short", "signed", "unsigned",
  "void", "wchar_t", "size_t", "string", "ostream", "istream", "ifstream", "ofstream",
  "vector", "list", "set", "multiset", "map", "multimap", "pair", "stack", "queue",
  "deque", "iterator", "std",
]);

// One pass, longest-context-first: comments and literals must win over the
// operator characters they contain (e.g. the `/` inside a `//` comment).
const TOKEN_RE = new RegExp(
  [
    "(\\/\\/[^\\n]*|\\/\\*[\\s\\S]*?\\*\\/)", // 1 comment
    "(\"(?:[^\"\\\\\\n]|\\\\.)*\"|'(?:[^'\\\\\\n]|\\\\.)*')", // 2 string / char literal
    "(^[ \\t]*#[A-Za-z_]+)", // 3 preprocessor directive
    "(<[A-Za-z_][A-Za-z0-9_.\\/]*>)", // 4 include target, e.g. <cassert>
    "(\\b\\d[\\d.]*[A-Za-z]*\\b)", // 5 number
    "([A-Za-z_][A-Za-z0-9_]*)", // 6 identifier
    "([{}()\\[\\];,<>+\\-*/%=!&|~?:.]+)", // 7 operator / punctuation
  ].join("|"),
  "gm",
);

const IS_SHOUTY = /^[A-Z][A-Z0-9_]+$/; // CAPACITY, MAX_SIZE — read as constants
const IS_CAPPED = /^[A-Z]/; // Node, Stack, Item, T — user-defined types

/** Color for a bare identifier. `called` = a `(` follows it. */
function identColor(id, called) {
  if (KEYWORDS.has(id)) return SYNTAX.keyword;
  if (TYPES.has(id)) return SYNTAX.type;
  if (IS_SHOUTY.test(id)) return SYNTAX.constant;
  if (called) return SYNTAX.func;
  if (IS_CAPPED.test(id)) return SYNTAX.type;
  return SYNTAX.plain;
}

/** Splits `code` into [{ text, color, italic }] spans. */
function tokenize(code) {
  const out = [];
  let last = 0;
  let m;

  TOKEN_RE.lastIndex = 0;
  while ((m = TOKEN_RE.exec(code)) !== null) {
    if (m.index > last) out.push({ text: code.slice(last, m.index), color: SYNTAX.plain });
    last = m.index + m[0].length;

    const [text, comment, literal, preproc, include, number, ident] = m;
    if (comment) out.push({ text, color: SYNTAX.comment, italic: true });
    else if (literal) out.push({ text, color: SYNTAX.string });
    else if (preproc) out.push({ text, color: SYNTAX.preproc });
    else if (include) {
      // `<cassert>` is an include target only after a #include; everywhere else
      // this shape is a template argument list — Stack<Item>, Pair<int>.
      const before = code.slice(code.lastIndexOf("\n", m.index) + 1, m.index);
      if (/#\s*include\s*$/.test(before)) out.push({ text, color: SYNTAX.string });
      else {
        const inner = text.slice(1, -1);
        out.push({ text: "<", color: SYNTAX.punct });
        out.push({ text: inner, color: identColor(inner, false) });
        out.push({ text: ">", color: SYNTAX.punct });
      }
    } else if (number) out.push({ text, color: SYNTAX.constant });
    // A trailing `(` is what separates a call from a plain variable.
    else if (ident) out.push({ text, color: identColor(ident, /^\s*\(/.test(code.slice(last))) });
    else out.push({ text, color: SYNTAX.punct });
  }

  if (last < code.length) out.push({ text: code.slice(last), color: SYNTAX.plain });
  return out;
}

export default function CodeBlock({ code, style }) {
  const tokens = useMemo(() => tokenize(code), [code]);

  return (
    <pre
      style={{
        background: PALETTE.bg,
        border: `1px solid ${PALETTE.line}`,
        borderRadius: RADII.md,
        padding: 16,
        overflowX: "auto",
        fontFamily: MONO,
        fontSize: 13,
        lineHeight: 1.5,
        color: SYNTAX.plain,
        margin: 0,
        ...style,
      }}
    >
      <code>
        {tokens.map((t, i) => (
          <span key={i} style={{ color: t.color, fontStyle: t.italic ? "italic" : undefined }}>
            {t.text}
          </span>
        ))}
      </code>
    </pre>
  );
}
