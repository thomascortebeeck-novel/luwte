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
/** A clinician the admin has verified. Only an admin can create this. */
const DOCTOR = 'uid-doctor';
/** The person who decides that. Made an admin only with the Admin SDK. */
const ADMIN = 'uid-admin';

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
/**
 * An admin verification. `careRole` is deliberately absent by default, which
 * is also what every verification written before D30 looks like — those are
 * read as 'clinician', since clinician was the only verified role at the time.
 */
const verifyClinician = (uid: string, careRole?: 'clinician' | 'nurse') =>
  testEnv.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'clinicians', uid), {
      verifiedAt: new Date(),
      ...(careRole ? { careRole } : {}),
    });
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
        // D29 — its own key now. A clinician gets it by default because
        // adherence is the fact they came for; they read it and can never
        // write it. Without this line they would be refused, which is the
        // split working rather than a bug.
        doses: true,
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

  it('lets a person delete their own account document', async () => {
    /*
     * This test previously asserted the opposite, "because deletion must
     * cascade" through a GDPR Cloud Function. **That function was never going
     * to exist**: erasure runs on the device like the printable report (D16),
     * so a rule waiting for a server was waiting for something the project had
     * already decided against, and Article 17 was unimplementable.
     *
     * Cascading is answered by ordering instead — this document goes last,
     * after the subtree it heads. Rewritten rather than deleted, so the
     * reversal is visible in the diff.
     */
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'users', JONAS), { displayName: 'Jonas' });
    });
    await assertSucceeds(deleteDoc(doc(asJonas(), 'users', JONAS)));
  });

  it('still refuses to let anybody else delete it', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'users', JONAS), { displayName: 'Jonas' });
    });
    await assertFails(deleteDoc(doc(asOther(), 'users', JONAS)));
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

  /*
   * A supporter stores no health data of their own — they are shown somebody
   * else's — so Article 9 consent would be meaningless from them. What they
   * agree to is confidentiality, and the record has to be able to say so.
   */
  it('accepts confidentiality instead, from somebody who keeps no logbook', async () => {
    await assertSucceeds(
      setDoc(doc(asJonas(), 'patients', JONAS, 'consents', 'c1'), {
        ...validConsent,
        grants: {
          essential: true,
          healthData: false,
          reminders: false,
          confidentiality: true,
        },
      }),
    );
  });

  it('REFUSES a record that agrees to neither, which consents to nothing', async () => {
    await assertFails(
      setDoc(doc(asJonas(), 'patients', JONAS, 'consents', 'c1'), {
        ...validConsent,
        grants: {
          essential: true,
          healthData: false,
          reminders: true,
          confidentiality: false,
        },
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
    arousal: 5,
    sleepHours: 7,
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

  /*
   * The patient may not disown a prescription **while that clinician is still
   * their clinician**. That is the invariant, and it is narrower than it first
   * looks: a patient controls their own circle, so they can always revoke and
   * then take the line back. Any rule promising more than this would be
   * decoration — the revoke is one tap away and nothing can stop it.
   *
   * What actually protects provenance is `logOnlyGrows`. Releasing a line ends
   * the relationship going forward; it cannot erase what was prescribed, so
   * the chart keeps its vertical rules either way.
   */
  it('REFUSES the patient disowning a prescription while the clinician is still theirs', async () => {
    await verifyClinician(DOCTOR);
    await seedClinicianCircle(DOCTOR);
    await seedMedication({ prescribedBy: DOCTOR });
    await assertFails(
      updateDoc(doc(asJonas(), 'patients', JONAS, 'medications', 'med1'), { prescribedBy: null }),
    );
  });

  it('and cannot get there by revoking in the same breath — it takes two writes', async () => {
    // Revoking is a write to `circle/`, releasing is a write to the
    // medication. There is no single request that does both, so the circle
    // screen shows the revocation before anything is disowned.
    await verifyClinician(DOCTOR);
    await seedClinicianCircle(DOCTOR);
    await seedMedication({ prescribedBy: DOCTOR });
    await assertFails(
      updateDoc(doc(asJonas(), 'patients', JONAS, 'medications', 'med1'), { prescribedBy: null }),
    );
    await assertSucceeds(
      updateDoc(doc(asJonas(), 'patients', JONAS, 'circle', DOCTOR), { revokedAt: new Date() }),
    );
    await assertSucceeds(
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

  it('lets the patient say what they expect something to be like', async () => {
    await assertSucceeds(
      setDoc(
        doc(asJonas(), 'patients', JONAS, 'activities', 'act1'),
        activity({ expectedPleasure: 5, expectedMastery: 2 }),
      ),
    );
  });

  it('REFUSES a supporter saying how the patient will feel about it', async () => {
    /*
     * The expectation is shown back to the person later, beside how it
     * actually went. Somebody else writing it turns that comparison into the
     * app quoting a family member's opinion as the person's own thought.
     */
    await grantCalendar();
    await assertFails(
      setDoc(
        doc(asOther(), 'patients', JONAS, 'activities', 'act2'),
        activity({ status: 'suggested', createdBy: OTHER, expectedPleasure: 7 }),
      ),
    );
    await assertFails(
      setDoc(
        doc(asOther(), 'patients', JONAS, 'activities', 'act3'),
        activity({ status: 'suggested', createdBy: OTHER, expectedMastery: 1 }),
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
   * D29 — these two used to assert the opposite, and the reversal is the
   * point rather than a test that became inconvenient.
   *
   * They asserted that a supporter card carrying `medication: true` granted
   * nothing, because the role was checked as well. Thomas decided the other
   * way: the person is in full control, and a blanket ban is the app deciding
   * for them. What replaces the fence is *the permission the person actually
   * set* — and the halves that made the ban work are kept elsewhere: a dose
   * never reaches the feed, the widening is confirmed in words, and it is
   * logged where the person can read it back.
   */
  it('lets a supporter the person granted medication read it', async () => {
    await seedMember('supporter', true);
    await seedMedication();
    await assertSucceeds(getDoc(doc(asOther(), 'patients', JONAS, 'medications', 'med1')));
  });

  it('REFUSES a supporter granted medication the doses they were not granted', async () => {
    // The split is the whole feature: somebody may see what you take without
    // seeing whether you took it. One toggle could not say that.
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

  it('lets a supporter granted doses read them', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'patients', JONAS, 'circle', OTHER), {
        memberUid: OTHER,
        role: 'supporter',
        permissions: {
          checkins: false,
          medication: false,
          doses: true,
          health: false,
          feed: true,
          calendar: true,
        },
        grantedAt: new Date(),
        revokedAt: null,
      });
      await setDoc(doc(ctx.firestore(), 'patients', JONAS, 'doses', '2026-08-05_med1_0800'), {
        medId: 'med1',
        status: 'taken',
      });
    });
    await assertSucceeds(
      getDoc(doc(asOther(), 'patients', JONAS, 'doses', '2026-08-05_med1_0800')),
    );
  });

  it('REFUSES a supporter granted doses the medication they were not granted', async () => {
    // And the other way round, so the split is a real split rather than one
    // key quietly implying the other.
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'patients', JONAS, 'circle', OTHER), {
        memberUid: OTHER,
        role: 'supporter',
        permissions: {
          checkins: false,
          medication: false,
          doses: true,
          health: false,
          feed: true,
          calendar: true,
        },
        grantedAt: new Date(),
        revokedAt: null,
      });
    });
    await seedMedication();
    await assertFails(getDoc(doc(asOther(), 'patients', JONAS, 'medications', 'med1')));
  });

  it('REFUSES a supporter granted neither, whatever their role says', async () => {
    await seedMember('supporter', false);
    await seedMedication();
    await assertFails(getDoc(doc(asOther(), 'patients', JONAS, 'medications', 'med1')));
  });

  it('REFUSES a revoked supporter who was granted both', async () => {
    // Widening who *may* be granted this changes nothing about revocation:
    // `granted()` is false the moment revokedAt is set.
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'patients', JONAS, 'circle', OTHER), {
        memberUid: OTHER,
        role: 'supporter',
        permissions: {
          checkins: true,
          medication: true,
          doses: true,
          health: true,
          feed: true,
          calendar: true,
        },
        grantedAt: new Date(),
        revokedAt: new Date(),
      });
    });
    await seedMedication();
    await assertFails(getDoc(doc(asOther(), 'patients', JONAS, 'medications', 'med1')));
  });

  it('REFUSES a supporter granted medication writing it', async () => {
    /*
     * The line that must never blur, restated now that family can read this.
     * Being allowed to *see* what somebody is prescribed is not being allowed
     * to change it, and `medications/` is still writable only by the patient
     * and a verified prescribing clinician.
     */
    await seedMember('supporter', true);
    await seedMedication();
    await assertFails(
      updateDoc(doc(asOther(), 'patients', JONAS, 'medications', 'med1'), { dose: '400 mg' }),
    );
  });

  it('REFUSES a supporter granted doses writing one', async () => {
    // Whether you took it is your own record, in both directions, and D29
    // widened only who may read it.
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'patients', JONAS, 'circle', OTHER), {
        memberUid: OTHER,
        role: 'supporter',
        permissions: {
          checkins: false,
          medication: false,
          doses: true,
          health: false,
          feed: true,
          calendar: true,
        },
        grantedAt: new Date(),
        revokedAt: null,
      });
    });
    await assertFails(
      setDoc(doc(asOther(), 'patients', JONAS, 'doses', '2026-08-05_med1_0800'), {
        medId: 'med1',
        status: 'taken',
      }),
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

  /*
   * What happens to a prescription when the person who wrote it is gone.
   *
   * Without this, revoking a psychiatrist froze every line they prescribed
   * forever: the patient fails the self-edit branch because `prescribedBy` is
   * set, and the prescriber branch fails because `granted()` is false for a
   * revoked member. `pendingChange` was the only move left, and it wrote to
   * someone who could no longer read the document it lived on.
   *
   * So the patient may take the line back — and only the line, never the dose
   * in the same write, or a release would be a place to hide an edit.
   */
  describe('when the prescriber is gone', () => {
    const releasing = (extra: Record<string, unknown> = {}) =>
      updateDoc(doc(asJonas(), 'patients', JONAS, 'medications', 'med1'), {
        prescribedBy: null,
        ...extra,
      });

    it('lets the patient take back a line whose prescriber was revoked', async () => {
      await seedClinicianCircle(DOCTOR, { revokedAt: new Date() });
      await seedMedication({ prescribedBy: DOCTOR });
      await assertSucceeds(releasing());
    });

    it('lets the patient take back a line whose prescriber left the circle', async () => {
      // No circle document at all — the other half of "gone".
      await seedMedication({ prescribedBy: DOCTOR });
      await assertSucceeds(releasing());
    });

    it('REFUSES taking a line back while the prescriber is still active', async () => {
      await verifyClinician(DOCTOR);
      await seedClinicianCircle(DOCTOR);
      await seedMedication({ prescribedBy: DOCTOR });
      await assertFails(releasing());
    });

    it('REFUSES a release that changes the dose in the same write', async () => {
      // The whole point: releasing must not be a way to smuggle an edit past
      // the prescriber. Take it back, then change it, and the log shows both.
      await seedClinicianCircle(DOCTOR, { revokedAt: new Date() });
      await seedMedication({ prescribedBy: DOCTOR });
      await assertFails(releasing({ dose: '100 mg' }));
    });

    it('REFUSES a release that shortens the change log', async () => {
      await seedClinicianCircle(DOCTOR, { revokedAt: new Date() });
      await seedMedication({
        prescribedBy: DOCTOR,
        changeLog: [{ at: new Date(), field: 'dose', from: '100 mg', to: '200 mg', by: DOCTOR }],
      });
      await assertFails(releasing({ changeLog: [] }));
    });

    it('REFUSES anyone but the patient taking the line back', async () => {
      await seedClinicianCircle(DOCTOR, { revokedAt: new Date() });
      await seedMember('supporter', true);
      await seedMedication({ prescribedBy: DOCTOR });
      await assertFails(
        updateDoc(doc(asOther(), 'patients', JONAS, 'medications', 'med1'), {
          prescribedBy: null,
        }),
      );
    });

    it('REFUSES handing the line to somebody else instead of taking it back', async () => {
      await seedClinicianCircle(DOCTOR, { revokedAt: new Date() });
      await seedMedication({ prescribedBy: DOCTOR });
      await assertFails(
        updateDoc(doc(asJonas(), 'patients', JONAS, 'medications', 'med1'), {
          prescribedBy: OTHER,
        }),
      );
    });

    it('lets the patient edit it normally once it is theirs again', async () => {
      await seedClinicianCircle(DOCTOR, { revokedAt: new Date() });
      await seedMedication({ prescribedBy: DOCTOR });
      await assertSucceeds(releasing());
      await assertSucceeds(
        updateDoc(doc(asJonas(), 'patients', JONAS, 'medications', 'med1'), { dose: '100 mg' }),
      );
    });

    it('still lets a new clinician take over instead', async () => {
      // Releasing is for when nobody is left, not the only way out.
      await seedClinicianCircle(DOCTOR, { revokedAt: new Date() });
      await verifyClinician(OTHER);
      await seedMember('clinician', true);
      await seedMedication({ prescribedBy: DOCTOR });
      await assertSucceeds(
        updateDoc(doc(asOther(), 'patients', JONAS, 'medications', 'med1'), {
          prescribedBy: OTHER,
        }),
      );
    });
  });
});

