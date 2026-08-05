import { paths, type ClinicianRequest, type Discipline } from '@luwte/core';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { db } from './client';

/**
 * PRD 6.7 — whether somebody is a clinician is decided by a person.
 *
 * Reading verification decides whether the console is offered; it decides
 * nothing about access. Every read of patient data still resolves through the
 * circle, and the rules refuse a medication write from anyone this returns
 * false for — so a tampered client gains a menu item and nothing else.
 */
export async function isVerifiedClinician(uid: string): Promise<boolean> {
  try {
    const snapshot = await getDoc(doc(db, paths.clinician(uid)));
    return snapshot.exists();
  } catch {
    // Reading someone else's record is refused, and so is reading your own
    // when signed out. Neither is a clinician.
    return false;
  }
}

/**
 * Whether this person may decide who is a clinician.
 *
 * `admins/{uid}` is bootstrapped with the Admin SDK and refused to every
 * client, so this is a question the app asks rather than a claim it accepts.
 */
export async function isAdmin(uid: string): Promise<boolean> {
  try {
    const snapshot = await getDoc(doc(db, paths.admin(uid)));
    return snapshot.exists();
  } catch {
    return false;
  }
}

export type RequestRecord = ClinicianRequest & { uid: string };

const toDate = (value: unknown): Date | null =>
  typeof (value as { toDate?: () => Date })?.toDate === 'function'
    ? (value as { toDate: () => Date }).toDate()
    : value instanceof Date
      ? value
      : null;

const readRequest = (uid: string, data: Record<string, unknown>): RequestRecord => ({
  uid,
  displayName: (data.displayName ?? '') as string,
  discipline: (data.discipline ?? 'andere') as Discipline,
  rizivNumber: (data.rizivNumber ?? '') as string,
  practice: (data.practice ?? '') as string,
  requestedAt: toDate(data.requestedAt) ?? new Date(),
  decidedAt: toDate(data.decidedAt),
  decidedBy: (data.decidedBy ?? null) as string | null,
  outcome: (data.outcome ?? null) as ClinicianRequest['outcome'],
});

/** Applying for yourself. Undecided by construction; the rules insist on it. */
export async function applyForVerification(
  uid: string,
  values: { displayName: string; discipline: Discipline; rizivNumber: string; practice: string },
): Promise<void> {
  await setDoc(doc(db, paths.clinicianRequest(uid)), {
    ...values,
    requestedAt: serverTimestamp(),
    decidedAt: null,
    decidedBy: null,
    outcome: null,
  });
}

export async function readMyRequest(uid: string): Promise<RequestRecord | null> {
  try {
    const snapshot = await getDoc(doc(db, paths.clinicianRequest(uid)));
    return snapshot.exists() ? readRequest(snapshot.id, snapshot.data()) : null;
  } catch {
    return null;
  }
}

/** The queue. Refused to anybody who is not an admin, by the rules. */
export async function readRequests(): Promise<RequestRecord[]> {
  const snapshot = await getDocs(collection(db, paths.clinicianRequests()));
  return snapshot.docs
    .map((document) => readRequest(document.id, document.data()))
    .sort((a, b) => a.requestedAt.getTime() - b.requestedAt.getTime());
}

/**
 * The decision, and the only place `clinicians/` is written.
 *
 * Two writes rather than one, deliberately: the verification document is what
 * grants the capability, and the request keeps the record of who asked and
 * what was decided. Approving writes both; declining writes only the record,
 * so a decline leaves no capability behind.
 */
export async function decideRequest(
  request: RequestRecord,
  adminUid: string,
  approve: boolean,
): Promise<void> {
  if (approve) {
    await setDoc(doc(db, paths.clinician(request.uid)), {
      verifiedAt: serverTimestamp(),
      verifiedBy: adminUid,
      discipline: request.discipline,
      rizivNumber: request.rizivNumber,
    });
  }

  await updateDoc(doc(db, paths.clinicianRequest(request.uid)), {
    outcome: approve ? 'verified' : 'declined',
    decidedBy: adminUid,
    decidedAt: serverTimestamp(),
  });
}
