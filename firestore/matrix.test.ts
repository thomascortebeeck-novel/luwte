import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { deleteDoc, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';

/**
 * PRD 5.3 — every (reader × permission × collection × operation) cell.
 *
 * `rules.test.ts` is the attacks somebody would actually try, written one at a
 * time as each feature landed. This is the complement: generated rather than
 * remembered, so a collection nobody wrote a test for shows as a failing cell
 * instead of as silence.
 *
 * A cell asserts only the *access* answer. Shape rules — a date matching its
 * document id, a `source` being present — stay in `rules.test.ts`, because the
 * matrix would need a valid fixture per collection to test them and that is
 * how a generated suite turns into a second implementation of the app. The
 * payloads below carry just enough shape to get *past* those rules, so that a
 * refusal is always about who is asking rather than about what they sent.
 *
 * Requires the Firestore emulator. Run with:
 *   pnpm test:rules
 */

// `demo-` guarantees the emulator never reaches a live project. Same id as
// `rules.test.ts` — one emulator run, one project.
const PROJECT_ID = 'demo-luwte-rules';

const PATIENT = 'uid-jonas';

/**
 * Six people, and the whole point is that five of them are refused.
 *
 * `granted` holds **every** permission and `notGranted` holds none, so one
 * pair of fixtures answers every row: a collection keyed to a permission is
 * allowed to the first and refused to the second, and a collection keyed to
 * nothing is refused to both. `revoked` holds every permission *and* a
 * revocation date, which is the only difference between it and `granted` —
 * `granted()` in the rules reads `revokedAt` before it reads the key.
 */
const READERS = ['self', 'granted', 'notGranted', 'revoked', 'stranger', 'unauthenticated'] as const;
type Reader = (typeof READERS)[number];

const UID: Record<Exclude<Reader, 'unauthenticated'>, string> = {
  self: PATIENT,
  granted: 'uid-granted',
  notGranted: 'uid-not-granted',
  revoked: 'uid-revoked',
  stranger: 'uid-stranger',
};

/**
 * A circle member who is none of the readers. The `circle` row reads *this*
 * person's card, because "may I read somebody else's entry" is the question
 * the matrix means. Reading your **own** entry is deliberately allowed — a
 * supporter has to be able to see what they were granted — and is tested by
 * name in `rules.test.ts` rather than smuggled in here as an exception.
 */
const THIRD_PARTY = 'uid-someone-else';

const permissionKeys = [
  'checkins',
  'medication',
  'doses',
  'health',
  'feed',
  'calendar',
  'plan',
] as const;
type PermissionKey = (typeof permissionKeys)[number];

const ALL_ON = Object.fromEntries(permissionKeys.map((k) => [k, true]));
const ALL_OFF = Object.fromEntries(permissionKeys.map((k) => [k, false]));

const DATE = '2026-08-05';

type Collection = {
  path: string;
  doc: string;
  /** The permission that opens this collection to a member, or null for self-only. */
  permission: PermissionKey | null;
  /** Enough shape to clear the collection's own create rule, and no more. */
  payload: Record<string, unknown>;
  /** Deliberate departures from "a write is the patient's alone". */
  selfMayUpdate?: false;
  selfMayDelete?: true;
  /** Why this row departs, in one sentence, next to the departure. */
  note?: string;
};

const COLLECTIONS: readonly Collection[] = [
  {
    path: 'checkins',
    doc: DATE,
    permission: 'checkins',
    payload: { date: DATE, mood: 4, arousal: 3, flatness: 2, sleepHours: 7 },
  },
  {
    path: 'weekly',
    doc: '2026-W32',
    permission: 'checkins',
    payload: { week: '2026-W32', akathisia: 1 },
  },
  {
    path: 'medications',
    doc: 'med-1',
    permission: 'medication',
    // No `prescribedBy`: an entry a clinician owns is a different question and
    // has its own four branches, tested by name in `rules.test.ts`.
    payload: { name: 'quetiapine', dose: '100 mg', changeLog: [] },
  },
  {
    path: 'doses',
    doc: `${DATE}_med-1_0800`,
    permission: 'doses',
    payload: { medId: 'med-1', date: DATE, taken: true },
  },
  {
    path: 'health',
    doc: DATE,
    permission: 'health',
    payload: { date: DATE, sleepMinutes: 430, source: { app: 'Health Connect' } },
  },
  {
    path: 'activities',
    doc: 'act-1',
    permission: 'calendar',
    /*
     * `status: 'accepted'` on purpose, in both directions.
     *
     * Reading: a member cannot read a *declined* activity at all, so a
     * declined fixture would measure that rule rather than this one — and it
     * is already tested by name.
     *
     * Writing: a member creating a `suggested` activity in their own name is
     * one of the three deliberate exceptions to "a write is the patient's
     * alone", and it is excluded here rather than encoded, because a
     * generated suite that quietly reproduces an exception stops being a check
     * on it. An accepted activity from a member is the thing the calendar
     * exists to refuse — a supporter may offer, never place.
     */
    payload: {
      title: 'wandelen',
      date: DATE,
      createdBy: PATIENT,
      status: 'accepted',
      recurrence: null,
    },
  },
  {
    path: 'completions',
    /*
     * **The one cell the matrix changed my mind about.** The brief keyed this
     * to `calendar`, which is what you would expect: a completion hangs off an
     * activity, and the activity is calendar data. The rules say self-only,
     * and the rules are right — the reasoning is written out above
     * `match /completions/` and it is that a completion carries pleasure and
     * mastery, which is somebody rating their own day rather than a plan for
     * it. Sharing one is what the feed is for, per item and by choice.
     *
     * So the expectation was wrong, not the rule. Left keyed to null, which
     * makes the `granted` reader — who holds every permission including
     * `calendar` — a standing assertion that the narrow reading holds.
     */
    doc: `act-1_${DATE}`,
    permission: null,
    payload: { activityId: 'act-1', date: DATE, pleasure: 5, mastery: 4 },
  },
  {
    path: 'posts',
    doc: 'post-1',
    permission: 'feed',
    // Reacting and commenting are the other two deliberate exceptions. They
    // live in subcollections of this document and are excluded for the same
    // reason as the suggestion above.
    payload: { kind: 'completion', activityId: 'act-1', createdAt: new Date() },
  },
  {
    path: 'plan',
    doc: 'plan-1',
    permission: 'plan',
    payload: { notice: 'ik slaap slechter', detail: 'ik bel mijn zus' },
    selfMayDelete: true,
    note:
      'The rest of this database is a record of what happened and refuses delete. A plan '
      + 'is a current intention, and a warning sign that has stopped being true is noise in '
      + 'a document somebody needs to read quickly on a bad day.',
  },
  {
    path: 'consents',
    doc: 'v1',
    permission: null,
    payload: {
      version: 'v1',
      grants: { essential: true, healthData: true },
      locale: 'nl',
      grantedAt: new Date(),
    },
  },
  {
    path: 'permissionLog',
    doc: 'entry-1',
    permission: null,
    payload: { memberUid: THIRD_PARTY, key: 'checkins', granted: true, at: new Date() },
    selfMayUpdate: false,
    note:
      'Append-only. A history that can be edited answers "what did I agree to in March" no '
      + 'better than memory does, which is the whole reason the log exists.',
  },
  {
    path: 'circle',
    doc: THIRD_PARTY,
    permission: null,
    payload: {
      memberUid: THIRD_PARTY,
      role: 'supporter',
      permissions: ALL_OFF,
      grantedAt: new Date(),
      revokedAt: null,
    },
  },
];

/**
 * Read resolves through the circle, and nothing else opens it.
 *
 *   | reader          | permission null | permission granted | permission off |
 *   | self            | allow           | allow              | allow          |
 *   | granted         | deny            | allow              | deny           |
 *   | notGranted      | deny            | deny               | deny           |
 *   | revoked         | deny            | deny               | deny           |
 *   | stranger        | deny            | deny               | deny           |
 *   | unauthenticated | deny            | deny               | deny           |
 *
 * `granted` holds every key, so the middle column is the row it lands in and
 * the right-hand column is `notGranted`.
 */
function mayRead(c: Collection, reader: Reader): boolean {
  if (reader === 'self') return true;
  return reader === 'granted' && c.permission !== null;
}

/**
 * A write is the patient's alone, everywhere in this matrix.
 *
 * Delete is refused to everybody, the patient included: this database is a
 * record of what happened, and an Art. 17 erasure is a separate path opened by
 * `erasureStartedAt` on the patient document — which the fixture deliberately
 * does not carry, so these cells measure ordinary operation. The erasure path
 * has its own suite in `rules.test.ts`.
 */
function mayWrite(c: Collection, reader: Reader, op: 'create' | 'update' | 'delete'): boolean {
  if (reader !== 'self') return false;
  if (op === 'delete') return c.selfMayDelete === true;
  if (op === 'update') return c.selfMayUpdate !== false;
  return true;
}

let testEnv: RulesTestEnvironment;

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

const dbFor = (reader: Reader) =>
  reader === 'unauthenticated'
    ? testEnv.unauthenticatedContext().firestore()
    : testEnv.authenticatedContext(UID[reader]).firestore();

const member = (uid: string, permissions: Record<string, boolean>, revokedAt: Date | null) => ({
  // `memberUid` duplicates the document id so a clinician's collection group
  // query can filter on it. The rules refuse a card where the two disagree.
  memberUid: uid,
  role: 'supporter',
  permissions,
  grantedAt: new Date(),
  revokedAt,
});

/**
 * The three members, and a patient document with **no** erasure marker — so
 * every delete cell is refused because the record is a record, not because
 * the patient document happens to be missing. (`erasing()` was once written to
 * treat a missing patient document as proof of an erasure in progress; that is
 * the ordinary state before onboarding finishes, and it switched delete
 * protection off for everybody who had not got that far.)
 */
const seedCircle = () =>
  testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'patients', PATIENT), { createdAt: new Date() });
    await setDoc(doc(db, 'patients', PATIENT, 'circle', UID.granted), member(UID.granted, ALL_ON, null));
    await setDoc(
      doc(db, 'patients', PATIENT, 'circle', UID.notGranted),
      member(UID.notGranted, ALL_OFF, null),
    );
    await setDoc(
      doc(db, 'patients', PATIENT, 'circle', UID.revoked),
      member(UID.revoked, ALL_ON, new Date()),
    );
  });

