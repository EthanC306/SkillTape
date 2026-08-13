import React, { useEffect, useMemo, useState } from "react";
import { PALETTE, MONO, HEADING, RADII } from "../../data/theme";
import { getStatsSummary } from "../../api/client";
import Select from "../ui/Select";
import SessionList from "./SessionList";

/**
 * StatsPanel — the Report view's Stats tab (ROADMAP.md A11).
 *
 * Answers the question the A6 dashboard structurally cannot: "how am I doing on
 * THIS topic in THIS mode." A6 leads with one number on purpose (closed-book
 * first-try accuracy per topic, the only figure it claims predicts an exam),
 * and that stays untouched on the Overview tab. This tab is the breakdown
 * underneath it.
 *
 * Two dropdowns rather than one exhaustive sheet. A 17-topic x 4-surface grid
 * printed in full is 68 cells of mostly nothing, and reading it is work; the
 * same data behind a topic picker and a mode picker is four small views, each
 * of which answers one question completely.
 *
 * ALL / ALL is still shown as a matrix, because "100% on MCQ but 56% in
 * Practice" is a comparison, and a comparison needs both numbers on screen at
 * once.
 */

const ALL = "__all__";

export default function StatsPanel({ course, view = "grid" }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [topicId, setTopicId] = useState(ALL);
  const [surface, setSurface] = useState(ALL);
  // "firstTry" is the honest exam predictor and matches what Overview reports;
  // "all" is every answer ever given. Defaulting to first-try keeps the two
  // tabs telling the same story unless you deliberately ask for the other one.
  const [counting, setCounting] = useState("firstTry");

  useEffect(() => {
    setData(null);
    setError(null);
    getStatsSummary(course)
      .then(setData)
      .catch((err) => setError(err.message));
  }, [course]);

  // Reset the topic filter when the course changes, or a topic id from the
  // previous course would survive into a bank that has no such topic and the
  // panel would show a permanent empty state with no obvious cause.
  useEffect(() => {
    setTopicId(ALL);
    setSurface(ALL);
  }, [course]);

  const cellIndex = useMemo(() => {
    const map = new Map();
    for (const c of data?.cells ?? []) map.set(`${c.topicId} ${c.surface}`, c);
    return map;
  }, [data]);

  if (error) return <Status text={error} tone="bad" />;
  if (!data) return <Status text="loading stats…" />;

  const { topics, surfaces, surfaceLabels } = data;

  /** The counting-mode-aware figures for one cell, or null when it has none. */
  function statsFor(tId, s) {
    const cell = cellIndex.get(`${tId} ${s}`);
    if (!cell) return null;
    return cell[counting];
  }

  /**
   * Sum a set of cells under the current counting mode.
   *
   * Durations are pooled and the median taken once over the whole selection,
   * rather than averaging each cell's median: a median of medians is not a
   * median, and with cells this small it lands nowhere near the real figure.
   * This is why the server ships raw `seconds` arrays (see server/stats.js).
   */
  function rollup(pairs) {
    let attempts = 0;
    let correct = 0;
    let seconds = [];
    let lastAt = null;
    for (const [tId, s] of pairs) {
      const cell = cellIndex.get(`${tId} ${s}`);
      if (!cell) continue;
      const st = cell[counting];
      attempts += st.attempts;
      correct += st.correct;
      seconds = seconds.concat(st.seconds ?? []);
      if (cell.lastAt != null && (lastAt == null || cell.lastAt > lastAt)) lastAt = cell.lastAt;
    }
    return { attempts, correct, seconds, lastAt };
  }

  const activeTopics = topicId === ALL ? topics.map((t) => t.id) : [topicId];
  const activeSurfaces = surface === ALL ? surfaces : [surface];
  const selectionPairs = activeTopics.flatMap((t) => activeSurfaces.map((s) => [t, s]));
  const headline = rollup(selectionPairs);

  const topicTitle = topics.find((t) => t.id === topicId)?.title ?? null;
  const surfaceTitle = surfaceLabels[surface] ?? null;

  const topicOptions = [
    { value: ALL, label: "All topics" },
    ...topics.map((t) => ({ value: t.id, label: t.title })),
  ];

  // Surfaces with no data anywhere stay in the list, labeled. Hiding them would
  // make "I have never used Practice" look identical to "Practice is not a
  // thing", and only one of those is worth acting on.
  const surfaceOptions = [
    { value: ALL, label: "All modes" },
    ...surfaces.map((s) => {
      const total = topics.reduce((n, t) => n + (cellIndex.get(`${t.id} ${s}`)?.all.attempts ?? 0), 0);
      return { value: s, label: total > 0 ? surfaceLabels[s] : `${surfaceLabels[s]} — no data` };
    }),
  ];

  const sessionView = view === "sessions";

  return (
    <div>
      {/* ── Controls ──────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "flex-end", marginBottom: 22 }}>
        {/* A sitting is inherently mixed-topic — a drill queue and an exam both
            pull across topics — so filtering sessions by one topic would make
            the score column mean something other than "how that sitting went".
            Disabled and visibly so, rather than silently ignored. The value is
            left alone so switching back to Grid restores the previous slice. */}
        <Select
          label="TOPIC"
          value={sessionView ? ALL : topicId}
          onChange={setTopicId}
          options={topicOptions}
          disabled={sessionView}
          title={sessionView ? "Sessions span topics — filter by mode instead" : undefined}
        />
        <Select label="MODE" value={surface} onChange={setSurface} options={surfaceOptions} />
        {/* First-try vs all-attempts is a question about a BANK of items over
            time. Within one sitting each item appears once, so the two counting
            modes would produce identical numbers and the control would only
            look broken. */}
        {!sessionView && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontFamily: MONO, fontSize: 11, color: PALETTE.muted, letterSpacing: 0.3 }}>
              COUNTING
            </span>
            <div style={{ display: "flex", gap: 6 }}>
              <Toggle active={counting === "firstTry"} onClick={() => setCounting("firstTry")}>
                First-try
              </Toggle>
              <Toggle active={counting === "all"} onClick={() => setCounting("all")}>
                All attempts
              </Toggle>
            </div>
          </div>
        )}
      </div>

      {sessionView ? (
        <SessionList course={course} surface={surface} surfaceLabels={surfaceLabels} />
      ) : (
        <>
          {/* ── Headline ────────────────────────────────────────────────── */}
          <Tiles stats={headline} />

          {/* ── The slice ───────────────────────────────────────────────── */}
          <div style={{ marginTop: 26 }}>
            {headline.attempts === 0 ? (
              <Empty
                topicTitle={topicTitle}
                surfaceTitle={surfaceTitle}
                counting={counting}
                // Only worth suggesting the other counting mode when it would
                // actually show something. "Try All attempts" under a slice that is
                // empty either way is advice that wastes a click.
                allAttemptsWouldHelp={selectionPairs.some(
                  ([t, s]) => (cellIndex.get(`${t} ${s}`)?.all.attempts ?? 0) > 0
                )}
              />
            ) : (
              <Body
                topicId={topicId}
                surface={surface}
                topics={topics}
                surfaces={surfaces}
                surfaceLabels={surfaceLabels}
                cellIndex={cellIndex}
                counting={counting}
                statsFor={statsFor}
                rollup={rollup}
              />
            )}
          </div>

          {/* ── Activity ────────────────────────────────────────────────── */}
          <Activity
            activity={data.activity}
            days={data.activityDays}
            topicId={topicId}
            surface={surface}
          />
        </>
      )}
    </div>
  );
}

