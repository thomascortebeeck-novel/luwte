import { describe, expect, it } from 'vitest';
import {
  CLINICAL_KEYS,
  DEFAULT_CLINICIAN_PERMISSIONS,
  DEFAULT_PERMISSIONS,
  INVITE_ALPHABET,
  INVITE_CODE_LENGTH,
  INVITE_TTL_DAYS,
  canSee,
  diffPermissions,
  grantedKeys,
  inviteCode,
  inviteExpiry,
  inviteLink,
  isActive,
  isClinicalKey,
  isInviteUsable,
  isRedeemableBy,
  permissionKeys,
  permissionsForRole,
  permissionsSchema,
  widenedClinicalKeys,
} from './circle';
import { applyPendingChange, hasPendingChange, isPrescribed, needsApproval } from './medication';

describe('permissions', () => {
  it('starts a supporter on feed and calendar only', () => {
    // PRD 6.4 — an invite sent on a bad day must not hand over a clinical
    // record. Widening it is two taps; narrowing it after the fact is not.
    expect(grantedKeys(DEFAULT_PERMISSIONS)).toEqual(['feed', 'calendar']);
  });

  it('starts a clinician on the clinical picture and nothing social', () => {
    // `doses` is on because adherence is the fact they came for. They read it
    // and, by the rules, can never write it.
    expect(grantedKeys(DEFAULT_CLINICIAN_PERMISSIONS)).toEqual([
      'checkins',
      'medication',
      'doses',
    ]);
  });

  it('lists what is granted, never what is withheld', () => {
    expect(grantedKeys({ ...DEFAULT_PERMISSIONS, feed: false, calendar: false })).toEqual([]);
  });

  it('keeps the sentence order stable regardless of the object', () => {
    const all = Object.fromEntries(permissionKeys.map((key) => [key, true]));
    expect(grantedKeys(all as never)).toEqual([
      'checkins',
      'medication',
      'doses',
      'health',
      'feed',
      'calendar',
    ]);
  });

  it('reads a circle document written before doses existed as not granted', () => {
    /*
     * Every card written before D29 predates the key. Absent has to mean
     * "never granted" — the alternative is a schema that refuses to parse a
     * real document, or worse, one that defaults it on.
     */
    const old = { checkins: true, medication: true, health: false, feed: true, calendar: true };
    const parsed = permissionsSchema.safeParse(old);
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.doses).toBe(false);
  });
});

describe('revocation', () => {
  const member = { permissions: { ...DEFAULT_PERMISSIONS }, revokedAt: null };

  it('treats a member without a revocation date as live', () => {
    expect(isActive(member)).toBe(true);
    expect(isActive({ revokedAt: undefined })).toBe(true);
  });

  it('ends every permission at once, not one at a time', () => {
    const revoked = { ...member, revokedAt: new Date('2026-08-04T10:00:00Z') };
    expect(isActive(revoked)).toBe(false);
    for (const key of permissionKeys) {
      expect(canSee(revoked, key)).toBe(false);
    }
  });

  it('does not grant what was never granted', () => {
    expect(canSee(member, 'feed')).toBe(true);
    expect(canSee(member, 'checkins')).toBe(false);
  });
});

describe('invites', () => {
  const now = new Date('2026-08-04T12:00:00Z');

  it('expires seven days out', () => {
    const expires = inviteExpiry(now);
    expect(expires.toISOString()).toBe('2026-08-11T12:00:00.000Z');
    expect(isInviteUsable({ expiresAt: expires, usedBy: null }, now)).toBe(true);
  });

  it('is unusable the moment it expires', () => {
    const expires = inviteExpiry(now);
    const later = new Date(expires.getTime() + 1);
    expect(isInviteUsable({ expiresAt: expires, usedBy: null }, later)).toBe(false);
    expect(INVITE_TTL_DAYS).toBe(7);
  });

  it('is unusable once claimed, however long it has left', () => {
    expect(isInviteUsable({ expiresAt: inviteExpiry(now), usedBy: 'uid-someone' }, now)).toBe(false);
  });
});

