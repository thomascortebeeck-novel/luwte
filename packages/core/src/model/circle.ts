import { z } from 'zod';
import type { CopyKey } from '../i18n/types';

/**
 * PRD 5.3 — the circle document *is* the access control list. Every read of
 * patient data resolves through it.
 *
 * The rule that matters most: **a circle document is writable by the patient
 * only.** A family member must never be able to widen their own access, and
 * during an episode the temptation to do so is real. Everything else in this
 * file is detail; that one line is the design.
 */

export const circleRoleSchema = z.enum(['supporter', 'clinician']);
export type CircleRole = z.infer<typeof circleRoleSchema>;

export const permissionKeys = ['checkins', 'medication', 'health', 'feed', 'calendar'] as const;
export type PermissionKey = (typeof permissionKeys)[number];

export const permissionsSchema = z.object({
  checkins: z.boolean(),
  medication: z.boolean(),
  health: z.boolean(),
  feed: z.boolean(),
  calendar: z.boolean(),
});

export type Permissions = z.infer<typeof permissionsSchema>;

/**
 * PRD 6.4 — the default on invite is feed and calendar only.
 *
 * Deliberately not everything. The person can widen it in two taps, and
 * starting narrow means an invite sent while unwell does not hand over a
 * clinical record by accident.
 */
export const DEFAULT_PERMISSIONS: Permissions = {
  checkins: false,
  medication: false,
  health: false,
  feed: true,
  calendar: true,
};

/** A clinician is invited for the clinical picture, so it starts wider. */
export const DEFAULT_CLINICIAN_PERMISSIONS: Permissions = {
  checkins: true,
  medication: true,
  health: false,
  feed: false,
  calendar: false,
};

export const circleMemberSchema = z.object({
  role: circleRoleSchema,
  /** 'broer', 'psychiater' — the person's own word for who this is. */
  relation: z.string().max(60).optional(),
  permissions: permissionsSchema,
  grantedAt: z.date(),
  /** Set on revocation. Access ends immediately; the record stays. */
  revokedAt: z.date().nullable().optional(),
});

export type CircleMember = z.infer<typeof circleMemberSchema>;

/**
 * PRD 6.4 — the permissions screen shows, per person, exactly what they can
 * see **in plain sentences, not toggle labels**. "Kan zien hoe je je voelt"
 * is a thing a person can agree to; "checkins: true" is not.
 */
export type PermissionCopy = {
  key: PermissionKey;
  sentenceKey: CopyKey;
};

export const PERMISSION_COPY: readonly PermissionCopy[] = [
  { key: 'checkins', sentenceKey: 'permCheckins' },
  { key: 'medication', sentenceKey: 'permMedication' },
  { key: 'health', sentenceKey: 'permHealth' },
  { key: 'feed', sentenceKey: 'permFeed' },
  { key: 'calendar', sentenceKey: 'permCalendar' },
];

/**
 * Which sentences a given role may be offered at all.
 *
 * Medication is a clinician's only. A supporter is never shown the toggle,
 * and the rules refuse the read even if a circle document somehow carries it
 * — what someone is prescribed is the most diagnostic thing here, and a
 * permission that is never offered cannot be granted by mistake.
 */
export function permissionsForRole(role: CircleRole): readonly PermissionCopy[] {
  return role === 'clinician'
    ? PERMISSION_COPY
    : PERMISSION_COPY.filter((entry) => entry.key !== 'medication');
}

/** The same mapping, for screens that already know which keys they want. */
export const PERMISSION_SENTENCE = Object.fromEntries(
  PERMISSION_COPY.map((entry) => [entry.key, entry.sentenceKey]),
) as Record<PermissionKey, CopyKey>;

/** Access is live only while the member has not been revoked. */
export function isActive(member: Pick<CircleMember, 'revokedAt'>): boolean {
  return member.revokedAt === null || member.revokedAt === undefined;
}

export function canSee(
  member: Pick<CircleMember, 'permissions' | 'revokedAt'>,
  key: PermissionKey,
): boolean {
  return isActive(member) && member.permissions[key] === true;
}

/** PRD 6.4 — codes expire in 7 days and are single-use. */
export const INVITE_TTL_DAYS = 7;

export const inviteSchema = z.object({
  patientId: z.string().min(1),
  role: circleRoleSchema,
  permissions: permissionsSchema,
  createdAt: z.date(),
  expiresAt: z.date(),
  usedBy: z.string().nullable().optional(),
});

export type Invite = z.infer<typeof inviteSchema>;

export function isInviteUsable(invite: Pick<Invite, 'expiresAt' | 'usedBy'>, now: Date): boolean {
  if (invite.usedBy) return false;
  return invite.expiresAt.getTime() > now.getTime();
}

export function inviteExpiry(from: Date): Date {
  return new Date(from.getTime() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000);
}

/**
 * The code *is* the capability: whoever holds it can join. So it has to be
 * unguessable — 12 characters of this alphabet is a little under 60 bits,
 * which is far past anything a family invite needs to survive.
 *
 * The alphabet leaves out 0/O/1/l/i, because a code gets read aloud across a
 * kitchen table as often as it gets tapped.
 */
export const INVITE_ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';
export const INVITE_CODE_LENGTH = 12;

/** 31 × 8. Bytes at or above this are discarded rather than folded. */
const UNBIASED_LIMIT = INVITE_ALPHABET.length * 8;

/**
 * Turns random bytes into a code, discarding the ones that would make some
 * characters likelier than others. Pure, so the randomness comes from the
 * caller and this can be tested for what it actually promises.
 */
export function inviteCode(bytes: Uint8Array): string {
  const chars: string[] = [];
  for (const byte of bytes) {
    if (byte >= UNBIASED_LIMIT) continue;
    chars.push(INVITE_ALPHABET[byte % INVITE_ALPHABET.length]!);
    if (chars.length === INVITE_CODE_LENGTH) return chars.join('');
  }
  throw new Error('inviteCode: not enough random bytes');
}

/** Where a code is redeemed. Defined once so the link and the route agree. */
export const INVITE_PATH = '/join';

export function inviteLink(origin: string, code: string): string {
  return `${origin.replace(/\/+$/, '')}${INVITE_PATH}/${code}`;
}

/**
 * The permissions that are on, in the order the sentences are shown. What a
 * member's card lists is exactly this — never the ones that are off, which
 * would read as a list of things being withheld from them.
 */
export function grantedKeys(permissions: Permissions): PermissionKey[] {
  return PERMISSION_COPY.filter((entry) => permissions[entry.key]).map((entry) => entry.key);
}
