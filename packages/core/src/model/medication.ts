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
  /**
   * PRD 5.3 and 6.7 — who owns this entry. Null while it is the patient's own
   * note of what they take; a verified clinician's uid once they have taken
   * it over, after which the patient may no longer edit it.
   *
   * The patient can never set this. Otherwise they could author provenance,
   * and a line saying a doctor prescribed something would not be worth
   * reading. The rules enforce that; this field only records it.
   */
  prescribedBy: z.string().nullable().default(null),
});

/**
 * PRD 5.3 — medication is the one thing only a clinician may see.
 *
 * Family and friends are never offered it. Not because a brother cannot be
 * trusted, but because what someone is prescribed is the most identifying,
 * most diagnostic thing this app holds — and a permission that is never
 * offered cannot be granted by mistake on a bad day.
 */
export const CLINICAL_PERMISSION_KEYS = ['medication'] as const;

/** Whether this entry is a clinical decision rather than a personal note. */
export function isPrescribed(medication: Pick<Medication, 'prescribedBy'>): boolean {
  return typeof medication.prescribedBy === 'string' && medication.prescribedBy.length > 0;
}

/**
 * A change the person wants made to something their clinician prescribed.
 *
 * They can always ask. What they cannot do is apply it themselves, because
 * the entry is a clinical decision and somebody made it. The proposal sits
 * here until that person approves it or does not.
 *
 * This is deliberately not a message: it is the exact new values, so
 * approving is one tap and cannot be mistranscribed.
 */
export const pendingChangeSchema = z.object({
  proposedBy: z.string().min(1),
  proposedAt: z.date(),
  name: z.string().min(1).max(120).optional(),
  dose: z.string().min(1).max(60).optional(),
  times: z.array(doseTimeSchema).min(1).max(6).optional(),
  purpose: z.string().max(300).optional(),
  /** Set when what they are asking for is to stop taking it. */
  stopping: z.boolean().optional(),
  /** Their own words about why. Read by a person, never parsed. */
  note: z.string().max(500).optional(),
});

export type PendingChange = z.infer<typeof pendingChangeSchema>;

export function hasPendingChange(medication: {
  pendingChange?: PendingChange | null;
}): boolean {
  return medication.pendingChange != null;
}

/**
 * Whether this person can just make the change, or has to ask.
 *
 * The test is whether a clinician owns this entry — which is what "a doctor
 * is assigned" means for one medication. Nobody prescribed it, nobody needs
 * to approve a change to it.
 */
export function needsApproval(medication: Pick<Medication, 'prescribedBy'>): boolean {
  return isPrescribed(medication);
}

/**
 * Whether the clinician who owns this line is still there to change it.
 *
 * A prescription outlives the circle entry that authorised it. Revoke a
 * psychiatrist and every line they wrote becomes uneditable by anyone: the
 * person fails the self-edit branch because `prescribedBy` is set, and the
 * clinician fails it because a revoked member is granted nothing. Asking is no
 * help either — the request is addressed to someone who can no longer read the
 * document it lives on.
 *
 * So the screen has to know, and this is what tells it. Nobody is left, and
 * the line goes back to the person it belongs to.
 */
export function prescriberGone(
  medication: Pick<Medication, 'prescribedBy'>,
  circle: readonly { uid: string; revokedAt?: Date | null }[],
): boolean {
  if (!isPrescribed(medication)) return false;
  const entry = circle.find((member) => member.uid === medication.prescribedBy);
  return entry === undefined || entry.revokedAt != null;
}

/**
 * The log entry for taking a line back.
 *
 * Releasing ends the relationship going forward; it never erases what was
 * prescribed. `changeLog` may only grow, so the chart keeps every vertical
 * rule the departed clinician's changes drew.
 */
export function releaseChange(
  medication: Pick<Medication, 'prescribedBy'>,
  by: string,
  at: Date,
): MedicationChange {
  return { at, field: 'prescribedBy', from: medication.prescribedBy ?? null, to: null, by };
}

/**
 * The log entry for a clinician taking over a line the person wrote themselves.
 *
 * The write is permitted already; what this adds is that it leaves a trace. A
 * line silently changing from *mine to edit* to *I can only ask* is precisely
 * the quiet loss of control this product must not do — the person invited this
 * clinician and granted them medication, so it needs no second consent, but it
 * has to be **told rather than discovered**.
 *
 * Returns nothing when the line was already prescribed: editing your own
 * prescription is not an adoption, and a log entry saying otherwise would draw
 * a vertical rule on the chart for a change that never happened.
 */
export function adoptionChange(
  before: { prescribedBy?: string | null },
  by: string,
  at: Date,
): MedicationChange | null {
  if (isPrescribed({ prescribedBy: before.prescribedBy ?? null })) return null;
  return { at, field: 'prescribedBy', from: null, to: by, by };
}

/** The values a proposal would produce, for showing what would change. */
export function applyPendingChange(change: PendingChange): Partial<Medication> {
  return {
    ...(change.name === undefined ? {} : { name: change.name }),
    ...(change.dose === undefined ? {} : { dose: change.dose }),
    ...(change.times === undefined ? {} : { times: change.times }),
    ...(change.purpose === undefined ? {} : { purpose: change.purpose }),
    ...(change.stopping === true ? { activeTo: new Date() } : {}),
  };
}

export type Medication = z.infer<typeof medicationSchema>;

export const doseStatusSchema = z.enum(['taken', 'skipped', 'pending']);
export type DoseStatus = z.infer<typeof doseStatusSchema>;

/**
 * What was actually taken, as opposed to what was prescribed.
 *
 * This is the question a psychiatrist cannot get an answer to today. The app
 * already records *whether* a dose was taken; it never recorded that somebody
 * halved it because it made them too drowsy to work, which is both the more
 * useful fact and the one that changes a prescription.
 *
 * Both fields are optional and both stay on `doses/`, which is the person's
 * own record in both directions: a prescribing clinician reads adherence and
 * can never write it. Nobody edits somebody else's account of what they took.
 */
export const doseAnnotationSchema = z.object({
  /** Free text, because '1 in plaats van 2' and '150 mg' are both answers. */
  actualDose: z.string().max(60).optional(),
  /** Their own words about why. Read by a person, never parsed. */
  note: z.string().max(500).optional(),
});

export type DoseAnnotation = z.infer<typeof doseAnnotationSchema>;

/**
 * Whether this dose carries anything beyond the tick.
 *
 * Used to decide whether to show it on the report: a fortnight of plain ticks
 * says "as prescribed" in one line, and printing an empty annotation per dose
 * would bury the three that matter.
 */
export function hasAnnotation(dose: DoseAnnotation): boolean {
  return (dose.actualDose ?? '').trim().length > 0 || (dose.note ?? '').trim().length > 0;
}

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
