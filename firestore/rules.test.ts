import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';

/**
 * The security rules are the access control design, so they are tested
 * directly rather than inferred from the screens that use them.
 *
 * Requires the Firestore emulator. Run with:
 *   pnpm test:rules
 */

// `demo-` guarantees the emulator never reaches a live project.
const PROJECT_ID = 'demo-luwte-rules';
const JONAS = 'uid-jonas';
const OTHER = 'uid-someone-else';

let testEnv: RulesTestEnvironment;

const validConsent = {
  version: '2026-08-04',
  grants: { essential: true, healthData: true, reminders: false },
  locale: 'nl',
  grantedAt: new Date(),
};

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      host: '127.0.0.1',
      port: 8080,
      rules: readFileSync(join(process.cwd(), 'firestore', 'firestore.rules'), 'utf8'),
    },
  });
});

afterAll(async () => {
  await testEnv?.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
});

const asJonas = () => testEnv.authenticatedContext(JONAS).firestore();
const asOther = () => testEnv.authenticatedContext(OTHER).firestore();
const asStranger = () => testEnv.unauthenticatedContext().firestore();

describe('users/{uid}', () => {
  it('lets a person create and read their own document', async () => {
    const db = asJonas();
    await assertSucceeds(
      setDoc(doc(db, 'users', JONAS), {
        role: 'patient',
        displayName: 'Jonas',
        locale: 'nl',
        createdAt: new Date(),
      }),
    );
    await assertSucceeds(getDoc(doc(db, 'users', JONAS)));
  });

  it('stops another signed-in person reading it', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'users', JONAS), { displayName: 'Jonas' });
    });
    await assertFails(getDoc(doc(asOther(), 'users', JONAS)));
  });

  it('stops another signed-in person writing it', async () => {
    await assertFails(setDoc(doc(asOther(), 'users', JONAS), { displayName: 'not me' }));
  });

  it('stops an unauthenticated reader', async () => {
    await assertFails(getDoc(doc(asStranger(), 'users', JONAS)));
  });

  it('refuses client-side deletion, because deletion must cascade', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'users', JONAS), { displayName: 'Jonas' });
    });
    await assertFails(deleteDoc(doc(asJonas(), 'users', JONAS)));
  });
});

describe('patients/{patientId}', () => {
  it('lets a person create, read and update their own record', async () => {
    const db = asJonas();
    await assertSucceeds(
      setDoc(doc(db, 'patients', JONAS), {
        displayName: 'Jonas',
        checkinHour: 20,
        timezone: 'Europe/Brussels',
        onboarded: false,
        createdAt: new Date(),
      }),
    );
    await assertSucceeds(getDoc(doc(db, 'patients', JONAS)));
    await assertSucceeds(updateDoc(doc(db, 'patients', JONAS), { onboarded: true }));
  });

  it('stops another signed-in person reading it — the row that matters', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'patients', JONAS), { displayName: 'Jonas' });
    });
    await assertFails(getDoc(doc(asOther(), 'patients', JONAS)));
  });

  it('stops someone creating a record under another person id', async () => {
    await assertFails(
      setDoc(doc(asOther(), 'patients', JONAS), { displayName: 'not me', onboarded: true }),
    );
  });

  it('stops an unauthenticated reader', async () => {
    await assertFails(getDoc(doc(asStranger(), 'patients', JONAS)));
  });
});

