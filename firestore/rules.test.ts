import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  collection,
  collectionGroup,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
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
/** A clinician the admin has verified. Only the admin can create this. */
const DOCTOR = 'uid-doctor';

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
const asDoctor = () => testEnv.authenticatedContext(DOCTOR).firestore();
const asStranger = () => testEnv.unauthenticatedContext().firestore();

/** The admin marks a clinician verified out of band. Nobody else can. */
const verifyClinician = (uid: string) =>
  testEnv.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'clinicians', uid), { verifiedAt: new Date() });
  });

/** The patient puts them in the circle, with medication granted. */
const seedClinicianCircle = (
  uid: string,
  overrides: Record<string, unknown> = {},
) =>
  testEnv.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'patients', JONAS, 'circle', uid), {
      memberUid: uid,
      role: 'clinician',
      permissions: {
        checkins: true,
        medication: true,
        health: false,
        feed: false,
        calendar: false,
      },
      grantedAt: new Date(),
      revokedAt: null,
      ...overrides,
    });
  });

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

/**
 * PRD 5.3 and 6.7 — medication ownership moves to the clinician.
 *
 * The line that must never blur runs through this block: *what you are
 * prescribed* is a clinical decision and a verified clinician owns it, while
 * *whether you took it* is the patient's own record and nobody may write it
 * for them. The doses block below is the other half of the same sentence.
 */
