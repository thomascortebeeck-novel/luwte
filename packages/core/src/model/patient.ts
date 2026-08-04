import { z } from 'zod';

/** PRD 5.2 — patientId is the patient's own uid. */
export const patientSchema = z.object({
  displayName: z.string().min(1).max(60),
  /** Local hour the single daily reminder fires. One reminder, never chased. */
  checkinHour: z.number().int().min(0).max(23),
  timezone: z.string().min(1),
  onboarded: z.boolean(),
  createdAt: z.date(),
});

export type Patient = z.infer<typeof patientSchema>;

/**
 * Belgium is one timezone and the pilot is one family, but every date key in
 * this product is computed in a named zone rather than from the device, so
 * that a check-in made while travelling still lands on the right local day.
 */
export const DEFAULT_TIMEZONE = 'Europe/Brussels';

/** A quiet default: late enough to have a day to report on, early enough not to wake anyone. */
export const DEFAULT_CHECKIN_HOUR = 20;
