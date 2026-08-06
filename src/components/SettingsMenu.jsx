import React, { useEffect, useState } from "react";
import { PALETTE, HEADING, RADII, SHADOWS } from "../data/theme";
import useTheme from "../hooks/useTheme";
import useOllamaSettings from "../hooks/useOllamaSettings";
import { getOllamaStatus } from "../api/client";
import AuthBar from "./AuthBar";

/**
 * SettingsMenu — the gear button at the end of Header's top bar (same spot
 * in both c++ and cs3000, since Header renders it for either course).
 *
 * Opens a panel with three sections: a theme-preset swatch row (see
 * ACCENT_PRESETS/useTheme), the local Ollama host/model Practice mode's
 * grading uses (docs/OLLAMA_GRADING.md), and the account control that used
 * to sit inline in Header — AuthBar itself is unchanged, just relocated in
 * here.
 *
 * Renders as a normal flex item in Header's row (not `position: fixed`) so
 * it never overlaps Header's own right-aligned text — it just sits after it
 * with a gap, however long that text gets.
 */
export default function SettingsMenu({ auth }) {
  const [open, setOpen] = useState(false);
  const { themeId, setThemeId, presets } = useTheme();
  const { host, model, codeModel, setHost, setModel, setCodeModel } = useOllamaSettings();
  const [ollamaStatus, setOllamaStatus] = useState(null); // null | "checking" | { reachable, models, modelAvailable, error? }
  const [ollamaCodeStatus, setOllamaCodeStatus] = useState(null); // same shape, for codeModel

  async function testOllamaConnection() {
    setOllamaStatus("checking");
    setOllamaCodeStatus("checking");
    const fallback = (err) => ({ reachable: false, models: [], modelAvailable: false, error: err.message });
    const [general, code] = await Promise.all([
      getOllamaStatus({ host, model }).catch(fallback),
      getOllamaStatus({ host, model: codeModel }).catch(fallback),
    ]);
    setOllamaStatus(general);
    setOllamaCodeStatus(code);
  }

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
      <div style={{ position: "relative", flexShrink: 0, zIndex: 2000 }}>
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
                Auto-grade (Ollama)
              </div>
              <div style={{ display: "grid", gap: 6, marginBottom: 8 }}>
                <div style={fieldLabelStyle}>Host</div>
                <input
                  value={host}
                  onChange={(e) => setHost(e.target.value)}
                  placeholder="http://127.0.0.1:11434"
                  style={inputStyle}
                />
                <div style={fieldLabelStyle}>General model</div>
                <input
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder="qwen2.5:7b-instruct"
                  style={inputStyle}
                />
                <div style={fieldLabelStyle} title="Used for WRITE/TRACE/ERROR items — a same-size generalist model judges code correctness noticeably worse than a coder-tuned one (verified directly, see itemSchema.js's CODE_FORMATS comment)">
                  Code model (write/trace/error)
                </div>
                <input
                  value={codeModel}
                  onChange={(e) => setCodeModel(e.target.value)}
                  placeholder="qwen2.5-coder:7b"
                  style={inputStyle}
                />
              </div>
              <button
                onClick={testOllamaConnection}
                style={{
                  fontFamily: HEADING,
                  fontSize: 11,
                  padding: "6px 12px",
                  borderRadius: RADII.md,
                  cursor: "pointer",
                  border: `1px solid ${PALETTE.line}`,
                  background: "transparent",
                  color: PALETTE.text,
                }}
              >
                Test connection
              </button>
              {ollamaStatus && (
                <div style={{ fontSize: 11, marginTop: 8, lineHeight: 1.5, color: ollamaStatusColor(ollamaStatus) }}>
                  general: {ollamaStatusText(ollamaStatus, host, model)}
                </div>
              )}
              {ollamaCodeStatus && (
                <div style={{ fontSize: 11, marginTop: 4, lineHeight: 1.5, color: ollamaStatusColor(ollamaCodeStatus) }}>
                  code: {ollamaStatusText(ollamaCodeStatus, host, codeModel)}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  fontFamily: HEADING,
  fontSize: 12,
  padding: "7px 10px",
  borderRadius: RADII.md,
  border: `1px solid ${PALETTE.line}`,
  background: PALETTE.panel2,
  color: PALETTE.text,
};

const fieldLabelStyle = {
  fontFamily: HEADING,
  fontSize: 10,
  color: PALETTE.muted,
  marginTop: 2,
};

function ollamaStatusColor(status) {
  if (status === "checking") return PALETTE.muted;
  if (!status.reachable) return PALETTE.bad;
  return status.modelAvailable ? PALETTE.good : PALETTE.accent;
}

function ollamaStatusText(status, host, model) {
  if (status === "checking") return "checking…";
  // hostAllowed:false means the server refused to fetch this host at all
  // (server/ollama.js's allowlist) — "start it and try again" would send the
  // user chasing a process that was never contacted.
  if (status.hostAllowed === false) return status.error ?? `Host ${host} is not allowed.`;
  if (!status.reachable) return `Ollama unreachable at ${host} — start it and try again.`;
  if (!status.modelAvailable) return `Ollama reachable, but ${model} isn't pulled — run: ollama pull ${model}`;
  return `Auto-grade: ${model} ready`;
}
