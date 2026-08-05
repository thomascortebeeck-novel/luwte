import { describe, expect, it } from 'vitest';
import {
  buildHealthDays,
  formatSleep,
  healthDaySchema,
  HEALTH_CONNECT_TYPES,
  sleepDateKey,
  sleepHoursFromMinutes,
  totalSleepMinutes,
} from './health';

const BRUSSELS = 'Europe/Brussels';

describe('a night belongs to the day you wake up', () => {
  it('keys an ordinary night to the morning after', () => {
    // Asleep 23:40 Monday, awake 07:10 Tuesday. The check-in that asks about
    // it is Tuesday's, so this is Tuesday's number.
    expect(sleepDateKey(new Date('2026-08-04T05:10:00Z'), BRUSSELS)).toBe('2026-08-04');
  });

  it('does not slide a late waking onto the previous day', () => {
    // 00:30 Brussels is 22:30 UTC the day before. `toISOString().slice(0,10)`
    // would answer 2026-08-03 here — the exact antipattern the date keys in
    // this product exist to prevent.
    expect(sleepDateKey(new Date('2026-08-03T22:30:00Z'), BRUSSELS)).toBe('2026-08-04');
  });

  it('survives the spring forward', () => {
    // 2026-03-29, clocks go 02:00 -> 03:00. Waking at 07:00 local is 05:00 UTC.
    expect(sleepDateKey(new Date('2026-03-29T05:00:00Z'), BRUSSELS)).toBe('2026-03-29');
  });

  it('survives the autumn back', () => {
    // 2026-10-25, clocks go 03:00 -> 02:00. Waking at 07:00 local is 06:00 UTC.
    expect(sleepDateKey(new Date('2026-10-25T06:00:00Z'), BRUSSELS)).toBe('2026-10-25');
  });
});

describe('a night is often more than one session', () => {
  it('sums a night broken by waking at three', () => {
    const minutes = totalSleepMinutes([
      { start: new Date('2026-08-03T21:40:00Z'), end: new Date('2026-08-04T01:00:00Z') },
      { start: new Date('2026-08-04T01:30:00Z'), end: new Date('2026-08-04T05:10:00Z') },
    ]);
    // 200 + 220. Six and a half hours in two pieces is still six and a half.
    expect(minutes).toBe(420);
  });

  it('says nothing rather than zero when the watch recorded nothing', () => {
    // Null and 0 are different answers: one is "no data", the other is "did
    // not sleep", and a chart that treats them alike tells a lie on a bad day.
    expect(totalSleepMinutes([])).toBeNull();
  });

  it('ignores a session that ends before it starts', () => {
    expect(
      totalSleepMinutes([
        { start: new Date('2026-08-04T05:00:00Z'), end: new Date('2026-08-04T04:00:00Z') },
      ]),
    ).toBe(0);
  });
});

describe('showing it', () => {
  it.each([
    [420, 'nl', '7 u'],
    [440, 'nl', '7 u 20'],
    [440, 'en', '7 h 20'],
    [65, 'nl', '1 u 05'],
  ] as const)('%s minutes in %s reads %s', (minutes, locale, expected) => {
    expect(formatSleep(minutes, locale)).toBe(expected);
  });

  it('offers the check-in a half hour, never a decimal', () => {
    expect(sleepHoursFromMinutes(440)).toBe(7.5);
    expect(sleepHoursFromMinutes(420)).toBe(7);
    expect(sleepHoursFromMinutes(400)).toBe(6.5);
  });
});

