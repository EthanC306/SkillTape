import React from "react";
import { PALETTE, MONO, RADII } from "../data/theme";

/**
 * Figure — a captioned diagram shown inside a Learn card or a Quiz question.
 *
 * The diagrams themselves are light-background artwork (number-set tables, arrow
 * diagrams, function machines, the Cartesian plane, …). Dropped straight onto the
 * app's dark theme they would look like harsh floating rectangles, so we mount the
 * image inside a soft, rounded, light "plate" — the way a textbook figure sits on
 * its own panel. The optional caption sits underneath in the muted monospace voice
 * used elsewhere in the tutor.
 *
 * Props:
 *   src     — URL of the image. Assets live in `public/figures/…`, which Vite serves
 *             from the site root, so pass an absolute path like
 *             "/figures/discrete/arrow-R.png" (works in `vite dev` and the build).
 *   alt     — required accessibility text describing the diagram.
 *   caption — optional short label rendered beneath the image (e.g. "Figure 1.2.1").
 */
export default function Figure({ src, alt, caption }) {
  return (
    <figure
      style={{
        // Reset the browser's default <figure> margins; the card controls spacing.
        margin: "16px 0 0",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      {/* Light "plate" so the dark-on-light diagram reads cleanly on the dark UI. */}
      <div
        style={{
          background: "#f4f5f7",
          border: `1px solid ${PALETTE.line}`,
          borderRadius: RADII.md,
          padding: 12,
          width: "100%",
          boxSizing: "border-box",
          display: "flex",
          justifyContent: "center",
        }}
      >
        <img
          src={src}
          alt={alt}
          loading="lazy"
          style={{
            maxWidth: "100%",
            height: "auto",
            display: "block",
          }}
        />
      </div>

      {caption && (
        <figcaption
          style={{
            marginTop: 8,
            fontFamily: MONO,
            fontSize: 11,
            color: PALETTE.muted,
            textAlign: "center",
          }}
        >
          {caption}
        </figcaption>
      )}
    </figure>
  );
}
