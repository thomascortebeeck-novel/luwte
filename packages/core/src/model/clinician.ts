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
 * D30 — which disciplines may be named as *the prescriber* on a medication.
 *
 * The admin decides whether somebody is a real care professional; the patient
 * decides whose they are. This is the third question in between: **what kind**
 * of professional, which is what stops a verified nurse being named a
 * clinician on a card and inheriting the ability to prescribe. Without it,
 * verifying a nurse would quietly widen who can write medication — the D23
 * protection, one role further out.
 *
 * A psychologist is in the non-prescribing list for the same reason a nurse
 * is: they cannot prescribe in Belgium, and letting the app record one as the
 * prescriber would make `prescribedBy` mean less than it says. `andere` is
 * unknown, and unknown resolves to the narrower answer — an admin who knows
 * better can decline the request and ask them to reapply.
 */
export const PRESCRIBING_DISCIPLINES = [
  'psychiater',
  'huisarts',
] as const satisfies readonly Discipline[];

/**
 * What a verified person may be named on a circle card. Written into
 * `clinicians/{uid}` by the admin's decision, and checked by the rules.
 */
export function careRoleFor(discipline: Discipline): 'clinician' | 'nurse' {
  return (PRESCRIBING_DISCIPLINES as readonly Discipline[]).includes(discipline)
    ? 'clinician'
    : 'nurse';
}

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

/**
 * How a person and their doctor find each other.
 *
 * Research finding that shapes this: **there is no public register to search.**
 * RIZIV/INAMI's "Een zorgverlener zoeken" is a web form for humans; there is
 * no open dataset and no API. So "search for your doctor" can only ever mean
 * searching doctors who already use luwte, and the copy says so rather than
 * implying a national lookup and then returning nothing.
 *
 * The document id **is** the connection code, which gives `get`-by-code for
 * free. That is what makes a card handed across a desk work for a clinician
 * who does not want to be in a searchable list at all: `listed: false` still
 * resolves by code.
 *
 * Kept separate from `clinicians/{uid}`, which is verification state and may
 * later hold things a clinician would not broadcast. This one is a nameplate —
 * a name, a discipline, a practice. No contact details, no patient data.
 * Widening `list` here can therefore never widen anything else. Same instinct
 * as the invite `get`/`list` split (D17).
 */
export const clinicianDirectorySchema = z.object({
  uid: z.string().min(1),
  displayName: z.string().min(1).max(80),
  discipline: z.enum(disciplines),
  practice: z.string().max(120).default(''),
  /** Lowercased `displayName`, so a prefix query needs no search service. */
  searchName: z.string(),
  /** Opt in to being findable by name. A code always works regardless. */
  listed: z.boolean(),
});

export type ClinicianDirectoryEntry = z.infer<typeof clinicianDirectorySchema>;

export function searchKey(displayName: string): string {
  return displayName.trim().toLowerCase();
}

/**
 * The bounds of a Firestore prefix query. Paired with `listed == true`, this
 * is the whole of "search by name" — no search service, no index beyond the
 * composite one, and nothing leaves the device that was not typed.
 */
export function prefixRange(query: string): { start: string; end: string } {
  // The upper bound is U+F8FF, a private-use character that sorts after every
  // ordinary one — so the range covers exactly the names starting with what
  // was typed. It is the standard Firestore prefix trick, written out here
  // because it looks like a typo otherwise.
  const start = searchKey(query);
  return { start, end: `${start}` };
}
