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

/*
 * D29 — `medication` and `doses` are two permissions, not one.
 *
 * *What you are prescribed* and *whether you took it* are clinically
 * different questions, and a person may well want a partner to see the first
 * and not the second. Sharing one was previously impossible for family at all;
 * sharing them together would have replaced one blunt answer with another.
 */
export const permissionKeys = [
  'checkins',
  'medication',
  'doses',
  'health',
  'feed',
  'calendar',
  /*
   * The early-warning-signs plan. Deliberately **not** a clinical key: the
   * whole point of a relapse-prevention plan is that the people around you
   * know it, so putting a confirmation screen in front of sharing it would add
   * friction to the thing that makes it work. It is still logged like every
   * other change.
   */
  'plan',
] as const;
export type PermissionKey = (typeof permissionKeys)[number];

export const permissionsSchema = z.object({
  checkins: z.boolean(),
  medication: z.boolean(),
  /*
   * Defaulted rather than required, because every circle document written
   * before D29 predates the key. An absent `doses` means the person never
   * granted it, which is the safe reading and matches what the rules do with
   * a missing field.
   */
  doses: z.boolean().default(false),
  health: z.boolean(),
  feed: z.boolean(),
  calendar: z.boolean(),
  /* Defaulted for the same reason `doses` is: cards written before it exists. */
  plan: z.boolean().default(false),
});

export type Permissions = z.infer<typeof permissionsSchema>;

/**
 * The two that describe medical treatment.
 *
 * Granting one of these is a different kind of act from granting the feed, so
 * the screens confirm it and the person's own log records it. Nothing in the
 * rules keys off this list — it is what the *interface* owes somebody before
 * they widen access, not a boundary.
 */
export const CLINICAL_KEYS = ['medication', 'doses'] as const satisfies readonly PermissionKey[];

export function isClinicalKey(key: PermissionKey): boolean {
  return (CLINICAL_KEYS as readonly PermissionKey[]).includes(key);
}

/**
 * Which permissions this change turns **on** — the ones worth stopping to
 * confirm. Narrowing is instant and silent: somebody taking access away from
 * another person should never be asked whether they are sure.
 */
export function widenedClinicalKeys(before: Permissions, after: Permissions): PermissionKey[] {
  return CLINICAL_KEYS.filter((key) => after[key] === true && before[key] !== true);
}

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
  doses: false,
  health: false,
  feed: true,
  calendar: true,
  plan: false,
};

/**
 * A clinician is invited for the clinical picture, so it starts wider — and
 * `doses` is on because adherence is the fact they came for. They can read it
 * and, by the rules, can never write it.
 */
export const DEFAULT_CLINICIAN_PERMISSIONS: Permissions = {
  checkins: true,
  medication: true,
  doses: true,
  health: false,
  feed: false,
  calendar: false,
  plan: false,
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
  { key: 'doses', sentenceKey: 'permDoses' },
  { key: 'health', sentenceKey: 'permHealth' },
  { key: 'feed', sentenceKey: 'permFeed' },
  { key: 'calendar', sentenceKey: 'permCalendar' },
  { key: 'plan', sentenceKey: 'permPlan' },
];

/**
 * Which sentences a given role may be offered at all.
 *
 * **Every role may be offered every one of them** (D29). This used to hide
 * medication from a supporter, and the argument for that was good: what
 * somebody is prescribed is the most diagnostic thing here, and a permission
 * that is never offered cannot be granted by mistake on a bad day.
 *
 * The argument against it turned out to be better. *The person is in full
 * control* is the deeper principle, and a blanket ban is the app deciding for
 * them — a partner who fetches the prescriptions cannot be told to look at a
 * screen that refuses to show them. What made the ban work is kept instead of
 * the ban: **a dose still never reaches the feed**, so being allowed to look
 * is not the same as being told; **turning one on is confirmed in words**; and
 * **the change is logged where the person can read it back**.
 */
export function permissionsForRole(_role: CircleRole): readonly PermissionCopy[] {
  return PERMISSION_COPY;
}

