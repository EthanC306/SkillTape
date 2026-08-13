import React, { useEffect, useState } from "react";
import { PALETTE, MONO, HEADING, RADII } from "../data/theme";
import { getDrillReport, resetLeech } from "../api/client";
import StatsPanel from "./report/StatsPanel";
import useReportView from "../hooks/useReportView";

/**
 * ReportView — the standing dashboard (ROADMAP.md A6), plus the leech-handoff
 * actions A8 specs (§1.2): "copy for tutor" and "reset scheduling state".
 *
 * Not a closed-book context — unlike DrillView/ExamView this doesn't hide
 * the nav chrome or gate itself behind an escape hatch; it's just a read-only
 * dashboard over GET /api/drill/report, safe to leave via the normal tab bar.
 *
 * "Only one number predicts the exam: closed-book, first-try, timed accuracy
 * per topic. Everything else is diagnostic" (A6) — that's why the weakest/
 * study-next ranking up top is the one thing this view leads with; the
 * formats grid, median time, and open/closed delta are secondary, and render
 * below it as exactly that: diagnostics, not the headline.
 *
 * A11 added a second tab rather than more sections. The Overview below is
 * unchanged and still leads with that one number; Stats is the per-topic,
 * per-mode breakdown underneath it, and it owns its own fetch (see
 * report/StatsPanel.jsx) so a failure there cannot take the A6 dashboard down
 * with it.
 */