/*
 * The difference between a link and a request.
 *
 * A link invite is a bearer token on purpose — whoever holds the code joins,
 * which is what sharing a link means. An invite issued from the directory is
 * not: nobody handed it over, the patient searched and asked, so holding the
 * code must not be enough.
 */
describe('an invite addressed to one person', () => {
  it('is redeemable by the person it names, and nobody else', () => {
    expect(isRedeemableBy({ forUid: 'uid-doctor' }, 'uid-doctor')).toBe(true);
    expect(isRedeemableBy({ forUid: 'uid-doctor' }, 'uid-someone-else')).toBe(false);
  });

  it('stays bearer when it names nobody, so an old link keeps working', () => {
    expect(isRedeemableBy({ forUid: null }, 'uid-anyone')).toBe(true);
  });
});

describe('inviteCode', () => {
  const bytes = (...values: number[]) => Uint8Array.from(values);

  it('is the agreed length', () => {
    expect(inviteCode(bytes(...Array.from({ length: 20 }, (_, i) => i)))).toHaveLength(
      INVITE_CODE_LENGTH,
    );
  });

  it('maps bytes onto the alphabet in order', () => {
    expect(inviteCode(bytes(0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11))).toBe('abcdefghjkmn');
  });

  it('uses only characters that survive being read aloud', () => {
    const code = inviteCode(bytes(...Array.from({ length: 64 }, (_, i) => (i * 7) % 256)));
    expect(code).toMatch(new RegExp(`^[${INVITE_ALPHABET}]{${INVITE_CODE_LENGTH}}$`));
    expect(INVITE_ALPHABET).not.toMatch(/[01lio]/);
  });

  it('discards the bytes that would make some characters likelier', () => {
    // 248 and 255 fold onto 'a' and 'h' if taken; they must be skipped
    // instead, or the first eight characters become 12% more common.
    const code = inviteCode(bytes(248, 255, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11));
    expect(code).toBe('abcdefghjkmn');
  });

  it('refuses to produce a short code when the bytes run out', () => {
    expect(() => inviteCode(bytes(0, 1, 2))).toThrow(/random bytes/);
  });
});

describe('who owns a medication line', () => {
  const line = {
    name: 'Quetiapine',
    dose: '200 mg',
    times: ['08:00'],
    purpose: '',
    activeFrom: new Date('2026-01-01T00:00:00Z'),
    activeTo: null,
  };

  it('treats a line the person wrote themselves as their own', () => {
    expect(isPrescribed({ ...line, prescribedBy: null })).toBe(false);
  });

  it('treats a line a clinician took over as prescribed', () => {
    expect(isPrescribed({ ...line, prescribedBy: 'uid-doctor' })).toBe(true);
  });

  it('does not treat an empty string as a prescriber', () => {
    // A blank uid would read as prescribed and lock the person out of their
    // own entry, with nobody able to edit it.
    expect(isPrescribed({ ...line, prescribedBy: '' })).toBe(false);
  });
});

/*
 * D29 — this block used to assert the opposite, and the reversal is the point
 * rather than a test that stopped being convenient.
 *
 * It asserted that a supporter is never shown the medication toggle. The
 * argument was good: a permission that is never offered cannot be granted by
 * mistake on a bad day. The argument against it was better — *the person is
 * in full control* is the deeper principle, and a blanket ban is the app
 * deciding for them. Thomas decided, 2026-08-05.
 *
 * What is tested here now is what was kept in its place.
 */
