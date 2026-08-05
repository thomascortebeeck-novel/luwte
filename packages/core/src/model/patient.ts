import { z } from 'zod';

/** PRD 5.2 — patientId is the patient's own uid. */
export const patientSchema = z.object({
  displayName: z.string().min(1).max(60),
  /** Local hour the single daily reminder fires. One reminder, never chased. */
  checkinHour: z.number().int().min(0).max(23),
  timezone: z.string().min(1),
  onboarded: z.boolean(),
  createdAt: z.date(),
  /**
   * GDPR Art. 17. Set when the person starts erasing themselves, and the
   * security rules refuse every delete in this subtree until it is.
   *
   * A marker rather than a flow the client just runs, because rules cannot
   * tell an erasure apart from somebody deleting one inconvenient day — and
   * this database refuses deletes almost everywhere precisely so that cannot
   * happen. `changeLog` may only grow because it draws the chart a
   * psychiatrist reads. Erasure is not an edit; it is the record ceasing to
   * exist, and it has to say so out loud.
   */
  erasureStartedAt: z.date().nullable().default(null),
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
