import { describe, expect, it } from 'vitest';
import {
  dateKey,
  formatDay,
  formatWeekday,
  isBackfillable,
  isEditable,
  previousDateKey,
  shiftDateKey,
  weekKey,
  weekdayOf,
} from './dates';

/**
 * PRD 6.1 — one check-in per calendar day, keyed by *local* date, editable
 * until midnight and then locked.
 *
 * Keying by UTC would put a 23:30 Brussels check-in in January on the wrong
 * day, and would silently move the midnight lock by an hour twice a year.
 * Every one of these is a real bug that only shows up at the edges, so the
 * edges are what is tested.
 */

const TZ = 'Europe/Brussels';

describe('dateKey', () => {
  it('uses the local calendar day, not UTC', () => {
    // 23:30 in Brussels on 15 January is 22:30 UTC the same day.
    expect(dateKey(new Date('2026-01-15T22:30:00Z'), TZ)).toBe('2026-01-15');
  });

  it('keeps a late-evening summer check-in on its own day', () => {
    // Brussels is UTC+2 in July, so 23:30 local is 21:30 UTC.
    expect(dateKey(new Date('2026-07-15T21:30:00Z'), TZ)).toBe('2026-07-15');
  });

  it('rolls over at local midnight, not at UTC midnight', () => {
    // 00:30 Brussels on 16 July is 22:30 UTC on the 15th.
    expect(dateKey(new Date('2026-07-15T22:30:00Z'), TZ)).toBe('2026-07-16');
  });

  it('handles the spring forward, when 02:00 local does not exist', () => {
    // Last Sunday of March 2026 is the 29th.
    expect(dateKey(new Date('2026-03-29T00:30:00Z'), TZ)).toBe('2026-03-29');
    expect(dateKey(new Date('2026-03-29T01:30:00Z'), TZ)).toBe('2026-03-29');
  });

  it('handles the autumn fall back, when 02:00 local happens twice', () => {
    // Last Sunday of October 2026 is the 25th.
    expect(dateKey(new Date('2026-10-25T00:30:00Z'), TZ)).toBe('2026-10-25');
    expect(dateKey(new Date('2026-10-25T01:30:00Z'), TZ)).toBe('2026-10-25');
  });

  it('pads single-digit months and days', () => {
    expect(dateKey(new Date('2026-02-03T12:00:00Z'), TZ)).toBe('2026-02-03');
  });
});

describe('previousDateKey', () => {
  it('steps back one day', () => {
    expect(previousDateKey('2026-08-04')).toBe('2026-08-03');
  });

  it('steps across a month boundary', () => {
    expect(previousDateKey('2026-08-01')).toBe('2026-07-31');
  });

  it('steps across a year boundary', () => {
    expect(previousDateKey('2026-01-01')).toBe('2025-12-31');
  });

  it('knows February in a leap year', () => {
    expect(previousDateKey('2028-03-01')).toBe('2028-02-29');
  });
});

describe('isEditable', () => {
  const now = new Date('2026-08-04T18:00:00Z'); // 20:00 in Brussels

  it("lets a person change today's check-in", () => {
    expect(isEditable('2026-08-04', now, TZ)).toBe(true);
  });

  it('locks yesterday once midnight has passed', () => {
    expect(isEditable('2026-08-03', now, TZ)).toBe(false);
  });

  it('refuses a day that has not happened', () => {
    expect(isEditable('2026-08-05', now, TZ)).toBe(false);
  });
});

describe('isBackfillable', () => {
  const now = new Date('2026-08-04T18:00:00Z');

  it('allows yesterday, and only yesterday', () => {
    // PRD 6.1 — a back-fill is allowed for yesterday only, and it is never
    // pushed. Anything older stays as it was, including empty.
    expect(isBackfillable('2026-08-03', now, TZ)).toBe(true);
    expect(isBackfillable('2026-08-02', now, TZ)).toBe(false);
  });

  it('does not treat today as a back-fill', () => {
    expect(isBackfillable('2026-08-04', now, TZ)).toBe(false);
  });
});

describe('weekKey', () => {
  it('uses ISO weeks, which start on Monday', () => {
    expect(weekKey(new Date('2026-08-03T10:00:00Z'), TZ)).toBe('2026-W32'); // Monday
    expect(weekKey(new Date('2026-08-09T10:00:00Z'), TZ)).toBe('2026-W32'); // Sunday
    expect(weekKey(new Date('2026-08-10T10:00:00Z'), TZ)).toBe('2026-W33');
  });

  it('pads the week number', () => {
    expect(weekKey(new Date('2026-01-08T10:00:00Z'), TZ)).toBe('2026-W02');
  });

  it('puts early January in the previous ISO year when the week belongs there', () => {
    // 1 January 2027 is a Friday, so it falls in ISO week 53 of 2026.
    expect(weekKey(new Date('2027-01-01T10:00:00Z'), TZ)).toBe('2026-W53');
  });
});

describe('weekdayOf', () => {
  it('reports Monday as 1 and Sunday as 7, like ISO', () => {
    expect(weekdayOf('2026-08-03')).toBe(1);
    expect(weekdayOf('2026-08-09')).toBe(7);
  });
});

describe('shiftDateKey', () => {
  it('moves a whole week without landing between days', () => {
    expect(shiftDateKey('2026-08-05', 7)).toBe('2026-08-12');
    expect(shiftDateKey('2026-08-05', -7)).toBe('2026-07-29');
  });

  it('stays exact across a clock change', () => {
    /*
     * The last Sunday of October is 25 October 2026, when Brussels loses an
     * hour. A week forward has to be a week, not six days and 23 hours —
     * which is what date arithmetic in local time gives you.
     */
    expect(shiftDateKey('2026-10-22', 7)).toBe('2026-10-29');
    expect(shiftDateKey('2027-03-25', 7)).toBe('2027-04-01');
  });

  it('crosses a year and a leap day', () => {
    expect(shiftDateKey('2026-12-30', 7)).toBe('2027-01-06');
    expect(shiftDateKey('2028-02-26', 7)).toBe('2028-03-04');
  });
});

describe('reading a day out loud', () => {
  it('says the day the way somebody here would', () => {
    expect(formatDay('2026-08-05', 'nl')).toBe('woensdag 5 augustus');
    expect(formatDay('2026-08-05', 'en')).toBe('Wednesday 5 August');
  });

  it('abbreviates the weekday for a column heading', () => {
    // These used to be a hardcoded Dutch array, so an English-speaking
    // supporter read "ma di wo" on their own calendar.
    expect(formatWeekday('2026-08-03', 'nl')).toBe('ma');
    expect(formatWeekday('2026-08-03', 'en')).toBe('Mon');
  });

  it('reads the key itself and not the device timezone', () => {
    /*
     * The formatter is pinned to UTC because the key was parsed as UTC
     * midnight. Anywhere west of Greenwich, a local-time formatter renders
     * that instant as the previous day — the same off-by-one the keys exist
     * to prevent, reintroduced at the last step.
     */
    expect(formatDay('2026-01-01', 'nl')).toBe('donderdag 1 januari');
  });
});