/* ── The four slice shapes ───────────────────────────────────────────────── */

function Body(props) {
  const { topicId, surface } = props;
  if (topicId === ALL && surface === ALL) return <Matrix {...props} />;
  if (topicId !== ALL && surface === ALL) return <ByMode {...props} />;
  if (topicId === ALL && surface !== ALL) return <ByTopic {...props} />;
  return <Detail {...props} />;
}

/** All topics x all modes. The comparison view — the reason this tab exists. */
function Matrix({ topics, surfaces, surfaceLabels, cellIndex, counting }) {
  // Always show Exam / Drill / Practice / MCQ so an empty column is visibly empty
  // rather than missing. Topics with nothing under the current counting mode stay
  // out of the body so the table does not pad with all-dash rows.
  const rows = topics.filter((t) =>
    surfaces.some((s) => (cellIndex.get(`${t.id} ${s}`)?.[counting].attempts ?? 0) > 0)
  );

  return (
    <Titled title="Topic × mode">
      <Panel>
        <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: MONO, fontSize: 12 }}>
          <thead>
            <tr style={{ textAlign: "left", color: PALETTE.muted }}>
              <th style={th}>Topic</th>
              {surfaces.map((s) => (
                <th key={s} style={th}>
                  {surfaceLabels[s]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((t) => (
              <tr key={t.id} style={{ borderTop: `1px solid ${PALETTE.line}` }}>
                <td style={{ ...td, color: PALETTE.text }}>{t.title}</td>
                {surfaces.map((s) => {
                  const st = cellIndex.get(`${t.id} ${s}`)?.[counting];
                  if (!st || st.attempts === 0) {
                    return (
                      <td key={s} style={td}>
                        —
                      </td>
                    );
                  }
                  return (
                    <td key={s} style={{ ...td, color: accuracyColor(st) }}>
                      {pct(st)}%{" "}
                      <span style={{ color: PALETTE.muted }}>
                        ({st.correct}/{st.attempts})
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </Titled>
  );
}

/** One topic, every mode. */
function ByMode({ topicId, topics, surfaces, surfaceLabels, cellIndex, counting }) {
  const title = topics.find((t) => t.id === topicId)?.title ?? topicId;
  const rows = surfaces.map((s) => ({
    surface: s,
    stats: cellIndex.get(`${topicId} ${s}`)?.[counting] ?? null,
  }));

  return (
    <Titled title={title}>
      <div style={{ display: "grid", gap: 8 }}>
        {rows.map((r) => (
          <BarRow key={r.surface} label={surfaceLabels[r.surface]} stats={r.stats} />
        ))}
      </div>
    </Titled>
  );
}

/** One mode, every topic — worst first, so the row that needs work is at the top. */
function ByTopic({ surface, topics, surfaceLabels, cellIndex, counting }) {
  const rows = topics
    .map((t) => ({ title: t.title, id: t.id, stats: cellIndex.get(`${t.id} ${surface}`)?.[counting] }))
    .filter((r) => r.stats && r.stats.attempts > 0)
    .sort((a, b) => pct(a.stats) - pct(b.stats));

  return (
    <Titled title={surfaceLabels[surface]}>
      <div style={{ display: "grid", gap: 8 }}>
        {rows.map((r) => (
          <BarRow key={r.id} label={r.title} stats={r.stats} />
        ))}
      </div>
    </Titled>
  );
}

/** One topic, one mode. */
function Detail({ topicId, surface, topics, surfaceLabels, cellIndex, counting }) {
  const cell = cellIndex.get(`${topicId} ${surface}`);
  const title = topics.find((t) => t.id === topicId)?.title ?? topicId;
  const stats = cell?.[counting];

  return (
    <Titled title={`${title} · ${surfaceLabels[surface]}`}>
      <div
        style={{
          background: PALETTE.panel,
          border: `1px solid ${PALETTE.line}`,
          borderRadius: RADII.md,
          padding: "14px 16px",
        }}
      >
        <BarRow label={surfaceLabels[surface]} stats={stats} />

        {/* The recent run is every attempt in this slice regardless of the
            counting toggle — it is a history, and a history that redraws
            itself when you change how averages are computed is a lie. */}
        {cell?.recent?.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <div style={{ fontFamily: MONO, fontSize: 11, color: PALETTE.muted, marginBottom: 8 }}>
              Last {cell.recent.length}
            </div>
            <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
              {cell.recent.map((ok, i) => (
                <span
                  key={i}
                  title={ok ? "correct" : "wrong"}
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: RADII.sm,
                    background: ok ? PALETTE.goodSoft : PALETTE.badSoft,
                    border: `1px solid ${ok ? PALETTE.good : PALETTE.bad}`,
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {cell?.lastAt != null && (
          <div style={{ fontFamily: MONO, fontSize: 11, color: PALETTE.muted, marginTop: 14 }}>
            Last answered {new Date(cell.lastAt).toLocaleString()}
          </div>
        )}
      </div>
    </Titled>
  );
}

/* ── Pieces ──────────────────────────────────────────────────────────────── */

/**
 * The headline four-up. Same proportions as fsrs/StatTiles.jsx (28px value,
 * tabular figures, MONO caption) so the two dashboards read as one app.
 */
function Tiles({ stats }) {
  const has = stats.attempts > 0;
  const timed = stats.seconds?.length ?? 0;
  const med = median(stats.seconds ?? []);
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
      <Tile
        label="Accuracy"
        value={has ? `${pct(stats)}%` : "—"}
        caption={has ? "target 85%" : "nothing recorded"}
        color={has ? accuracyColor(stats) : PALETTE.muted}
      />
      <Tile label="Attempts" value={has ? String(stats.attempts) : "—"} caption="answers counted" />
      <Tile label="Correct" value={has ? String(stats.correct) : "—"} caption="Good or Easy" />
      <Tile
        label="Median time"
        value={med != null ? `${round1(med)}s` : "—"}
        caption={timed > 0 ? `${timed} timed` : "no timing"}
      />
    </div>
  );
}

function Tile({ label, value, caption, color }) {
  return (
    <div
      style={{
        background: PALETTE.panel,
        border: `1px solid ${PALETTE.line}`,
        borderRadius: RADII.md,
        padding: "14px 16px",
      }}
    >
      <div style={{ fontFamily: HEADING, fontSize: 12, fontWeight: 500, color: PALETTE.muted, marginBottom: 10 }}>
        {label}
      </div>
      <div
        style={{
          fontFamily: HEADING,
          fontSize: 26,
          fontWeight: 500,
          lineHeight: 1,
          color: color ?? PALETTE.text,
          fontVariantNumeric: "tabular-nums",
          marginBottom: 6,
        }}
      >
        {value}
      </div>
      <div style={{ fontFamily: MONO, fontSize: 11, color: PALETTE.muted, lineHeight: 1.4 }}>{caption}</div>
    </div>
  );
}

/** A label, an accuracy bar, and the numbers. The workhorse of three of the four views. */
function BarRow({ label, stats }) {
  const has = stats && stats.attempts > 0;
  const p = has ? pct(stats) : 0;
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(120px, 1fr) minmax(80px, 3fr) auto",
        gap: 14,
        alignItems: "center",
      }}
    >
      <span style={{ fontFamily: HEADING, fontSize: 13 }}>{label}</span>
      <span
        style={{
          height: 8,
          borderRadius: RADII.sm,
          background: PALETTE.panel2,
          border: `1px solid ${PALETTE.line}`,
          overflow: "hidden",
        }}
      >
        {has && (
          <span
            style={{
              display: "block",
              height: "100%",
              width: `${p}%`,
              background: accuracyColor(stats),
              opacity: 0.65,
            }}
          />
        )}
      </span>
      <span
        style={{
          fontFamily: MONO,
          fontSize: 12,
          fontVariantNumeric: "tabular-nums",
          color: has ? accuracyColor(stats) : PALETTE.muted,
          whiteSpace: "nowrap",
        }}
      >
        {has ? (
          <>
            {p}%{" "}
            <span style={{ color: PALETTE.muted }}>
              ({stats.correct}/{stats.attempts})
            </span>
          </>
        ) : (
          "—"
        )}
      </span>
    </div>
  );
}

/**
 * A 30-day bar strip. Hand-rolled SVG like ComplexityChart and
 * RetrievabilityCurve — this repo has no charting dependency and adding one for
 * thirty rectangles would be the wrong trade.
 *
 * Each day is one bar: full height is that day's attempt count against the
 * busiest day in the window, and the filled portion is the share answered
 * correctly. Empty days are drawn as a baseline tick rather than skipped, so
 * the gaps are visible as gaps.
 */
function Activity({ activity, days, topicId, surface }) {
  const rows = activity.filter(
    (a) => (surface === ALL || a.surface === surface) && (topicId === ALL || a.topicId === topicId)
  );

  const byDay = new Map();
  for (const r of rows) {
    const d = byDay.get(r.day) ?? { attempts: 0, correct: 0 };
    d.attempts += r.attempts;
    d.correct += r.correct;
    byDay.set(r.day, d);
  }

  // Rebuilt from today backwards rather than from the response's day keys, so
  // days with nothing recorded still occupy a slot.
  const today = new Date();
  const slots = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    slots.push({ key, ...(byDay.get(key) ?? { attempts: 0, correct: 0 }) });
  }

  const peak = Math.max(1, ...slots.map((s) => s.attempts));
  const total = slots.reduce((n, s) => n + s.attempts, 0);
  const activeDays = slots.filter((s) => s.attempts > 0).length;

  const W = 100;
  const H = 28;
  const slotW = W / days;
  const barW = slotW * 0.62;

  return (
    <div style={{ marginTop: 30 }}>
      <div style={{ fontFamily: HEADING, fontSize: 13, fontWeight: 500, color: PALETTE.muted, marginBottom: 10 }}>
        Last {days} days
        <span style={{ fontFamily: MONO, fontWeight: 400, marginLeft: 10 }}>
          {total} answers · {activeDays} active
        </span>
      </div>

      <div
        style={{
          background: PALETTE.panel,
          border: `1px solid ${PALETTE.line}`,
          borderRadius: RADII.md,
          padding: "14px 16px",
        }}
      >
        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          role="img"
          aria-label={`Daily study activity for the last ${days} days: ${total} answers across ${activeDays} days.`}
          style={{ width: "100%", height: 56, display: "block" }}
        >
          {slots.map((s, i) => {
            const x = i * slotW + (slotW - barW) / 2;
            if (s.attempts === 0) {
              return <rect key={s.key} x={x} y={H - 0.8} width={barW} height={0.8} fill={PALETTE.line} />;
            }
            const h = Math.max(1.5, (s.attempts / peak) * (H - 2));
            const correctH = h * (s.correct / s.attempts);
            return (
              <g key={s.key}>
                <title>{`${s.key}: ${s.correct}/${s.attempts} correct`}</title>
                <rect x={x} y={H - h} width={barW} height={h} fill={PALETTE.line} />
                <rect x={x} y={H - correctH} width={barW} height={correctH} fill={PALETTE.good} opacity={0.75} />
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

/** Names the empty slice rather than drawing a grid of dashes for it. */
function Empty({ topicTitle, surfaceTitle, counting, allAttemptsWouldHelp }) {
  let what = "No attempts recorded yet";
  if (topicTitle && surfaceTitle) what = `No ${surfaceTitle} attempts recorded for ${topicTitle} yet`;
  else if (topicTitle) what = `No attempts recorded for ${topicTitle} yet`;
  else if (surfaceTitle) what = `No ${surfaceTitle} attempts recorded yet`;

  return (
    <div
      style={{
        background: PALETTE.panel,
        border: `1px solid ${PALETTE.line}`,
        borderRadius: RADII.md,
        padding: "22px 24px",
        fontFamily: MONO,
        fontSize: 12,
        color: PALETTE.muted,
        lineHeight: 1.6,
      }}
    >
      {what}.
      {counting === "firstTry" && allAttemptsWouldHelp && (
        <div style={{ marginTop: 6 }}>Try All attempts for the full history.</div>
      )}
    </div>
  );
}

function Titled({ title, children }) {
  return (
    <div>
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

function Toggle({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      style={{
        fontFamily: HEADING,
        fontSize: 12,
        padding: "7px 14px",
        borderRadius: RADII.md,
        cursor: "pointer",
        border: `1px solid ${active ? PALETTE.accent : PALETTE.line}`,
        background: active ? PALETTE.accentSoft : "transparent",
        color: active ? PALETTE.accent : PALETTE.text,
      }}
    >
      {children}
    </button>
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

/* ── Helpers ─────────────────────────────────────────────────────────────── */

const th = { padding: "10px 12px", fontWeight: 400 };
const td = { padding: "10px 12px", color: PALETTE.muted, fontVariantNumeric: "tabular-nums" };

function pct(stats) {
  if (!stats || stats.attempts === 0) return 0;
  return Math.round((stats.correct / stats.attempts) * 100);
}

/** The 85% line is A6's pre-exam target for any topic weighted 1.0 or above. */
function accuracyColor(stats) {
  if (!stats || stats.attempts === 0) return PALETTE.muted;
  if (pct(stats) >= 85) return PALETTE.good;
  return PALETTE.bad;
}

/** Mirrors server/stats.js's median. Small enough to restate rather than share a module across the API boundary. */
function median(nums) {
  if (!nums.length) return null;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2) return sorted[mid];
  return (sorted[mid - 1] + sorted[mid]) / 2;
}

function round1(n) {
  return Math.round(n * 10) / 10;
}