describe('patients/{patientId}/consents', () => {
  it('lets a person log their own consent', async () => {
    await assertSucceeds(
      setDoc(doc(asJonas(), 'patients', JONAS, 'consents', 'c1'), validConsent),
    );
  });

  it('refuses a consent record that does not grant the required items', async () => {
    await assertFails(
      setDoc(doc(asJonas(), 'patients', JONAS, 'consents', 'c1'), {
        ...validConsent,
        grants: { essential: true, healthData: false, reminders: false },
      }),
    );
  });

  it('refuses a consent record with no version', async () => {
    const { version: _version, ...withoutVersion } = validConsent;
    await assertFails(
      setDoc(doc(asJonas(), 'patients', JONAS, 'consents', 'c1'), withoutVersion),
    );
  });

  it('refuses deletion, because a consent log that can be erased is not a log', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'patients', JONAS, 'consents', 'c1'), validConsent);
    });
    await assertFails(deleteDoc(doc(asJonas(), 'patients', JONAS, 'consents', 'c1')));
  });

  it('allows withdrawal as an update rather than a delete', async () => {
    await setDoc(doc(asJonas(), 'patients', JONAS, 'consents', 'c1'), validConsent);
    await assertSucceeds(
      updateDoc(doc(asJonas(), 'patients', JONAS, 'consents', 'c1'), {
        withdrawnAt: new Date(),
      }),
    );
  });

  it("stops another person reading someone's consent history", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'patients', JONAS, 'consents', 'c1'), validConsent);
    });
    await assertFails(getDoc(doc(asOther(), 'patients', JONAS, 'consents', 'c1')));
  });
});

describe('patients/{patientId}/checkins', () => {
  const checkin = {
    date: '2026-08-04',
    mood: 4,
    energy: 3,
    sleepHours: 7,
    sleepRested: 4,
    anxiety: 5,
    flatness: 2,
    source: 'manual',
  };

  it('lets a person write their own day', async () => {
    await assertSucceeds(
      setDoc(doc(asJonas(), 'patients', JONAS, 'checkins', '2026-08-04'), checkin),
    );
  });

  it('refuses a document whose id does not match its date', async () => {
    // This is what keeps one-per-day idempotent when an offline write syncs.
    await assertFails(
      setDoc(doc(asJonas(), 'patients', JONAS, 'checkins', '2026-08-05'), checkin),
    );
  });

  it('stops another signed-in person reading a check-in', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'patients', JONAS, 'checkins', '2026-08-04'), checkin);
    });
    await assertFails(getDoc(doc(asOther(), 'patients', JONAS, 'checkins', '2026-08-04')));
  });

  it('stops another signed-in person writing one', async () => {
    await assertFails(
      setDoc(doc(asOther(), 'patients', JONAS, 'checkins', '2026-08-04'), checkin),
    );
  });

  it('refuses deletion, so a day cannot silently disappear', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'patients', JONAS, 'checkins', '2026-08-04'), checkin);
    });
    await assertFails(deleteDoc(doc(asJonas(), 'patients', JONAS, 'checkins', '2026-08-04')));
  });

  it('allows an edit on the same day', async () => {
    await setDoc(doc(asJonas(), 'patients', JONAS, 'checkins', '2026-08-04'), checkin);
    await assertSucceeds(
      updateDoc(doc(asJonas(), 'patients', JONAS, 'checkins', '2026-08-04'), { mood: 5 }),
    );
  });
});

describe('patients/{patientId}/weekly', () => {
  const weekly = { restlessness: 3, stiffness: 2, sedation: 5, hopelessness: 4 };

  it('lets a person write their own weekly items', async () => {
    await assertSucceeds(
      setDoc(doc(asJonas(), 'patients', JONAS, 'weekly', '2026-W32'), weekly),
    );
  });

  it("stops another person reading someone's weekly items", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'patients', JONAS, 'weekly', '2026-W32'), weekly);
    });
    await assertFails(getDoc(doc(asOther(), 'patients', JONAS, 'weekly', '2026-W32')));
  });

  it('refuses deletion', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'patients', JONAS, 'weekly', '2026-W32'), weekly);
    });
    await assertFails(deleteDoc(doc(asJonas(), 'patients', JONAS, 'weekly', '2026-W32')));
  });
});