export default function ReportView({ course, onExit }) {
  const [tab, setTab] = useState("overview");
  // Persisted server-side, so which reading you prefer follows the history
  // rather than the browser profile. See hooks/useReportView.js.
  const [view, setView] = useReportView();
  const [report, setReport] = useState(null);
  const [error, setError] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [resettingId, setResettingId] = useState(null);

  function load() {
    setReport(null);
    setError(null);
    getDrillReport(course)
      .then(setReport)
      .catch((err) => setError(err.message));
  }

  useEffect(load, [course]);

  async function copyForTutor(leech) {
    const lines = [
      `Prompt: ${leech.prompt}`,
      `Format: ${leech.format}`,
      `Expected: ${leech.expected}`,
      leech.criteria?.length ? `Criteria:\n${leech.criteria.map((c) => `- ${c}`).join("\n")}` : null,
      leech.provenance
        ? `Source excerpt: "${leech.provenance.excerpt}"\nCitation: ${leech.provenance.citation}${leech.provenance.page != null ? `, p.${leech.provenance.page}` : ""}`
        : null,
      `Attempt history (${leech.history.length}):\n${leech.history
        .map((h) => `  ${new Date(h.ts).toLocaleString()} · ${h.mode} · grade ${h.grade} · ${h.seconds}s`)
        .join("\n")}`,
    ]
      .filter(Boolean)
      .join("\n\n");

    await navigator.clipboard.writeText(lines);
    setCopiedId(leech.itemId);
    setTimeout(() => setCopiedId((id) => (id === leech.itemId ? null : id)), 2000);
  }

  async function doResetLeech(itemId) {
    setResettingId(itemId);
    try {
      await resetLeech(itemId);
      load();
    } finally {
      setResettingId(null);
    }
  }

  const navBtn = {
    fontFamily: HEADING,
    fontSize: 12,
    padding: "7px 14px",
    borderRadius: RADII.md,
    cursor: "pointer",
    border: `1px solid ${PALETTE.line}`,
    background: PALETTE.panel,
    color: PALETTE.text,
  };

  // The tab bar renders before either tab's data does, on purpose: the two
  // tabs fetch from different endpoints, and gating the whole view on the A6
  // report would make a failure there swallow a Stats tab that would have
  // loaded fine.
  const chrome = (
    <Chrome tab={tab} setTab={setTab} onExit={onExit} view={view} setView={setView} />
  );

  if (tab === "stats") {
    return (
      <div>
        {chrome}
        <StatsPanel course={course} view={view} />
      </div>
    );
  }

  if (error) {
    return (
      <div>
        {chrome}
        <Status text={error} tone="bad" />
      </div>
    );
  }
  if (!report) {
    return (
      <div>
        {chrome}
        <Status text="loading report…" />
      </div>
    );
  }

  const weakestTopics = report.weakest.map((id) => report.topics.find((t) => t.id === id)).filter(Boolean);
  const allFormats = [...new Set(report.topics.flatMap((t) => Object.keys(t.formats)))];

  return (
    <div>
      {chrome}

      <Section title="Study these next">
        <div style={{ display: "grid", gap: 6 }}>
          {weakestTopics.map((t) => (
            <div
              key={t.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 16,
                padding: "12px 14px",
                borderRadius: RADII.md,
                background: PALETTE.panel,
                border: `1px solid ${PALETTE.line}`,
              }}
            >
              <span style={{ fontFamily: HEADING, fontSize: 14, fontWeight: 500 }}>{t.title}</span>
              <span
                style={{
                  fontFamily: MONO,
                  fontSize: 12,
                  color: PALETTE.muted,
                  display: "flex",
                  gap: 14,
                  flexShrink: 0,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                <span>w{t.examWeight}</span>
                {t.verifiedItemCount === 0 ? (
                  <span style={{ color: PALETTE.muted }}>no items</span>
                ) : t.firstTryAccuracy == null ? (
                  <span>not drilled</span>
                ) : (
                  <span style={{ color: t.meetsTarget ? PALETTE.good : PALETTE.bad }}>
                    {Math.round(t.firstTryAccuracy * 100)}%
                  </span>
                )}
              </span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Topics">
        <Panel>
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: MONO, fontSize: 12 }}>
            <thead>
              <tr style={{ textAlign: "left", color: PALETTE.muted }}>
                <th style={th}>Topic</th>
                <th style={th}>Weight</th>
                <th style={th}>Items</th>
                <th style={th}>First-try</th>
                <th style={th}>Open − closed</th>
                <th style={th}>Leeches</th>
              </tr>
            </thead>
            <tbody>
              {report.topics.map((t) => (
                <tr key={t.id} style={{ borderTop: `1px solid ${PALETTE.line}` }}>
                  <td style={{ ...td, color: PALETTE.text }}>{t.title}</td>
                  <td style={td}>{t.examWeight}</td>
                  <td style={td}>{t.verifiedItemCount}</td>
                  <td
                    style={{
                      ...td,
                      color:
                        t.firstTryAccuracy == null ? PALETTE.muted : t.meetsTarget ? PALETTE.good : PALETTE.bad,
                    }}
                  >
                    {t.firstTryAccuracy == null
                      ? "—"
                      : `${Math.round(t.firstTryAccuracy * 100)}% (${t.firstTryCorrect}/${t.firstTryCount})`}
                  </td>
                  <td style={td}>
                    {t.openClosedDelta == null
                      ? "—"
                      : `${t.openClosedDelta >= 0 ? "+" : ""}${Math.round(t.openClosedDelta * 100)}%`}
                  </td>
                  <td style={{ ...td, color: t.leechCount > 0 ? PALETTE.bad : PALETTE.muted }}>{t.leechCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      </Section>

      <Section title="Bank coverage">
        <Panel>
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: MONO, fontSize: 12 }}>
            <thead>
              <tr style={{ textAlign: "left", color: PALETTE.muted }}>
                <th style={th}>Topic</th>
                {allFormats.map((f) => (
                  <th key={f} style={th}>
                    {f}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {report.topics.map((t) => (
                <tr key={t.id} style={{ borderTop: `1px solid ${PALETTE.line}` }}>
                  <td style={{ ...td, color: PALETTE.text }}>{t.title}</td>
                  {allFormats.map((f) => {
                    const cell = t.formats[f];
                    return (
                      <td key={f} style={td}>
                        {cell ? `${cell.verified}/${cell.total}` : "—"}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
        {Object.keys(report.formatMedianSeconds).length > 0 && (
          <div style={{ marginTop: 10, fontFamily: MONO, fontSize: 11, color: PALETTE.muted }}>
            Median first-try time:{" "}
            {Object.entries(report.formatMedianSeconds)
              .map(([f, s]) => `${f} ${s}s`)
              .join(" · ")}
          </div>
        )}
      </Section>

      <Section title="Leeches">
        {report.leeches.length === 0 ? (
          <div
            style={{
              fontFamily: MONO,
              fontSize: 12,
              color: PALETTE.muted,
              padding: "16px 14px",
              borderRadius: RADII.md,
              border: `1px dashed ${PALETTE.line}`,
              textAlign: "center",
            }}
          >
            None right now
          </div>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {report.leeches.map((l) => (
              <div
                key={l.itemId}
                style={{
                  background: PALETTE.panel,
                  border: `1px solid ${PALETTE.line}`,
                  borderRadius: RADII.md,
                  padding: "14px 16px",
                }}
              >
                <div style={{ fontFamily: HEADING, fontSize: 14, fontWeight: 500, marginBottom: 6 }}>
                  {l.prompt}
                </div>
                <div style={{ fontFamily: MONO, fontSize: 11, color: PALETTE.muted, marginBottom: 12 }}>
                  {l.topicTitle} · {l.format} · {l.lapses} lapses · {l.history.length} attempts
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button onClick={() => copyForTutor(l)} style={navBtn}>
                    {copiedId === l.itemId ? "Copied" : "Copy for tutor"}
                  </button>
                  <button
                    onClick={() => doResetLeech(l.itemId)}
                    disabled={resettingId === l.itemId}
                    style={{ ...navBtn, opacity: resettingId === l.itemId ? 0.5 : 1 }}
                    title="Clears lapses and re-enters rotation fresh"
                  >
                    {resettingId === l.itemId ? "Resetting…" : "Reset scheduling"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}

const th = { padding: "10px 12px", fontWeight: 400 };
const td = { padding: "10px 12px", color: PALETTE.muted, fontVariantNumeric: "tabular-nums" };

/**
 * Title, Overview/Stats segment, and Back — one row so the report doesn't
 * spend two stacked bars on chrome before any data.
 */
function Chrome({ tab, setTab, onExit, view, setView }) {
  const seg = (active) => ({
    fontFamily: HEADING,
    fontSize: 12,
    padding: "6px 14px",
    borderRadius: RADII.sm,
    cursor: "pointer",
    border: "none",
    background: active ? PALETTE.panel : "transparent",
    color: active ? PALETTE.text : PALETTE.muted,
    boxShadow: active ? `inset 0 0 0 1px ${PALETTE.line}` : "none",
  });

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        marginBottom: 22,
        flexWrap: "wrap",
      }}
    >
      <div style={{ fontFamily: HEADING, fontSize: 16, fontWeight: 500 }}>Report</div>
      <div
        style={{
          display: "flex",
          gap: 2,
          padding: 3,
          borderRadius: RADII.md,
          background: PALETTE.panel2,
          border: `1px solid ${PALETTE.line}`,
        }}
      >
        <button onClick={() => setTab("overview")} aria-pressed={tab === "overview"} style={seg(tab === "overview")}>
          Overview
        </button>
        <button
          onClick={() => setTab("stats")}
          aria-pressed={tab === "stats"}
          title="Accuracy by topic and study mode"
          style={seg(tab === "stats")}
        >
          Stats
        </button>
      </div>
      {/* Back kept its `marginLeft: auto` behavior by moving the push onto this
          wrapper — the view toggle has to sit beside Back, not left of the tab
          bar, and two separately right-aligned children is not a thing flex
          does. Only shown on Stats: it switches how that tab reads, and a
          control that does nothing on the tab you are looking at is worse than
          one that is absent. */}
      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
        {tab === "stats" && (
          <div
            style={{
              display: "flex",
              gap: 2,
              padding: 3,
              borderRadius: RADII.md,
              background: PALETTE.panel2,
              border: `1px solid ${PALETTE.line}`,
            }}
          >
            <button
              onClick={() => setView("grid")}
              aria-pressed={view === "grid"}
              title="Accuracy by topic and mode"
              style={seg(view === "grid")}
            >
              Grid
            </button>
            <button
              onClick={() => setView("sessions")}
              aria-pressed={view === "sessions"}
              title="Past study sittings, question by question"
              style={seg(view === "sessions")}
            >
              Sessions
            </button>
          </div>
        )}
        <button
          onClick={onExit}
          style={{
            fontFamily: HEADING,
            fontSize: 12,
            padding: "7px 14px",
            borderRadius: RADII.md,
            cursor: "pointer",
            border: `1px solid ${PALETTE.line}`,
            background: "transparent",
            color: PALETTE.text,
          }}
        >
          Back
        </button>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ fontFamily: HEADING, fontSize: 13, fontWeight: 500, color: PALETTE.muted, marginBottom: 10 }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function Panel({ children }) {
  return (
    <div
      style={{
        overflowX: "auto",
        background: PALETTE.panel,
        border: `1px solid ${PALETTE.line}`,
        borderRadius: RADII.md,
      }}
    >
      {children}
    </div>
  );
}

function Status({ text, tone }) {
  return (
    <div
      style={{
        background: PALETTE.panel,
        border: `1px solid ${tone === "bad" ? PALETTE.bad : PALETTE.line}`,
        borderRadius: RADII.lg,
        padding: "28px 30px",
        fontFamily: MONO,
        fontSize: 13,
        color: tone === "bad" ? PALETTE.bad : PALETTE.muted,
        textAlign: "center",
      }}
    >
      {text}
    </div>
  );
}
