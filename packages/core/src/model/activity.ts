import { z } from 'zod';
import { nextDateKey, previousDateKey, weekdayOf, type DateKey } from '../dates';

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
 * PRD 6.3 — "simple recurrence (daily / weekly / weekday) via rrule".
 *
 * Stored as an rrule string so the field does not have to change if real
 * rrule support ever arrives, but only these three are ever parsed. Anything
 * else is treated as no recurrence rather than guessed at: an activity that
 * silently appears on the wrong days is worse than one that appears once.
 */
export const RECURRENCES = {
  daily: 'FREQ=DAILY',
  weekly: 'FREQ=WEEKLY',
  weekdays: 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR',
} as const;

export type RecurrenceId = keyof typeof RECURRENCES;

export const recurrenceSchema = z.enum([
  RECURRENCES.daily,
  RECURRENCES.weekly,
  RECURRENCES.weekdays,
]);

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
});

export type Activity = z.infer<typeof activitySchema>;

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

/** Monday to Friday, as ISO weekdays. */
const WEEKDAYS = [1, 2, 3, 4, 5];

/**
 * Whether an activity lands on a given day.
 *
 * A recurring activity never runs backwards from where it started, and an
 * unrecognised rule means "just the one day" — see RECURRENCES.
 */
export function occursOn(
  activity: Pick<Activity, 'date' | 'recurrence'>,
  day: DateKey,
): boolean {
  if (day === activity.date) return true;
  if (!activity.recurrence || day < activity.date) return false;

  switch (activity.recurrence) {
    case RECURRENCES.daily:
      return true;
    case RECURRENCES.weekly:
      return weekdayOf(day) === weekdayOf(activity.date);
    case RECURRENCES.weekdays:
      return WEEKDAYS.includes(weekdayOf(day));
    default:
      return false;
  }
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
