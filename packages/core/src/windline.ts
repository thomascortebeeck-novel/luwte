/**
 * BRAND 3.7 — the windline.
 *
 * A single fine line drawn from the last fourteen days. Unsettled stretches
 * oscillate finely and closely; settled stretches run long and near-flat. It
 * carries no number, no label, no scale and no judgement. It is a horizon
 * line — a way of feeling the shape of a fortnight in half a second.
 *
 * This module produces the *shape*, not the drawing: one unrest value per
 * day, 0 for settled and 1 for unsettled. The geometry lives in the UI.
 *
 * Two rules govern it, and both are easy to break by accident:
 *
 *   1. **It is not a score.** Unrest is not badness. A person can be
 *      unsettled and having a good week. Nothing here may be phrased,
 *      coloured or ranked as good or bad.
 *   2. **A missed day is invisible** (BRAND 4.1). A gap must not render as a
 *      gap, so missing days are bridged from their neighbours. The line stays
 *      continuous and says nothing about the day nobody filled in.
 */

export type WindlineDay = {
  /** 1..7 */
  mood: number;
  /** 1..7, how rested */
  sleepRested: number;
  /** 1..7, higher is more restless */
  anxiety: number;
};

/** Maps 1..7 onto 0..1. */
const normalise = (value: number) => (Math.min(7, Math.max(1, value)) - 1) / 6;

/**
 * How agitated a single day reads.
 *
 * Anxiety carries the most weight because it is the most direct report of
 * unrest. Poor sleep and low mood contribute because both show up as
 * agitation in the shape of a fortnight, but neither is treated as a verdict
 * on the day.
 *
 * Activity will join this when the calendar lands (BRAND 3.7 names mood,
 * sleep and activity); until then the three self-reported items carry it.
 */
export function dayUnrest(day: WindlineDay): number {
  const anxiety = normalise(day.anxiety);
  const unrested = 1 - normalise(day.sleepRested);
  const lowMood = 1 - normalise(day.mood);

  const weighted = anxiety * 0.5 + unrested * 0.3 + lowMood * 0.2;
  return Math.min(1, Math.max(0, weighted));
}

/**
 * One unrest value per day, oldest first, with missing days bridged.
 *
 * `days` is indexed oldest to newest and may contain nulls for days with no
 * check-in. A null between two known days takes the average of the nearest
 * known values on each side; a null at either end takes its nearest known
 * neighbour. With nothing known at all the line is flat and quiet, which is
 * the correct thing for a new account to show.
 */
export function windlineSeries(days: readonly (WindlineDay | null)[]): number[] {
  const known = days.map((day) => (day ? dayUnrest(day) : null));

  if (known.every((value) => value === null)) {
    return known.map(() => 0);
  }

  return known.map((value, index) => {
    if (value !== null) return value;

    let before: number | null = null;
    for (let i = index - 1; i >= 0; i -= 1) {
      const candidate = known[i];
      if (candidate !== null && candidate !== undefined) {
        before = candidate;
        break;
      }
    }

    let after: number | null = null;
    for (let i = index + 1; i < known.length; i += 1) {
      const candidate = known[i];
      if (candidate !== null && candidate !== undefined) {
        after = candidate;
        break;
      }
    }

    if (before === null) return after ?? 0;
    if (after === null) return before;
    return (before + after) / 2;
  });
}

/** BRAND 3.7 — fourteen days. */
export const WINDLINE_DAYS = 14;