describe('what is stored', () => {
  const valid = {
    date: '2026-08-04',
    sleepMinutes: 420,
    restingHeartRate: 58,
    source: { app: 'com.garmin.android.apps.connectmobile', device: 'Forerunner 265' },
    recordedAt: new Date(),
  };

  it('accepts a reading with its source', () => {
    expect(healthDaySchema.parse(valid).source.app).toContain('garmin');
  });

  it('refuses a reading with no source at all', () => {
    /*
     * Attribution is not decoration. Relaying a CE-marked device's own result,
     * said to be that device's, is a conduit under MDCG 2019-11. An
     * unattributed number on a screen in luwte's own voice is luwte making a
     * measurement claim, which is the line this product does not cross.
     */
    expect(() => healthDaySchema.parse({ ...valid, source: undefined })).toThrow();
  });

  it('lets either reading be absent, because a watch may supply one and not the other', () => {
    expect(healthDaySchema.parse({ ...valid, restingHeartRate: null }).restingHeartRate).toBeNull();
    expect(healthDaySchema.parse({ ...valid, sleepMinutes: null }).sleepMinutes).toBeNull();
  });

  it('refuses a heart rate outside anything physiological', () => {
    expect(() => healthDaySchema.parse({ ...valid, restingHeartRate: 0 })).toThrow();
    expect(() => healthDaySchema.parse({ ...valid, restingHeartRate: 400 })).toThrow();
  });

  it('refuses more sleep than a day contains', () => {
    expect(() => healthDaySchema.parse({ ...valid, sleepMinutes: 1441 })).toThrow();
  });
});

describe('folding what the device offered into days', () => {
  const src = { app: 'com.garmin.android.apps.connectmobile', device: 'Forerunner 265' };
  const at = new Date('2026-08-04T18:00:00Z');

  it('puts a night on the day it ended and a heart rate on its own day', () => {
    const days = buildHealthDays(
      [{ start: new Date('2026-08-03T21:40:00Z'), end: new Date('2026-08-04T05:10:00Z'), source: src }],
      [{ time: new Date('2026-08-04T05:20:00Z'), bpm: 58, source: src }],
      BRUSSELS,
      at,
    );
    expect(days).toHaveLength(1);
    expect(days[0]!.date).toBe('2026-08-04');
    expect(days[0]!.sleepMinutes).toBe(450);
    expect(days[0]!.restingHeartRate).toBe(58);
  });

  it('takes the lowest resting reading, not the average', () => {
    /*
     * "Resting" is a floor, not a mean. Averaging in a reading taken while
     * somebody climbed the stairs reports a number that never happened — and
     * this product may relay a measurement and may never manufacture one.
     */
    const days = buildHealthDays(
      [],
      [
        { time: new Date('2026-08-04T05:20:00Z'), bpm: 58, source: src },
        { time: new Date('2026-08-04T14:00:00Z'), bpm: 74, source: src },
      ],
      BRUSSELS,
      at,
    );
    expect(days[0]!.restingHeartRate).toBe(58);
  });

  it('writes nothing for a day the watch recorded nothing', () => {
    // An empty document would claim the watch was worn and found nothing,
    // which is a different and false statement from having no reading.
    expect(buildHealthDays([], [], BRUSSELS, at)).toEqual([]);
  });

  it('keeps the day in order, so a batch write is readable', () => {
    const days = buildHealthDays(
      [
        { start: new Date('2026-08-05T21:00:00Z'), end: new Date('2026-08-06T05:00:00Z'), source: src },
        { start: new Date('2026-08-03T21:00:00Z'), end: new Date('2026-08-04T05:00:00Z'), source: src },
      ],
      [],
      BRUSSELS,
      at,
    );
    expect(days.map((d) => d.date)).toEqual(['2026-08-04', '2026-08-06']);
  });

  it('produces documents the schema and the rules both accept', () => {
    const days = buildHealthDays(
      [{ start: new Date('2026-08-03T21:40:00Z'), end: new Date('2026-08-04T05:10:00Z'), source: src }],
      [],
      BRUSSELS,
      at,
    );
    // `source.app` is what the rules check, and `date` is what makes a
    // re-import idempotent rather than duplicating a night.
    expect(() => healthDaySchema.parse(days[0])).not.toThrow();
    expect(days[0]!.source.app).toBe(src.app);
  });
});

describe('what is read from the device', () => {
  it('is only sleep and resting heart rate', () => {
    /*
     * A guard on scope rather than on correctness. Steps are available and
     * deliberately not read — a step count invites the self-scoring BRAND
     * refuses everywhere else — and every type added here becomes another
     * per-data-type justification on the Google Play health declaration.
     */
    expect([...HEALTH_CONNECT_TYPES]).toEqual(['SleepSession', 'RestingHeartRate']);
  });
});