describe('patients/{patientId}/medications', () => {
  const medication = {
    name: 'Quetiapine',
    dose: '200 mg',
    times: ['08:00', '20:00'],
    purpose: 'Om je gedachten rustiger te maken.',
    activeFrom: new Date(),
    activeTo: null,
    changeLog: [],
  };

  it('lets a person keep their own medication list', async () => {
    await assertSucceeds(
      setDoc(doc(asJonas(), 'patients', JONAS, 'medications', 'med1'), medication),
    );
  });

  it("stops another signed-in person reading someone's medication", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'patients', JONAS, 'medications', 'med1'), medication);
    });
    await assertFails(getDoc(doc(asOther(), 'patients', JONAS, 'medications', 'med1')));
  });

  it('refuses deletion, because it would erase the history of taking it', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'patients', JONAS, 'medications', 'med1'), medication);
    });
    await assertFails(deleteDoc(doc(asJonas(), 'patients', JONAS, 'medications', 'med1')));
  });

  it('allows stopping a medication by setting activeTo', async () => {
    await setDoc(doc(asJonas(), 'patients', JONAS, 'medications', 'med1'), medication);
    await assertSucceeds(
      updateDoc(doc(asJonas(), 'patients', JONAS, 'medications', 'med1'), {
        activeTo: new Date(),
      }),
    );
  });
});

describe('patients/{patientId}/doses', () => {
  const dose = { medId: 'med1', status: 'taken', takenAt: new Date() };

  it('lets a person tick their own dose', async () => {
    await assertSucceeds(
      setDoc(doc(asJonas(), 'patients', JONAS, 'doses', '2026-08-04_med1_0800'), dose),
    );
  });

  it('stops another person reading or writing it', async () => {
    await assertFails(
      setDoc(doc(asOther(), 'patients', JONAS, 'doses', '2026-08-04_med1_0800'), dose),
    );
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'patients', JONAS, 'doses', '2026-08-04_med1_0800'), dose);
    });
    await assertFails(getDoc(doc(asOther(), 'patients', JONAS, 'doses', '2026-08-04_med1_0800')));
  });

  it('refuses deletion', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'patients', JONAS, 'doses', '2026-08-04_med1_0800'), dose);
    });
    await assertFails(
      deleteDoc(doc(asJonas(), 'patients', JONAS, 'doses', '2026-08-04_med1_0800')),
    );
  });
});

/**
 * PRD 5.3 — the circle document is the access control list, and these are the
 * tests that decide whether that sentence is true.
 */