const seedTarget = (c: Collection) =>
  testEnv.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'patients', PATIENT, c.path, c.doc), c.payload);
  });

const verdict = (allowed: boolean) => (allowed ? 'allow' : 'deny');
const assertThat = (allowed: boolean) => (allowed ? assertSucceeds : assertFails);

/**
 * The guard that makes this a matrix rather than a longer list.
 *
 * A generated suite only helps if adding a collection makes a cell appear.
 * Left to itself the table above is a second thing to remember, and the whole
 * complaint about `rules.test.ts` was that remembering is what fails. So the
 * source of truth is `PATIENT_SUBCOLLECTIONS` — read from the file rather than
 * imported, because `@luwte/core` does not resolve from the repo root and the
 * rules config deliberately has no aliases — and a collection that exists
 * there and not here fails **here**, at the moment the collection is written.
 *
 * Same shape as the guard in `contrast.test.ts` and the one in
 * `erasure.test.ts`, and the failure it prevents is the same size as the
 * second: a collection with no matrix row is a subtree whose access nobody
 * checked, holding Article 9 data, with nothing on either side to show it.
 */
function declaredSubcollections(): string[] {
  const source = readFileSync(
    join(process.cwd(), 'packages', 'core', 'src', 'model', 'erasure.ts'),
    'utf8',
  );
  const body = source
    .split('export const PATIENT_SUBCOLLECTIONS = [')[1]
    ?.split('] as const;')[0];
  if (body === undefined) throw new Error('PATIENT_SUBCOLLECTIONS not found in erasure.ts');
  return [...body.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*/g, '').matchAll(/'([^']+)'/g)].map(
    (m) => m[1],
  );
}