describe('medication ownership', () => {
  const medication = {
    name: 'Quetiapine',
    dose: '200 mg',
    times: ['08:00', '20:00'],
    purpose: 'Om je gedachten rustiger te maken.',
    activeFrom: new Date(),
    activeTo: null,
    changeLog: [],
    prescribedBy: null,
  };

  const seedMedication = (overrides: Record<string, unknown> = {}) =>
    testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'patients', JONAS, 'medications', 'med1'), {
        ...medication,
        ...overrides,
      });
    });

  const asDoctorWriting = () => doc(asDoctor(), 'patients', JONAS, 'medications', 'med1');

  it('lets a verified clinician the patient invited write the list', async () => {
    await verifyClinician(DOCTOR);
    await seedClinicianCircle(DOCTOR);
    await assertSucceeds(setDoc(asDoctorWriting(), { ...medication, prescribedBy: DOCTOR }));
  });

  /*
   * Three separate conditions, and removing any one of them opens a hole.
   * Each of the next three tests removes exactly one.
   */
  it('REFUSES a clinician the admin never verified', async () => {
    await seedClinicianCircle(DOCTOR);
    await assertFails(setDoc(asDoctorWriting(), { ...medication, prescribedBy: DOCTOR }));
  });

  it('REFUSES a verified clinician the patient never invited', async () => {
    await verifyClinician(DOCTOR);
    await assertFails(setDoc(asDoctorWriting(), { ...medication, prescribedBy: DOCTOR }));
  });

  it('REFUSES a verified clinician the patient did not grant medication to', async () => {
    await verifyClinician(DOCTOR);
    await seedClinicianCircle(DOCTOR, {
      permissions: {
        checkins: true,
        medication: false,
        health: false,
        feed: false,
        calendar: false,
      },
    });
    await assertFails(setDoc(asDoctorWriting(), { ...medication, prescribedBy: DOCTOR }));
  });

  it('REFUSES a verified clinician whose access was stopped', async () => {
    await verifyClinician(DOCTOR);
    await seedClinicianCircle(DOCTOR, { revokedAt: new Date() });
    await assertFails(setDoc(asDoctorWriting(), { ...medication, prescribedBy: DOCTOR }));
  });

  it('REFUSES a verified clinician invited only as a supporter', async () => {
    // The patient chose the word. Being a doctor somewhere is not the same as
    // being *this* person's doctor.
    await verifyClinician(DOCTOR);
    await seedClinicianCircle(DOCTOR, { role: 'supporter' });
    await assertFails(setDoc(asDoctorWriting(), { ...medication, prescribedBy: DOCTOR }));
  });

  it('REFUSES a clinician writing the list under another uid', async () => {
    await verifyClinician(DOCTOR);
    await seedClinicianCircle(DOCTOR);
    await assertFails(setDoc(asDoctorWriting(), { ...medication, prescribedBy: OTHER }));
  });

  it('still lets the patient keep a list of their own', async () => {
    await assertSucceeds(
      setDoc(doc(asJonas(), 'patients', JONAS, 'medications', 'med2'), medication),
    );
  });

  it('REFUSES the patient claiming a medication was prescribed', async () => {
    // Otherwise the patient could author provenance, and a list that says
    // "your doctor prescribed this" would not be trustworthy.
    await assertFails(
      setDoc(doc(asJonas(), 'patients', JONAS, 'medications', 'med3'), {
        ...medication,
        prescribedBy: DOCTOR,
      }),
    );
  });

  it('REFUSES the patient editing what a clinician prescribed', async () => {
    await seedMedication({ prescribedBy: DOCTOR });
    await assertFails(
      updateDoc(doc(asJonas(), 'patients', JONAS, 'medications', 'med1'), { dose: '400 mg' }),
    );
  });

  it('REFUSES the patient stopping what a clinician prescribed', async () => {
    await seedMedication({ prescribedBy: DOCTOR });
    await assertFails(
      updateDoc(doc(asJonas(), 'patients', JONAS, 'medications', 'med1'), { activeTo: new Date() }),
    );
  });

  it('REFUSES the patient taking ownership of their own entry away from a clinician', async () => {
    await seedMedication({ prescribedBy: DOCTOR });
    await assertFails(
      updateDoc(doc(asJonas(), 'patients', JONAS, 'medications', 'med1'), { prescribedBy: null }),
    );
  });

  it('lets a clinician take over an entry the patient wrote first', async () => {
    // The common case: the list exists before the psychiatrist has an account.
    await verifyClinician(DOCTOR);
    await seedClinicianCircle(DOCTOR);
    await seedMedication();
    await assertSucceeds(
      updateDoc(doc(asDoctor(), 'patients', JONAS, 'medications', 'med1'), {
        dose: '300 mg',
        prescribedBy: DOCTOR,
        changeLog: [{ at: new Date(), field: 'dose', from: '200 mg', to: '300 mg', by: DOCTOR }],
      }),
    );
  });

  it('REFUSES anyone shortening the change log', async () => {
    // The log is what draws the vertical rules on the chart. Erasing an entry
    // would erase a dose change that happened.
    await verifyClinician(DOCTOR);
    await seedClinicianCircle(DOCTOR);
    await seedMedication({
      prescribedBy: DOCTOR,
      changeLog: [
        { at: new Date(), field: 'dose', from: '100 mg', to: '200 mg', by: DOCTOR },
        { at: new Date(), field: 'times', from: '08:00', to: '08:00, 20:00', by: DOCTOR },
      ],
    });
    await assertFails(
      updateDoc(doc(asDoctor(), 'patients', JONAS, 'medications', 'med1'), { changeLog: [] }),
    );
  });

  /*
   * The other half of the sentence. Adherence is never recorded on someone
   * else's behalf, not even by the person who prescribed the medication.
   */
  it('REFUSES even a verified prescribing clinician ticking a dose', async () => {
    await verifyClinician(DOCTOR);
    await seedClinicianCircle(DOCTOR);
    await assertFails(
      setDoc(doc(asDoctor(), 'patients', JONAS, 'doses', '2026-08-04_med1_0800'), {
        medId: 'med1',
        status: 'taken',
        takenAt: new Date(),
      }),
    );
  });

  it('lets that same clinician read whether the dose was taken', async () => {
    await verifyClinician(DOCTOR);
    await seedClinicianCircle(DOCTOR);
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'patients', JONAS, 'doses', '2026-08-04_med1_0800'), {
        medId: 'med1',
        status: 'taken',
      });
    });
    await assertSucceeds(
      getDoc(doc(asDoctor(), 'patients', JONAS, 'doses', '2026-08-04_med1_0800')),
    );
  });
});