describe('who may be offered what', () => {
  it('offers every sentence to every role', () => {
    for (const role of ['supporter', 'clinician'] as const) {
      expect(permissionsForRole(role).map((entry) => entry.key)).toEqual([
        'checkins',
        'medication',
        'doses',
        'health',
        'feed',
        'calendar',
      ]);
    }
  });

  it('keeps what you take and whether you took it as separate questions', () => {
    // The reason the split exists: somebody may well want a partner to see
    // what they take and not whether they took it, and one toggle could not
    // say that.
    expect(CLINICAL_KEYS).toEqual(['medication', 'doses']);
    expect(isClinicalKey('medication')).toBe(true);
    expect(isClinicalKey('doses')).toBe(true);
    expect(isClinicalKey('feed')).toBe(false);
  });

  it('stops to confirm turning a clinical permission on', () => {
    const before = { ...DEFAULT_PERMISSIONS };
    expect(widenedClinicalKeys(before, { ...before, doses: true })).toEqual(['doses']);
    expect(widenedClinicalKeys(before, { ...before, medication: true, doses: true })).toEqual([
      'medication',
      'doses',
    ]);
  });

  it('never stops to confirm turning one off, or anything social', () => {
    /*
     * Narrowing is instant and silent. Somebody taking access away from
     * another person should never be asked whether they are sure — that is
     * the app arguing with them about their own decision.
     */
    const wide = { ...DEFAULT_PERMISSIONS, medication: true, doses: true };
    expect(widenedClinicalKeys(wide, { ...wide, medication: false })).toEqual([]);
    expect(widenedClinicalKeys(wide, wide)).toEqual([]);
    expect(widenedClinicalKeys(DEFAULT_PERMISSIONS, { ...DEFAULT_PERMISSIONS, health: true })).toEqual(
      [],
    );
  });
});

describe('the record of what was given', () => {
  it('names both directions of a change', () => {
    const before = { ...DEFAULT_PERMISSIONS, medication: true };
    const after = { ...DEFAULT_PERMISSIONS, medication: false, doses: true };
    expect(diffPermissions(before, after)).toEqual({
      granted: ['doses'],
      withdrawn: ['medication'],
    });
  });

  it('says nothing when nothing changed, so the log does not fill with noise', () => {
    expect(diffPermissions(DEFAULT_PERMISSIONS, { ...DEFAULT_PERMISSIONS })).toBeNull();
  });

  it('logs what was withdrawn as well as what was given', () => {
    // A history that only records widening would answer "what did I agree to"
    // and never "when did I stop".
    const before = { ...DEFAULT_PERMISSIONS, feed: true };
    expect(diffPermissions(before, { ...before, feed: false })).toEqual({
      granted: [],
      withdrawn: ['feed'],
    });
  });
});

describe('asking for a change to medication', () => {
  const line = {
    name: 'Quetiapine',
    dose: '200 mg',
    times: ['08:00'],
    purpose: '',
    activeFrom: new Date('2026-01-01T00:00:00Z'),
    activeTo: null,
  };

  it('needs approval only when a clinician owns it', () => {
    expect(needsApproval({ ...line, prescribedBy: 'uid-doctor' })).toBe(true);
    expect(needsApproval({ ...line, prescribedBy: null })).toBe(false);
  });

  it('turns a proposal into exactly the fields that were asked for', () => {
    expect(
      applyPendingChange({ proposedBy: 'uid-jonas', proposedAt: new Date(), dose: '100 mg' }),
    ).toEqual({ dose: '100 mg' });
  });

  it('leaves out anything not asked for, so approving changes nothing else', () => {
    const result = applyPendingChange({
      proposedBy: 'uid-jonas',
      proposedAt: new Date(),
      note: 'Ik voel me er suf van.',
    });
    expect(result).toEqual({});
  });

  it('stops the medication when that is what was asked', () => {
    const result = applyPendingChange({
      proposedBy: 'uid-jonas',
      proposedAt: new Date(),
      stopping: true,
    });
    expect(result.activeTo).toBeInstanceOf(Date);
  });

  it('knows whether something is waiting', () => {
    expect(hasPendingChange({ pendingChange: null })).toBe(false);
    expect(hasPendingChange({})).toBe(false);
    expect(
      hasPendingChange({ pendingChange: { proposedBy: 'uid-jonas', proposedAt: new Date() } }),
    ).toBe(true);
  });
});

describe('inviteLink', () => {
  it('points at the redemption route', () => {
    expect(inviteLink('https://luwte.app', 'abcdefghjkmn')).toBe(
      'https://luwte.app/join/abcdefghjkmn',
    );
  });

  it('does not double the slash when the origin carries one', () => {
    expect(inviteLink('http://localhost:5173/', 'abc')).toBe('http://localhost:5173/join/abc');
  });
});