describe('clinicians/{uid}', () => {
  it('lets a clinician see that they were verified', async () => {
    await verifyClinician(DOCTOR);
    await assertSucceeds(getDoc(doc(asDoctor(), 'clinicians', DOCTOR)));
  });

  it('REFUSES anyone marking themselves verified', async () => {
    // Verification is an admin act, deliberately. If it could be claimed
    // in-band, "verified clinician" would mean nothing.
    await assertFails(setDoc(doc(asDoctor(), 'clinicians', DOCTOR), { verifiedAt: new Date() }));
    await assertFails(setDoc(doc(asJonas(), 'clinicians', JONAS), { verifiedAt: new Date() }));
  });

  it('REFUSES reading another person’s verification record', async () => {
    await verifyClinician(DOCTOR);
    await assertFails(getDoc(doc(asJonas(), 'clinicians', DOCTOR)));
  });
});

/*
 * Verification is a decision an admin makes in the app rather than a script
 * somebody runs (D27). That moved the root of trust from "only the Admin SDK
 * writes clinicians/" to "only the Admin SDK writes admins/" — so these tests
 * are about whether that root actually holds.
 */
describe('the admin who decides who is a clinician', () => {
  const asAdmin = () => testEnv.authenticatedContext(ADMIN).firestore();

  const makeAdmin = (uid: string) =>
    testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'admins', uid), { createdAt: new Date() });
    });

  const application = {
    displayName: 'Dr. An Peeters',
    discipline: 'psychiater',
    rizivNumber: '12345678003',
    practice: 'UZ Gent',
    requestedAt: new Date(),
    decidedAt: null,
    decidedBy: null,
    outcome: null,
  };

  const apply = (as: ReturnType<typeof asDoctor>, uid: string) =>
    setDoc(doc(as, 'clinicianRequests', uid), application);

  it('REFUSES anybody making themselves an admin', async () => {
    // The whole chain rests on this one row.
    await assertFails(setDoc(doc(asJonas(), 'admins', JONAS), { createdAt: new Date() }));
    await assertFails(setDoc(doc(asDoctor(), 'admins', DOCTOR), { createdAt: new Date() }));
  });

  it('REFUSES an admin making somebody else an admin', async () => {
    await makeAdmin(ADMIN);
    await assertFails(setDoc(doc(asAdmin(), 'admins', DOCTOR), { createdAt: new Date() }));
  });

  it('REFUSES enumerating who the admins are', async () => {
    await makeAdmin(ADMIN);
    await assertFails(getDocs(collection(asAdmin(), 'admins')));
  });

  it('lets a clinician apply for themselves', async () => {
    await assertSucceeds(apply(asDoctor(), DOCTOR));
  });

  it('REFUSES applying on somebody else’s behalf', async () => {
    await assertFails(apply(asDoctor(), OTHER));
  });

  it('REFUSES an application that arrives already approved', async () => {
    await assertFails(
      setDoc(doc(asDoctor(), 'clinicianRequests', DOCTOR), {
        ...application,
        outcome: 'verified',
        decidedBy: DOCTOR,
        decidedAt: new Date(),
      }),
    );
  });

  it('REFUSES the applicant deciding their own request', async () => {
    await apply(asDoctor(), DOCTOR);
    await assertFails(
      updateDoc(doc(asDoctor(), 'clinicianRequests', DOCTOR), {
        outcome: 'verified',
        decidedBy: DOCTOR,
        decidedAt: new Date(),
      }),
    );
  });

  it('lets an admin read the queue and decide', async () => {
    await makeAdmin(ADMIN);
    await apply(asDoctor(), DOCTOR);
    await assertSucceeds(getDocs(collection(asAdmin(), 'clinicianRequests')));
    await assertSucceeds(
      updateDoc(doc(asAdmin(), 'clinicianRequests', DOCTOR), {
        outcome: 'verified',
        decidedBy: ADMIN,
        decidedAt: new Date(),
      }),
    );
    await assertSucceeds(
      setDoc(doc(asAdmin(), 'clinicians', DOCTOR), {
        verifiedAt: new Date(),
        verifiedBy: ADMIN,
      }),
    );
  });

  it('REFUSES a decision that rewrites the application it is deciding', async () => {
    // Otherwise approving could quietly change the RIZIV number it approved.
    await makeAdmin(ADMIN);
    await apply(asDoctor(), DOCTOR);
    await assertFails(
      updateDoc(doc(asAdmin(), 'clinicianRequests', DOCTOR), {
        outcome: 'verified',
        decidedBy: ADMIN,
        decidedAt: new Date(),
        rizivNumber: '99999999999',
      }),
    );
  });

  it('REFUSES an admin signing a decision as somebody else', async () => {
    await makeAdmin(ADMIN);
    await apply(asDoctor(), DOCTOR);
    await assertFails(
      updateDoc(doc(asAdmin(), 'clinicianRequests', DOCTOR), {
        outcome: 'verified',
        decidedBy: DOCTOR,
        decidedAt: new Date(),
      }),
    );
  });

  it('REFUSES a non-admin reading the queue', async () => {
    await apply(asDoctor(), DOCTOR);
    await assertFails(getDocs(collection(asJonas(), 'clinicianRequests')));
  });

  it('REFUSES deleting a decided request, because who asked is a record', async () => {
    await makeAdmin(ADMIN);
    await apply(asDoctor(), DOCTOR);
    await assertFails(deleteDoc(doc(asAdmin(), 'clinicianRequests', DOCTOR)));
  });

  it('REFUSES the applicant editing their application after it was decided', async () => {
    await makeAdmin(ADMIN);
    await apply(asDoctor(), DOCTOR);
    await updateDoc(doc(asAdmin(), 'clinicianRequests', DOCTOR), {
      outcome: 'declined',
      decidedBy: ADMIN,
      decidedAt: new Date(),
    });
    await assertFails(
      updateDoc(doc(asDoctor(), 'clinicianRequests', DOCTOR), { rizivNumber: '12345678004' }),
    );
  });
});

