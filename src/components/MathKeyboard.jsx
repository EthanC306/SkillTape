import React, { useEffect, useRef, useState } from "react";
import { MONO, PALETTE, RADII } from "../data/theme";

// Templates use | as the caret position and {{selection}} as the text selected
// in the field. Keeping the saved value as Unicode/plain text means math stays
// readable in every existing surface (Learn, Flashcards, Fill, and Drill).
const GROUPS = [
  {
    label: "Calculus",
    keys: [
      ["∫", "∫ | dx", "integral"],
      ["∫ₐᵇ", "∫ₐᵇ | dx", "definite integral"],
      ["∬", "∬ | dA", "double integral"],
      ["Σ", "∑ₙ₌₁^∞ |", "infinite series"],
      ["lim", "limₓ→| ", "limit"],
      ["d/dx", "d/dx (|)", "derivative"],
      ["dy/dx", "dy/dx", "dy over dx"],
      ["f′", "f′(|)", "first derivative"],
      ["f″", "f″(|)", "second derivative"],
      ["dx", " dx", "dx"],
      ["du", " du", "du"],
      ["dt", " dt", "dt"],
    ],
  },
  {
    label: "Functions",
    keys: [
      ["√", "√({{selection}}|)", "square root"],
      ["ln", "ln({{selection}}|)", "natural logarithm"],
      ["eˣ", "e^({{selection}}|)", "exponential"],
      ["sin", "sin({{selection}}|)", "sine"],
      ["cos", "cos({{selection}}|)", "cosine"],
      ["tan", "tan({{selection}}|)", "tangent"],
      ["sec", "sec({{selection}}|)", "secant"],
      ["sin⁻¹", "sin⁻¹({{selection}}|)", "inverse sine"],
      ["a⁄b", "__fraction__", "stacked fraction"],
      ["|x|", "∣{{selection:x}}∣|", "absolute value"],
      ["( )", "({{selection}}|)", "parentheses"],
      ["[ ]", "[{{selection}}|]", "brackets"],
    ],
  },
  {
    label: "Symbols",
    keys: [
      ["∞", "∞", "infinity"], ["π", "π", "pi"], ["θ", "θ", "theta"],
      ["Δ", "Δ", "delta"], ["∂", "∂", "partial"], ["±", "±", "plus or minus"], ["≈", "≈", "approximately"],
      ["≠", "≠", "not equal"], ["≤", "≤", "less than or equal"],
      ["≥", "≥", "greater than or equal"], ["→", "→", "approaches"],
      ["x²", "{{selection:x}}²|", "squared"], ["x³", "{{selection:x}}³|", "cubed"],
      ["xⁿ", "{{selection:x}}ⁿ|", "nth power"], ["n!", "{{selection:n}}!|", "factorial"],
      ["·", "·", "multiply"], ["÷", "÷", "divide"],
    ],
  },
];

export function applyMathTemplate(value, start, end, template) {
  const selected = value.slice(start, end);
  let insertion = template
    .replace("{{selection}}", selected)
    .replace(/\{\{selection:([^}]+)\}\}/, selected || "$1");
  const marker = insertion.indexOf("|");
  insertion = insertion.replace("|", "");
  const caret = start + (marker < 0 ? insertion.length : marker);
  return { value: value.slice(0, start) + insertion + value.slice(end), caret };
}