describe('the circle as an access control list', () => {
  const seedCircle = (permissions: Record<string, boolean>, revokedAt: Date | null = null) =>
    testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'patients', JONAS, 'circle', OTHER), {
        role: 'supporter',
        relation: 'broer',
        permissions: {
          checkins: false,
          medication: false,
          health: false,
          feed: false,
          calendar: false,
          ...permissions,
        },
        grantedAt: new Date(),
        revokedAt,
      });
      await setDoc(ctx.firestore().doc(`patients/${JONAS}/checkins/2026-08-04`), {
        date: '2026-08-04',
        mood: 4,
      });
      await setDoc(ctx.firestore().doc(`patients/${JONAS}/medications/med1`), {
        name: 'Quetiapine',
      });
    });

  it('lets a granted supporter read the check-ins they were granted', async () => {
    await seedCircle({ checkins: true });
    await assertSucceeds(getDoc(doc(asOther(), 'patients', JONAS, 'checkins', '2026-08-04')));
  });

  it('refuses the same supporter the medication they were not granted', async () => {
    // Per-key, not all-or-nothing. This is the whole point of five toggles.
    await seedCircle({ checkins: true });
    await assertFails(getDoc(doc(asOther(), 'patients', JONAS, 'medications', 'med1')));
  });

  it('refuses a circle member with no permissions at all', async () => {
    await seedCircle({});
    await assertFails(getDoc(doc(asOther(), 'patients', JONAS, 'checkins', '2026-08-04')));
  });

  it('cuts off access the moment the member is revoked', async () => {
    await seedCircle({ checkins: true }, new Date());
    await assertFails(getDoc(doc(asOther(), 'patients', JONAS, 'checkins', '2026-08-04')));
  });

  it('refuses someone who is not in the circle at all', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(ctx.firestore().doc(`patients/${JONAS}/checkins/2026-08-04`), {
        date: '2026-08-04',
        mood: 4,
      });
    });
    await assertFails(getDoc(doc(asOther(), 'patients', JONAS, 'checkins', '2026-08-04')));
  });

  it('lets a member see their own entry, so they know what they were granted', async () => {
    await seedCircle({ feed: true });
    await assertSucceeds(getDoc(doc(asOther(), 'patients', JONAS, 'circle', OTHER)));
  });

  it('NEVER lets a member widen their own access', async () => {
    // The rule that matters most. During an episode the temptation is real.
    await seedCircle({ feed: true });
    await assertFails(
      updateDoc(doc(asOther(), 'patients', JONAS, 'circle', OTHER), {
        'permissions.checkins': true,
      }),
    );
  });

  it('never lets a member un-revoke themselves', async () => {
    await seedCircle({ checkins: true }, new Date());
    await assertFails(
      updateDoc(doc(asOther(), 'patients', JONAS, 'circle', OTHER), { revokedAt: null }),
    );
  });

  it('never lets a stranger add themselves to the circle', async () => {
    await assertFails(
      setDoc(doc(asOther(), 'patients', JONAS, 'circle', OTHER), {
        role: 'supporter',
        permissions: {
          checkins: true,
          medication: true,
          health: true,
          feed: true,
          calendar: true,
        },
        grantedAt: new Date(),
        revokedAt: null,
      }),
    );
  });

  it('never lets a member read someone else’s entry in the same circle', async () => {
    await seedCircle({ feed: true });
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(ctx.firestore().doc(`patients/${JONAS}/circle/uid-third-party`), {
        role: 'supporter',
        permissions: { checkins: true, medication: false, health: false, feed: false, calendar: false },
        grantedAt: new Date(),
        revokedAt: null,
      });
    });
    await assertFails(getDoc(doc(asOther(), 'patients', JONAS, 'circle', 'uid-third-party')));
  });

  it('lets the patient grant, narrow and revoke', async () => {
    const db = asJonas();
    await assertSucceeds(
      setDoc(doc(db, 'patients', JONAS, 'circle', OTHER), {
        role: 'supporter',
        permissions: { checkins: false, medication: false, health: false, feed: true, calendar: true },
        grantedAt: new Date(),
        revokedAt: null,
      }),
    );
    await assertSucceeds(
      updateDoc(doc(db, 'patients', JONAS, 'circle', OTHER), { 'permissions.checkins': true }),
    );
    await assertSucceeds(
      updateDoc(doc(db, 'patients', JONAS, 'circle', OTHER), { revokedAt: new Date() }),
    );
  });

  it('refuses deletion, so who once had access stays on the record', async () => {
    await seedCircle({ feed: true });
    await assertFails(deleteDoc(doc(asJonas(), 'patients', JONAS, 'circle', OTHER)));
  });

  it('does not let a granted supporter write the check-in itself', async () => {
    // Reading how someone felt is one thing. Authoring it is another.
    await seedCircle({ checkins: true });
    await assertFails(
      setDoc(doc(asOther(), 'patients', JONAS, 'checkins', '2026-08-05'), {
        date: '2026-08-05',
        mood: 7,
      }),
    );
  });
});

/**
 * PRD 6.4 — redeeming an invite is the one way a circle entry appears
 * without the patient writing it. These tests are what stop it becoming a
 * back door into someone's health record.
 */
