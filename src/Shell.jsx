import React, { useState } from "react";
import App from "./App";
import { PALETTE, MONO } from "./data/curriculum";

/**
 * Shell — the app's home page.
 *
 * A single page with a tab bar pinned to the bottom. Two tabs for now:
 *   • "CS2401" → the tutor showing the C++ class topics.
 *   • "CS3000" → the tutor showing the Discrete Structures topics
 *               (currently "1.1 Speaking Mathematically: Variables").
 *
 * On first load neither tab is selected, so the (currently minimal) home page is
 * shown. Kept intentionally simple — a foundation to build the real home page onto
 * later.
 */
export default function Shell() {
  // Which bottom tab is active. `null` = the plain home page (nothing selected).
  const [tab, setTab] = useState(null); // "cs2401" | "cs3000" | null

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
        background: PALETTE.bg,
        color: PALETTE.text,
      }}
    >
      {/* Active view fills the space above the tab bar. Each class tab renders
          the tutor filtered to that course; no tab yet = the blank home page. */}
      <div style={{ flex: 1, minHeight: 0 }}>
        {tab === "cs2401" ? (
          <App key="cs2401" course="cpp" />
        ) : tab === "cs3000" ? (
          <App key="cs3000" course="discrete" />
        ) : (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              minHeight: "80vh",
              fontFamily: MONO,
              fontSize: 14,
              letterSpacing: 3,
              textTransform: "uppercase",
              color: PALETTE.muted,
            }}
          >
            Home
          </div>
        )}
      </div>

      {/* Bottom tab bar. */}
      <nav
        style={{
          display: "flex",
          justifyContent: "center",
          gap: 8,
          padding: "10px 16px",
          borderTop: `1px solid ${PALETTE.line}`,
          background: PALETTE.panel,
        }}
      >
        {[
          ["cs2401", "CS2401"],
          ["cs3000", "CS3000"],
        ].map(([id, label]) => {
          const active = tab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              style={{
                fontFamily: MONO,
                fontSize: 13,
                letterSpacing: 1,
                padding: "8px 20px",
                borderRadius: 8,
                cursor: "pointer",
                border: `1px solid ${active ? PALETTE.accent : PALETTE.line}`,
                background: active ? PALETTE.accent : "transparent",
                color: active ? PALETTE.bg : PALETTE.text,
                fontWeight: active ? 700 : 400,
              }}
            >
              {label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
