import { dateKey } from './dates';

/**
 * PRD 5.4 / 6.1 — who is due a check-in reminder right now.
 *
 * Kept here, as a pure function over plain data, rather than inside the Cloud
 * Function: the scheduler wrapper is three lines and untestable, while the
 * decision of *whether to disturb someone* is the part that must never be
 * wrong. It runs hourly and answers one question per patient.
 *
 * The rules it encodes, all of them from PRD 8:
 *   - it is their chosen hour, in their own timezone
 *   - they have not already checked in today
 *   - they did not turn the reminder off
 *   - **it fires once and never again for that day**
 *
 * That last one is why `alreadyRemindedOn` exists. An hourly job with a
 * missed-check-in condition would otherwise nag every hour until midnight,
 * which is precisely the behaviour this product exists not to have.
 */

export type ReminderCandidate = {
  patientId: string;
  /**
   * Absent for anyone who keeps no logbook of their own. A supporter is never
   * asked what hour suits them, so they have no hour — and defaulting one
   * would enrol them in a daily nudge to fill in a check-in they do not have.
   */
  checkinHour?: number | null;
  timezone: string;
  /** False when the person turned the daily reminder off. */
  remindersEnabled: boolean;
  /** Date key of their most recent check-in, if any. */
  lastCheckinDate?: string | null;
  /** Date key on which a reminder was last sent, if any. */
  alreadyRemindedOn?: string | null;
  /** Empty when they never granted notification permission on any device. */
  fcmTokens?: readonly string[];
};

/** The local hour for a candidate at a given instant, 0..23. */
export function localHour(instant: Date, timeZone: string): number {
  const formatted = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    hour12: false,
  }).format(instant);
  // en-GB renders midnight as "24" in some ICU versions.
  return Number(formatted) % 24;
}

export function isDueForReminder(candidate: ReminderCandidate, now: Date): boolean {
  if (!candidate.remindersEnabled) return false;
  if (!candidate.fcmTokens?.length) return false;

  // Nobody chose an hour, so there is no hour at which to disturb them. This
  // is what keeps a supporter out of the daily nudge entirely, rather than
  // relying on every caller to remember they are not a patient.
  if (typeof candidate.checkinHour !== 'number') return false;

  const today = dateKey(now, candidate.timezone);

  // Never twice in a day. This is the rule that keeps "never chase" true.
  if (candidate.alreadyRemindedOn === today) return false;

  // Already done today: there is nothing to remind them about.
  if (candidate.lastCheckinDate === today) return false;

  return localHour(now, candidate.timezone) === candidate.checkinHour;
}

export function selectDue(
  candidates: readonly ReminderCandidate[],
  now: Date,
): ReminderCandidate[] {
  return candidates.filter((candidate) => isDueForReminder(candidate, now));
}
