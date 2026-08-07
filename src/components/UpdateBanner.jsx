import React, { useState } from "react";
import { PALETTE, MONO, HEADING, RADII } from "../data/theme";
import useUpdater from "../hooks/useUpdater";

/**
 * UpdateBanner — the only visible evidence that auto-update works.
 *
 * Renders nothing at all unless the Electron shell is actually doing something
 * (downloading, finished, or failed). In a browser, in Docker, and in unpacked
 * `npm run electron:dev` runs, useUpdater reports "unsupported" and this is a
 * no-op — the same component can therefore be mounted unconditionally in
 * Shell.jsx without a host check at the call site.
 *
 * Styling follows the theme file's Nocturne note: an accent-tinted surface with
 * an accent border, never a flood fill, and an outlined button rather than a
 * solid one. It sits in the normal flex column above the content rather than
 * position:fixed, so it displaces the page instead of covering the top of it.
 *
 * `.app-chrome` is deliberate: index.html hides every element with that class
 * while a drill or exam is running. An update notice is exactly the kind of
 * interruption closed-book mode exists to suppress, and the update installs on
 * quit regardless of whether anyone saw this.
 */
export default function UpdateBanner() {
  const { status, version, percent, error, restart } = useUpdater();
  const [dismissed, setDismissed] = useState(null);

  // "available" fires before the first download-progress event. Folding it in
  // avoids a blank gap on a slow connection, where that window can be seconds.
  const downloading = status === "available" || status === "downloading";
  const show = downloading || status === "ready" || status === "error";
  if (!show || dismissed === status) return null;

  return (
    <div
      className="app-chrome"
      role="status"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 14,
        padding: "8px 16px",
        fontFamily: MONO,
        fontSize: 12,
        color: status === "error" ? PALETTE.muted : PALETTE.text,
        background: status === "error" ? "transparent" : PALETTE.accentSoft,
        borderBottom: `1px solid ${status === "error" ? PALETTE.line : PALETTE.accent}`,
      }}
    >
      {downloading && (
        <span>
          <span style={{ color: PALETTE.accent }}>⟳</span> Downloading update{" "}
          {version ?? ""} … {status === "downloading" ? percent : 0}%
        </span>
      )}

      {status === "ready" && (
        <>
          <span>
            <span style={{ color: PALETTE.accent }}>✓</span> Update {version} ready — installs
            when you close SkillTape.
          </span>
          <button
            type="button"
            onClick={restart}
            style={{
              fontFamily: HEADING,
              fontSize: 12,
              letterSpacing: 1,
              padding: "4px 14px",
              borderRadius: RADII.md,
              cursor: "pointer",
              border: `1px solid ${PALETTE.accent}`,
              background: "transparent",
              color: PALETTE.accent,
              fontWeight: 500,
            }}
          >
            Restart now
          </button>
        </>
      )}

      {status === "error" && <span>Update check failed: {error}</span>}

      {/* No dismiss on "downloading" — it resolves on its own in seconds, and a
          banner you can dismiss mid-progress just loses the percentage. */}
      {status !== "downloading" && status !== "available" && (
        <button
          type="button"
          onClick={() => setDismissed(status)}
          aria-label="Dismiss"
          title="Dismiss"
          style={{
            fontFamily: MONO,
            fontSize: 14,
            lineHeight: 1,
            padding: "2px 6px",
            borderRadius: RADII.sm,
            cursor: "pointer",
            border: "1px solid transparent",
            background: "transparent",
            color: PALETTE.muted,
          }}
        >
          ×
        </button>
      )}
    </div>
  );
}
