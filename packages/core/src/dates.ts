/**
 * Every date key in luwte is a *local* calendar day in a named timezone,
 * never a UTC day and never whatever the device happens to think.
 *
 * PRD 6.1 keys check-ins by calendar day and locks them at midnight. Getting
 * this wrong is invisible for most of the year and then wrong twice a day at
 * the edges: a 23:30 entry in January lands on the previous day under UTC,
 * and the midnight lock drifts by an hour each time the clocks change.
 *
 * `Intl.DateTimeFormat` with an explicit `timeZone` does the conversion
 * correctly, including both DST transitions, without a date library.
 */

export type DateKey = string; // yyyy-MM-dd
export type WeekKey = string; // yyyy-'W'ww

const cache = new Map<string, Intl.DateTimeFormat>();

function formatter(timeZone: string): Intl.DateTimeFormat {
  let existing = cache.get(timeZone);
  if (!existing) {
    existing = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    cache.set(timeZone, existing);
  }
  return existing;
}

/** The local calendar day of an instant, as yyyy-MM-dd. */
export function dateKey(instant: Date, timeZone: string): DateKey {
  // en-CA formats as yyyy-MM-dd, which is the shape we want anyway.
  return formatter(timeZone).format(instant);
}

/** Parsed as UTC midnight, so arithmetic on it is never bitten by DST. */
function toUtcDate(key: DateKey): Date {
  const [year, month, day] = key.split('-').map(Number) as [number, number, number];
  return new Date(Date.UTC(year, month - 1, day));
}

function fromUtcDate(date: Date): DateKey {
  return date.toISOString().slice(0, 10);
}

export function previousDateKey(key: DateKey): DateKey {
  const date = toUtcDate(key);
  date.setUTCDate(date.getUTCDate() - 1);
  return fromUtcDate(date);
}

/** ISO weekday: Monday is 1, Sunday is 7. */
export function weekdayOf(key: DateKey): number {
  const day = toUtcDate(key).getUTCDay();
  return day === 0 ? 7 : day;
}

/**
 * PRD 6.1 — editable until midnight, then locked. Only today qualifies, and
 * a day that has not happened yet never does.
 */
export function isEditable(key: DateKey, now: Date, timeZone: string): boolean {
  return key === dateKey(now, timeZone);
}

/**
 * PRD 6.1 — a back-fill is allowed for yesterday only, reachable from
 * Insights and never pushed. Older days stay as they are, including empty:
 * on a missed day the app says nothing.
 */
export function isBackfillable(key: DateKey, now: Date, timeZone: string): boolean {
  return key === previousDateKey(dateKey(now, timeZone));
}

/**
 * ISO-8601 week, as yyyy-'W'ww. Weeks start on Monday and week 1 is the one
 * containing the first Thursday, which is why the ISO year can differ from
 * the calendar year at the turn.
 */
export function weekKey(instant: Date, timeZone: string): WeekKey {
  const date = toUtcDate(dateKey(instant, timeZone));

  // Shift to the Thursday of this week; its calendar year is the ISO year.
  const day = date.getUTCDay() === 0 ? 7 : date.getUTCDay();
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const isoYear = date.getUTCFullYear();

  const firstThursday = new Date(Date.UTC(isoYear, 0, 4));
  const firstDay = firstThursday.getUTCDay() === 0 ? 7 : firstThursday.getUTCDay();
  firstThursday.setUTCDate(firstThursday.getUTCDate() + 4 - firstDay);

  const week = 1 + Math.round((date.getTime() - firstThursday.getTime()) / (7 * 86_400_000));
  return `${isoYear}-W${String(week).padStart(2, '0')}`;
}
