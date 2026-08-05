import { z } from 'zod';
import { dateKey, type DateKey } from '../dates';

/**
 * Watch data — sleep and resting heart rate.
 *
 * **It arrives through the phone, not through Garmin.** Garmin Connect for
 * Android writes to Health Connect, which is an on-device API: no Garmin
 * agreement, no OAuth client secret, no webhook, no server and no Blaze. The
 * Android app reads locally and writes here as the patient, through the rules
 * that already exist. It also works with any watch that writes to Health
 * Connect — Fitbit, Samsung, Oura — where Garmin's cloud API would have bought
 * a Garmin-only feature at the price of a backend.
 *
 * **The line this must not cross.** Under EU MDR it is *intended purpose* that
 * makes software a medical device. Relaying a measurement, attributed to the
 * device that made it, is a conduit — MDCG 2019-11 treats storage and
 * communication without modifying the data as outside the definition.
 * Deriving something from it is not. luwte may carry a conclusion somebody
 * else is licensed to draw and may never draw one: no interpretation, no
 * threshold, no "your resting heart rate is elevated". That is why `source` is
 * required rather than nice to have — attribution is what makes this a relay
 * rather than a claim of luwte's own.
 */

/** Where a reading came from. Shown with the reading, never averaged away. */
export const healthSourceSchema = z.object({
  /** The writing app's package name, e.g. `com.garmin.android.apps.connectmobile`. */
  app: z.string().min(1).max(120),
  /** The device model Health Connect reported, when it reported one. */
  device: z.string().max(120).nullable().default(null),
});

export const healthDaySchema = z.object({
  /** yyyy-MM-dd, and see `sleepDateKey` for which day a night belongs to. */
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  /** Total time asleep, in minutes. Null when the watch recorded nothing. */
  sleepMinutes: z.number().int().min(0).max(24 * 60).nullable().default(null),
  /** Beats per minute. Stored always, charted only if the person asks. */
  restingHeartRate: z.number().int().min(20).max(220).nullable().default(null),
  source: healthSourceSchema,
  recordedAt: z.date(),
});

export type HealthDay = z.infer<typeof healthDaySchema>;
export type HealthSource = z.infer<typeof healthSourceSchema>;

/**
 * A night belongs to the day you **wake up**, not the day you fell asleep.
 *
 * The check-in asks how you slept, and it is answered in the evening about the
 * night before — so sleep that ran 23:40 Monday to 07:10 Tuesday is Tuesday's
 * answer. Keying it to Monday would prefill the wrong day's check-in, and it
 * would do so invisibly, because both days plausibly have a number in them.
 *
 * Computed in the patient's zone for the same reason every other date key in
 * this product is: `toISOString().slice(0, 10)` is UTC and puts a Brussels
 * night on the wrong side of midnight for half the year.
 */
export function sleepDateKey(end: Date, timezone: string): DateKey {
  return dateKey(end, timezone);
}

/**
 * Health Connect returns sessions, and a real night is often several — a wake
 * at 03:00 splits one sleep into two records. Summed rather than taking the
 * longest, because "six hours in two pieces" is six hours slept.
 */
export function totalSleepMinutes(
  sessions: readonly { start: Date; end: Date }[],
): number | null {
  if (sessions.length === 0) return null;
  const total = sessions.reduce(
    (sum, s) => sum + Math.max(0, (s.end.getTime() - s.start.getTime()) / 60000),
    0,
  );
  return Math.round(total);
}

/** `7 u 20` / `7h 20`. Never a decimal — nobody sleeps 7.33 hours. */
export function formatSleep(minutes: number, locale: 'nl' | 'en'): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const unit = locale === 'nl' ? 'u' : 'h';
  return m === 0 ? `${h} ${unit}` : `${h} ${unit} ${String(m).padStart(2, '0')}`;
}

