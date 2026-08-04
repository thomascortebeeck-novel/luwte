import { z } from 'zod';

/**
 * PRD 6.2 / 6.6 — medication, and the change log that makes the chart worth
 * looking at.
 *
 * `changeLog` exists from the very first edit, long before a clinician can
 * touch anything. PRD 6.6 calls medication changes marked on the timeline
 * "the entire clinical value of the product": seeing flatness rise in the
 * fortnight after a dose increase is the thing that changes an appointment.
 * A log started later cannot show the change that already happened.
 */

/** `HH:mm`, the times of day a dose is taken. */
export const doseTimeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);

export const medicationChangeSchema = z.object({
  at: z.date(),
  field: z.string().min(1),
  from: z.string().nullable(),
  to: z.string().nullable(),
  /** The uid that made the change — the patient, or a clinician later. */
  by: z.string().min(1),
});

export type MedicationChange = z.infer<typeof medicationChangeSchema>;

export const medicationSchema = z.object({
  name: z.string().min(1).max(120),
  dose: z.string().min(1).max(60),
  times: z.array(doseTimeSchema).min(1).max(6),
  /**
   * PRD 6.2 — a plain-language line on what this is for. Not a mechanism,
   * not a diagnosis: what it is meant to do for this person.
   */
  purpose: z.string().max(300).default(''),
  activeFrom: z.date(),
  activeTo: z.date().nullable().optional(),
});

export type Medication = z.infer<typeof medicationSchema>;

export const doseStatusSchema = z.enum(['taken', 'skipped', 'pending']);
export type DoseStatus = z.infer<typeof doseStatusSchema>;

/**
 * PRD 5.2 — `doses/{yyyy-MM-dd_medId_HHmm}`. Keyed rather than auto-id for
 * the same reason check-ins are: it makes the write idempotent, so ticking a
 * dose offline and syncing twice records one dose, not two.
 */
export function doseId(dateKey: string, medId: string, time: string): string {
  return `${dateKey}_${medId}_${time.replace(':', '')}`;
}

/**
 * Which fields changed between two versions, as log entries.
 *
 * Only the fields a human can meaningfully see on a timeline are logged —
 * a dose going from 5mg to 10mg matters, an id does not. `times` is
 * flattened to a readable string because the log is read by people.
 */
export function diffMedication(
  before: Partial<Medication>,
  after: Partial<Medication>,
  by: string,
  at: Date,
): MedicationChange[] {
  const render = (value: unknown): string | null => {
    if (value === undefined || value === null) return null;
    if (Array.isArray(value)) return value.join(', ');
    if (value instanceof Date) return value.toISOString().slice(0, 10);
    return String(value);
  };

  const tracked: (keyof Medication)[] = ['name', 'dose', 'times', 'purpose', 'activeTo'];

  return tracked
    .filter((field) => render(before[field]) !== render(after[field]))
    .map((field) => ({
      at,
      field: String(field),
      from: render(before[field]),
      to: render(after[field]),
      by,
    }));
}

/**
 * PRD 6.2 — optional practices. Offered, never tracked, no completion state,
 * and nothing is written when one is ignored. They are deliberately not
 * documents: there is nothing to store, because storing it would make it a
 * task.
 */
export const OPTIONAL_PRACTICES = [
  { id: 'gratitude', labelKey: 'practiceGratitude' },
  { id: 'breathing', labelKey: 'practiceBreathing' },
  { id: 'walk', labelKey: 'practiceWalk' },
] as const;