/*
 * PRD 6.3 — a supporter may offer something, never place it. This block is
 * where "family wanting to help and a person needing to control their own
 * day" is settled by the database rather than by the app being polite.
 */
describe('patients/{patientId}/activities', () => {
  const activity = (overrides: Record<string, unknown> = {}) => ({
    title: 'Koffie',
    date: '2026-08-04',
    startTime: '10:00',
    withPerson: '',
    createdBy: JONAS,
    status: 'accepted',
    recurrence: null,
    ...overrides,
  });

  const grantCalendar = (extra: Record<string, boolean> = {}) =>
    testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'patients', JONAS, 'circle', OTHER), {
        memberUid: OTHER,
        role: 'supporter',
        permissions: {
          checkins: false,
          medication: false,
          health: false,
          feed: true,
          calendar: true,
          ...extra,
        },
        grantedAt: new Date(),
        revokedAt: null,
      });
    });

  const seedActivity = (overrides: Record<string, unknown> = {}) =>
    testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'patients', JONAS, 'activities', 'act1'), activity(overrides));
    });

  it('lets the patient plan their own day', async () => {
    await assertSucceeds(
      setDoc(doc(asJonas(), 'patients', JONAS, 'activities', 'act1'), activity()),
    );
  });

  it('lets a supporter with calendar suggest something', async () => {
    await grantCalendar();
    await assertSucceeds(
      setDoc(
        doc(asOther(), 'patients', JONAS, 'activities', 'act2'),
        activity({ status: 'suggested', createdBy: OTHER }),
      ),
    );
  });

  it('REFUSES a supporter putting something straight on the calendar', async () => {
    // The whole design. An offer is not an entry.
    await grantCalendar();
    await assertFails(
      setDoc(
        doc(asOther(), 'patients', JONAS, 'activities', 'act2'),
        activity({ status: 'accepted', createdBy: OTHER }),
      ),
    );
  });

  it('REFUSES a supporter suggesting in somebody else’s name', async () => {
    await grantCalendar();
    await assertFails(
      setDoc(
        doc(asOther(), 'patients', JONAS, 'activities', 'act2'),
        activity({ status: 'suggested', createdBy: JONAS }),
      ),
    );
  });

  it('REFUSES a supporter accepting their own suggestion', async () => {
    await grantCalendar();
    await seedActivity({ status: 'suggested', createdBy: OTHER });
    await assertFails(
      updateDoc(doc(asOther(), 'patients', JONAS, 'activities', 'act1'), { status: 'accepted' }),
    );
  });

  it('REFUSES a supporter editing what the patient planned', async () => {
    await grantCalendar();
    await seedActivity();
    await assertFails(
      updateDoc(doc(asOther(), 'patients', JONAS, 'activities', 'act1'), { title: 'Iets anders' }),
    );
  });

  it('REFUSES a supporter without the calendar permission suggesting anything', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'patients', JONAS, 'circle', OTHER), {
        memberUid: OTHER,
        role: 'supporter',
        permissions: {
          checkins: true,
          medication: false,
          health: false,
          feed: true,
          calendar: false,
        },
        grantedAt: new Date(),
        revokedAt: null,
      });
    });
    await assertFails(
      setDoc(
        doc(asOther(), 'patients', JONAS, 'activities', 'act2'),
        activity({ status: 'suggested', createdBy: OTHER }),
      ),
    );
  });

  it('lets a supporter read what was accepted', async () => {
    await grantCalendar();
    await seedActivity();
    await assertSucceeds(getDoc(doc(asOther(), 'patients', JONAS, 'activities', 'act1')));
  });

  /*
   * "Declining is silent; the suggester is not notified of a decline."
   * Enforced rather than merely intended: they cannot read it at all, so
   * there is nothing to poll for and nothing to infer.
   */
  it('REFUSES a supporter reading an activity that was declined', async () => {
    await grantCalendar();
    await seedActivity({ status: 'declined', createdBy: OTHER });
    await assertFails(getDoc(doc(asOther(), 'patients', JONAS, 'activities', 'act1')));
  });

  it('REFUSES a listing that would reveal a decline', async () => {
    await grantCalendar();
    await seedActivity({ status: 'declined', createdBy: OTHER });
    await assertFails(getDocs(collection(asOther(), 'patients', JONAS, 'activities')));
  });

  it('lets a supporter list what is not declined', async () => {
    await grantCalendar();
    await seedActivity();
    await assertSucceeds(
      getDocs(
        query(
          collection(asOther(), 'patients', JONAS, 'activities'),
          where('status', 'in', ['suggested', 'accepted']),
        ),
      ),
    );
  });

  it('lets the patient see everything, declines included', async () => {
    await seedActivity({ status: 'declined' });
    await assertSucceeds(getDocs(collection(asJonas(), 'patients', JONAS, 'activities')));
  });

  it('refuses deletion, so what was offered stays on the record', async () => {
    await seedActivity();
    await assertFails(deleteDoc(doc(asJonas(), 'patients', JONAS, 'activities', 'act1')));
  });

  it('keeps a stranger out entirely', async () => {
    await seedActivity();
    await assertFails(getDoc(doc(asOther(), 'patients', JONAS, 'activities', 'act1')));
    await assertFails(
      setDoc(doc(asOther(), 'patients', JONAS, 'activities', 'act3'), activity()),
    );
  });
});