describe('invites and redemption', () => {
  const soon = () => new Date(Date.now() + 7 * 24 * 3600 * 1000);
  const feedOnly = {
    checkins: false,
    medication: false,
    health: false,
    feed: true,
    calendar: true,
  };

  const seedInvite = (overrides: Record<string, unknown> = {}) =>
    testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'invites', 'CODE1'), {
        patientId: JONAS,
        role: 'supporter',
        permissions: feedOnly,
        createdAt: new Date(),
        expiresAt: soon(),
        usedBy: null,
        ...overrides,
      });
    });

  const entry = (overrides: Record<string, unknown> = {}) => ({
    inviteCode: 'CODE1',
    role: 'supporter',
    permissions: feedOnly,
    grantedAt: new Date(),
    revokedAt: null,
    ...overrides,
  });

  it('lets someone join with a valid invite', async () => {
    await seedInvite();
    await assertSucceeds(setDoc(doc(asOther(), 'patients', JONAS, 'circle', OTHER), entry()));
  });

  it('REFUSES a redeemer who grants themselves more than the invite carried', async () => {
    // The escalation that matters: a valid feed-only invite, used to write a
    // card that sees everything.
    await seedInvite();
    await assertFails(
      setDoc(
        doc(asOther(), 'patients', JONAS, 'circle', OTHER),
        entry({
          permissions: {
            checkins: true,
            medication: true,
            health: true,
            feed: true,
            calendar: true,
          },
        }),
      ),
    );
  });

  it('refuses a redeemer who promotes themselves to clinician', async () => {
    await seedInvite();
    await assertFails(
      setDoc(doc(asOther(), 'patients', JONAS, 'circle', OTHER), entry({ role: 'clinician' })),
    );
  });

  it('refuses an expired invite', async () => {
    await seedInvite({ expiresAt: new Date(Date.now() - 1000) });
    await assertFails(setDoc(doc(asOther(), 'patients', JONAS, 'circle', OTHER), entry()));
  });

  it('refuses an invite already used by somebody else', async () => {
    await seedInvite({ usedBy: 'uid-someone-first' });
    await assertFails(setDoc(doc(asOther(), 'patients', JONAS, 'circle', OTHER), entry()));
  });

  it('refuses an invite that names a different patient', async () => {
    await seedInvite({ patientId: 'uid-another-patient' });
    await assertFails(setDoc(doc(asOther(), 'patients', JONAS, 'circle', OTHER), entry()));
  });

  it('refuses a made-up invite code', async () => {
    await assertFails(
      setDoc(doc(asOther(), 'patients', JONAS, 'circle', OTHER), entry({ inviteCode: 'NOPE' })),
    );
  });

  it('refuses a redeemer writing a card for somebody other than themselves', async () => {
    await seedInvite();
    await assertFails(
      setDoc(doc(asOther(), 'patients', JONAS, 'circle', 'uid-third-party'), entry()),
    );
  });

  it('refuses a redeemer who arrives pre-revoked, which would hide them', async () => {
    await seedInvite();
    await assertFails(
      setDoc(doc(asOther(), 'patients', JONAS, 'circle', OTHER), entry({ revokedAt: new Date() })),
    );
  });

  it('lets the patient issue an invite, and nobody issue one for someone else', async () => {
    await assertSucceeds(
      setDoc(doc(asJonas(), 'invites', 'MINE'), {
        patientId: JONAS,
        role: 'supporter',
        permissions: feedOnly,
        createdAt: new Date(),
        expiresAt: soon(),
        usedBy: null,
      }),
    );
    await assertFails(
      setDoc(doc(asOther(), 'invites', 'FORGED'), {
        patientId: JONAS,
        role: 'clinician',
        permissions: feedOnly,
        createdAt: new Date(),
        expiresAt: soon(),
        usedBy: null,
      }),
    );
  });

  it('lets a redeemer claim an invite but not rewrite what it grants', async () => {
    await seedInvite();
    await assertSucceeds(updateDoc(doc(asOther(), 'invites', 'CODE1'), { usedBy: OTHER }));

    await seedInvite();
    await assertFails(
      updateDoc(doc(asOther(), 'invites', 'CODE1'), {
        usedBy: OTHER,
        permissions: {
          checkins: true,
          medication: true,
          health: true,
          feed: true,
          calendar: true,
        },
      }),
    );
  });

  it('lets the patient withdraw an invite', async () => {
    await seedInvite();
    await assertSucceeds(deleteDoc(doc(asJonas(), 'invites', 'CODE1')));
  });

  it('does not let anyone else delete it', async () => {
    await seedInvite();
    await assertFails(deleteDoc(doc(asOther(), 'invites', 'CODE1')));
  });
});

describe('everything else', () => {
  it('is denied by default', async () => {
    await assertFails(getDoc(doc(asJonas(), 'checkins', 'anything')));
    await assertFails(setDoc(doc(asJonas(), 'invites', 'code'), { patientId: JONAS }));
    await assertFails(setDoc(doc(asJonas(), 'clinicians', JONAS), { verified: true }));
  });

  it('does not let a patient mark themselves a verified clinician', async () => {
    await assertFails(setDoc(doc(asJonas(), 'clinicians', JONAS), { verified: true }));
  });
});
