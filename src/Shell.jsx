import React, { useState } from "react";
import App from "./App";
import { PALETTE, MONO } from "./data/curriculum";

/**
 * Shell — the app's home page.
 *
 * A single page with a tab bar pinned to the bottom. Three tabs:
 *   • "Home"   → the landing page with a link to the GitHub repo (tab === null).
 *   • "CS2401" → the tutor showing the C++ class topics.
 *   • "CS3000" → the tutor showing the Discrete Structures topics.
 *
 * The tab bar is rendered here, outside of <App>, so it stays on screen no matter
 * how deep the user navigates inside a course (topic list, Learn, or Quiz) — the
 * "Home" tab is always a one-click way out of whatever course/topic is open.
 *
 * On first load no course tab is selected, so the blank home page is shown.
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
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 24,
              minHeight: "80vh",
              fontFamily: MONO,
              fontSize: 14,
              letterSpacing: 3,
              textTransform: "uppercase",
              color: PALETTE.muted,
            }}
          >
            Home
            {/* Link to the project's GitHub repo, styled like the tab buttons. */}
            <a
              href="https://github.com/EthanC306/SkillTape"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                fontFamily: MONO,
                fontSize: 13,
                letterSpacing: 1,
                padding: "8px 20px",
                borderRadius: 8,
                cursor: "pointer",
                border: `1px solid ${PALETTE.line}`,
                background: "transparent",
                color: PALETTE.text,
                textDecoration: "none",
                textTransform: "none",
              }}
            >
              {/* GitHub octocat mark (inline SVG so no asset/network needed). */}
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.4 7.4 0 0 1 2-.27c.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
              </svg>
              GitHub
            </a>
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
          [null, "Home"],
          ["cs2401", "CS2401"],
          ["cs3000", "CS3000"],
        ].map(([id, label]) => {
          const active = tab === id;
          return (
            <button
              key={label}
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