/*
 * How a person finds their doctor. There is no public register to search —
 * RIZIV publishes a web form, not an API — so this can only ever list
 * clinicians who already use luwte, and the copy says so.
 */
describe('the clinician directory', () => {
  const asAdmin = () => testEnv.authenticatedContext(ADMIN).firestore();

  const entry = (listed: boolean) => ({
    uid: DOCTOR,
    displayName: 'Dr. An Peeters',
    discipline: 'psychiater',
    practice: 'UZ Gent',
    searchName: 'dr. an peeters',
    listed,
  });

  const seedEntry = (code: string, listed: boolean) =>
    testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'clinicianDirectory', code), entry(listed));
    });

  it('lets anyone signed in resolve a code they were given', async () => {
    await seedEntry('abcdefghjkmn', true);
    await assertSucceeds(getDoc(doc(asJonas(), 'clinicianDirectory', 'abcdefghjkmn')));
  });

  it('resolves by code even for somebody who is not listed', async () => {
    // A card handed across a desk has to work for a doctor who does not want
    // to be in a searchable list at all.
    await seedEntry('abcdefghjkmn', false);
    await assertSucceeds(getDoc(doc(asJonas(), 'clinicianDirectory', 'abcdefghjkmn')));
  });

  it('lets a search by name run, filtered to the people who opted in', async () => {
    await seedEntry('abcdefghjkmn', true);
    await assertSucceeds(
      getDocs(query(collection(asJonas(), 'clinicianDirectory'), where('listed', '==', true))),
    );
  });

  it('REFUSES an unfiltered sweep of every clinician', async () => {
    // The D17 lesson: an unfiltered listing is refused outright rather than
    // filtered, so an unlisted clinician cannot be swept up by a broad query.
    await seedEntry('abcdefghjkmn', true);
    await assertFails(getDocs(collection(asJonas(), 'clinicianDirectory')));
  });

  it('REFUSES listing the people who did not opt in', async () => {
    await seedEntry('abcdefghjkmn', false);
    await assertFails(
      getDocs(query(collection(asJonas(), 'clinicianDirectory'), where('listed', '==', false))),
    );
  });

  it('REFUSES a clinician writing their own entry', async () => {
    await assertFails(setDoc(doc(asDoctor(), 'clinicianDirectory', 'abcdefghjkmn'), entry(true)));
  });

  it('REFUSES a patient writing one for somebody', async () => {
    await assertFails(setDoc(doc(asJonas(), 'clinicianDirectory', 'abcdefghjkmn'), entry(true)));
  });

  it('lets an admin write it, which is what approving does', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'admins', ADMIN), { createdAt: new Date() });
    });
    await assertSucceeds(setDoc(doc(asAdmin(), 'clinicianDirectory', 'abcdefghjkmn'), entry(true)));
  });
});

