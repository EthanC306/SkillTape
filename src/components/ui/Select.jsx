import React, { useId } from "react";
import { PALETTE, HEADING, MONO, RADII } from "../../data/theme";

/**
 * A labeled dropdown.
 *
 * The first `<select>` in the app, and the first resident of the `ui/` folder
 * docs/STUDY_HUB.md §4.2 plans. Every other choice control here is a row of
 * toggle chips (PracticeView's `Chip`, Home's `ctrlBtn`), which is right for
 * four formats and wrong for seventeen topics: a chip row that long stops being
 * scannable and starts being a wall.
 *
 * Native `<select>` rather than a custom listbox on purpose. Keyboard
 * navigation, type-ahead, screen-reader semantics, and mobile's native picker
 * all come for free, and none of them would survive a hand-rolled div stack
 * without considerably more code than this whole file.
 *
 * Props:
 *   label    — shown above the control; also its accessible name
 *   value    — the selected option's `value`
 *   onChange — called with the new value (the string, not the event)
 *   options  — [{ value, label }]
 */
export default function Select({ label, value, onChange, options }) {
  const id = useId();

  return (
    <label htmlFor={id} style={{ display: "inline-flex", flexDirection: "column", gap: 6 }}>
      <span style={{ fontFamily: MONO, fontSize: 11, color: PALETTE.muted, letterSpacing: 0.3 }}>
        {label}
      </span>

      <span style={{ position: "relative", display: "inline-flex" }}>
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{
            // Matches the navBtn idiom in ReportView/Home rather than inventing
            // a second control shape for the same page.
            fontFamily: HEADING,
            fontSize: 12,
            color: PALETTE.text,
            background: PALETTE.panel2,
            border: `1px solid ${PALETTE.line}`,
            borderRadius: RADII.md,
            // Right padding leaves room for the chevron below, which is
            // pointer-transparent and sits on top.
            padding: "7px 30px 7px 12px",
            cursor: "pointer",
            appearance: "none",
            WebkitAppearance: "none",
            MozAppearance: "none",
            minWidth: 168,
            width: "100%",
          }}
        >
          {options.map((o) => (
            // The dropdown list itself is drawn by the OS, not by this page, so
            // it does not inherit any of the styling above. Without explicit
            // colors here the open menu renders in the platform's default
            // light palette and the options come out unreadable on this theme.
            <option
              key={o.value}
              value={o.value}
              style={{ background: PALETTE.panel, color: PALETTE.text }}
            >
              {o.label}
            </option>
          ))}
        </select>

        <svg
          viewBox="0 0 12 12"
          width="12"
          height="12"
          aria-hidden="true"
          style={{
            position: "absolute",
            right: 11,
            top: "50%",
            transform: "translateY(-50%)",
            // Must not eat the click — the whole control should open the menu,
            // not just the parts of it the chevron is not covering.
            pointerEvents: "none",
            color: PALETTE.muted,
          }}
        >
          <path
            d="M2.5 4.5 6 8l3.5-3.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    </label>
  );
}
