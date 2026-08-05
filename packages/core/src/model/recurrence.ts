import { weekdayOf, type DateKey } from '../dates';

/**
 * PRD 6.3 asked for "simple recurrence via rrule", and the first version stored
 * an rrule string but only ever parsed three exact values. That was the right
 * shape and the wrong reach: somebody wanting a fortnightly appointment or a
 * monthly injection had no way to say so, and every new case would have grown
 * the enum by one.
 *
 * This is a real subset of RFC 5545, chosen so the stored strings that already
 * exist keep meaning exactly what they meant.
 *
 * Supported: `FREQ` (DAILY, WEEKLY, MONTHLY, YEARLY), `INTERVAL`, `BYDAY`,
 * `UNTIL`.
 *
 * **`COUNT` is deliberately not supported.** "Ten times" cannot be answered by
 * looking at one day — you have to count every occurrence from the start — so
 * it would make this either expensive or wrong, and a recurrence that quietly
 * shows an eleventh time is worse than one that cannot be expressed. `UNTIL`
 * says the same thing in a way that stays a pure function of the day being
 * asked about, and "until December" is what people mean anyway.
 *
 * **Anything unparseable means "just the one day."** That rule predates this
 * file and is worth keeping loudly: an activity that silently appears on the
 * wrong days is worse than one that appears once.
 */

export type Frequency = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';

export type Recurrence = {
  freq: Frequency;
  /** Every n-th day/week/month/year. At least 1. */
  interval: number;
  /** ISO weekdays 1..7, empty when the rule does not name any. */
  byDay: number[];
  /** Inclusive last day, or null for no end. */
  until: DateKey | null;
};

/** RFC 5545 weekday codes, in ISO order so the index maps to `weekdayOf`. */
const WEEKDAY_CODES = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'] as const;

/** The presets a screen offers. Every one is a valid rule for the parser. */
export const RECURRENCE_PRESETS = {
  daily: 'FREQ=DAILY',
  weekly: 'FREQ=WEEKLY',
  fortnightly: 'FREQ=WEEKLY;INTERVAL=2',
  weekdays: 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR',
  monthly: 'FREQ=MONTHLY',
  yearly: 'FREQ=YEARLY',
} as const;

export type RecurrencePresetId = keyof typeof RECURRENCE_PRESETS;

const isFrequency = (value: string): value is Frequency =>
  value === 'DAILY' || value === 'WEEKLY' || value === 'MONTHLY' || value === 'YEARLY';

