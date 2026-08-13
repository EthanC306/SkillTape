import React, { useEffect, useState } from "react";
import { PALETTE, MONO, HEADING, RADII } from "../../data/theme";
import { getSessions } from "../../api/client";
import { GRADE_LABELS } from "../../data/grading";
import SessionModal from "./SessionModal";

/**
 * SessionList — the Stats tab's session reading.
 *
 * The grid answers "how am I doing on this topic in this mode". This answers
 * "what happened in that sitting" — one row per past Drill / Practice / Exam,
 * newest first, clickable into the questions themselves.
 *
 * Sessions come from server/sessions.js, which reconstructs them two ways: an
 * exact client-minted id on anything studied since the feature landed, and
 * timestamp clustering on everything older. The second is a guess, so those
 * rows say so rather than presenting a heuristic in the same voice as a fact.
 *
 * Props:
 *   course        — which course's history to list
 *   surface       — the MODE dropdown's value; ALL ("__all__") shows every mode
 *   surfaceLabels — server-supplied display names, so the two cannot drift
 */
const ALL = "__all__";

export default function SessionList({ course, surface, surfaceLabels }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [openKey, setOpenKey] = useState(null);

  useEffect(() => {
    setData(null);
    setError(null);
    let cancelled = false;
    getSessions(course)
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      });
    return () => {
      cancelled = true;
    };
  }, [course]);

  if (error) return <Status text={error} tone="bad" />;
  if (!data) return <Status text="loading sessions…" />;

  // Filtered client-side rather than by refetching: the list is summaries only,
  // so the whole history is already here and switching modes should be instant
  // — the same stance /api/stats/summary takes for the grid's dropdowns.
  const sessions =
    surface === ALL ? data.sessions : data.sessions.filter((s) => s.surface === surface);

  if (sessions.length === 0) {
    return (
      <Status
        text={
          surface === ALL
            ? "No study sessions recorded yet."
            : `No ${surfaceLabels[surface] ?? surface} sessions recorded yet.`
        }
      />
    );
  }

  const open = sessions.find((s) => s.key === openKey) ?? null;

  return (
    <div>
      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
        {sessions.map((s) => (
          <SessionRow
            key={s.key}
            session={s}
            label={surfaceLabels[s.surface] ?? s.surface}
            onOpen={() => setOpenKey(s.key)}
          />
        ))}
      </ul>

      {open && (
        <SessionModal
          course={course}
          sessionKey={open.key}
          summary={open}
          label={surfaceLabels[open.surface] ?? open.surface}
          onClose={() => setOpenKey(null)}
        />
      )}
    </div>
  );
}

/**
 * One sitting. A button rather than a styled div so it is keyboard-reachable
 * and announces itself as activatable — the whole row opens the detail, and a
 * click target this large should not be mouse-only.
 */
function SessionRow({ session, label, onOpen }) {
  const { startedAt, graded, correct, attempts, seconds, derived, topicIds } = session;
  const pct = graded ? Math.round((correct / graded) * 100) : null;
  const notReached = attempts - graded;

  return (
    <li>
      <button
        onClick={onOpen}
        style={{
          width: "100%",
          textAlign: "left",
          display: "block",
          background: PALETTE.panel2,
          border: `1px solid ${PALETTE.line}`,
          borderRadius: RADII.md,
          padding: "12px 14px",
          cursor: "pointer",
          color: PALETTE.text,
          font: "inherit",
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
          <span
            style={{
              fontFamily: MONO,
              fontSize: 13,
              fontWeight: 700,
              fontVariantNumeric: "tabular-nums",
              // Same 85% pass line accuracyColor uses in the grid, so a session
              // and the cell it feeds cannot disagree about what "good" is.
              color: pct == null ? PALETTE.muted : pct >= 85 ? PALETTE.good : PALETTE.bad,
            }}
          >
            {graded ? `${correct}/${graded}` : "—"}
          </span>
          <span style={{ fontFamily: HEADING, fontSize: 12 }}>{label}</span>
          <span style={{ fontFamily: MONO, fontSize: 11, color: PALETTE.muted }}>
            {new Date(startedAt).toLocaleString()}
          </span>
          <span style={{ marginLeft: "auto", fontFamily: MONO, fontSize: 11, color: PALETTE.muted }}>
            {formatDuration(seconds)}
          </span>
        </div>

        <div style={{ display: "flex", gap: 3, flexWrap: "wrap", marginTop: 8 }}>
          {session.grades.map((n, grade) =>
            // A histogram of the four grades rather than one square per
            // question: the per-question squares live in the detail view, and
            // repeating them here would make the row taller without saying
            // anything the score does not already.
            n > 0 ? (
              <span
                key={grade}
                title={`${GRADE_LABELS[grade]}: ${n}`}
                style={{
                  fontFamily: MONO,
                  fontSize: 10,
                  padding: "2px 7px",
                  borderRadius: RADII.sm,
                  background: grade >= 2 ? PALETTE.goodSoft : PALETTE.badSoft,
                  border: `1px solid ${grade >= 2 ? PALETTE.good : PALETTE.bad}`,
                  color: PALETTE.text,
                }}
              >
                {GRADE_LABELS[grade]} {n}
              </span>
            ) : null
          )}
          {notReached > 0 && (
            <span
              title="Seen but never answered — an exam the timer ran out on, or a drill ended mid-item"
              style={{
                fontFamily: MONO,
                fontSize: 10,
                padding: "2px 7px",
                borderRadius: RADII.sm,
                border: `1px dashed ${PALETTE.line}`,
                color: PALETTE.muted,
              }}
            >
              {notReached} not reached
            </span>
          )}
        </div>

        <div style={{ fontFamily: MONO, fontSize: 10, color: PALETTE.muted, marginTop: 8 }}>
          {topicIds.length} {topicIds.length === 1 ? "topic" : "topics"}
          {derived && (
            <>
              {" · "}
              <span title="Recorded before sessions were tracked — reconstructed by grouping attempts less than 30 minutes apart, so the boundaries are approximate.">
                approximate
              </span>
            </>
          )}
        </div>
      </button>
    </li>
  );
}

/** Total time on task, not wall-clock span — see the `seconds` note in server/sessions.js. */
function formatDuration(seconds) {
  if (!seconds) return "—";
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m < 60) return s ? `${m}m ${s}s` : `${m}m`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

/** Same shape StatsPanel and ReportView each declare locally — see PracticeView.jsx's note on that. */
function Status({ text, tone }) {
  return (
    <div
      style={{
        fontFamily: MONO,
        fontSize: 12,
        color: tone === "bad" ? PALETTE.bad : PALETTE.muted,
        padding: "18px 0",
      }}
    >
      {text}
    </div>
  );
}
