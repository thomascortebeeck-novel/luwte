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

import type { Locale } from './i18n/index';

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

/**
 * Days forward or back, arithmetic done at UTC midnight so a clock change
 * never turns seven days into six and a bit.
 */
export function shiftDateKey(key: DateKey, days: number): DateKey {
  const date = toUtcDate(key);
  date.setUTCDate(date.getUTCDate() + days);
  return fromUtcDate(date);
}

export function previousDateKey(key: DateKey): DateKey {
  return shiftDateKey(key, -1);
}

export function nextDateKey(key: DateKey): DateKey {
  return shiftDateKey(key, 1);
}

/** ISO weekday: Monday is 1, Sunday is 7. */
export function weekdayOf(key: DateKey): number {
  const day = toUtcDate(key).getUTCDay();
  return day === 0 ? 7 : day;
}

/*
 * Reading a day out loud, which is a different job from keying one.
 *
 * The keys above are `yyyy-MM-dd` because that sorts and compares; a person
 * reading a calendar wants "woensdag 5 augustus". Both formatters take the
 * key rather than an instant, so they cannot reintroduce the timezone bug the
 * keys exist to prevent — the day has already been decided by then.
 *
 * `nl-BE` rather than `nl-NL`: this is Flanders, and the Belgian locale is
 * what a person here would expect to see.
 */
const LOCALE_TAG: Record<Locale, string> = { nl: 'nl-BE', en: 'en-GB' };

function labeller(locale: Locale, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = `${locale}:${JSON.stringify(options)}`;
  let existing = cache.get(key);
  if (!existing) {
    // UTC, because the key was parsed as UTC midnight. Any other zone can
    // shift it back a day.
    existing = new Intl.DateTimeFormat(LOCALE_TAG[locale], { ...options, timeZone: 'UTC' });
    cache.set(key, existing);
  }
  return existing;
}

/** A whole day as somebody would say it: "woensdag 5 augustus". */
export function formatDay(key: DateKey, locale: Locale): string {
  return labeller(locale, { weekday: 'long', day: 'numeric', month: 'long' }).format(toUtcDate(key));
}

/** The weekday alone, short, for a column heading: "wo". */
export function formatWeekday(key: DateKey, locale: Locale): string {
  return labeller(locale, { weekday: 'short' }).format(toUtcDate(key));
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
