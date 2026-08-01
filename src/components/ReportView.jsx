import React, { useEffect, useState } from "react";
import { PALETTE, MONO, HEADING, RADII } from "../data/theme";
import { getDrillReport, resetLeech } from "../api/client";

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
 */
export default function ReportView({ course, onExit }) {
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
    background: "transparent",
    color: PALETTE.text,
  };

  if (error) {
    return (
      <div>
        <TopBar onExit={onExit} />
        <Status text={error} tone="bad" />
      </div>
    );
  }
  if (!report) {
    return (
      <div>
        <TopBar onExit={onExit} />
        <Status text="loading report…" />
      </div>
    );
  }

  const weakestTopics = report.weakest.map((id) => report.topics.find((t) => t.id === id)).filter(Boolean);
  const allFormats = [...new Set(report.topics.flatMap((t) => Object.keys(t.formats)))];

  return (
    <div>
      <TopBar onExit={onExit} />

      {/* ── Study these next (the headline signal) ──────────────────────── */}
      <Section title="Study these next" subtitle="examWeight × (1 − closed-book first-try accuracy), highest first">
        <div style={{ display: "grid", gap: 8 }}>
          {weakestTopics.map((t) => (
            <div
              key={t.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "10px 14px",
                borderRadius: RADII.md,
                background: PALETTE.panel2,
                border: `1px solid ${PALETTE.line}`,
              }}
            >
              <span style={{ fontFamily: HEADING, fontSize: 14 }}>{t.title}</span>
              <span style={{ fontFamily: MONO, fontSize: 12, color: PALETTE.muted, display: "flex", gap: 14 }}>
                <span>weight {t.examWeight}</span>
                {t.verifiedItemCount === 0 ? (
                  <span style={{ color: PALETTE.bad }}>no items yet — migrate this topic first (A3)</span>
                ) : t.firstTryAccuracy == null ? (
                  <span>not drilled yet</span>
                ) : (
                  <span style={{ color: t.meetsTarget ? PALETTE.good : PALETTE.bad }}>
                    {Math.round(t.firstTryAccuracy * 100)}% first-try
                  </span>
                )}
              </span>
            </div>
          ))}
        </div>
      </Section>

      {/* ── Per-topic accuracy overview ──────────────────────────────────── */}
      <Section title="Topics" subtitle="closed-book first-try accuracy — target ≥85% where exam weight ≥ 1.0">
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: MONO, fontSize: 12 }}>
            <thead>
              <tr style={{ textAlign: "left", color: PALETTE.muted }}>
                <th style={th}>Topic</th>
                <th style={th}>Weight</th>
                <th style={th}>Verified items</th>
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
                  <td style={{ ...td, color: t.firstTryAccuracy == null ? PALETTE.muted : t.meetsTarget ? PALETTE.good : PALETTE.bad }}>
                    {t.firstTryAccuracy == null ? "—" : `${Math.round(t.firstTryAccuracy * 100)}% (${t.firstTryCount})`}
                  </td>
                  <td style={td}>{t.openClosedDelta == null ? "—" : `${t.openClosedDelta >= 0 ? "+" : ""}${Math.round(t.openClosedDelta * 100)}%`}</td>
                  <td style={{ ...td, color: t.leechCount > 0 ? PALETTE.bad : PALETTE.muted }}>{t.leechCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* ── Topics x formats grid ────────────────────────────────────────── */}
      <Section title="Bank coverage" subtitle="verified / total items, by topic and format">
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: MONO, fontSize: 11 }}>
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
        </div>
        {Object.keys(report.formatMedianSeconds).length > 0 && (
          <div style={{ marginTop: 10, fontFamily: MONO, fontSize: 11, color: PALETTE.muted }}>
            median time (closed, first-try):{" "}
            {Object.entries(report.formatMedianSeconds)
              .map(([f, s]) => `${f} ${s}s`)
              .join(" · ")}
          </div>
        )}
      </Section>

      {/* ── Leech list + handoff (A8) ────────────────────────────────────── */}
      <Section title="Leeches" subtitle="items pulled from rotation after 3 lapses — the item is probably broken, not you">
        {report.leeches.length === 0 ? (
          <div style={{ fontFamily: MONO, fontSize: 12, color: PALETTE.muted }}>None right now.</div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {report.leeches.map((l) => (
              <div key={l.itemId} style={{ background: PALETTE.panel2, border: `1px solid ${PALETTE.line}`, borderRadius: RADII.md, padding: "12px 14px" }}>
                <div style={{ fontSize: 14, marginBottom: 6 }}>{l.prompt}</div>
                <div style={{ fontFamily: MONO, fontSize: 11, color: PALETTE.muted, marginBottom: 10 }}>
                  {l.topicTitle} · {l.format} · {l.lapses} lapses · {l.history.length} attempts
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button onClick={() => copyForTutor(l)} style={navBtn}>
                    {copiedId === l.itemId ? "Copied ✓" : "Copy for tutor"}
                  </button>
                  <button
                    onClick={() => doResetLeech(l.itemId)}
                    disabled={resettingId === l.itemId}
                    style={{ ...navBtn, opacity: resettingId === l.itemId ? 0.5 : 1 }}
                    title='"Concept landed, item is fine" — clears lapses and re-enters rotation fresh'
                  >
                    {resettingId === l.itemId ? "Resetting…" : "Reset scheduling"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        <div style={{ fontFamily: MONO, fontSize: 11, color: PALETTE.muted, marginTop: 10 }}>
          Rewriting the item or splitting an overloaded fact both still need a direct edit to the topic file — there's no
          content editor for drill items yet (A7).
        </div>
      </Section>
    </div>
  );
}

const th = { padding: "6px 10px", fontWeight: 400 };
const td = { padding: "6px 10px", color: PALETTE.muted };

function TopBar({ onExit }) {
  return (
    <div style={{ display: "flex", alignItems: "center", marginBottom: 18 }}>
      <div style={{ fontFamily: HEADING, fontSize: 16, fontWeight: 500 }}>Report</div>
      <button
        onClick={onExit}
        style={{
          marginLeft: "auto",
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
        ‹ Back
      </button>
    </div>
  );
}

function Section({ title, subtitle, children }) {
  return (
    <div style={{ marginBottom: 26 }}>
      <div style={{ fontFamily: HEADING, fontSize: 14, fontWeight: 500, marginBottom: 2 }}>{title}</div>
      {subtitle && <div style={{ fontFamily: MONO, fontSize: 11, color: PALETTE.muted, marginBottom: 10 }}>{subtitle}</div>}
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
