import { z } from 'zod';
import { nextDateKey, previousDateKey, type DateKey } from '../dates';
import {
  RECURRENCE_PRESETS,
  matchesRecurrence,
  parseRecurrence,
  type RecurrencePresetId,
} from './recurrence';

/**
 * PRD 6.3 — the calendar, and the rule the whole phase exists for:
 *
 * > A supporter with `calendar` permission creates with `status: 'suggested'`.
 * > Suggestions appear in a separate, quiet tray — **never directly on the
 * > calendar**. The patient accepts or declines. Declining is silent.
 *
 * Family wanting to help and a person needing to control their own day is the
 * central tension of this product, and this is where it is resolved. A
 * suggestion is an offer, not an entry.
 */

export const activityStatusSchema = z.enum(['suggested', 'accepted', 'declined']);
export type ActivityStatus = z.infer<typeof activityStatusSchema>;

/**
 * PRD 6.3 — "simple recurrence via rrule".
 *
 * Real rrule support has arrived, which is what the string storage was always
 * for: see `recurrence.ts` for the supported subset. These presets are what a
 * screen offers, and the three that existed before mean exactly what they
 * meant — `FREQ=WEEKLY` still inherits the weekday it started on, and the
 * weekdays rule is still Monday to Friday.
 */
export const RECURRENCES = RECURRENCE_PRESETS;

export type RecurrenceId = RecurrencePresetId;

/**
 * Any rule the parser understands, rather than a fixed list — otherwise the
 * schema and the parser could disagree, and the schema would win by refusing
 * to store something the app can read perfectly well.
 */
export const recurrenceSchema = z
  .string()
  .refine((value) => parseRecurrence(value) !== null, {
    message: 'not a supported recurrence rule',
  });

export const activitySchema = z.object({
  title: z.string().min(1).max(120),
  /** The local calendar day it belongs to. Keyed, for the same reason
   *  check-ins are: a day is a day in Brussels, not in UTC. */
  date: z.string().min(10).max(10),
  /** `HH:mm`, or empty for something that has no particular time. */
  startTime: z.string().regex(/^(([01]\d|2[0-3]):[0-5]\d)?$/).default(''),
  withPerson: z.string().max(60).default(''),
  createdBy: z.string().min(1),
  status: activityStatusSchema,
  recurrence: recurrenceSchema.nullable().default(null),
  /*
   * What the person thought it would be like, recorded when they planned it.
   *
   * Behavioural activation research finds *expected* mastery and pleasure
   * contribute more than what was actually obtained — which is the mechanism
   * this product already claims for itself: noticing that something you
   * expected to be hard turned out to be fine is what changes what you do
   * next. Without this recorded, that comparison is implied and never shown.
   *
   * Belongs to the activity rather than the completion because it is said
   * once, at planning time, and a weekly walk was planned once.
   */
  expectedPleasure: z.number().int().min(1).max(7).nullable().default(null),
  expectedMastery: z.number().int().min(1).max(7).nullable().default(null),
});

export type Activity = z.infer<typeof activitySchema>;

/** Whether there is anything to compare an answer against. */
export function hasExpectation(
  activity: Pick<Activity, 'expectedPleasure' | 'expectedMastery'>,
): boolean {
  return activity.expectedPleasure !== null || activity.expectedMastery !== null;
}

export const completionSchema = z.object({
  activityId: z.string().min(1),
  date: z.string().min(10).max(10),
  /** Null once it has been ticked and unticked again. */
  completedAt: z.date().nullable(),
  /** PRD 6.2 — behavioural activation. Both optional; skipping costs nothing. */
  pleasure: z.number().int().min(1).max(7).nullable().default(null),
  mastery: z.number().int().min(1).max(7).nullable().default(null),
  postedToFeed: z.boolean().default(false),
});

export type Completion = z.infer<typeof completionSchema>;

/**
 * Keyed `activityId_yyyy-MM-dd`, so a recurring activity has one completion
 * per day and ticking it offline twice records one.
 */
export function completionId(activityId: string, date: DateKey): string {
  return `${activityId}_${date}`;
}

/** Completions apart the question comes back, after the first one. */
export const RATING_INTERVAL = 5;

/**
 * Whether to ask how it went, this time.
 *
 * PRD 6.2 puts a two-tap question after finishing something planned, and the
 * research says to keep **both** halves — mastery and pleasure come apart,
 * and a walk that gave one without the other is exactly the distinction worth
 * recording. What was wrong was the frequency: re-rating Tuesday's walk every
 * Tuesday is bookkeeping, and bookkeeping is what makes people stop.
 *
 * So: the first time, then every fifth. The first matters most because it is
 * where an expectation gets tested; the returns are there because how a thing
 * feels changes over months, which is the only reason to ask twice at all.
 *
 * Counting completions rather than answers is deliberate. If somebody skipped
 * it, the question comes back on the fifth like everybody else's rather than
 * the next day — **the app never chases**, and re-asking a question somebody
 * just dismissed is chasing.
 */
export function shouldAskRating({ completedBefore }: { completedBefore: number }): boolean {
  if (completedBefore < 0) return false;
  return completedBefore % RATING_INTERVAL === 0;
}

/**
 * Whether an activity lands on a given day.
 *
 * A recurring activity never runs backwards from where it started, and an
 * unrecognised rule means "just the one day" — see `recurrence.ts` for why
 * that failure mode is the safe one.
 */
export function occursOn(
  activity: Pick<Activity, 'date' | 'recurrence'>,
  day: DateKey,
): boolean {
  if (day === activity.date) return true;
  if (!activity.recurrence || day < activity.date) return false;

  const rule = parseRecurrence(activity.recurrence);
  return rule === null ? false : matchesRecurrence(rule, activity.date, day);
}

/** How many days either side of today the week view shows. */
export const WEEK_RADIUS = 3;

/**
 * PRD 6.3 — "week view, seven columns, current day centred".
 *
 * Centred rather than starting on Monday, because the question the screen
 * answers is "what is around now", not "what does this week look like". On a
 * Saturday, a Monday-first week is almost entirely behind you.
 */
export function centredWeek(today: DateKey): DateKey[] {
  const days: DateKey[] = [today];
  for (let i = 0; i < WEEK_RADIUS; i += 1) days.unshift(previousDateKey(days[0]!));
  for (let i = 0; i < WEEK_RADIUS; i += 1) days.push(nextDateKey(days[days.length - 1]!));
  return days;
}

/** Planned things for one day, earliest first, untimed ones last. */
export function onDay<T extends Pick<Activity, 'date' | 'recurrence' | 'status' | 'startTime'>>(
  activities: readonly T[],
  day: DateKey,
): T[] {
  return activities
    .filter((activity) => activity.status === 'accepted' && occursOn(activity, day))
    .sort((a, b) => (a.startTime || '99:99').localeCompare(b.startTime || '99:99'));
}