/** `yyyymmdd` or a full timestamp — only the date part is used. */
function parseUntil(value: string): DateKey | null {
  const digits = value.replace(/[^0-9]/g, '').slice(0, 8);
  if (digits.length !== 8) return null;
  const key = `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
  return /^\d{4}-\d{2}-\d{2}$/.test(key) ? key : null;
}

/**
 * Reads a rule, or returns null if it says anything this does not understand.
 *
 * Null is not an error path, it is the "just the one day" answer. A rule using
 * COUNT, BYMONTHDAY or anything else outside the subset lands here on purpose:
 * better to show a single occurrence than to guess at a pattern.
 */
export function parseRecurrence(rule: string | null | undefined): Recurrence | null {
  if (!rule) return null;

  const parts = new Map<string, string>();
  for (const chunk of rule.trim().toUpperCase().split(';')) {
    const [key, value] = chunk.split('=');
    if (key && value) parts.set(key.trim(), value.trim());
  }

  const freq = parts.get('FREQ');
  if (!freq || !isFrequency(freq)) return null;

  // Anything outside the subset means the rule says something we would be
  // guessing at. COUNT especially: honouring it needs the occurrence ordinal.
  for (const key of parts.keys()) {
    if (!['FREQ', 'INTERVAL', 'BYDAY', 'UNTIL'].includes(key)) return null;
  }

  const rawInterval = parts.get('INTERVAL');
  const interval = rawInterval === undefined ? 1 : Number(rawInterval);
  if (!Number.isInteger(interval) || interval < 1) return null;

  const byDay: number[] = [];
  const rawByDay = parts.get('BYDAY');
  if (rawByDay !== undefined) {
    for (const code of rawByDay.split(',')) {
      const index = WEEKDAY_CODES.indexOf(code.trim() as (typeof WEEKDAY_CODES)[number]);
      // A positional prefix like `2MO` ("the second Monday") is outside the
      // subset, and treating it as plain MO would put things on wrong days.
      if (index === -1) return null;
      byDay.push(index + 1);
    }
    if (byDay.length === 0) return null;
  }

  const rawUntil = parts.get('UNTIL');
  const until = rawUntil === undefined ? null : parseUntil(rawUntil);
  if (rawUntil !== undefined && until === null) return null;

  return { freq, interval, byDay, until };
}

/** Turns a parsed rule back into a string, so a screen can store what it built. */
export function formatRecurrence(recurrence: Recurrence): string {
  const parts = [`FREQ=${recurrence.freq}`];
  if (recurrence.interval > 1) parts.push(`INTERVAL=${recurrence.interval}`);
  if (recurrence.byDay.length > 0) {
    parts.push(`BYDAY=${recurrence.byDay.map((d) => WEEKDAY_CODES[d - 1]).join(',')}`);
  }
  if (recurrence.until) parts.push(`UNTIL=${recurrence.until.replace(/-/g, '')}`);
  return parts.join(';');
}

/*
 * Date arithmetic on `yyyy-MM-dd` strings.
 *
 * Parsed as UTC midnight deliberately. These are local calendar days already —
 * `dateKey` resolved the timezone when the string was made — so treating them
 * as UTC is a way of counting days without a second timezone conversion
 * reintroducing a DST error.
 */
const asUtc = (key: DateKey): Date => new Date(`${key}T00:00:00Z`);

const daysBetween = (from: DateKey, to: DateKey): number =>
  Math.round((asUtc(to).getTime() - asUtc(from).getTime()) / 86_400_000);

/** The Monday of the ISO week a day falls in. */
const startOfWeek = (key: DateKey): Date => {
  const date = asUtc(key);
  date.setUTCDate(date.getUTCDate() - (weekdayOf(key) - 1));
  return date;
};

/**
 * Whether a recurring activity that started on `start` lands on `day`.
 *
 * Never runs backwards: an activity does not occur before the day it was put
 * in the calendar, whatever the rule says.
 */
export function matchesRecurrence(
  recurrence: Recurrence,
  start: DateKey,
  day: DateKey,
): boolean {
  if (day < start) return false;
  if (recurrence.until && day > recurrence.until) return false;
  if (day === start) return true;

  const from = asUtc(start);
  const to = asUtc(day);

  switch (recurrence.freq) {
    case 'DAILY': {
      if (daysBetween(start, day) % recurrence.interval !== 0) return false;
      // BYDAY on a daily rule narrows it rather than driving it.
      return recurrence.byDay.length === 0 || recurrence.byDay.includes(weekdayOf(day));
    }

    case 'WEEKLY': {
      const weeks = Math.round(
        (startOfWeek(day).getTime() - startOfWeek(start).getTime()) / (86_400_000 * 7),
      );
      if (weeks % recurrence.interval !== 0) return false;
      // Without BYDAY the rule inherits the weekday it started on, which is
      // what RFC 5545 does with DTSTART and what the old `weekly` preset meant.
      return recurrence.byDay.length === 0
        ? weekdayOf(day) === weekdayOf(start)
        : recurrence.byDay.includes(weekdayOf(day));
    }

    case 'MONTHLY': {
      const months =
        (to.getUTCFullYear() - from.getUTCFullYear()) * 12 +
        (to.getUTCMonth() - from.getUTCMonth());
      if (months <= 0 || months % recurrence.interval !== 0) return false;
      /*
       * The same date each month, and **a month without that date is skipped
       * rather than rolled forward**. Something set for the 31st does not
       * quietly become the 1st of March: a person checking their calendar for
       * an appointment would find it on a day nobody agreed to.
       */
      return to.getUTCDate() === from.getUTCDate();
    }

    case 'YEARLY': {
      const years = to.getUTCFullYear() - from.getUTCFullYear();
      if (years <= 0 || years % recurrence.interval !== 0) return false;
      // 29 February therefore occurs only in leap years, which is correct and
      // is the same skip-rather-than-shift rule as above.
      return (
        to.getUTCMonth() === from.getUTCMonth() && to.getUTCDate() === from.getUTCDate()
      );
    }
  }
}
