import { describe, expect, it } from 'vitest';
import {
  RECURRENCES,
  WEEK_RADIUS,
  activitySchema,
  centredWeek,
  completionId,
  completionSchema,
  occursOn,
  onDay,
  type Activity,
} from './activity';

const base = (overrides: Partial<Activity> = {}): Activity => ({
  title: 'Koffie met Sam',
  date: '2026-08-04', // a Tuesday
  startTime: '10:00',
  withPerson: 'Sam',
  createdBy: 'uid-jonas',
  status: 'accepted',
  recurrence: null,
  ...overrides,
});

describe('occursOn', () => {
  it('puts a one-off on its own day and nowhere else', () => {
    const activity = base();
    expect(occursOn(activity, '2026-08-04')).toBe(true);
    expect(occursOn(activity, '2026-08-05')).toBe(false);
    expect(occursOn(activity, '2026-08-03')).toBe(false);
  });

  it('repeats a daily activity every day after it starts', () => {
    const activity = base({ recurrence: RECURRENCES.daily });
    expect(occursOn(activity, '2026-08-05')).toBe(true);
    expect(occursOn(activity, '2026-09-01')).toBe(true);
  });

  it('never runs a recurrence backwards from where it started', () => {
    // Otherwise something planned today would appear to have been planned
    // for every day of the past, which is a small kind of rewriting history.
    for (const recurrence of Object.values(RECURRENCES)) {
      expect(occursOn(base({ recurrence }), '2026-08-03')).toBe(false);
    }
  });

  it('repeats a weekly activity on the same weekday', () => {
    const activity = base({ recurrence: RECURRENCES.weekly });
    expect(occursOn(activity, '2026-08-11')).toBe(true); // the next Tuesday
    expect(occursOn(activity, '2026-08-10')).toBe(false); // Monday
    expect(occursOn(activity, '2026-08-12')).toBe(false); // Wednesday
  });

  it('repeats a weekday activity Monday to Friday and skips the weekend', () => {
    const activity = base({ recurrence: RECURRENCES.weekdays });
    expect(occursOn(activity, '2026-08-06')).toBe(true); // Thursday
    expect(occursOn(activity, '2026-08-07')).toBe(true); // Friday
    expect(occursOn(activity, '2026-08-08')).toBe(false); // Saturday
    expect(occursOn(activity, '2026-08-09')).toBe(false); // Sunday
    expect(occursOn(activity, '2026-08-10')).toBe(true); // Monday
  });

  it('treats a rule it does not understand as a single day', () => {
    // Guessing would put an activity on days nobody chose. Appearing once is
    // a visible mistake; appearing on the wrong days is an invisible one.
    const activity = base({ recurrence: 'FREQ=MONTHLY;BYMONTHDAY=4' as Activity['recurrence'] });
    expect(occursOn(activity, '2026-08-04')).toBe(true);
    expect(occursOn(activity, '2026-09-04')).toBe(false);
  });
});

describe('onDay', () => {
  it('leaves out anything the person has not accepted', () => {
    // The whole design of PRD 6.3: a suggestion is an offer, not an entry.
    // Until it is accepted it does not belong to the day.
    const activities = [
      base({ title: 'Aangenomen' }),
      base({ title: 'Voorgesteld', status: 'suggested' }),
      base({ title: 'Afgewezen', status: 'declined' }),
    ];
    expect(onDay(activities, '2026-08-04').map((a) => a.title)).toEqual(['Aangenomen']);
  });

  it('orders by start time', () => {
    const activities = [
      base({ title: 'Middag', startTime: '14:00' }),
      base({ title: 'Ochtend', startTime: '09:00' }),
    ];
    expect(onDay(activities, '2026-08-04').map((a) => a.title)).toEqual(['Ochtend', 'Middag']);
  });

  it('puts something without a time last rather than first', () => {
    // An empty time sorts before every real time as a string, which would
    // put "sometime today" above a 07:00 appointment.
    const activities = [
      base({ title: 'Ooit', startTime: '' }),
      base({ title: 'Zeven uur', startTime: '07:00' }),
    ];
    expect(onDay(activities, '2026-08-04').map((a) => a.title)).toEqual(['Zeven uur', 'Ooit']);
  });

  it('includes a recurring activity on a later day', () => {
    const activities = [base({ recurrence: RECURRENCES.daily })];
    expect(onDay(activities, '2026-08-20')).toHaveLength(1);
  });
});

describe('centredWeek', () => {
  it('gives seven days with today in the middle', () => {
    const week = centredWeek('2026-08-04');
    expect(week).toHaveLength(7);
    expect(week[WEEK_RADIUS]).toBe('2026-08-04');
    expect(week).toEqual([
      '2026-08-01',
      '2026-08-02',
      '2026-08-03',
      '2026-08-04',
      '2026-08-05',
      '2026-08-06',
      '2026-08-07',
    ]);
  });

  it('crosses a month boundary without arithmetic going wrong', () => {
    expect(centredWeek('2026-09-01')).toEqual([
      '2026-08-29',
      '2026-08-30',
      '2026-08-31',
      '2026-09-01',
      '2026-09-02',
      '2026-09-03',
      '2026-09-04',
    ]);
  });

  it('crosses a leap day', () => {
    expect(centredWeek('2028-03-01')[0]).toBe('2028-02-27');
    expect(centredWeek('2028-03-01')).toContain('2028-02-29');
  });
});

describe('completionId', () => {
  it('is one per activity per day, so a repeated sync records one', () => {
    expect(completionId('act1', '2026-08-04')).toBe('act1_2026-08-04');
  });
});

describe('schemas', () => {
  it('accepts an activity with no time and nobody named', () => {
    expect(
      activitySchema.safeParse({ ...base(), startTime: '', withPerson: '' }).success,
    ).toBe(true);
  });

  it('refuses a time that is not a time', () => {
    expect(activitySchema.safeParse(base({ startTime: '25:00' })).success).toBe(false);
  });

  it('lets a completion carry no ratings at all', () => {
    // PRD 6.2 — the two-tap question is optional and dismissible. A
    // completion with nothing filled in is an ordinary, complete record.
    const parsed = completionSchema.safeParse({
      activityId: 'act1',
      date: '2026-08-04',
      completedAt: new Date(),
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.pleasure).toBeNull();
      expect(parsed.data.mastery).toBeNull();
      expect(parsed.data.postedToFeed).toBe(false);
    }
  });

  it('keeps ratings on the seven-point scale', () => {
    const build = (pleasure: number) => ({
      activityId: 'act1',
      date: '2026-08-04',
      completedAt: new Date(),
      pleasure,
    });
    expect(completionSchema.safeParse(build(7)).success).toBe(true);
    expect(completionSchema.safeParse(build(8)).success).toBe(false);
    expect(completionSchema.safeParse(build(0)).success).toBe(false);
  });
});