/** The same mapping, for screens that already know which keys they want. */
export const PERMISSION_SENTENCE = Object.fromEntries(
  PERMISSION_COPY.map((entry) => [entry.key, entry.sentenceKey]),
) as Record<PermissionKey, CopyKey>;

/**
 * The same permissions, described to the person being *asked* rather than the
 * person granting.
 *
 * `PERMISSION_SENTENCE` is addressed to the patient — "Kan zien hoe je je
 * voelde" — and turns into nonsense on a clinician's own screen, where "je"
 * would mean them. These are plain noun phrases instead, which also sidesteps
 * having to pick a pronoun for somebody the app has never met.
 */
export const PERMISSION_GRANT: Record<PermissionKey, CopyKey> = {
  checkins: 'grantCheckins',
  medication: 'grantMedication',
  doses: 'grantDoses',
  health: 'grantHealth',
  feed: 'grantFeed',
  calendar: 'grantCalendar',
  plan: 'grantPlan',
};

/**
 * What turning a clinical permission on actually means, said plainly, at the
 * moment it is turned on.
 *
 * This is the honest answer to "full control on a bad day": you cannot both
 * give somebody real control and protect them from themselves, but you can
 * make sure they were told in words rather than in a toggle label — and that
 * they can see later what they agreed to.
 */
export const PERMISSION_CONFIRM: Record<'medication' | 'doses', CopyKey> = {
  medication: 'confirmMedication',
  doses: 'confirmDoses',
};

/**
 * An entry in the person's own record of who they gave what to, and when.
 *
 * **Not a security control, and it must not be mistaken for one.** Security
 * rules cannot require that changing a circle document also writes a log
 * entry, so a client that skips it leaves no trace — the boundary is the
 * circle document itself, which only the patient may write. This is a record
 * for the person, so "what did I agree to in March" has an answer that is not
 * memory.
 *
 * Append-only in the rules, because a history that can be edited answers that
 * question no better than memory does.
 */
export const permissionChangeSchema = z.object({
  memberUid: z.string().min(1),
  /** Their own word for who this is, copied at the time. Names change. */
  relation: z.string().max(60).default(''),
  granted: z.array(z.enum(permissionKeys)).default([]),
  withdrawn: z.array(z.enum(permissionKeys)).default([]),
  at: z.date(),
});

export type PermissionChange = z.infer<typeof permissionChangeSchema>;

/** What changed, in both directions. Null when nothing did — nothing to log. */
export function diffPermissions(
  before: Permissions,
  after: Permissions,
): { granted: PermissionKey[]; withdrawn: PermissionKey[] } | null {
  const granted = permissionKeys.filter((key) => after[key] === true && before[key] !== true);
  const withdrawn = permissionKeys.filter((key) => after[key] !== true && before[key] === true);
  return granted.length === 0 && withdrawn.length === 0 ? null : { granted, withdrawn };
}

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
  /**
   * When set, only this person may redeem it.
   *
   * A link invite is a bearer token by design: whoever holds the code joins,
   * which is exactly what handing someone a link means. An invite issued from
   * the clinician directory is different in kind — **nobody handed it over**.
   * The person searched, found a name, and asked. So the code alone must not
   * be enough, or an invite meant for one psychiatrist would admit whoever
   * came across it.
   */
  forUid: z.string().nullable().default(null),
});

export type Invite = z.infer<typeof inviteSchema>;

export function isInviteUsable(invite: Pick<Invite, 'expiresAt' | 'usedBy'>, now: Date): boolean {
  if (invite.usedBy) return false;
  return invite.expiresAt.getTime() > now.getTime();
}

/**
 * Whether this person is the one the invite was issued for.
 *
 * An unaddressed invite is redeemable by anyone holding the code; an addressed
 * one only by its recipient. The rules enforce this — nothing here is a
 * boundary — but the screens ask first so a refusal always means a real bug.
 */
export function isRedeemableBy(invite: Pick<Invite, 'forUid'>, uid: string): boolean {
  return invite.forUid == null || invite.forUid === uid;
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
