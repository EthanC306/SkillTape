import React, { useCallback, useEffect, useRef, useState } from "react";
import { PALETTE, MONO, HEADING, RADII, fadeDivider } from "../data/theme";
import { formatInterval, formatDueLabel } from "../data/fsrsFormat";
import { postSchedulerSimulate } from "../api/client";
import useSchedulerSettings from "../hooks/useSchedulerSettings";
import StatTiles from "./fsrs/StatTiles";
import GradeBar from "./fsrs/GradeBar";
import RetrievabilityCurve from "./fsrs/RetrievabilityCurve";
import PromptBody from "./PromptBody";

/**
 * The scheduler sandbox. One scratch card, a clock you can push forward, and
 * every number the scheduler tracks updated live.
 *
 * Nothing here is saved. The card lives in React state and every calculation
 * goes to POST /api/drill/simulate, which touches no database. Two reasons: a
 * sandbox that quietly scheduled a real item would be a trap, and routing the
 * math through the server keeps the rule that only server/fsrs.js derives an
 * interval. This screen is layout, nothing else.
 */

// Hardcoded rather than pulled from the queue. A scratch card has to be safe
// to fail on purpose, and the moment this showed a genuine due item the user
// would reasonably assume grading it counted.
const SCRATCH_CARD = {
  topic: "dynamic arrays",
  ref: "item 004",
  prompt: "What does `delete[] p;` do if `p` was shifted with `p += 5;`?",
  format: "recall",
};

const DAY_MS = 86400000;

const STATE_ROLE = [
  { name: "New", color: PALETTE.accent },
  { name: "Learning", color: PALETTE.warn },
  { name: "Review", color: PALETTE.good },
  { name: "Relearning", color: PALETTE.bad },
];

