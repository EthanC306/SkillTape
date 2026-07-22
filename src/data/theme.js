// Shared visual theme for the whole app: colors, fonts, radii, shadows.
// Import from here (not from curriculum.js) wherever a component needs styling.
//
// Tokens follow the "Nocturne" design system: a near-neutral blue-grey dark
// ground, Inter type, soft 8px radii, tonal ramps (100-900) for neutral and
// accent, and an accent used sparingly (lines, borders, small marks) rather
// than as a flood fill. Buttons are outlined, never solid-filled.

// ---- Tonal ramps (from Nocturne's OKLCH-derived scale) ---------------------
export const NEUTRAL = {
  100: "#f3f5fe",
  200: "#e4e7f5",
  300: "#cfd3e5",
  400: "#b2b6ca",
  500: "#9397ab",
  600: "#75798c",
  700: "#595d6c",
  800: "#3f424d",
  900: "#292b31",
};

export const ACCENT_RAMP = {
  100: "#f5f4ff",
  200: "#e7e5fe",
  300: "#d2cefd",
  400: "#b5abfc",
  500: "#968ae0",
  600: "#796cbf",
  700: "#5d5294",
  800: "#423a6a",
  900: "#2b2741",
};

export const RADII = {
  sm: 4,
  md: 8,
  lg: 14,
};

export const SHADOWS = {
  sm: `0 0 0 1px ${NEUTRAL[800]}`,
  md: `0 0 0 1px ${NEUTRAL[700]}, 0 6px 18px rgba(0,0,0,0.55)`,
  lg: `0 0 0 1px ${NEUTRAL[500]}, 0 16px 40px rgba(0,0,0,0.65)`,
};

// A hairline divider tint (matches --color-divider: text at 16% opacity).
export const DIVIDER = "rgba(233,233,237,0.16)";
export const DIVIDER_ROW = "rgba(233,233,237,0.08)";

// Builds a rule that fades to transparent at both ends, over `edge`px a side —
// the Nocturne "fading divider" signature, used in place of a solid <hr>.
export function fadeDivider(edge = 48, color = DIVIDER) {
  return `linear-gradient(to right, transparent, ${color} ${edge}px, ${color} calc(100% - ${edge}px), transparent)`;
}

// Central palette. Field names stay backward-compatible with the app's
// original theme so every existing call site keeps working; values are the
// Nocturne tokens.
export const PALETTE = {
  bg: "#161826", // --color-bg
  panel: "#232532", // --color-surface
  panel2: NEUTRAL[900], // a step up from bg, under surface — secondary panel fill
  line: NEUTRAL[800], // solid hairline border (box outlines stay solid per spec)
  divider: DIVIDER, // fading-rule tint
  dividerRow: DIVIDER_ROW,
  text: "#e9e9ed", // --color-text
  muted: NEUTRAL[500],
  accent: "#9184d9", // --color-accent
  accentSoft: "rgba(145,132,217,0.12)", // hover tint (accent @ 12%)
  accentSoftStrong: "rgba(145,132,217,0.22)", // pressed tint (accent @ 22%)
  // Keep good/bad functionally distinct from the accent (quiz semantics),
  // but desaturate them to sit inside the same tonal-ramp aesthetic.
  good: "#7fb894",
  goodSoft: "rgba(127,184,148,0.15)",
  bad: "#c97b7b",
  badSoft: "rgba(201,123,123,0.15)",
};

export const RAMP = {
  neutral: NEUTRAL,
  accent: ACCENT_RAMP,
};

// Inter, loaded via Google Fonts link in index.html — used for both headings
// and body text. Weight is capped at 500 for headings (never bolder).
export const HEADING = '"Inter", system-ui, -apple-system, sans-serif';
export const SANS = '"Inter", system-ui, -apple-system, sans-serif';
export const HEADING_WEIGHT = 500;

// Monospace stack retained for code listings / quiz code blocks, where a
// fixed-width face is functional rather than decorative.
export const MONO = 'ui-monospace, "JetBrains Mono", "SF Mono", Menlo, Consolas, monospace';

// Reusable style fragment for keyboard focus rings. Inline styles can't
// express :focus-visible directly, so components pair this with the
// onFocus/onBlur toggle in src/hooks/useFocusRing.js (falls back to plain
// :focus-visible rules injected once in index.html for native elements).
export const FOCUS_RING = {
  outline: `2px solid ${PALETTE.accent}`,
  outlineOffset: 2,
};