/*
 * D27, the second half: the patient's word decides *whose* clinician somebody
 * is. It cannot decide *that they are one*.
 */
describe('naming somebody as your clinician', () => {
  const card = (role: string) => ({
    memberUid: DOCTOR,
    role,
    permissions: {
      checkins: true,
      medication: role === 'clinician',
      health: false,
      feed: false,
      calendar: false,
    },
    grantedAt: new Date(),
    revokedAt: null,
  });

  it('works when the admin verified them', async () => {
    await verifyClinician(DOCTOR);
    await assertSucceeds(
      setDoc(doc(asJonas(), 'patients', JONAS, 'circle', DOCTOR), card('clinician')),
    );
  });

  it('REFUSES a clinician card for somebody nobody verified', async () => {
    await assertFails(
      setDoc(doc(asJonas(), 'patients', JONAS, 'circle', DOCTOR), card('clinician')),
    );
  });

  it('still lets anyone at all be a supporter', async () => {
    // Verification gates the clinical role and nothing else. A brother needs
    // no credential to be a brother.
    await assertSucceeds(
      setDoc(doc(asJonas(), 'patients', JONAS, 'circle', DOCTOR), card('supporter')),
    );
  });

  it('REFUSES promoting a supporter card into a clinician one', async () => {
    // The same escalation, split across two writes.
    await setDoc(doc(asJonas(), 'patients', JONAS, 'circle', DOCTOR), card('supporter'));
    await assertFails(
      updateDoc(doc(asJonas(), 'patients', JONAS, 'circle', DOCTOR), {
        role: 'clinician',
        permissions: card('clinician').permissions,
      }),
    );
  });

  it('allows the promotion once they are verified', async () => {
    await setDoc(doc(asJonas(), 'patients', JONAS, 'circle', DOCTOR), card('supporter'));
    await verifyClinician(DOCTOR);
    await assertSucceeds(
      updateDoc(doc(asJonas(), 'patients', JONAS, 'circle', DOCTOR), {
        role: 'clinician',
        permissions: card('clinician').permissions,
      }),
    );
  });
});

/*
 * D30 — a nurse, and the clause that keeps the role from being a way round
 * everything above.
 */
describe('naming somebody as your nurse', () => {
  const card = (role: string) => ({
    memberUid: DOCTOR,
    role,
    permissions: {
      checkins: true,
      medication: true,
      doses: true,
      health: false,
      feed: false,
      calendar: true,
      plan: false,
    },
    grantedAt: new Date(),
    revokedAt: null,
  });

  it('REFUSES a nurse card for somebody nobody verified', async () => {
    /*
     * Without this the whole D23 protection is bypassed by calling somebody a
     * nurse instead of a doctor — and a nurse the person granted medication is
     * reading the most diagnostic thing here.
     */
    await assertFails(setDoc(doc(asJonas(), 'patients', JONAS, 'circle', DOCTOR), card('nurse')));
  });

  it('works once an admin verified them as one', async () => {
    await verifyClinician(DOCTOR, 'nurse');
    await assertSucceeds(setDoc(doc(asJonas(), 'patients', JONAS, 'circle', DOCTOR), card('nurse')));
  });

  it('REFUSES naming a verified nurse as a clinician', async () => {
    /*
     * The clause D30 turns on. `isPrescriber` requires `role == 'clinician'`,
     * so without this a verified nurse could be given a clinician card and
     * would inherit the ability to write what somebody is prescribed —
     * exactly what the decision says a nurse never does.
     *
     * The admin decides *what kind* of professional; the patient decides
     * whose. Neither can decide the other's half.
     */
    await verifyClinician(DOCTOR, 'nurse');
    await assertFails(
      setDoc(doc(asJonas(), 'patients', JONAS, 'circle', DOCTOR), card('clinician')),
    );
  });

  it('REFUSES the same promotion in a second write', async () => {
    await verifyClinician(DOCTOR, 'nurse');
    await setDoc(doc(asJonas(), 'patients', JONAS, 'circle', DOCTOR), card('nurse'));
    await assertFails(
      updateDoc(doc(asJonas(), 'patients', JONAS, 'circle', DOCTOR), { role: 'clinician' }),
    );
  });

  it('lets a verified clinician be named a nurse, which grants less', async () => {
    // Odd but harmless: they would simply lose the ability to prescribe for
    // this person. Refusing it would be the app arguing with the patient
    // about what somebody is to them.
    await verifyClinician(DOCTOR, 'clinician');
    await assertSucceeds(setDoc(doc(asJonas(), 'patients', JONAS, 'circle', DOCTOR), card('nurse')));
  });

  it('still reads a verification written before careRole existed as a clinician', async () => {
    // Those were all issued when clinician was the only verified role, and
    // reading them as anything else would revoke a properly checked
    // prescriber the moment this shipped.
    await verifyClinician(DOCTOR);
    await assertSucceeds(
      setDoc(doc(asJonas(), 'patients', JONAS, 'circle', DOCTOR), card('clinician')),
    );
  });
});

