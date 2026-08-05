import { z } from 'zod';

/**
 * GDPR Article 15 (access) and Article 17 (erasure).
 *
 * Both happen **on the device**, like the printable report (D16). Article 9
 * data that never leaves the phone to be exported is better than Article 9
 * data that does, and it keeps the project billing-free — a Cloud Function
 * would need Blaze to do a thing the client can already do with the
 * permissions it holds.
 *
 * The interesting problem here is that **this database refuses `delete`
 * almost everywhere on purpose**. A dose log that can be shortened is not a
 * record; a comment that can be unsaid after it was read is not a comment;
 * `changeLog` may only grow because it draws the vertical rules on the chart
 * a psychiatrist reads. None of that is an obstacle to Article 17 — it is
 * about the integrity of a record *while it exists*, and erasure is the
 * record ceasing to exist. But security rules cannot tell the two apart by
 * looking at a delete, so the difference has to be made visible to them.
 *
 * Hence `erasureStartedAt` on the patient document. Erasure is a **separate,
 * deliberate path**: the marker goes down first, the rules only permit
 * deletes while it is set, and normal operation keeps every refusal it had.
 */

/**
 * Every sub-collection under `patients/{pid}`.
 *
 * **Enumerated rather than remembered**, and `erasure.test.ts` reads
 * `paths.ts` and fails if a collection exists there and not here. That is the
 * same guard `contrast.test.ts` grew after a colour pairing nobody added went
 * unnoticed for months — and the failure mode is worse in this file. A
 * collection missing from a contrast table is an unreadable label; a
 * collection missing from here is health data that survives somebody
 * exercising their right to erasure, and neither they nor we would know.
 */
export const PATIENT_SUBCOLLECTIONS = [
  'consents',
  'checkins',
  'weekly',
  'medications',
  'doses',
  'activities',
  'completions',
  'posts',
  'circle',
  'permissionLog',
  'plan',
] as const;

export type PatientSubcollection = (typeof PATIENT_SUBCOLLECTIONS)[number];

/** Sub-collections that hang off a post rather than off the patient. */
export const POST_SUBCOLLECTIONS = ['reactions', 'comments'] as const;

/**
 * The order erasure runs in, and the order is the design.
 *
 * **Access is revoked before content is removed.** Invites first, because an
 * unredeemed invite is a pending grant and somebody could otherwise join
 * halfway through. Then the circle, which cuts off everyone who already had
 * access. Only then does anything get deleted that somebody might have been
 * able to read.
 *
 * Run the other way round, a teardown interrupted by a flat battery would
 * leave the remaining months readable by the whole circle. Run this way, the
 * same interruption leaves the person with their own data and nobody else's
 * access to it, which is the failure worth having.
 *
 * The patient document goes **last of the Firestore work**, because the rules
 * read `erasureStartedAt` from it. See `erasureStillPermitted` for what
 * happens if the process dies after that point.
 */
export const ERASURE_ORDER = [
  { step: 'invites', why: 'a pending invite is a pending grant' },
  { step: 'circle', why: 'cut off everyone who already had access' },
  { step: 'posts', why: 'and the reactions and comments hanging off each one' },
  { step: 'content', why: 'the check-ins, medication, doses, calendar and plan' },
  { step: 'clinicianRequest', why: 'only exists if they ever applied to be verified' },
  { step: 'patient', why: 'the rules read the erasure marker from it, so it goes late' },
  { step: 'account', why: 'the users document, then the auth account itself' },
] as const;

/**
 * Article 17 versus somebody else's authorship.
 *
 * A supporter's comment is the supporter's own words. It is also **about this
 * person's day, attached to this person's post, inside this person's
 * subtree** — and it does not survive the post it answers in any meaningful
 * form. The patient's right to erasure governs, and reactions and comments go
 * with the post.
 *
 * Recorded here rather than left implicit because it is a real conflict of
 * two people's interests and somebody will ask which way it was decided.
 */
export const COMMENTS_DIE_WITH_THE_POST = true;

/** Bumped when the export's shape changes, so an old file is readable as old. */
export const EXPORT_VERSION = 1;

export const exportEnvelopeSchema = z.object({
  format: z.literal('luwte-export'),
  version: z.number().int().positive(),
  exportedAt: z.string().min(1),
  patientId: z.string().min(1),
  /** Keyed by collection name. Documents keep their ids. */
  data: z.record(z.string(), z.unknown()),
});

export type ExportEnvelope = z.infer<typeof exportEnvelopeSchema>;

/**
 * Everything an export must contain: the account and patient documents, every
 * sub-collection, plus the two things that live outside the patient subtree
 * and would otherwise be quietly missed.
 */
export const EXPORT_SECTIONS = [
  'account',
  'patient',
  ...PATIENT_SUBCOLLECTIONS,
  'invites',
  'clinicianRequest',
] as const;

export type ExportSection = (typeof EXPORT_SECTIONS)[number];

export function buildExport(
  patientId: string,
  exportedAt: Date,
  sections: Record<string, unknown>,
): ExportEnvelope {
  const missing = EXPORT_SECTIONS.filter((s) => !(s in sections));
  if (missing.length > 0) {
    /*
     * Loud rather than partial. An export that silently omits a collection
     * looks exactly like an export of somebody who never used that feature,
     * and Article 15 is answered wrongly with no way to notice.
     */
    throw new Error(`Export is incomplete: ${missing.join(', ')} missing`);
  }
  return {
    format: 'luwte-export',
    version: EXPORT_VERSION,
    exportedAt: exportedAt.toISOString(),
    patientId,
    data: sections,
  };
}

/** `luwte-<name>-2026-08-05.json`, with anything filesystem-hostile removed. */
export function exportFilename(displayName: string, exportedAt: Date): string {
  const slug =
    displayName
      .toLowerCase()
      .normalize('NFD')
      // Combining marks, spelled by codepoint so the source stays readable.
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'export';
  return `luwte-${slug}-${exportedAt.toISOString().slice(0, 10)}.json`;
}

/**
 * Whether the rules will permit deletes. Mirrors `erasing()` in
 * `firestore.rules` exactly, so the client can say why something was refused
 * instead of guessing.
 *
 * **A missing patient document means no**, and that is deliberate. An earlier
 * version answered yes, reasoning that the marker lives on that document so
 * its absence proves erasure was under way. Ten rules tests failed and all of
 * them were right: a missing patient document is the ordinary state before
 * onboarding finishes, so it would have switched off delete-protection for
 * anybody who had not got that far.
 *
 * Nothing is lost. The patient document is deleted **after** everything it
 * heads (`ERASURE_ORDER`), so an interruption there leaves nothing stranded —
 * and a person who somehow ends up in that state re-creates the document,
 * which they are always allowed to do, and carries on.
 */
export function erasureStillPermitted(patient: { erasureStartedAt?: Date | null } | null): boolean {
  if (patient === null) return false;
  return patient.erasureStartedAt != null;
}