/**
 * The check-in's `sleepHours` is typed by the person. This is what a watch can
 * offer instead, and it is an **offer**: prefilled and editable, never
 * authoritative. Somebody who lay awake knowing they did not sleep is right
 * and the watch is wrong, and the logbook is theirs.
 */
export function sleepHoursFromMinutes(minutes: number): number {
  return Math.round((minutes / 60) * 2) / 2;
}

/**
 * Resting heart rate is **stored and not charted by default**.
 *
 * An uninterpreted cardiac number shown unprompted is harmful in both
 * directions: alarming when it means nothing, and reassuring when it does not.
 * The person can turn it on. Nothing turns it on for them, and nothing in
 * luwte ever says what it means.
 */
export const CHARTS_RESTING_HEART_RATE_BY_DEFAULT = false;

/**
 * The only two types read from Health Connect.
 *
 * Deliberately short. Steps are available and not read — this is a logbook for
 * how somebody feels, and a step count invites exactly the self-scoring BRAND
 * refuses everywhere else. ECG is not a Health Connect type at all, and Body
 * Battery and Stress are Garmin-proprietary derived scores, which is a second
 * reason to leave them: relaying somebody else's *measurement* is a conduit,
 * relaying their *interpretation* starts to look like offering one.
 *
 * Google Play requires a per-data-type justification for each of these, so a
 * shorter list is also a shorter form and a smaller promise.
 */
export const HEALTH_CONNECT_TYPES = ['SleepSession', 'RestingHeartRate'] as const;

export type HealthConnectType = (typeof HEALTH_CONNECT_TYPES)[number];

/** What the platform hands over, in the shape every Health Connect plugin agrees on. */
export type RawSleepSession = { start: Date; end: Date; source: HealthSource };
export type RawRestingHeartRate = { time: Date; bpm: number; source: HealthSource };

/**
 * Fold whatever the device offered into one document per day.
 *
 * Pure, and therefore the part that is actually tested. The plugin that reads
 * Health Connect is a thin adapter around this: platform code is the hardest
 * thing to test and the easiest thing to get wrong, so as little of the
 * decision-making as possible lives there.
 *
 * **A day with neither reading is not written.** An empty document would say
 * "the watch was worn and recorded nothing", which is a different and false
 * claim — and it would take a row on the chart where absence belongs.
 */
export function buildHealthDays(
  sleep: readonly RawSleepSession[],
  resting: readonly RawRestingHeartRate[],
  timezone: string,
  recordedAt: Date,
): HealthDay[] {
  const byDay = new Map<string, { sleep: RawSleepSession[]; resting: RawRestingHeartRate[] }>();
  const bucket = (key: string) => {
    const found = byDay.get(key) ?? { sleep: [], resting: [] };
    byDay.set(key, found);
    return found;
  };

  // Sleep is keyed by when it *ended* — see `sleepDateKey`.
  for (const session of sleep) bucket(sleepDateKey(session.end, timezone)).sleep.push(session);
  for (const rate of resting) bucket(dateKey(rate.time, timezone)).resting.push(rate);

  return [...byDay.entries()]
    .map(([date, day]) => {
      const sleepMinutes = totalSleepMinutes(day.sleep);
      /*
       * Several resting readings in a day: take the lowest. "Resting" is a
       * floor rather than an average, and averaging in a reading taken while
       * somebody climbed the stairs would report something that never
       * happened. Lowest is the closest thing to the measurement's own claim.
       */
      const restingHeartRate =
        day.resting.length > 0 ? Math.min(...day.resting.map((r) => Math.round(r.bpm))) : null;

      // Whatever wrote the data. Sleep first, since it is the reading the
      // check-in actually uses.
      const source = day.sleep[0]?.source ?? day.resting[0]?.source ?? null;
      if (source === null) return null;
      if (sleepMinutes === null && restingHeartRate === null) return null;

      return { date, sleepMinutes, restingHeartRate, source, recordedAt } satisfies HealthDay;
    })
    .filter((day): day is HealthDay => day !== null)
    .sort((a, b) => a.date.localeCompare(b.date));
}
