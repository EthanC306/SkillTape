import React, { useState } from "react";
import { PALETTE, MONO, HEADING, RADII, SHADOWS } from "../data/theme";

/**
 * AuthBar — the account control in Header's top-right corner.
 *
 * Logged out: a compact "Log in" trigger that opens an inline email/password
 * form. Not a full modal (HistoryModal's dialog pattern is overkill for two
 * fields) — a small popover anchored under the trigger, dismissed by
 * submitting or clicking the trigger again. One form serves both signup and
 * login via a mode toggle, since without an account this is the ONLY way in:
 * a returning user and a first-time user land on the same control.
 *
 * Logged in: the email plus a "Log out" button, no form.
 */
export default function AuthBar({ user, onLogin, onSignup, onLogout }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState("login"); // "login" | "signup"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const btn = {
    fontFamily: HEADING,
    fontSize: 12,
    padding: "6px 14px",
    borderRadius: RADII.md,
    cursor: "pointer",
    border: `1px solid ${PALETTE.line}`,
    background: "transparent",
    color: PALETTE.text,
  };

  const field = {
    width: "100%",
    boxSizing: "border-box",
    background: PALETTE.bg,
    border: `1px solid ${PALETTE.line}`,
    borderRadius: RADII.md,
    color: PALETTE.text,
    padding: "7px 10px",
    fontFamily: "inherit",
    fontSize: 13,
  };

  function toggleOpen() {
    setOpen((o) => !o);
    setPassword("");
    setError(null);
  }

  function switchMode(next) {
    setMode(next);
    setError(null);
  }

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (mode === "login") await onLogin(email, password);
      else await onSignup(email, password);
      setOpen(false);
      setPassword("");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (user) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontFamily: MONO, fontSize: 12, color: PALETTE.muted }}>{user.email}</span>
        <button onClick={onLogout} style={btn}>
          Log out
        </button>
      </div>
    );
  }

  return (
    <div style={{ position: "relative" }}>
      <button onClick={toggleOpen} style={btn}>
        {open ? "Close" : "Log in"}
      </button>
      {open && (
        <form
          onSubmit={submit}
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            zIndex: 1000,
            background: PALETTE.panel,
            border: `1px solid ${PALETTE.line}`,
            borderRadius: RADII.lg,
            boxShadow: SHADOWS.lg,
            padding: 16,
            width: 240,
            display: "grid",
            gap: 10,
          }}
        >
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              onClick={() => switchMode("login")}
              style={{
                ...btn,
                flex: 1,
                border: `1px solid ${mode === "login" ? PALETTE.accent : PALETTE.line}`,
                color: mode === "login" ? PALETTE.accent : PALETTE.text,
                background: mode === "login" ? PALETTE.accentSoft : "transparent",
              }}
            >
              Log in
            </button>
            <button
              type="button"
              onClick={() => switchMode("signup")}
              style={{
                ...btn,
                flex: 1,
                border: `1px solid ${mode === "signup" ? PALETTE.accent : PALETTE.line}`,
                color: mode === "signup" ? PALETTE.accent : PALETTE.text,
                background: mode === "signup" ? PALETTE.accentSoft : "transparent",
              }}
            >
              Sign up
            </button>
          </div>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email"
            aria-label="email"
            autoComplete="email"
            required
            style={field}
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="password"
            aria-label="password"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            required
            style={field}
          />
          {error && (
            <span style={{ fontFamily: MONO, fontSize: 11, color: PALETTE.bad }}>{error}</span>
          )}
          <button
            type="submit"
            disabled={busy}
            style={{
              ...btn,
              border: `1px solid ${PALETTE.accent}`,
              background: PALETTE.accentSoft,
              color: PALETTE.accent,
              fontWeight: 500,
              opacity: busy ? 0.6 : 1,
              cursor: busy ? "default" : "pointer",
            }}
          >
            {busy ? "…" : mode === "login" ? "Log in" : "Create account"}
          </button>
        </form>
      )}
    </div>
  );
}
