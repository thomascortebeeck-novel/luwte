import { describe, expect, it } from 'vitest';
import {
  RATING_INTERVAL,
  RECURRENCES,
  WEEK_RADIUS,
  activitySchema,
  centredWeek,
  completionId,
  completionSchema,
  hasExpectation,
  occursOn,
  onDay,
  shouldAskRating,
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
  expectedPleasure: null,
  expectedMastery: null,
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

describe('shouldAskRating', () => {
  it('asks the first time, which is where an expectation gets tested', () => {
    expect(shouldAskRating({ completedBefore: 0 })).toBe(true);
  });

  it('says nothing on the next four, so a weekly walk is not re-rated weekly', () => {
    // The friction this removes is the whole point: accepting that mastery
    // and pleasure are worth keeping does not mean asking every Tuesday.
    for (let before = 1; before < RATING_INTERVAL; before += 1) {
      expect(shouldAskRating({ completedBefore: before })).toBe(false);
    }
  });

  it('comes back on the fifth, because how something feels changes', () => {
    expect(shouldAskRating({ completedBefore: RATING_INTERVAL })).toBe(true);
    expect(shouldAskRating({ completedBefore: RATING_INTERVAL * 4 })).toBe(true);
  });

  it('never asks twice in a row after a skip', () => {
    /*
     * The cadence counts completions, not answers, precisely so that a
     * dismissal is not met with the same question tomorrow. Never chase is a
     * rule about the app's behaviour, and re-asking is chasing.
     */
    expect(shouldAskRating({ completedBefore: 0 })).toBe(true);
    expect(shouldAskRating({ completedBefore: 1 })).toBe(false);
  });

  it('refuses a count that cannot have happened', () => {
    expect(shouldAskRating({ completedBefore: -1 })).toBe(false);
  });
});

describe('hasExpectation', () => {
  it('is true when either half was answered, since both are optional', () => {
    expect(hasExpectation({ expectedPleasure: null, expectedMastery: null })).toBe(false);
    expect(hasExpectation({ expectedPleasure: 3, expectedMastery: null })).toBe(true);
    expect(hasExpectation({ expectedPleasure: null, expectedMastery: 6 })).toBe(true);
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

  it('lets an activity be planned without saying what it will be like', () => {
    // Planning has to stay one field and a tap. The expectation is worth
    // having and is never worth making somebody answer.
    const parsed = activitySchema.safeParse({ ...base(), expectedPleasure: undefined });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.expectedPleasure).toBeNull();
  });

  it('keeps an expectation on the same seven-point scale as the answer', () => {
    // Otherwise "you expected 8, you got 7" would compare two different
    // scales and read as a drop.
    expect(activitySchema.safeParse(base({ expectedMastery: 7 })).success).toBe(true);
    expect(activitySchema.safeParse(base({ expectedMastery: 8 as 7 })).success).toBe(false);
    expect(activitySchema.safeParse(base({ expectedMastery: 0 as 7 })).success).toBe(false);
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
