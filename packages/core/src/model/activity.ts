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
