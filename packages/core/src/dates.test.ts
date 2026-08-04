import { describe, expect, it } from 'vitest';
import {
  dateKey,
  isBackfillable,
  isEditable,
  previousDateKey,
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
