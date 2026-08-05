import {
  buildExport,
  ERASURE_ORDER,
  PATIENT_SUBCOLLECTIONS,
  POST_SUBCOLLECTIONS,
  paths,
  type ExportEnvelope,
} from '@luwte/core';
import { deleteUser } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  updateDoc,
  where,
  writeBatch,
  type DocumentData,
} from 'firebase/firestore';
import { auth, db } from './client';

/**
 * GDPR Article 15 and Article 17, both **on the device**.
 *
 * The printable report established the shape (D16): a Cloud Function would
 * need Blaze to do what the client already has the permissions for, and
 * Article 9 data is better off not making the trip. The rules do the enforcing
 * either way — this file cannot delete anything its caller was not already
 * allowed to delete.
 */

/** Firestore Timestamps and refs are not JSON. Nothing else here needs touching. */
function plain(value: unknown): unknown {
  if (value === null || value === undefined) return null;
  if (typeof value === 'object') {
    const candidate = value as { toDate?: () => Date };
    if (typeof candidate.toDate === 'function') return candidate.toDate().toISOString();
    if (Array.isArray(value)) return value.map(plain);
    return Object.fromEntries(Object.entries(value as DocumentData).map(([k, v]) => [k, plain(v)]));
  }
  return value;
}

async function readCollection(path: string): Promise<Record<string, unknown>[]> {
  const snapshot = await getDocs(collection(db, path));
  return snapshot.docs.map((d) => ({ id: d.id, ...(plain(d.data()) as object) }));
}

/**
 * Article 15 — everything, in one file, readable without luwte.
 *
 * `buildExport` throws if a section is missing rather than shipping a partial
 * file, because an export silently missing `doses` is indistinguishable from
 * the export of somebody who never ticked one off.
 */
export async function exportEverything(uid: string): Promise<ExportEnvelope> {
  const sections: Record<string, unknown> = {};

  const [account, patient] = await Promise.all([
    getDoc(doc(db, paths.user(uid))),
    getDoc(doc(db, paths.patient(uid))),
  ]);
  sections.account = account.exists() ? plain(account.data()) : null;
  sections.patient = patient.exists() ? plain(patient.data()) : null;

  await Promise.all(
    PATIENT_SUBCOLLECTIONS.map(async (name) => {
      sections[name] = await readCollection(`${paths.patient(uid)}/${name}`);
    }),
  );

  /*
   * Reactions and comments live under a post, so they are not reachable by
   * listing the patient's sub-collections. Attached to their post rather than
   * flattened: "who said what about which day" is the part worth having.
   */
  const posts = sections.posts as { id: string }[];
  sections.posts = await Promise.all(
    posts.map(async (post) => ({
      ...post,
      ...Object.fromEntries(
        await Promise.all(
          POST_SUBCOLLECTIONS.map(async (sub) => [
            sub,
            await readCollection(`${paths.posts(uid)}/${post.id}/${sub}`),
          ]),
        ),
      ),
    })),
  );

  // Invites are the person's own, but live at the root rather than under them.
  const invites = await getDocs(query(collection(db, paths.invites()), where('patientId', '==', uid)));
  sections.invites = invites.docs.map((d) => ({ id: d.id, ...(plain(d.data()) as object) }));

  const request = await getDoc(doc(db, paths.clinicianRequest(uid)));
  sections.clinicianRequest = request.exists() ? plain(request.data()) : null;

  return buildExport(uid, new Date(), sections);
}

/** Firestore caps a batch at 500 writes. */
const BATCH_LIMIT = 450;

async function deleteAll(path: string): Promise<number> {
  const snapshot = await getDocs(collection(db, path));
  let done = 0;
  for (let i = 0; i < snapshot.docs.length; i += BATCH_LIMIT) {
    const batch = writeBatch(db);
    for (const d of snapshot.docs.slice(i, i + BATCH_LIMIT)) batch.delete(d.ref);
    await batch.commit();
    done += Math.min(BATCH_LIMIT, snapshot.docs.length - i);
  }
  return done;
}

export type ErasureStep = (typeof ERASURE_ORDER)[number]['step'];

/**
 * Article 17.
 *
 * **The order is the design, and it is not an implementation detail.** Access
 * is revoked before anything is removed: invites first, because an unredeemed
 * invite is a pending grant, then the circle, which cuts off everyone who
 * already had access. Only then does content go.
 *
 * Run the other way round, a teardown interrupted by a flat battery would
 * leave the remaining months readable by the whole circle. Run this way, the
 * same interruption leaves the person with their own data and nobody else's
 * access to it — the failure worth having.
 *
 * The patient document goes late because the security rules read the erasure
 * marker from it, and the account document last because it heads the lot.
 */
export async function eraseEverything(
  uid: string,
  onStep?: (step: ErasureStep) => void,
): Promise<void> {
  // The marker first. Until it is down the rules refuse every delete below,
  // which is what keeps erasure a deliberate path rather than a loose end.
  await updateDoc(doc(db, paths.patient(uid)), { erasureStartedAt: new Date() });

  onStep?.('invites');
  const invites = await getDocs(query(collection(db, paths.invites()), where('patientId', '==', uid)));
  for (const d of invites.docs) await deleteDoc(d.ref);

  onStep?.('circle');
  await deleteAll(paths.circle(uid));

  onStep?.('posts');
  const posts = await getDocs(collection(db, paths.posts(uid)));
  for (const post of posts.docs) {
    // A supporter's comment is their own words, and it does not survive the
    // post it answers in any meaningful form. It goes with it. See
    // COMMENTS_DIE_WITH_THE_POST.
    for (const sub of POST_SUBCOLLECTIONS) {
      await deleteAll(`${paths.posts(uid)}/${post.id}/${sub}`);
    }
    await deleteDoc(post.ref);
  }

  onStep?.('content');
  for (const name of PATIENT_SUBCOLLECTIONS) {
    if (name === 'circle' || name === 'posts') continue;
    await deleteAll(`${paths.patient(uid)}/${name}`);
  }

  onStep?.('clinicianRequest');
  /*
   * Only an *undecided* request can go. A decided one records that an admin
   * granted somebody clinical access to other people's records, and the rules
   * keep it — Art. 17(3)(e). Refusal here is expected rather than a fault, so
   * it must not abort the erasure; the person is told in docs/GDPR.md terms.
   */
  await deleteDoc(doc(db, paths.clinicianRequest(uid))).catch(() => undefined);

  onStep?.('patient');
  await deleteDoc(doc(db, paths.patient(uid)));

  onStep?.('account');
  await deleteDoc(doc(db, paths.user(uid)));

  /*
   * Last, and the only part that is not Firestore: the sign-in itself. Leaving
   * it would mean the person's email still exists in a system they asked to be
   * erased from.
   *
   * Firebase refuses this when the session is old (`requires-recent-login`).
   * That is surfaced rather than swallowed — the data is already gone, and
   * telling somebody to sign in again to finish is honest where a silent
   * failure would leave them believing something untrue.
   */
  if (auth.currentUser && auth.currentUser.uid === uid) {
    await deleteUser(auth.currentUser);
  }
}