describe('patients/{patientId}/completions', () => {
  const completion = {
    activityId: 'act1',
    date: '2026-08-04',
    completedAt: new Date(),
    pleasure: 5,
    mastery: 3,
    postedToFeed: false,
  };

  it('lets a person record how it went', async () => {
    await assertSucceeds(
      setDoc(doc(asJonas(), 'patients', JONAS, 'completions', 'act1_2026-08-04'), completion),
    );
  });

  /*
   * Pleasure and mastery are someone rating their own day. A supporter with
   * the calendar permission can see what was planned; what the person made of
   * it is not part of that.
   */
  it('REFUSES even a supporter with calendar reading the ratings', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'patients', JONAS, 'circle', OTHER), {
        memberUid: OTHER,
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
      });
      await setDoc(
        doc(ctx.firestore(), 'patients', JONAS, 'completions', 'act1_2026-08-04'),
        completion,
      );
    });
    await assertFails(
      getDoc(doc(asOther(), 'patients', JONAS, 'completions', 'act1_2026-08-04')),
    );
  });

  it('REFUSES anyone recording a completion on somebody else’s behalf', async () => {
    await assertFails(
      setDoc(doc(asOther(), 'patients', JONAS, 'completions', 'act1_2026-08-04'), completion),
    );
  });
});

/*
 * PRD 6.4 — the feed is the one place a circle member authors anything, and
 * the only warmth this product carries. What they may write is fenced tightly
 * even so.
 */