describe('what a nurse may do once they are in the circle', () => {
  const seedNurse = () =>
    testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'clinicians', DOCTOR), {
        verifiedAt: new Date(),
        careRole: 'nurse',
      });
      await setDoc(doc(ctx.firestore(), 'patients', JONAS, 'circle', DOCTOR), {
        memberUid: DOCTOR,
        role: 'nurse',
        permissions: {
          checkins: true,
          medication: true,
          doses: true,
          health: false,
          feed: false,
          calendar: true,
          plan: false,
        },
        grantedAt: new Date(),
        revokedAt: null,
      });
    });

  it('reads medication when the person granted it', async () => {
    await seedNurse();
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'patients', JONAS, 'medications', 'med1'), {
        name: 'Quetiapine',
        dose: '200 mg',
        times: ['20:00'],
        prescribedBy: null,
        changeLog: [],
      });
    });
    await assertSucceeds(getDoc(doc(asDoctor(), 'patients', JONAS, 'medications', 'med1')));
  });

  it('REFUSES a nurse writing medication, which is the point of the role', async () => {
    /*
     * `isPrescriber` requires `role == 'clinician'`, so this needed no new
     * code — but it is the sentence the whole decision rests on, and a test
     * that fails loudly is what keeps it true through the next refactor.
     */
    await seedNurse();
    await assertFails(
      setDoc(doc(asDoctor(), 'patients', JONAS, 'medications', 'med2'), {
        name: 'Iets anders',
        dose: '50 mg',
        times: ['08:00'],
        prescribedBy: DOCTOR,
        changeLog: [],
      }),
    );
  });

  it('offers something for the calendar, and only as a suggestion', async () => {
    await seedNurse();
    await assertSucceeds(
      setDoc(doc(asDoctor(), 'patients', JONAS, 'activities', 'a1'), {
        title: 'Wandelen',
        date: '2026-08-05',
        startTime: '',
        withPerson: '',
        createdBy: DOCTOR,
        status: 'suggested',
        // "Suggest a week" — one offer the person accepts once, landing on
        // every day it names. Still an offer.
        recurrence: 'FREQ=WEEKLY;BYDAY=MO,WE,FR',
      }),
    );
  });

  it('REFUSES a nurse putting something straight on the calendar', async () => {
    /*
     * "A supporter may offer, never place" is the resolution of the central
     * tension of this product, and D30 says explicitly that it does not bend
     * for a job title.
     */
    await seedNurse();
    await assertFails(
      setDoc(doc(asDoctor(), 'patients', JONAS, 'activities', 'a2'), {
        title: 'Wandelen',
        date: '2026-08-05',
        startTime: '',
        withPerson: '',
        createdBy: DOCTOR,
        status: 'accepted',
        recurrence: null,
      }),
    );
  });

  it('REFUSES a nurse accepting their own suggestion', async () => {
    await seedNurse();
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'patients', JONAS, 'activities', 'a3'), {
        title: 'Wandelen',
        date: '2026-08-05',
        startTime: '',
        withPerson: '',
        createdBy: DOCTOR,
        status: 'suggested',
        recurrence: null,
      });
    });
    await assertFails(
      updateDoc(doc(asDoctor(), 'patients', JONAS, 'activities', 'a3'), { status: 'accepted' }),
    );
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

  /*
   * What was actually taken, as opposed to what was prescribed.
   *
   * The line that must never blur: *what you are prescribed* is a clinical
   * decision, *what you actually took* is your own account of your own day.
   * A prescriber reads it — that is the whole point, it is the fact that
   * changes a prescription — and can never write it. Nobody edits somebody
   * else's account of what they took.
   */
  describe('and what was actually taken', () => {
    const annotated = {
      medId: 'med1',
      status: 'taken',
      takenAt: new Date(),
      actualDose: 'de helft',
      note: 'te suf om te werken',
    };

    it('lets the person say what they actually took, and why', async () => {
      await assertSucceeds(
        setDoc(doc(asJonas(), 'patients', JONAS, 'doses', '2026-08-04_med1_0800'), annotated),
      );
    });

    it('lets the prescriber read it — this is the fact they came for', async () => {
      await verifyClinician(DOCTOR);
      await seedClinicianCircle(DOCTOR);
      await testEnv.withSecurityRulesDisabled(async (ctx) => {
        await setDoc(
          doc(ctx.firestore(), 'patients', JONAS, 'doses', '2026-08-04_med1_0800'),
          annotated,
        );
      });
      await assertSucceeds(
        getDoc(doc(asDoctor(), 'patients', JONAS, 'doses', '2026-08-04_med1_0800')),
      );
    });

    it('REFUSES the prescriber writing it, however well meant', async () => {
      await verifyClinician(DOCTOR);
      await seedClinicianCircle(DOCTOR);
      await testEnv.withSecurityRulesDisabled(async (ctx) => {
        await setDoc(
          doc(ctx.firestore(), 'patients', JONAS, 'doses', '2026-08-04_med1_0800'),
          annotated,
        );
      });
      await assertFails(
        updateDoc(doc(asDoctor(), 'patients', JONAS, 'doses', '2026-08-04_med1_0800'), {
          actualDose: 'alles',
        }),
      );
    });

    it('REFUSES a supporter granted medication but not doses', async () => {
      /*
       * D29 — this used to refuse them outright, on the role. Now it refuses
       * them on the permission they were actually given, which is the split
       * doing its job: what somebody said about halving a dose is not
       * automatically visible to whoever may see the prescription.
       */
      await testEnv.withSecurityRulesDisabled(async (ctx) => {
        await setDoc(doc(ctx.firestore(), 'patients', JONAS, 'circle', OTHER), {
          memberUid: OTHER,
          role: 'supporter',
          permissions: {
            checkins: true,
            medication: true,
            doses: false,
            health: true,
            feed: true,
            calendar: true,
          },
          grantedAt: new Date(),
          revokedAt: null,
        });
        await setDoc(
          doc(ctx.firestore(), 'patients', JONAS, 'doses', '2026-08-04_med1_0800'),
          annotated,
        );
      });
      await assertFails(
        getDoc(doc(asOther(), 'patients', JONAS, 'doses', '2026-08-04_med1_0800')),
      );
    });
  });
});

