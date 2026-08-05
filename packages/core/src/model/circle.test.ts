import { describe, expect, it } from 'vitest';
import {
  DEFAULT_CLINICIAN_PERMISSIONS,
  DEFAULT_PERMISSIONS,
  INVITE_ALPHABET,
  INVITE_CODE_LENGTH,
  INVITE_TTL_DAYS,
  canSee,
  grantedKeys,
  inviteCode,
  inviteExpiry,
  inviteLink,
  isActive,
  isInviteUsable,
  permissionKeys,
  permissionsForRole,
} from './circle';
import { applyPendingChange, hasPendingChange, isPrescribed, needsApproval } from './medication';

describe('permissions', () => {
  it('starts a supporter on feed and calendar only', () => {
    // PRD 6.4 — an invite sent on a bad day must not hand over a clinical
    // record. Widening it is two taps; narrowing it after the fact is not.
    expect(grantedKeys(DEFAULT_PERMISSIONS)).toEqual(['feed', 'calendar']);
  });

  it('starts a clinician on the clinical picture and nothing social', () => {
    expect(grantedKeys(DEFAULT_CLINICIAN_PERMISSIONS)).toEqual(['checkins', 'medication']);
  });

  it('lists what is granted, never what is withheld', () => {
    expect(grantedKeys({ ...DEFAULT_PERMISSIONS, feed: false, calendar: false })).toEqual([]);
  });

  it('keeps the sentence order stable regardless of the object', () => {
    const all = Object.fromEntries(permissionKeys.map((key) => [key, true]));
    expect(grantedKeys(all as never)).toEqual([
      'checkins',
      'medication',
      'health',
      'feed',
      'calendar',
    ]);
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

describe('who may be offered medication', () => {
  /*
   * The rule the whole clinical fence rests on: family and friends are never
   * shown the toggle. Not hidden conditionally somewhere in a screen —
   * absent from the list a screen can render.
   */
  it('never offers medication to a supporter', () => {
    expect(permissionsForRole('supporter').map((entry) => entry.key)).toEqual([
      'checkins',
      'health',
      'feed',
      'calendar',
    ]);
  });

  it('offers it to a clinician', () => {
    expect(permissionsForRole('clinician').map((entry) => entry.key)).toContain('medication');
  });

  it('leaves every other sentence available to both', () => {
    const supporter = permissionsForRole('supporter').map((e) => e.key);
    const clinician = permissionsForRole('clinician').map((e) => e.key);
    expect(clinician.filter((key) => !supporter.includes(key))).toEqual(['medication']);
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
