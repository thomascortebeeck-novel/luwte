import { z } from 'zod';

/**
 * PRD 6.7 — whether someone is a clinician is checked by a person.
 *
 * That check now happens in an admin panel rather than a shell script (D27),
 * so the root of trust moved with it: it is no longer "only the Admin SDK may
 * write `clinicians/`", it is **"only the Admin SDK may write `admins/`"**.
 *
 * The invariants are unchanged, and they are the whole point:
 *   - nobody verifies themselves
 *   - no patient can anoint a clinician
 *   - verification grants no access to anybody's data on its own
 */

export const disciplines = [
  'psychiater',
  'huisarts',
  'psycholoog',
  'verpleegkundige',
  'andere',
] as const;
export type Discipline = (typeof disciplines)[number];

/**
 * The Belgian provider register (RIZIV/INAMI) issues every practitioner an
 * eleven-digit number whose **last three digits are the competency code** —
 * which is how a psychiatrist is told apart from a doctor in general.
 *
 * There is no public API to check one against, so this is a plausibility test
 * and nothing more. The admin does the actual checking, against
 * <https://www.riziv.fgov.be/nl/webtoepassingen/een-zorgverlener-zoeken>, and
 * that check is the entire point of the step.
 */
export function normaliseRiziv(value: string): string {
  return value.replace(/\D/g, '');
}

export function isPlausibleRiziv(value: string): boolean {
  return normaliseRiziv(value).length === 11;
}

/** The last three digits, or null if this is not eleven digits at all. */
export function competencyCode(value: string): string | null {
  const digits = normaliseRiziv(value);
  return digits.length === 11 ? digits.slice(-3) : null;
}

export const clinicianRequestSchema = z.object({
  displayName: z.string().min(1).max(80),
  discipline: z.enum(disciplines),
  rizivNumber: z.string().min(1).max(40),
  practice: z.string().max(120).default(''),
  requestedAt: z.date(),
  /*
   * A decided request is kept, never deleted. Who asked to be trusted with
   * somebody else's clinical record — and what was decided — is exactly the
   * kind of record this project does not erase. The same reasoning as a
   * revoked circle member and a withdrawn consent.
   */
  decidedAt: z.date().nullable().default(null),
  decidedBy: z.string().nullable().default(null),
  outcome: z.enum(['verified', 'declined']).nullable().default(null),
});

export type ClinicianRequest = z.infer<typeof clinicianRequestSchema>;

export function isDecided(request: Pick<ClinicianRequest, 'outcome'>): boolean {
  return request.outcome !== null && request.outcome !== undefined;
}

/** The fields an admin's decision may touch, and nothing else. */
export const DECISION_KEYS = ['decidedAt', 'decidedBy', 'outcome'] as const;