/**
 * PRD 5.3 — the circle document is the access control list, and these are the
 * tests that decide whether that sentence is true.
 */
/**
 * The early-warning-signs plan.
 *
 * Its own permission, because sharing "what I do when it starts going wrong"
 * is a different decision from sharing how a Tuesday felt.
 */
describe('the early-warning-signs plan', () => {
  const entry = { sign: 'Ik slaap minder dan vijf uur.', action: 'Ik bel mijn zus.' };

  const seedEntry = () =>
    testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'patients', JONAS, 'plan', 'p1'), entry);
    });

  const seedMemberWith = (plan: boolean) =>
    testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'patients', JONAS, 'circle', OTHER), {
        memberUid: OTHER,
        role: 'supporter',
        permissions: {
          checkins: true,
          medication: false,
          doses: false,
          health: false,
          feed: true,
          calendar: true,
          plan,
        },
        grantedAt: new Date(),
        revokedAt: null,
      });
    });

  it('lets the person write their own plan', async () => {
    await assertSucceeds(setDoc(doc(asJonas(), 'patients', JONAS, 'plan', 'p1'), entry));
  });

  it('lets the person delete an entry, unlike almost everything else here', async () => {
    /*
     * The rest of this database is a record of what happened, and a record
     * that can vanish is not worth keeping. A plan is a current intention —
     * a sign that stopped being true is noise in the one document somebody
     * needs to read quickly on a bad day.
     */
    await seedEntry();
    await assertSucceeds(deleteDoc(doc(asJonas(), 'patients', JONAS, 'plan', 'p1')));
  });

  it('lets somebody granted it read the plan', async () => {
    await seedMemberWith(true);
    await seedEntry();
    await assertSucceeds(getDoc(doc(asOther(), 'patients', JONAS, 'plan', 'p1')));
  });

  it('REFUSES somebody granted check-ins but not the plan', async () => {
    // Its own permission, not a rider on another one.
    await seedMemberWith(false);
    await seedEntry();
    await assertFails(getDoc(doc(asOther(), 'patients', JONAS, 'plan', 'p1')));
  });

  it('REFUSES a member writing into somebody else’s plan', async () => {
    // It is the person's own words about their own patterns. Somebody else
    // adding a sign would be telling them what to watch for in themselves.
    await seedMemberWith(true);
    await assertFails(setDoc(doc(asOther(), 'patients', JONAS, 'plan', 'p2'), entry));
  });

  it('REFUSES a member deleting from it', async () => {
    await seedMemberWith(true);
    await seedEntry();
    await assertFails(deleteDoc(doc(asOther(), 'patients', JONAS, 'plan', 'p1')));
  });

  it('REFUSES a revoked member who had been granted it', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'patients', JONAS, 'circle', OTHER), {
        memberUid: OTHER,
        role: 'supporter',
        permissions: {
          checkins: true,
          medication: false,
          doses: false,
          health: false,
          feed: true,
          calendar: true,
          plan: true,
        },
        grantedAt: new Date(),
        revokedAt: new Date(),
      });
    });
    await seedEntry();
    await assertFails(getDoc(doc(asOther(), 'patients', JONAS, 'plan', 'p1')));
  });

  it('REFUSES a stranger entirely', async () => {
    await seedEntry();
    await assertFails(getDocs(collection(asOther(), 'patients', JONAS, 'plan')));
  });
});

/**
 * D29 — the person's own record of who they gave what to.
 *
 * **A record, not a control**, and the tests say so: rules cannot require
 * that changing a circle document also writes here, so what is asserted is
 * that nobody else can read it and that nobody at all can rewrite it.
 */
describe('the record of what was given', () => {
  const entry = {
    memberUid: OTHER,
    relation: 'broer',
    granted: ['doses'],
    withdrawn: [],
    at: new Date(),
  };

  const seedEntry = () =>
    testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'patients', JONAS, 'permissionLog', 'e1'), entry);
    });

  it('lets the person write their own history', async () => {
    await assertSucceeds(
      setDoc(doc(asJonas(), 'patients', JONAS, 'permissionLog', 'e1'), entry),
    );
  });

  it('lets the person read it back, which is the whole point', async () => {
    await seedEntry();
    await assertSucceeds(getDoc(doc(asJonas(), 'patients', JONAS, 'permissionLog', 'e1')));
  });

  it('REFUSES rewriting an entry, because an editable history is memory', async () => {
    await seedEntry();
    await assertFails(
      updateDoc(doc(asJonas(), 'patients', JONAS, 'permissionLog', 'e1'), { granted: [] }),
    );
  });

  it('REFUSES deleting one, for the same reason', async () => {
    await seedEntry();
    await assertFails(deleteDoc(doc(asJonas(), 'patients', JONAS, 'permissionLog', 'e1')));
  });

  it('REFUSES a member reading it, even one granted everything', async () => {
    /*
     * It is a list of *everyone*. A member who could read it would learn what
     * every other member was given, which is a bigger disclosure than any
     * single permission on their own card.
     */
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'patients', JONAS, 'circle', OTHER), {
        memberUid: OTHER,
        role: 'supporter',
        permissions: {
          checkins: true,
          medication: true,
          doses: true,
          health: true,
          feed: true,
          calendar: true,
        },
        grantedAt: new Date(),
        revokedAt: null,
      });
    });
    await seedEntry();
    await assertFails(getDoc(doc(asOther(), 'patients', JONAS, 'permissionLog', 'e1')));
  });

  it('REFUSES a member writing an entry into somebody else’s history', async () => {
    await seedEntry();
    await assertFails(
      setDoc(doc(asOther(), 'patients', JONAS, 'permissionLog', 'e2'), entry),
    );
  });

  it('REFUSES a member listing the history', async () => {
    await seedEntry();
    await assertFails(getDocs(collection(asOther(), 'patients', JONAS, 'permissionLog')));
  });
});

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

