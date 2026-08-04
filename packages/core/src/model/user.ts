import { z } from 'zod';

export const roleSchema = z.enum(['patient', 'supporter', 'clinician', 'admin']);
export type Role = z.infer<typeof roleSchema>;

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
