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

const PROJECT_ID = 'luwte-rules-test';
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