describe('patients/{patientId}/posts', () => {
  const post = {
    activityId: 'act1',
    title: 'Samen wandelen',
    text: '',
    createdAt: new Date(),
  };

  const grantFeed = (feed = true) =>
    testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'patients', JONAS, 'circle', OTHER), {
        memberUid: OTHER,
        role: 'supporter',
        permissions: {
          checkins: false,
          medication: false,
          health: false,
          feed,
          calendar: true,
        },
        grantedAt: new Date(),
        revokedAt: null,
      });
    });

  const seedPost = () =>
    testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'patients', JONAS, 'posts', 'post1'), post);
    });

  it('lets the patient share something', async () => {
    await assertSucceeds(setDoc(doc(asJonas(), 'patients', JONAS, 'posts', 'post1'), post));
  });

  it('REFUSES anyone else posting as the patient', async () => {
    await grantFeed();
    await assertFails(setDoc(doc(asOther(), 'patients', JONAS, 'posts', 'post2'), post));
  });

  it('lets a member granted the feed read it', async () => {
    await grantFeed();
    await seedPost();
    await assertSucceeds(getDoc(doc(asOther(), 'patients', JONAS, 'posts', 'post1')));
  });

  it('REFUSES a member who was not granted the feed', async () => {
    await grantFeed(false);
    await seedPost();
    await assertFails(getDoc(doc(asOther(), 'patients', JONAS, 'posts', 'post1')));
  });

  it('refuses deletion, so a shared moment does not vanish from under a reply', async () => {
    await seedPost();
    await assertFails(deleteDoc(doc(asJonas(), 'patients', JONAS, 'posts', 'post1')));
  });

  describe('reactions', () => {
    it('lets a member react warmly', async () => {
      await grantFeed();
      await seedPost();
      await assertSucceeds(
        setDoc(doc(asOther(), 'patients', JONAS, 'posts', 'post1', 'reactions', OTHER), {
          type: 'heart',
          at: new Date(),
        }),
      );
    });

    /*
     * PRD 6.4 — warm only, checked in the database as well as the client. A
     * person recovering from psychosis reading a thumbs-down from their
     * mother at 2am is a harm this product will not create, and that must
     * survive somebody writing straight to Firestore.
     */
    it('REFUSES a reaction that is not one of the three warm ones', async () => {
      await grantFeed();
      await seedPost();
      for (const type of ['thumbsdown', 'sad', 'angry', 'worried']) {
        await assertFails(
          setDoc(doc(asOther(), 'patients', JONAS, 'posts', 'post1', 'reactions', OTHER), {
            type,
            at: new Date(),
          }),
        );
      }
    });

    it('REFUSES reacting in somebody else’s name', async () => {
      await grantFeed();
      await seedPost();
      await assertFails(
        setDoc(doc(asOther(), 'patients', JONAS, 'posts', 'post1', 'reactions', JONAS), {
          type: 'heart',
          at: new Date(),
        }),
      );
    });

    it('REFUSES a reaction from someone without the feed', async () => {
      await grantFeed(false);
      await seedPost();
      await assertFails(
        setDoc(doc(asOther(), 'patients', JONAS, 'posts', 'post1', 'reactions', OTHER), {
          type: 'heart',
          at: new Date(),
        }),
      );
    });

    it('lets a person take their own reaction back', async () => {
      await grantFeed();
      await seedPost();
      await setDoc(doc(asOther(), 'patients', JONAS, 'posts', 'post1', 'reactions', OTHER), {
        type: 'clap',
        at: new Date(),
      });
      await assertSucceeds(
        deleteDoc(doc(asOther(), 'patients', JONAS, 'posts', 'post1', 'reactions', OTHER)),
      );
    });
  });

  describe('comments', () => {
    const comment = { authorUid: OTHER, text: 'Fijn dat het lukte.', at: new Date() };

    it('lets a member say something back', async () => {
      await grantFeed();
      await seedPost();
      await assertSucceeds(
        setDoc(doc(asOther(), 'patients', JONAS, 'posts', 'post1', 'comments', 'c1'), comment),
      );
    });

    it('REFUSES a comment signed with somebody else’s name', async () => {
      await grantFeed();
      await seedPost();
      await assertFails(
        setDoc(doc(asOther(), 'patients', JONAS, 'posts', 'post1', 'comments', 'c1'), {
          ...comment,
          authorUid: JONAS,
        }),
      );
    });

    it('REFUSES editing a comment after it was read', async () => {
      await grantFeed();
      await seedPost();
      await testEnv.withSecurityRulesDisabled(async (ctx) => {
        await setDoc(
          doc(ctx.firestore(), 'patients', JONAS, 'posts', 'post1', 'comments', 'c1'),
          comment,
        );
      });
      await assertFails(
        updateDoc(doc(asOther(), 'patients', JONAS, 'posts', 'post1', 'comments', 'c1'), {
          text: 'Iets anders',
        }),
      );
    });

    it('lets the patient remove a comment from their own feed', async () => {
      await grantFeed();
      await seedPost();
      await testEnv.withSecurityRulesDisabled(async (ctx) => {
        await setDoc(
          doc(ctx.firestore(), 'patients', JONAS, 'posts', 'post1', 'comments', 'c1'),
          comment,
        );
      });
      await assertSucceeds(
        deleteDoc(doc(asJonas(), 'patients', JONAS, 'posts', 'post1', 'comments', 'c1')),
      );
    });
  });
});