/*
 * An invite addressed to one person.
 *
 * The distinction this exists for: a link invite is a bearer token by design —
 * whoever holds the code joins, which is exactly what sharing a link means. An
 * invite issued from the clinician directory is not, because **nobody handed it
 * over**. The patient searched, found a name, and asked. So holding the code
 * must not be enough, and these are the attacks that says so.
 */
describe('an invite addressed to one person', () => {
  const soon = () => new Date(Date.now() + 7 * 24 * 3600 * 1000);
  const clinical = {
    checkins: true,
    medication: true,
    doses: true,
    health: false,
    feed: false,
    calendar: false,
  };

  const seedAddressed = (overrides: Record<string, unknown> = {}) =>
    testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'invites', 'ASKED'), {
        patientId: JONAS,
        role: 'clinician',
        permissions: clinical,
        createdAt: new Date(),
        expiresAt: soon(),
        usedBy: null,
        forUid: DOCTOR,
        ...overrides,
      });
    });

  const entry = (overrides: Record<string, unknown> = {}) => ({
    inviteCode: 'ASKED',
    role: 'clinician',
    permissions: clinical,
    grantedAt: new Date(),
    revokedAt: null,
    ...overrides,
  });

  it('lets the doctor it was written for accept it', async () => {
    await verifyClinician(DOCTOR);
    await seedAddressed();
    await assertSucceeds(setDoc(doc(asDoctor(), 'patients', JONAS, 'circle', DOCTOR), entry()));
  });

  /*
   * The attack the field exists for. Everything else about this invite is
   * genuine — the patient issued it, it is unused and unexpired, and the card
   * copies its role and permissions exactly. Only the person is wrong.
   */
  it('REFUSES somebody else who has the code', async () => {
    await verifyClinician(OTHER);
    await seedAddressed();
    await assertFails(setDoc(doc(asOther(), 'patients', JONAS, 'circle', OTHER), entry()));
  });

  /*
   * Not an escalation — the circle write would refuse them anyway — but the
   * doctor it was meant for would find a dead code and nothing saying why.
   */
  it('REFUSES a stranger burning it by marking it used', async () => {
    await seedAddressed();
    await assertFails(updateDoc(doc(asOther(), 'invites', 'ASKED'), { usedBy: OTHER }));
  });

  it('lets the addressee claim it', async () => {
    await seedAddressed();
    await assertSucceeds(updateDoc(doc(asDoctor(), 'invites', 'ASKED'), { usedBy: DOCTOR }));
  });

  it('REFUSES the addressee retargeting it to somebody else on the way through', async () => {
    await seedAddressed();
    await assertFails(
      updateDoc(doc(asDoctor(), 'invites', 'ASKED'), { usedBy: DOCTOR, forUid: OTHER }),
    );
  });

  it('REFUSES the addressee widening what it grants', async () => {
    await verifyClinician(DOCTOR);
    await seedAddressed();
    await assertFails(
      setDoc(
        doc(asDoctor(), 'patients', JONAS, 'circle', DOCTOR),
        entry({ permissions: { ...clinical, health: true, feed: true } }),
      ),
    );
  });

  /*
   * Being asked is not being verified. The clamp on the circle write is what
   * refuses this, and it has to hold on this path too — otherwise a patient
   * searching would be a way around the thing the admin panel decides.
   */
  it('REFUSES an unverified addressee accepting a clinician invite', async () => {
    await seedAddressed();
    await assertFails(setDoc(doc(asDoctor(), 'patients', JONAS, 'circle', DOCTOR), entry()));
  });

  it('lets the addressee list what has been asked of them', async () => {
    await seedAddressed();
    await assertSucceeds(
      getDocs(query(collection(asDoctor(), 'invites'), where('forUid', '==', DOCTOR))),
    );
  });

  it('REFUSES a listing of what was asked of somebody else', async () => {
    await seedAddressed();
    await assertFails(
      getDocs(query(collection(asOther(), 'invites'), where('forUid', '==', DOCTOR))),
    );
  });

  it('REFUSES the addressee an unfiltered sweep of every invite', async () => {
    await seedAddressed();
    await assertFails(getDocs(collection(asDoctor(), 'invites')));
  });

  /*
   * The field is absent on every invite issued before it existed, so a shared
   * link has to keep working exactly as it did — a null default rather than a
   * missing-field error that would lock out a family mid-pilot.
   */
  it('leaves an ordinary link invite bearer, as it was', async () => {
    await seedAddressed({
      role: 'supporter',
      permissions: {
        checkins: false,
        medication: false,
        health: false,
        feed: true,
        calendar: true,
      },
      forUid: null,
    });
    await assertSucceeds(
      setDoc(
        doc(asOther(), 'patients', JONAS, 'circle', OTHER),
        entry({
          role: 'supporter',
          permissions: {
            checkins: false,
            medication: false,
            health: false,
            feed: true,
            calendar: true,
          },
        }),
      ),
    );
  });
});

/**
 * GDPR Art. 17.
 *
 * The point of these is the pair: **the same delete is refused before the
 * marker and permitted after it.** That is what makes erasure a separate path
 * rather than a hole in the refusals the rest of this file exists to enforce.
 */
