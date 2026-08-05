import { describe, expect, it } from 'vitest';
import { occursOn } from './activity';
import {
  RECURRENCE_PRESETS,
  formatRecurrence,
  matchesRecurrence,
  parseRecurrence,
} from './recurrence';

/** 2026-08-05 is a Wednesday, which every fixture below is anchored to. */
const WED = '2026-08-05';

const on = (rule: string, day: string, start = WED) =>
  occursOn({ date: start, recurrence: rule }, day);

describe('parseRecurrence', () => {
  it('reads the parts it supports', () => {
    expect(parseRecurrence('FREQ=WEEKLY;INTERVAL=2;BYDAY=MO,WE;UNTIL=20261231')).toEqual({
      freq: 'WEEKLY',
      interval: 2,
      byDay: [1, 3],
      until: '2026-12-31',
    });
  });

  it('defaults interval to one and names no days', () => {
    expect(parseRecurrence('FREQ=DAILY')).toEqual({
      freq: 'DAILY',
      interval: 1,
      byDay: [],
      until: null,
    });
  });

  /*
   * Every rejection below is the same decision: an activity that silently
   * appears on the wrong day is worse than one that appears once. Returning
   * null is the "just this day" answer, not an error.
   */
  it.each([
    ['', 'nothing at all'],
    ['FREQ=HOURLY', 'a frequency outside the subset'],
    ['INTERVAL=2', 'no frequency'],
    ['FREQ=WEEKLY;COUNT=10', 'COUNT, which cannot be answered from one day'],
    ['FREQ=MONTHLY;BYMONTHDAY=13', 'a part outside the subset'],
    ['FREQ=WEEKLY;BYDAY=2MO', 'a positional weekday'],
    ['FREQ=WEEKLY;BYDAY=XX', 'a weekday that is not one'],
    ['FREQ=WEEKLY;INTERVAL=0', 'an interval of zero'],
    ['FREQ=WEEKLY;INTERVAL=-1', 'a negative interval'],
    ['FREQ=WEEKLY;UNTIL=nonsense', 'an unreadable end date'],
  ])('refuses %s — %s', (rule) => {
    expect(parseRecurrence(rule)).toBeNull();
  });

  it('survives a round trip through formatting', () => {
    for (const rule of Object.values(RECURRENCE_PRESETS)) {
      expect(formatRecurrence(parseRecurrence(rule)!)).toBe(rule);
    }
  });
});

/*
 * The compatibility property, and the reason this refactor is safe to ship on
 * top of data somebody already has: the three rules that could be stored
 * before must still mean exactly what they meant.
 */
describe('the rules that already existed', () => {
  it('daily still means every day', () => {
    expect(on(RECURRENCE_PRESETS.daily, '2026-08-06')).toBe(true);
    expect(on(RECURRENCE_PRESETS.daily, '2026-09-20')).toBe(true);
  });

  it('weekly still inherits the weekday it started on', () => {
    expect(on(RECURRENCE_PRESETS.weekly, '2026-08-12')).toBe(true); // Wednesday
    expect(on(RECURRENCE_PRESETS.weekly, '2026-08-13')).toBe(false); // Thursday
  });

  it('weekdays still means Monday to Friday', () => {
    expect(on(RECURRENCE_PRESETS.weekdays, '2026-08-06')).toBe(true); // Thursday
    expect(on(RECURRENCE_PRESETS.weekdays, '2026-08-07')).toBe(true); // Friday
    expect(on(RECURRENCE_PRESETS.weekdays, '2026-08-08')).toBe(false); // Saturday
    expect(on(RECURRENCE_PRESETS.weekdays, '2026-08-09')).toBe(false); // Sunday
    expect(on(RECURRENCE_PRESETS.weekdays, '2026-08-10')).toBe(true); // Monday
  });

  it('still never runs backwards from the day it was put in', () => {
    expect(on(RECURRENCE_PRESETS.daily, '2026-08-04')).toBe(false);
  });

  it('still treats a rule it cannot read as a single day', () => {
    expect(on('FREQ=HOURLY', '2026-08-06')).toBe(false);
    expect(on('FREQ=HOURLY', WED)).toBe(true);
  });
});

describe('what is newly expressible', () => {
  it('every other week, which a fortnightly appointment needs', () => {
    expect(on('FREQ=WEEKLY;INTERVAL=2', '2026-08-12')).toBe(false);
    expect(on('FREQ=WEEKLY;INTERVAL=2', '2026-08-19')).toBe(true);
    expect(on('FREQ=WEEKLY;INTERVAL=2', '2026-09-02')).toBe(true);
  });

  it('every third day', () => {
    expect(on('FREQ=DAILY;INTERVAL=3', '2026-08-08')).toBe(true);
    expect(on('FREQ=DAILY;INTERVAL=3', '2026-08-09')).toBe(false);
  });

  it('the same date each month, which a depot injection needs', () => {
    expect(on('FREQ=MONTHLY', '2026-09-05')).toBe(true);
    expect(on('FREQ=MONTHLY', '2026-09-06')).toBe(false);
    expect(on('FREQ=MONTHLY;INTERVAL=3', '2026-09-05')).toBe(false);
    expect(on('FREQ=MONTHLY;INTERVAL=3', '2026-11-05')).toBe(true);
  });

  it('once a year', () => {
    expect(on('FREQ=YEARLY', '2027-08-05')).toBe(true);
    expect(on('FREQ=YEARLY', '2027-08-06')).toBe(false);
  });

  it('stops at UNTIL, on the day itself and not before', () => {
    expect(on('FREQ=DAILY;UNTIL=20260810', '2026-08-10')).toBe(true);
    expect(on('FREQ=DAILY;UNTIL=20260810', '2026-08-11')).toBe(false);
  });
});

/*
 * The edge cases where a wrong answer puts something on a day nobody agreed
 * to, which for an appointment is the failure that actually costs somebody
 * something.
 */
describe('months that do not have the date', () => {
  it('skips them rather than rolling into the next month', () => {
    const start = '2026-01-31';
    // February has no 31st. Rolling forward would put it on 2 or 3 March.
    expect(matchesRecurrence(parseRecurrence('FREQ=MONTHLY')!, start, '2026-03-01')).toBe(false);
    expect(matchesRecurrence(parseRecurrence('FREQ=MONTHLY')!, start, '2026-03-03')).toBe(false);
    expect(matchesRecurrence(parseRecurrence('FREQ=MONTHLY')!, start, '2026-03-31')).toBe(true);
  });

  it('puts 29 February only in leap years', () => {
    const rule = parseRecurrence('FREQ=YEARLY')!;
    expect(matchesRecurrence(rule, '2028-02-29', '2029-02-28')).toBe(false);
    expect(matchesRecurrence(rule, '2028-02-29', '2032-02-29')).toBe(true);
  });

  it('counts weeks across a year boundary rather than restarting', () => {
    /*
     * A fortnightly rule that forgot which week it was in would flip parity at
     * the new year, silently moving somebody's appointment by a week.
     *
     * 2026-12-30 is 21 weeks after the 2026-08-05 start — odd, so off. The
     * following Wednesday is week 22 and is on. Counting from the ISO week of
     * the start is what makes that hold across December.
     */
    expect(on('FREQ=WEEKLY;INTERVAL=2', '2026-12-30')).toBe(false);
    expect(on('FREQ=WEEKLY;INTERVAL=2', '2027-01-06')).toBe(true);
    expect(on('FREQ=WEEKLY;INTERVAL=2', '2027-01-13')).toBe(false);
  });
});
