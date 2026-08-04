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
