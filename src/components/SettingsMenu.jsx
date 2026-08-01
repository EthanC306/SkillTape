import React, { useEffect, useState } from "react";
import { PALETTE, HEADING, RADII, SHADOWS } from "../data/theme";
import useTheme from "../hooks/useTheme";
import AuthBar from "./AuthBar";

/**
 * SettingsMenu — the gear button fixed to the top of the page (same corner
 * in both c++ and cs3000, since Header renders it for either course).
 *
 * Opens a panel with two sections: a theme-preset swatch row (see
 * ACCENT_PRESETS/useTheme) and the account control that used to sit inline
 * in Header — AuthBar itself is unchanged, just relocated in here.
 */
export default function SettingsMenu({ auth }) {
  const [open, setOpen] = useState(false);
  const { themeId, setThemeId, presets } = useTheme();

  useEffect(() => {
    if (!open) return;
    function onKey(e) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{ position: "fixed", inset: 0, zIndex: 1900 }}
        />
      )}
      <div style={{ position: "fixed", top: 16, right: 16, zIndex: 2000 }}>
        <button
          onClick={() => setOpen((o) => !o)}
          aria-label="Settings"
          aria-expanded={open}
          title="Settings"
          style={{
            width: 36,
            height: 36,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: RADII.md,
            cursor: "pointer",
            border: `1px solid ${open ? PALETTE.accent : PALETTE.line}`,
            background: open ? PALETTE.accentSoft : PALETTE.panel,
            color: open ? PALETTE.accent : PALETTE.text,
            boxShadow: SHADOWS.sm,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
        {open && (
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "absolute",
              top: "calc(100% + 8px)",
              right: 0,
              width: 280,
              display: "grid",
              gap: 14,
              padding: 16,
              background: PALETTE.panel,
              border: `1px solid ${PALETTE.line}`,
              borderRadius: RADII.lg,
              boxShadow: SHADOWS.lg,
            }}
          >
            <div>
              <div
                style={{
                  fontFamily: HEADING,
                  fontSize: 11,
                  fontWeight: 500,
                  letterSpacing: 1,
                  textTransform: "uppercase",
                  color: PALETTE.muted,
                  marginBottom: 10,
                }}
              >
                Theme
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                {presets.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setThemeId(p.id)}
                    title={p.label}
                    aria-label={p.label}
                    aria-pressed={themeId === p.id}
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: "50%",
                      cursor: "pointer",
                      padding: 0,
                      background: p.value,
                      border: `2px solid ${themeId === p.id ? PALETTE.text : "transparent"}`,
                      boxShadow: `0 0 0 1px ${PALETTE.line}`,
                    }}
                  />
                ))}
              </div>
            </div>

            <div style={{ height: 1, background: PALETTE.line }} />

            <div>
              <div
                style={{
                  fontFamily: HEADING,
                  fontSize: 11,
                  fontWeight: 500,
                  letterSpacing: 1,
                  textTransform: "uppercase",
                  color: PALETTE.muted,
                  marginBottom: 10,
                }}
              >
                Account
              </div>
              <AuthBar
                user={auth.user}
                onLogin={auth.login}
                onSignup={auth.signup}
                onLogout={auth.logout}
              />
            </div>
          </div>
        )}
      </div>
    </>
  );
}
