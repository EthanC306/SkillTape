// Display formatting for scheduler numbers. Pure string work, no scheduling
// logic. Intervals in days, stability to one decimal, retrievability as a
// whole percent, all decided here so the rule can't drift between screens.

/** Keeps a decimal only when it carries information: 2 -> "2", 1.4 -> "1.4". */
function trim1(n) {
  const s = n.toFixed(1);
  if (s.endsWith(".0")) return s.slice(0, -2);
  return s;
}

/** Shown wherever a card has no value for a field yet. Never a zero. */
export const NO_VALUE = "-";

const MINUTES_PER_DAY = 1440;
const DAYS_PER_MONTH = 30.4375;
const DAYS_PER_YEAR = 365.25;

/**
 * An interval as the grade bar labels it: "10m", "3d", "2mo", "1.4y".
 *
 * Takes minutes, not days, because FSRS learning steps are 1 and 10 minutes
 * and both report scheduled_days: 0. A days-only formatter prints "0d" for the
 * two intervals a new card spends most of its life on.
 */
export function formatInterval(minutes) {
  if (!Number.isFinite(minutes) || minutes <= 0) return "now";

  if (minutes < 60) {
    return `${Math.max(1, Math.round(minutes))}m`;
  }

  const hours = minutes / 60;
  if (hours < 24) {
    return `${Math.round(hours)}h`;
  }

  const days = minutes / MINUTES_PER_DAY;
  if (days < 30) {
    return `${Math.round(days)}d`;
  }

  // Rounded first, then range checked. Checking `months < 12` before rounding
  // lets 365 days (11.99 months) print "12mo", a unit this scale doesn't have.
  const months = days / DAYS_PER_MONTH;
  let monthLabel;
  if (months < 10) {
    monthLabel = trim1(months);
  } else {
    monthLabel = String(Math.round(months));
  }
  if (Number(monthLabel) < 12) {
    return `${monthLabel}mo`;
  }

  const years = days / DAYS_PER_YEAR;
  if (years < 10) {
    return `${trim1(years)}y`;
  }
  return `${Math.round(years)}y`;
}

export function formatIntervalBetween(fromMs, toMs) {
  return formatInterval((toMs - fromMs) / 60000);
}

export function formatStability(stability) {
  if (!Number.isFinite(stability) || stability <= 0) return NO_VALUE;
  if (stability < 10) return trim1(stability);
  return String(Math.round(stability));
}

/** FSRS difficulty runs 1 to 10, so one decimal across the whole range. */
export function formatDifficulty(difficulty) {
  if (!Number.isFinite(difficulty) || difficulty <= 0) return NO_VALUE;
  return trim1(difficulty);
}

export function formatRetrievability(r) {
  if (!Number.isFinite(r)) return NO_VALUE;
  return `${Math.round(r * 100)}%`;
}

/**
 * When a card next comes up, in words. Day granular on purpose: an exact
 * timestamp invites reading precision into a schedule that fuzz jitters.
 */
export function formatDueLabel(dueOn, now = Date.now()) {
  if (dueOn == null) return "not scheduled";
  if (dueOn <= now) return "due now";

  const days = Math.round((dueOn - now) / 86400000);
  if (days === 0) return "later today";
  if (days === 1) return "tomorrow";
  return `in ${formatInterval((dueOn - now) / 60000)}`;
}
