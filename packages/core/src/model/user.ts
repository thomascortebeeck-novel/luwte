import { z } from 'zod';

export const roleSchema = z.enum(['patient', 'supporter', 'clinician', 'admin']);
export type Role = z.infer<typeof roleSchema>;

/**
 * The three onboardings. `admin` is deliberately absent — it is granted out of
 * band and never chosen on a screen.
 *
 * Choosing one of these grants nothing. A person who says they are a clinician
 * gets the clinician's screens and no access whatsoever: verification is an
 * admin act against `clinicians/{uid}`, which no client may write. That is what
 * makes it safe to simply ask.
 */
export const onboardingRoles = ['patient', 'supporter', 'clinician'] as const;
export type OnboardingRole = (typeof onboardingRoles)[number];

/**
 * Whether this person keeps a logbook of their own.
 *
 * This one question decides most of the difference between the onboardings:
 * whether to ask what hour to be reminded, and whether the consent on offer is
 * about their own health data or about someone else's.
 */
export function keepsOwnLogbook(role: OnboardingRole): boolean {
  return role === 'patient';
}

/**
 * What kind of *account* somebody arriving on an invite needs, given what the
 * patient called them on it.
 *
 * These are two different questions and D30 is where they come apart. The
 * circle role says what somebody is **to one patient** — a nurse to this
 * person, a supporter to another. The account role decides which screens they
 * get and where signing in takes them, and a nurse belongs in the console
 * beside the clinicians: same application to be verified, same patient list,
 * same per-patient overview. What they may *do* there is settled by the
 * circle card and the rules, never by this.
 */
export function accountRoleFor(circleRole: 'supporter' | 'clinician' | 'nurse'): OnboardingRole {
  return circleRole === 'supporter' ? 'supporter' : 'clinician';
}

/**
 * PRD 5.5 — Firebase Auth cannot be pinned to Europe, so it holds an email
 * and nothing else. Everything identifying lives here, in Firestore, under
 * the pseudonymous uid.
 *
 * `displayName` is what the person chooses to be called. It is not a legal
 * name and nothing should treat it as one.
 */
export const userSchema = z.object({
  role: roleSchema,
  displayName: z.string().min(1).max(60),
  locale: z.enum(['nl', 'en']),
  createdAt: z.date(),
});

export type User = z.infer<typeof userSchema>;