describe('erasure', () => {
  /** A patient document, with or without the marker down. */
  const seedPatient = (erasureStartedAt: Date | null = null) =>
    testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'patients', JONAS), {
        displayName: 'Jonas',
        checkinHour: 20,
        timezone: 'Europe/Brussels',
        onboarded: true,
        createdAt: new Date(),
        erasureStartedAt,
      });
    });

  const seed = (path: string[], data: Record<string, unknown> = { any: true }) =>
    testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), path[0]!, ...path.slice(1)), data);
    });

  it('lets a person start erasing themselves', async () => {
    await seedPatient(null);
    await assertSucceeds(
      updateDoc(doc(asJonas(), 'patients', JONAS), { erasureStartedAt: new Date() }),
    );
  });

  it('does not let anybody else start it for them', async () => {
    await seedPatient(null);
    await assertFails(
      updateDoc(doc(asOther(), 'patients', JONAS), { erasureStartedAt: new Date() }),
    );
  });

  it('refuses to delete a check-in while they are not erasing', async () => {
    // The invariant the rest of the database depends on: a record of what
    // happened cannot be quietly shortened one inconvenient day at a time.
    await seedPatient(null);
    await seed(['patients', JONAS, 'checkins', '2026-08-05'], { mood: 4 });
    await assertFails(deleteDoc(doc(asJonas(), 'patients', JONAS, 'checkins', '2026-08-05')));
  });

  it('permits exactly that delete once erasure has started', async () => {
    await seedPatient(new Date());
    await seed(['patients', JONAS, 'checkins', '2026-08-05'], { mood: 4 });
    await assertSucceeds(deleteDoc(doc(asJonas(), 'patients', JONAS, 'checkins', '2026-08-05')));
  });

  it('refuses to let a medication line be erased while not erasing', async () => {
    // changeLog draws the vertical rules on the chart a psychiatrist reads.
    await seedPatient(null);
    await seed(['patients', JONAS, 'medications', 'med-1'], { name: 'Abilify' });
    await assertFails(deleteDoc(doc(asJonas(), 'patients', JONAS, 'medications', 'med-1')));
  });

  it('does not let somebody else delete your data even while you are erasing', async () => {
    // The marker opens the door for its owner and for nobody else.
    await seedPatient(new Date());
    await seed(['patients', JONAS, 'checkins', '2026-08-05'], { mood: 4 });
    await assertFails(deleteDoc(doc(asOther(), 'patients', JONAS, 'checkins', '2026-08-05')));
  });

  it('does not let a member in the circle delete anything', async () => {
    await seedPatient(new Date());
    await seed(['patients', JONAS, 'circle', OTHER], {
      memberUid: OTHER,
      role: 'supporter',
      permissions: { checkins: true, medication: false, doses: false, health: false, feed: true, calendar: true },
      grantedAt: new Date(),
      revokedAt: null,
    });
    await seed(['patients', JONAS, 'checkins', '2026-08-05'], { mood: 4 });
    await assertFails(deleteDoc(doc(asOther(), 'patients', JONAS, 'checkins', '2026-08-05')));
  });

  it('lets the person cut off the circle during erasure', async () => {
    await seedPatient(new Date());
    await seed(['patients', JONAS, 'circle', OTHER], { memberUid: OTHER, revokedAt: null });
    await assertSucceeds(deleteDoc(doc(asJonas(), 'patients', JONAS, 'circle', OTHER)));
  });

  it("lets the person remove somebody else's reaction from their own post", async () => {
    // A reaction is normally the reactor's alone to place or remove. Erasing
    // the patient takes the post it hangs on, so it goes with it.
    await seedPatient(new Date());
    await seed(['patients', JONAS, 'posts', 'post-1'], { kind: 'completion' });
    await seed(['patients', JONAS, 'posts', 'post-1', 'reactions', OTHER], { type: 'heart' });
    await assertSucceeds(
      deleteDoc(doc(asJonas(), 'patients', JONAS, 'posts', 'post-1', 'reactions', OTHER)),
    );
  });

  it('keeps the permission log unforgeable while making it erasable', async () => {
    await seedPatient(new Date());
    await seed(['patients', JONAS, 'permissionLog', 'entry-1'], { memberUid: OTHER });
    // Still cannot be rewritten — erasure is not an edit.
    await assertFails(
      updateDoc(doc(asJonas(), 'patients', JONAS, 'permissionLog', 'entry-1'), { memberUid: 'x' }),
    );
    await assertSucceeds(deleteDoc(doc(asJonas(), 'patients', JONAS, 'permissionLog', 'entry-1')));
  });

  it('erases the consent record, which is otherwise append-only', async () => {
    await seedPatient(new Date());
    await seed(['patients', JONAS, 'consents', '2026-08-04'], validConsent);
    await assertSucceeds(deleteDoc(doc(asJonas(), 'patients', JONAS, 'consents', '2026-08-04')));
  });

  it('finishes: the patient document and then the account document', async () => {
    await seedPatient(new Date());
    await seed(['users', JONAS], { displayName: 'Jonas' });
    await assertSucceeds(deleteDoc(doc(asJonas(), 'patients', JONAS)));
    await assertSucceeds(deleteDoc(doc(asJonas(), 'users', JONAS)));
  });

  it('refuses deletes when there is no patient document, marker or not', async () => {
    /*
     * `erasing()` was briefly written to permit this, reasoning that a missing
     * patient document proves erasure was under way — the marker lives on it.
     *
     * Ten tests in this file failed and all of them were right. **No patient
     * document is the ordinary state before onboarding finishes**, so that
     * version quietly switched off delete-protection for anybody who had not
     * got that far. Kept as a regression, because the reasoning was plausible
     * enough to write once and would be plausible enough to write again.
     */
    await seed(['patients', JONAS, 'checkins', '2026-08-05'], { mood: 4 });
    await assertFails(deleteDoc(doc(asJonas(), 'patients', JONAS, 'checkins', '2026-08-05')));
  });

  it('lets somebody in that state recover by re-creating the document', async () => {
    // The recovery that makes the strict rule safe, and it needs no special
    // permission: creating your own patient document is always allowed.
    await seed(['patients', JONAS, 'checkins', '2026-08-05'], { mood: 4 });
    await assertSucceeds(
      setDoc(doc(asJonas(), 'patients', JONAS), {
        displayName: 'Jonas',
        checkinHour: 20,
        timezone: 'Europe/Brussels',
        onboarded: true,
        createdAt: new Date(),
        erasureStartedAt: new Date(),
      }),
    );
    await assertSucceeds(deleteDoc(doc(asJonas(), 'patients', JONAS, 'checkins', '2026-08-05')));
  });

  it('lets somebody withdraw a verification request nobody has decided', async () => {
    await seed(['clinicianRequests', JONAS], { outcome: null, riziv: '12345678901' });
    await assertSucceeds(deleteDoc(doc(asJonas(), 'clinicianRequests', JONAS)));
  });

  it('keeps a decided one, because it records access somebody was granted', async () => {
    // A deliberate limit on erasure, not an oversight — Art. 17(3)(e). Written
    // down in docs/GDPR.md and told to anybody it affects.
    await seed(['clinicianRequests', JONAS], { outcome: 'approved', decidedBy: ADMIN });
    await assertFails(deleteDoc(doc(asJonas(), 'clinicianRequests', JONAS)));
  });

  it('does not let one person withdraw another person\'s request', async () => {
    await seed(['clinicianRequests', DOCTOR], { outcome: null });
    await assertFails(deleteDoc(doc(asJonas(), 'clinicianRequests', DOCTOR)));
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