/*
 * Medication is a clinician's business and nobody else's, and a change to it
 * is a clinical decision even when the patient is the one asking for it.
 */
describe('who may see and change medication', () => {
  const medication = {
    name: 'Quetiapine',
    dose: '200 mg',
    times: ['08:00'],
    purpose: 'Om je gedachten rustiger te maken.',
    activeFrom: new Date(),
    activeTo: null,
    changeLog: [],
    prescribedBy: null,
    pendingChange: null,
  };

  const seedMedication = (overrides: Record<string, unknown> = {}) =>
    testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'patients', JONAS, 'medications', 'med1'), {
        ...medication,
        ...overrides,
      });
    });

  const seedMember = (role: string, medicationGranted: boolean) =>
    testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'patients', JONAS, 'circle', OTHER), {
        memberUid: OTHER,
        role,
        permissions: {
          checkins: true,
          medication: medicationGranted,
          health: false,
          feed: true,
          calendar: true,
        },
        grantedAt: new Date(),
        revokedAt: null,
      });
    });

  /*
   * The one the requirement turns on: family and friends never see this,
   * even if a circle document somehow says they may. The role is checked as
   * well as the permission, so a supporter card carrying `medication: true`
   * grants nothing.
   */
  it('REFUSES a supporter reading medication even when the card says they may', async () => {
    await seedMember('supporter', true);
    await seedMedication();
    await assertFails(getDoc(doc(asOther(), 'patients', JONAS, 'medications', 'med1')));
  });

  it('REFUSES a supporter reading doses even when the card says they may', async () => {
    await seedMember('supporter', true);
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'patients', JONAS, 'doses', '2026-08-05_med1_0800'), {
        medId: 'med1',
        status: 'taken',
      });
    });
    await assertFails(
      getDoc(doc(asOther(), 'patients', JONAS, 'doses', '2026-08-05_med1_0800')),
    );
  });

  it('lets a clinician granted medication read it', async () => {
    await seedMember('clinician', true);
    await seedMedication();
    await assertSucceeds(getDoc(doc(asOther(), 'patients', JONAS, 'medications', 'med1')));
  });

  it('REFUSES a clinician who was not granted medication', async () => {
    await seedMember('clinician', false);
    await seedMedication();
    await assertFails(getDoc(doc(asOther(), 'patients', JONAS, 'medications', 'med1')));
  });

  it('lets the patient read their own, always', async () => {
    await seedMedication({ prescribedBy: DOCTOR });
    await assertSucceeds(getDoc(doc(asJonas(), 'patients', JONAS, 'medications', 'med1')));
  });

  /*
   * No clinician owns this entry, so nobody has to approve a change to it.
   * "If there is a doctor assigned" is answered by `prescribedBy`.
   */
  it('lets the patient change their own entry outright when no clinician owns it', async () => {
    await seedMedication();
    await assertSucceeds(
      updateDoc(doc(asJonas(), 'patients', JONAS, 'medications', 'med1'), { dose: '300 mg' }),
    );
  });

  it('lets the patient ask for a change to what a clinician prescribed', async () => {
    await seedMedication({ prescribedBy: DOCTOR });
    await assertSucceeds(
      updateDoc(doc(asJonas(), 'patients', JONAS, 'medications', 'med1'), {
        pendingChange: {
          proposedBy: JONAS,
          proposedAt: new Date(),
          dose: '100 mg',
          note: 'Ik voel me er heel suf van.',
        },
      }),
    );
  });

  it('REFUSES the patient applying that change themselves', async () => {
    // The whole point of asking. Proposing and doing are different writes.
    await seedMedication({ prescribedBy: DOCTOR });
    await assertFails(
      updateDoc(doc(asJonas(), 'patients', JONAS, 'medications', 'med1'), { dose: '100 mg' }),
    );
  });

  it('REFUSES the patient smuggling a change in beside the proposal', async () => {
    await seedMedication({ prescribedBy: DOCTOR });
    await assertFails(
      updateDoc(doc(asJonas(), 'patients', JONAS, 'medications', 'med1'), {
        dose: '100 mg',
        pendingChange: { proposedBy: JONAS, proposedAt: new Date(), dose: '100 mg' },
      }),
    );
  });

  it('REFUSES a proposal signed with somebody else’s name', async () => {
    await seedMedication({ prescribedBy: DOCTOR });
    await assertFails(
      updateDoc(doc(asJonas(), 'patients', JONAS, 'medications', 'med1'), {
        pendingChange: { proposedBy: DOCTOR, proposedAt: new Date(), dose: '100 mg' },
      }),
    );
  });

  it('lets the prescriber approve, applying the change and clearing it', async () => {
    await verifyClinician(DOCTOR);
    await seedClinicianCircle(DOCTOR);
    await seedMedication({
      prescribedBy: DOCTOR,
      pendingChange: { proposedBy: JONAS, proposedAt: new Date(), dose: '100 mg' },
    });
    await assertSucceeds(
      updateDoc(doc(asDoctor(), 'patients', JONAS, 'medications', 'med1'), {
        dose: '100 mg',
        prescribedBy: DOCTOR,
        pendingChange: null,
        changeLog: [{ at: new Date(), field: 'dose', from: '200 mg', to: '100 mg', by: DOCTOR }],
      }),
    );
  });

  it('lets the prescriber decline by clearing it, changing nothing else', async () => {
    await verifyClinician(DOCTOR);
    await seedClinicianCircle(DOCTOR);
    await seedMedication({
      prescribedBy: DOCTOR,
      pendingChange: { proposedBy: JONAS, proposedAt: new Date(), dose: '100 mg' },
    });
    await assertSucceeds(
      updateDoc(doc(asDoctor(), 'patients', JONAS, 'medications', 'med1'), {
        prescribedBy: DOCTOR,
        pendingChange: null,
      }),
    );
  });

  it('REFUSES a supporter proposing anything at all', async () => {
    await seedMember('supporter', true);
    await seedMedication({ prescribedBy: DOCTOR });
    await assertFails(
      updateDoc(doc(asOther(), 'patients', JONAS, 'medications', 'med1'), {
        pendingChange: { proposedBy: OTHER, proposedAt: new Date(), dose: '100 mg' },
      }),
    );
  });

  it('REFUSES an unverified clinician approving', async () => {
    await seedClinicianCircle(DOCTOR);
    await seedMedication({
      prescribedBy: DOCTOR,
      pendingChange: { proposedBy: JONAS, proposedAt: new Date(), dose: '100 mg' },
    });
    await assertFails(
      updateDoc(doc(asDoctor(), 'patients', JONAS, 'medications', 'med1'), {
        dose: '100 mg',
        prescribedBy: DOCTOR,
        pendingChange: null,
      }),
    );
  });
});