describe('the matrix covers the schema', () => {
  it('has a row for every sub-collection under a patient', () => {
    const covered = new Set(COLLECTIONS.map((c) => c.path));
    const missing = declaredSubcollections().filter((name) => !covered.has(name));
    if (missing.length > 0) {
      throw new Error(
        `No access matrix row for: ${missing.join(', ')}. `
          + 'Add one to COLLECTIONS with the permission that opens it, or null if it is '
          + 'self-only. A collection with no row is one nobody checked.',
      );
    }
  });

  it('has no row for a sub-collection that no longer exists', () => {
    const declared = new Set(declaredSubcollections());
    const stale = COLLECTIONS.map((c) => c.path).filter((path) => !declared.has(path));
    if (stale.length > 0) {
      throw new Error(
        `Matrix rows for collections that are not in PATIENT_SUBCOLLECTIONS: ${stale.join(', ')}. `
          + 'Either the collection was removed and this row is dead, or it was added to the '
          + 'rules and never to erasure — which would be health data outliving an Art. 17 request.',
      );
    }
  });
});

for (const c of COLLECTIONS) {
  const label = `${c.path} (${c.permission ?? 'self only'})`;

  describe(label, () => {
    for (const reader of READERS) {
      const ref = () => doc(dbFor(reader), 'patients', PATIENT, c.path, c.doc);

      it(`${reader} · read → ${verdict(mayRead(c, reader))}`, async () => {
        await seedCircle();
        await seedTarget(c);
        await assertThat(mayRead(c, reader))(getDoc(ref()));
      });

      it(`${reader} · create → ${verdict(mayWrite(c, reader, 'create'))}`, async () => {
        // No target seeded: a `set` on an absent document is a create.
        await seedCircle();
        await assertThat(mayWrite(c, reader, 'create'))(setDoc(ref(), c.payload));
      });

      it(`${reader} · update → ${verdict(mayWrite(c, reader, 'update'))}`, async () => {
        await seedCircle();
        await seedTarget(c);
        await assertThat(mayWrite(c, reader, 'update'))(updateDoc(ref(), { updatedAt: new Date() }));
      });

      it(`${reader} · delete → ${verdict(mayWrite(c, reader, 'delete'))}`, async () => {
        await seedCircle();
        await seedTarget(c);
        await assertThat(mayWrite(c, reader, 'delete'))(deleteDoc(ref()));
      });
    }
  });
}
