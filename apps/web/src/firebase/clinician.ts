import {
  DEFAULT_CLINICIAN_PERMISSIONS,
  inviteCode,
  paths,
  searchKey,
  type ClinicianDirectoryEntry,
  type ClinicianRequest,
  type Discipline,
} from '@luwte/core';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from './client';

/**
 * The same generator the circle invites use — one tested, unbiased function,
 * and an alphabet already chosen for being read aloud across a kitchen table.
 */
function newConnectionCode(): string {
  return inviteCode(crypto.getRandomValues(new Uint8Array(64)));
}

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
export type DirectoryRecord = ClinicianDirectoryEntry & { code: string };

const readEntry = (code: string, data: Record<string, unknown>): DirectoryRecord => ({
  code,
  uid: (data.uid ?? '') as string,
  displayName: (data.displayName ?? '') as string,
  discipline: (data.discipline ?? 'andere') as Discipline,
  practice: (data.practice ?? '') as string,
  searchName: (data.searchName ?? '') as string,
  listed: data.listed === true,
});

/** Resolving a code somebody handed over. Naming it is the whole capability. */
export async function readClinicianByCode(code: string): Promise<DirectoryRecord | null> {
  try {
    const snapshot = await getDoc(doc(db, paths.clinicianDirectoryEntry(code.trim())));
    return snapshot.exists() ? readEntry(snapshot.id, snapshot.data()) : null;
  } catch {
    return null;
  }
}

/** The clinician's own code, so they can hand it out. */
export async function readMyDirectoryEntry(uid: string): Promise<DirectoryRecord | null> {
  try {
    const snapshot = await getDocs(
      query(
        collection(db, paths.clinicianDirectory()),
        where('listed', '==', true),
        where('uid', '==', uid),
      ),
    );
    const first = snapshot.docs[0];
    return first ? readEntry(first.id, first.data()) : null;
  } catch {
    return null;
  }
}

/**
 * The patient adding their doctor.
 *
 * Written by the patient, into their own circle — which is why this needs no
 * new access path at all. The code names the clinician; the patient's write is
 * what grants. The rules refuse the card unless an admin verified them, so a
 * code alone can never make somebody a clinician.
 */
export async function connectClinician(
  patientUid: string,
  entry: DirectoryRecord,
  relation: string,
): Promise<void> {
  await setDoc(doc(db, paths.circleMember(patientUid, entry.uid)), {
    memberUid: entry.uid,
    role: 'clinician',
    relation,
    permissions: { ...DEFAULT_CLINICIAN_PERMISSIONS },
    grantedAt: serverTimestamp(),
    revokedAt: null,
  });
}

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

    /*
     * The nameplate, and with it the connection code the clinician hands to a
     * patient. Issued here because approving is the moment they become
     * findable at all, and because the directory is admin-written like the
     * verification it accompanies.
     *
     * `listed: true` by default and changeable later — a doctor who does not
     * want to be searchable still has a code that works.
     */
    await setDoc(doc(db, paths.clinicianDirectoryEntry(newConnectionCode())), {
      uid: request.uid,
      displayName: request.displayName,
      discipline: request.discipline,
      practice: request.practice,
      searchName: searchKey(request.displayName),
      listed: true,
    });
  }

  await updateDoc(doc(db, paths.clinicianRequest(request.uid)), {
    outcome: approve ? 'verified' : 'declined',
    decidedBy: adminUid,
    decidedAt: serverTimestamp(),
  });
}