describe('clinicians/{uid}', () => {
  it('lets a clinician see that they were verified', async () => {
    await verifyClinician(DOCTOR);
    await assertSucceeds(getDoc(doc(asDoctor(), 'clinicians', DOCTOR)));
  });

  it('REFUSES anyone marking themselves verified', async () => {
    // Verification is an out-of-band admin act, deliberately. If it could be
    // claimed in-band, "verified clinician" would mean nothing.
    await assertFails(setDoc(doc(asDoctor(), 'clinicians', DOCTOR), { verifiedAt: new Date() }));
    await assertFails(setDoc(doc(asJonas(), 'clinicians', JONAS), { verifiedAt: new Date() }));
  });

  it('REFUSES reading another person’s verification record', async () => {
    await verifyClinician(DOCTOR);
    await assertFails(getDoc(doc(asJonas(), 'clinicians', DOCTOR)));
  });
});

describe('the patients a clinician may open', () => {
  it('lets a member list the circles they belong to', async () => {
    await verifyClinician(DOCTOR);
    await seedClinicianCircle(DOCTOR);
    await assertSucceeds(
      getDocs(query(collectionGroup(asDoctor(), 'circle'), where('memberUid', '==', DOCTOR))),
    );
  });

  it('REFUSES listing the circles somebody else belongs to', async () => {
    await verifyClinician(DOCTOR);
    await seedClinicianCircle(DOCTOR);
    await assertFails(
      getDocs(query(collectionGroup(asOther(), 'circle'), where('memberUid', '==', DOCTOR))),
    );
  });

  it('REFUSES an unfiltered sweep of every circle in the database', async () => {
    await seedClinicianCircle(DOCTOR);
    await assertFails(getDocs(collectionGroup(asDoctor(), 'circle')));
  });

  it('REFUSES putting somebody else in your own circle under their uid', async () => {
    // Otherwise anyone could write a card in their own circle carrying a
    // clinician's uid, and appear in that clinician's patient list without
    // ever having invited them.
    await assertFails(
      setDoc(doc(asJonas(), 'patients', JONAS, 'circle', OTHER), {
        memberUid: DOCTOR,
        role: 'supporter',
        permissions: {
          checkins: true,
          medication: true,
          health: false,
          feed: false,
          calendar: false,
        },
        grantedAt: new Date(),
        revokedAt: null,
      }),
    );
  });

  it('lets the patient write a card that names the right person', async () => {
    await assertSucceeds(
      setDoc(doc(asJonas(), 'patients', JONAS, 'circle', OTHER), {
        memberUid: OTHER,
        role: 'supporter',
        permissions: {
          checkins: false,
          medication: false,
          health: false,
          feed: true,
          calendar: true,
        },
        grantedAt: new Date(),
        revokedAt: null,
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

  /*
   * Knowing a code is the capability, so naming one is allowed. Enumerating
   * them is not — otherwise every check above is decoration, because an
   * attacker would simply read the list and redeem a genuine invite.
   */
  it('lets anyone signed in read an invite they can name', async () => {
    await seedInvite();
    await assertSucceeds(getDoc(doc(asOther(), 'invites', 'CODE1')));
  });

  it('REFUSES to let a stranger list every open invite in the system', async () => {
    await seedInvite();
    await assertFails(getDocs(collection(asOther(), 'invites')));
  });

  it('REFUSES a listing filtered to another patient', async () => {
    await seedInvite();
    await assertFails(
      getDocs(query(collection(asOther(), 'invites'), where('patientId', '==', JONAS))),
    );
  });

  it('lets the patient list their own invites', async () => {
    await seedInvite();
    await assertSucceeds(
      getDocs(query(collection(asJonas(), 'invites'), where('patientId', '==', JONAS))),
    );
  });

  it('REFUSES even the patient an unfiltered listing', async () => {
    // The filter is what makes the rule enforceable per document. Without it
    // the query could return an invite belonging to someone else.
    await seedInvite();
    await assertFails(getDocs(collection(asJonas(), 'invites')));
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