/** A collapsible symbol palette for one controlled input or textarea. */
export default function MathKeyboard({ inputRef, value, onChange, label = "math keyboard" }) {
  const [open, setOpen] = useState(false);
  const [fraction, setFraction] = useState(null);
  const [fractionTarget, setFractionTarget] = useState("numerator");
  const numeratorRef = useRef(null);
  const denominatorRef = useRef(null);

  function insert(template) {
    // While composing a fraction, the palette belongs to its focused box. The
    // underlying card field must remain untouched until commitFraction runs.
    if (fraction) {
      const part = fractionTarget;
      const field = part === "numerator" ? numeratorRef.current : denominatorRef.current;
      const current = fraction[part];
      const result = applyMathTemplate(current, field?.selectionStart ?? current.length, field?.selectionEnd ?? current.length, template);
      setFraction((draft) => ({ ...draft, [part]: result.value }));
      requestAnimationFrame(() => {
        const target = part === "numerator" ? numeratorRef.current : denominatorRef.current;
        target?.focus();
        target?.setSelectionRange(result.caret, result.caret);
      });
      return;
    }
    const field = inputRef.current;
    if (!field) return;
    const result = applyMathTemplate(value, field.selectionStart ?? value.length, field.selectionEnd ?? value.length, template);
    onChange(result.value);
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.setSelectionRange(result.caret, result.caret);
    });
  }

  function openFraction() {
    const field = inputRef.current;
    if (!field) return;
    const start = field.selectionStart ?? value.length;
    const end = field.selectionEnd ?? value.length;
    setOpen(true);
    setFractionTarget(value.slice(start, end) ? "denominator" : "numerator");
    setFraction({ numerator: value.slice(start, end), denominator: "", start, end });
  }

  function commitFraction() {
    if (!fraction) return;
    const markup = `\\frac{${fraction.numerator}}{${fraction.denominator}}`;
    const next = value.slice(0, fraction.start) + markup + value.slice(fraction.end);
    const caret = fraction.start + markup.length;
    onChange(next);
    setFraction(null);
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.setSelectionRange(caret, caret);
    });
  }

  useEffect(() => {
    if (!fraction) return;
    (fractionTarget === "denominator" ? denominatorRef : numeratorRef).current?.focus();
  }, [fraction?.start]);

  // In Calculus II edit fields, slash is authoring shorthand for the same
  // stacked fraction produced by the palette. A selection becomes the
  // numerator; with no selection, a is supplied as an easy-to-replace prompt.
  useEffect(() => {
    const field = inputRef.current;
    if (!field) return undefined;
    function handleSlash(event) {
      if (event.key !== "/" || event.ctrlKey || event.metaKey || event.altKey) return;
      event.preventDefault();
      openFraction();
    }
    // Capture prevents the textarea's own handlers from consuming slash first.
    field.addEventListener("keydown", handleSlash, true);
    return () => field.removeEventListener("keydown", handleSlash, true);
  });

  const buttonStyle = {
    border: `1px solid ${PALETTE.line}`,
    background: "transparent",
    color: PALETTE.text,
    borderRadius: RADII.sm,
    padding: "5px 8px",
    fontFamily: "Georgia, 'Times New Roman', serif",
    fontSize: 14,
    cursor: "pointer",
    minWidth: 36,
  };

  return (
    <div style={{ display: "grid", gap: 7 }}>
      <button
        type="button"
        aria-expanded={open}
        aria-label={label}
        onClick={() => setOpen((shown) => !shown)}
        style={{ ...buttonStyle, justifySelf: "start", borderColor: PALETTE.accent, color: PALETTE.accent, fontFamily: MONO, fontSize: 11 }}
      >
        ∑ Math {open ? "▴" : "▾"}
      </button>
      {(open || fraction) && (
        <div style={{ border: `1px solid ${PALETTE.line}`, borderRadius: RADII.md, background: PALETTE.bg, padding: 9, display: "grid", gap: 8 }}>
          {open && GROUPS.map((group) => (
            <div key={group.label} style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
              <span style={{ width: 68, fontFamily: MONO, fontSize: 9, color: PALETTE.muted, textTransform: "uppercase" }}>{group.label}</span>
              {group.keys.map(([display, template, title]) => (
                <button
                  key={`${group.label}-${display}`}
                  type="button"
                  title={title}
                  aria-label={`Insert ${title}`}
                  onPointerDown={(event) => {
                    event.preventDefault();
                    // A nested fraction remains structured math inside the
                    // active fraction box; it is never sent to the card body.
                    if (template === "__fraction__" && fraction) insert("\\frac{}{|}");
                    else if (template === "__fraction__") openFraction();
                    else insert(template);
                  }}
                  style={buttonStyle}
                >
                  {display}
                </button>
              ))}
            </div>
          ))}
          {fraction && (
            <div role="group" aria-label="Fraction editor" style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", padding: "10px 12px", borderRadius: RADII.md, background: PALETTE.panel }}>
              <div style={{ display: "inline-grid", width: "min(280px, 100%)", fontFamily: "Georgia, 'Times New Roman', serif" }}>
                <input
                  ref={numeratorRef}
                  value={fraction.numerator}
                  onChange={(event) => setFraction((current) => ({ ...current, numerator: event.target.value }))}
                  onFocus={() => setFractionTarget("numerator")}
                  onKeyDown={(event) => {
                    if (event.key === "/") {
                      event.preventDefault();
                      insert("\\frac{}{|}");
                      return;
                    }
                    if (event.key === "Enter") {
                      event.preventDefault();
                      setFractionTarget("denominator");
                      denominatorRef.current?.focus();
                    }
                  }}
                  placeholder="numerator"
                  aria-label="Fraction numerator"
                  style={{ textAlign: "center", font: "inherit", fontSize: 16, color: PALETTE.text, background: PALETTE.bg, border: `1px solid ${PALETTE.line}`, borderRadius: `${RADII.sm}px ${RADII.sm}px 0 0`, padding: "7px 9px", borderBottomColor: PALETTE.text }}
                />
                <input
                  ref={denominatorRef}
                  value={fraction.denominator}
                  onChange={(event) => setFraction((current) => ({ ...current, denominator: event.target.value }))}
                  onFocus={() => setFractionTarget("denominator")}
                  onKeyDown={(event) => {
                    if (event.key === "/") {
                      event.preventDefault();
                      insert("\\frac{}{|}");
                    } else if (event.key === "Enter") {
                      event.preventDefault();
                      commitFraction();
                    }
                  }}
                  placeholder="denominator"
                  aria-label="Fraction denominator"
                  style={{ textAlign: "center", font: "inherit", fontSize: 16, color: PALETTE.text, background: PALETTE.bg, border: `1px solid ${PALETTE.line}`, borderRadius: `0 0 ${RADII.sm}px ${RADII.sm}px`, padding: "7px 9px", borderTopColor: PALETTE.text }}
                />
              </div>
              <button type="button" onClick={commitFraction} disabled={!fraction.numerator || !fraction.denominator} style={{ ...buttonStyle, borderColor: PALETTE.accent, color: PALETTE.accent, opacity: fraction.numerator && fraction.denominator ? 1 : 0.45 }}>Insert fraction</button>
              <button type="button" onClick={() => setFraction(null)} style={buttonStyle}>Cancel</button>
            </div>
          )}
          {open && <span style={{ fontFamily: MONO, fontSize: 9, color: PALETTE.muted }}>Select text first to place it inside functions, powers, roots, fractions, or grouping symbols. Press / for a fraction.</span>}
        </div>
      )}
    </div>
  );
}