export default function FsrsLab({ onExit }) {
  const [card, setCard] = useState(null);
  const [now, setNow] = useState(() => Date.now());
  const [requestRetention, setRequestRetention] = useState(0.9);
  const [sim, setSim] = useState(null);
  const [error, setError] = useState(null);

  const { settings: saved } = useSchedulerSettings();
  const touched = useRef(false);

  // Open on the user's real retention, but only if they haven't already
  // dragged the slider. The settings fetch resolves after first paint, and
  // yanking the slider out from under a hand mid-drag is worse than the
  // default.
  useEffect(() => {
    if (saved && !touched.current) {
      setRequestRetention(saved.requestRetention);
    }
  }, [saved]);

  // Every call is ticketed so only the newest lands. Dragging the slider fires
  // a request per frame and they do not come back in order.
  const seq = useRef(0);

  const simulate = useCallback(
    async (body) => {
      const ticket = seq.current + 1;
      seq.current = ticket;
      try {
        const res = await postSchedulerSimulate({
          format: SCRATCH_CARD.format,
          settings: { requestRetention },
          ...body,
        });
        if (ticket !== seq.current) return null;
        setSim(res);
        setError(null);
        return res;
      } catch (e) {
        if (ticket === seq.current) setError(e.message);
        return null;
      }
    },
    [requestRetention]
  );

  useEffect(() => {
    simulate({ card, now });
  }, [card, now, simulate]);

  async function grade(g) {
    const res = await simulate({ card, now, grade: g });
    if (res?.card) setCard(res.card);
  }

  function reset() {
    setCard(null);
    setNow(Date.now());
  }

  function moveRetention(value) {
    touched.current = true;
    setRequestRetention(value);
  }

  const reviewed = card != null;
  const dueOn = card?.due_on ?? null;
  const canJump = reviewed && dueOn > now;
  const lastReviewedAt = card?.last_reviewed_at ?? null;

  function offsetDays(ms) {
    if (lastReviewedAt == null) return null;
    return (ms - lastReviewedAt) / DAY_MS;
  }

  let dueOffset = null;
  if (dueOn != null) {
    dueOffset = offsetDays(dueOn);
  }

  let jumpTitle = "Grade the card first, it isn't scheduled yet";
  if (canJump) {
    jumpTitle = "Jump the clock to this card's due date";
  }

  let sinceLastReview = "";
  if (reviewed) {
    if (now - lastReviewedAt < 60000) {
      sinceLastReview = "just now";
    } else {
      sinceLastReview = `${formatInterval((now - lastReviewedAt) / 60000)} ago`;
    }
  }

  let clockLine = "card not scheduled";
  if (reviewed) {
    clockLine = `card ${formatDueLabel(dueOn, now)}`;
  }

  return (
    <div style={{ maxWidth: 780, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 16, marginBottom: 18 }}>
        <div>
          <h2 style={{ fontFamily: HEADING, fontSize: 19, fontWeight: 500, margin: "0 0 4px" }}>
            How scheduling works
          </h2>
          <p style={{ color: PALETTE.muted, fontSize: 13, margin: 0, maxWidth: 520, lineHeight: 1.6 }}>
            A scratch card wired to the real scheduler. Grade it, push the clock forward, and watch
            what moves. Nothing here is saved.
          </p>
        </div>
        <button onClick={onExit} style={{ ...ghostBtn, marginLeft: "auto", flexShrink: 0 }}>
          Back
        </button>
      </div>

      <div
        style={{
          background: PALETTE.panel,
          border: `1px solid ${PALETTE.line}`,
          borderRadius: RADII.lg,
          padding: 24,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <span style={{ fontFamily: MONO, fontSize: 12, color: PALETTE.muted }}>
            {SCRATCH_CARD.topic} / {SCRATCH_CARD.ref}
          </span>
          <StateBadge state={sim?.card?.state ?? 0} />
        </div>

        <PromptBody
          prompt={SCRATCH_CARD.prompt}
          style={{ fontSize: 16, fontWeight: 600, lineHeight: 1.5, marginBottom: 6 }}
        />
        <div style={{ fontSize: 13, color: PALETTE.muted, marginBottom: 26 }}>
          Answer shown. Now grade it.
        </div>

        <StatTiles
          review={{
            stability: sim?.card?.stability,
            difficulty: sim?.card?.difficulty,
            retrievability: sim?.retrievability,
            reps: sim?.card?.reps ?? 0,
            lapses: sim?.card?.lapses ?? 0,
            dueOn,
          }}
          now={now}
        />

        <div style={{ marginTop: 26 }}>
          <GradeBar preview={sim?.preview} onGrade={grade} disabled={!sim} />
        </div>

        <div style={{ marginTop: 20 }}>
          <RetrievabilityCurve
            curve={sim?.curve}
            target={requestRetention}
            nowOffsetDays={offsetDays(now)}
            dueOffsetDays={dueOffset}
          />
        </div>

        <div style={{ height: 1, background: fadeDivider(), margin: "24px 0 20px" }} />

        <Control label="Desired retention">
          <input
            type="range"
            min={0.7}
            max={0.97}
            step={0.01}
            value={requestRetention}
            onChange={(e) => moveRetention(Number(e.target.value))}
            aria-label="Desired retention"
            style={{ flex: 1, minWidth: 140, accentColor: PALETTE.accent, cursor: "pointer" }}
          />
          <span
            style={{
              fontFamily: MONO,
              fontSize: 13,
              fontWeight: 600,
              color: PALETTE.text,
              minWidth: 42,
              textAlign: "right",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {Math.round(requestRetention * 100)}%
          </span>
        </Control>

        <Control label="Advance clock">
          <button onClick={() => setNow((t) => t + DAY_MS)} style={ghostBtn}>
            +1 day
          </button>
          <button onClick={() => setNow((t) => t + 7 * DAY_MS)} style={ghostBtn}>
            +7 days
          </button>
          <button
            onClick={() => setNow(dueOn)}
            disabled={!canJump}
            title={jumpTitle}
            style={{ ...ghostBtn, opacity: canJump ? 1 : 0.4, cursor: canJump ? "pointer" : "default" }}
          >
            Jump to due
          </button>
          <button
            onClick={reset}
            style={{ ...ghostBtn, marginLeft: "auto", color: PALETTE.muted }}
          >
            Reset card
          </button>
        </Control>

        <div style={{ fontFamily: MONO, fontSize: 11, color: PALETTE.muted, marginTop: 14, lineHeight: 1.7 }}>
          <div>
            clock {new Date(now).toLocaleString()} · {clockLine}
          </div>
          {reviewed && (
            <div>
              last review {sinceLastReview} · this interval{" "}
              {formatInterval((dueOn - lastReviewedAt) / 60000)}
            </div>
          )}
          <div style={{ marginTop: 6 }}>
            Retention here is the sandbox's own. Your saved setting is untouched.
          </div>
          {error && <div style={{ color: PALETTE.bad, marginTop: 6 }}>{error}</div>}
        </div>
      </div>

      <ul style={{ margin: "18px 0 0", padding: "0 0 0 18px", color: PALETTE.muted, fontSize: 13, lineHeight: 1.9 }}>
        <li>
          Hit <strong style={{ color: PALETTE.good }}>Good</strong> three times. Stability compounds,
          and that is the whole mechanism.
        </li>
        <li>
          Then hit <strong style={{ color: PALETTE.bad }}>Again</strong> once. Stability collapses and
          difficulty jumps, and difficulty never fully recovers, so every later interval stays
          shorter. One lapse costs you for a long time.
        </li>
        <li>
          Drag retention from 90% down to 80% and the intervals roughly double. It is the only knob
          most people ever need.
        </li>
        <li>
          Advance the clock and watch the curve fall toward the dashed line. The scheduler is just
          picking the day the curve crosses it.
        </li>
      </ul>
    </div>
  );
}

function Control({ label, children }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
      <span style={{ fontFamily: HEADING, fontSize: 13, color: PALETTE.muted, minWidth: 122 }}>
        {label}
      </span>
      {children}
    </div>
  );
}

function StateBadge({ state }) {
  const role = STATE_ROLE[state] ?? STATE_ROLE[0];
  return (
    <span
      style={{
        marginLeft: "auto",
        fontFamily: HEADING,
        fontSize: 11,
        fontWeight: 500,
        padding: "3px 9px",
        borderRadius: RADII.sm,
        border: `1px solid ${role.color}`,
        color: role.color,
      }}
    >
      {role.name}
    </span>
  );
}

const ghostBtn = {
  fontFamily: HEADING,
  fontSize: 12,
  padding: "7px 14px",
  borderRadius: RADII.md,
  cursor: "pointer",
  border: `1px solid ${PALETTE.line}`,
  background: PALETTE.panel2,
  color: PALETTE.text,
};
