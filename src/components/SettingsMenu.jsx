import React, { useEffect, useState } from "react";
import { PALETTE, MONO, HEADING, RADII, SHADOWS } from "../data/theme";
import useTheme from "../hooks/useTheme";
import useOllamaSettings from "../hooks/useOllamaSettings";
import useSchedulerSettings from "../hooks/useSchedulerSettings";
import useSchedulerFlags from "../hooks/useSchedulerFlags";
import { getOllamaStatus } from "../api/client";
import AuthBar from "./AuthBar";

/**
 * SettingsMenu — the gear button at the end of Header's top bar (same spot
 * in both c++ and cs3000, since Header renders it for either course).
 *
 * Opens a panel with four sections: a theme-preset swatch row (see
 * ACCENT_PRESETS/useTheme), the account control that used to sit inline in
 * Header, the scheduler parameters (plans/fsrs_ui.md Phase 6), and the local
 * Ollama host/model Practice mode's grading uses (docs/OLLAMA_GRADING.md).
 *
 * Renders as a normal flex item in Header's row (not `position: fixed`) so
 * it never overlaps Header's own right-aligned text — it just sits after it
 * with a gap, however long that text gets.
 */
export default function SettingsMenu({ auth }) {
  const [open, setOpen] = useState(false);
  const { themeId, setThemeId, presets } = useTheme();
  const { host, model, codeModel, setHost, setModel, setCodeModel } = useOllamaSettings();
  const scheduler = useSchedulerSettings();
  const flags = useSchedulerFlags();
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
            position: "relative",
            width: 36,
            height: 36,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: RADII.md,
            cursor: "pointer",
            overflow: "hidden",
            border: `1px solid ${open ? PALETTE.accent : PALETTE.line}`,
            // The app logo is the button's background, with the gear over it.
            // Black behind it so the logo's own black field blends into the
            // button instead of sitting on a lighter panel color.
            background: `#000 url("/icons/256x256.png") center / cover no-repeat`,
            color: "#fff",
            boxShadow: SHADOWS.sm,
            padding: 0,
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

            <SchedulerSection scheduler={scheduler} flags={flags} />

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

/**
 * The FSRS parameters (plans/fsrs_ui.md Phase 6), plus the two display toggles.
 *
 * Every label is in plain language, because the underlying names are not:
 * "request_retention" is meaningless to the person choosing it, while "higher
 * means shorter intervals and more reviews" is the actual trade being made.
 *
 * Retention commits on release, not on every drag frame: moving the slider
 * rewrites the due date of every scheduled card server-side, and firing that
 * on each intermediate value would be dozens of pointless full-collection
 * rewrites on the way to the value the user meant.
 */
function SchedulerSection({ scheduler, flags }) {
  const { settings, save, impact, saving } = scheduler;
  // Local mirror so the slider tracks the thumb at 60fps while the server only
  // hears about the value the user let go on.
  const [retention, setRetention] = useState(null);
  const [notice, setNotice] = useState(null);

  const current = retention ?? settings?.requestRetention ?? 0.9;

  if (!settings) {
    return (
      <Section title="Scheduling">
        <Hint>loading…</Hint>
      </Section>
    );
  }

  async function commitRetention(value) {
    if (value === settings.requestRetention) return;
    // Phase 6 asks for a confirmation when the recompute touches a lot of
    // cards. Asked BEFORE the write, so the number in the prompt is the number
    // that would actually move.
    const affected = await impact();
    if (
      affected >= 25 &&
      !window.confirm(
        `Changing desired retention to ${Math.round(value * 100)}% will recalculate the due date of ` +
          `${affected} scheduled cards.\n\nTheir memory strength is not affected, only when they next come up. Continue?`
      )
    ) {
      setRetention(settings.requestRetention);
      return;
    }
    const saved = await save({ requestRetention: value }).catch(() => null);
    if (saved) {
      setNotice(
        saved.rescheduled > 0
          ? `${saved.rescheduled} card${saved.rescheduled === 1 ? "" : "s"} rescheduled`
          : "saved"
      );
    }
  }

  return (
    <Section title="Scheduling">
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
        <span style={fieldLabelStyle}>Desired retention</span>
        <span
          style={{
            marginLeft: "auto",
            fontFamily: MONO,
            fontSize: 12,
            color: PALETTE.text,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {Math.round(current * 100)}%
        </span>
      </div>
      <input
        type="range"
        min={0.7}
        max={0.97}
        step={0.01}
        value={current}
        disabled={saving}
        aria-label="Desired retention"
        onChange={(e) => setRetention(Number(e.target.value))}
        onPointerUp={(e) => commitRetention(Number(e.currentTarget.value))}
        onKeyUp={(e) => commitRetention(Number(e.currentTarget.value))}
        style={{ width: "100%", accentColor: PALETTE.accent, cursor: "pointer" }}
      />
      <Hint>Higher means shorter intervals and more reviews.</Hint>

      <div style={{ ...fieldLabelStyle, marginTop: 10 }}>Daily new items</div>
      <NumberField
        value={settings.dailyNewLimit}
        min={0}
        max={9999}
        disabled={saving}
        onCommit={(n) => save({ dailyNewLimit: n }).catch(() => {})}
      />
      <Hint>How many never-seen items a review session may introduce per day.</Hint>

      <div style={{ ...fieldLabelStyle, marginTop: 10 }}>Maximum interval (days)</div>
      <NumberField
        value={settings.maximumInterval}
        min={1}
        max={36500}
        disabled={saving}
        onCommit={(n) => save({ maximumInterval: n }).catch(() => {})}
      />
      <Hint>The furthest ahead anything is ever scheduled.</Hint>

      <Check
        label="Spread due dates (fuzz)"
        title="Jitters each interval by a few percent so cards learned together don't all come due on the same day"
        checked={settings.enableFuzz}
        disabled={saving}
        onChange={(on) => save({ enableFuzz: on }).catch(() => {})}
      />
      <Check
        label="Show due counts on home"
        title="The due / learning / new strip above the topic grid. Off restores the plain topic list."
        checked={flags.dueStrip}
        onChange={flags.setDueStrip}
      />
      <Check
        label="Scheduler inspector (diagnostics)"
        title="Adds a row of raw FSRS state under each Drill item"
        checked={flags.inspector}
        onChange={flags.setInspector}
      />

      {notice && <Hint>{notice}</Hint>}
      {scheduler.error && <Hint tone={PALETTE.bad}>{scheduler.error}</Hint>}
    </Section>
  );
}

function Section({ title, children }) {
  return (
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
        {title}
      </div>
      {children}
    </div>
  );
}

/** Commits on blur/Enter, never on keystroke: "1" on the way to "100" is not a value to save. */
function NumberField({ value, min, max, disabled, onCommit }) {
  const [draft, setDraft] = useState(String(value));

  // Adopt a value that changed underneath us (the server clamps out-of-range
  // input), but never while the field is focused and being typed into.
  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  function commit() {
    const n = Math.round(Number(draft));
    if (!Number.isFinite(n) || n === value) return setDraft(String(value));
    onCommit(Math.min(max, Math.max(min, n)));
  }

  return (
    <input
      type="number"
      min={min}
      max={max}
      value={draft}
      disabled={disabled}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
      style={inputStyle}
    />
  );
}

function Check({ label, title, checked, disabled, onChange }) {
  return (
    <label
      title={title}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        marginTop: 10,
        fontFamily: HEADING,
        fontSize: 12,
        color: PALETTE.text,
        cursor: disabled ? "default" : "pointer",
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        style={{ accentColor: PALETTE.accent, cursor: "inherit" }}
      />
      {label}
    </label>
  );
}

function Hint({ children, tone }) {
  return (
    <div style={{ fontSize: 10, lineHeight: 1.5, color: tone ?? PALETTE.muted, marginTop: 4 }}>
      {children}
    </div>
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
