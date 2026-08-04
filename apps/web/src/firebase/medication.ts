import {
  diffMedication,
  doseId,
  paths,
  type DoseStatus,
  type Medication,
} from '@luwte/core';
import {
  arrayUnion,
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

export type MedicationRecord = Medication & { id: string };

export async function readActiveMedications(uid: string): Promise<MedicationRecord[]> {
  const snapshot = await getDocs(
    query(collection(db, paths.medications(uid)), where('activeTo', '==', null)),
  );

  return snapshot.docs
    .map((document) => {
      const data = document.data();
      return {
        id: document.id,
        name: data.name ?? '',
        dose: data.dose ?? '',
        times: (data.times ?? []) as string[],
        purpose: data.purpose ?? '',
        activeFrom: data.activeFrom?.toDate?.() ?? new Date(),
        activeTo: null,
      };
    })
    .sort((a, b) => (a.times[0] ?? '').localeCompare(b.times[0] ?? ''));
}

export async function createMedication(
  uid: string,
  values: Omit<Medication, 'activeFrom' | 'activeTo'>,
): Promise<void> {
  const id = doc(collection(db, paths.medications(uid))).id;
  await setDoc(doc(db, paths.medication(uid, id)), {
    ...values,
    activeFrom: serverTimestamp(),
    activeTo: null,
    // PRD 6.6 — the log exists from the first write, not from whenever a
    // clinician arrives. A log started later cannot show the change that
    // already happened, and those changes are the chart's whole value.
    changeLog: [],
  });
}

/**
 * Applies an edit and appends what changed, in one write, so a change can
 * never be saved without its log entry.
 */
export async function updateMedication(
  uid: string,
  medId: string,
  before: Partial<Medication>,
  after: Partial<Medication>,
  by: string,
): Promise<void> {
  const changes = diffMedication(before, after, by, new Date());
  if (changes.length === 0) return;

  await updateDoc(doc(db, paths.medication(uid, medId)), {
    ...after,
    changeLog: arrayUnion(...changes),
  });
}

export async function readDoseStatuses(
  uid: string,
  dateKey: string,
): Promise<Record<string, DoseStatus>> {
  const snapshot = await getDocs(
    query(collection(db, paths.doses(uid)), where('date', '==', dateKey)),
  );
  const statuses: Record<string, DoseStatus> = {};
  for (const document of snapshot.docs) {
    statuses[document.id] = (document.data().status ?? 'pending') as DoseStatus;
  }
  return statuses;
}

/**
 * Not awaited by the UI. Ticking a dose has to feel instant and has to work
 * with no signal; the keyed document id means a double sync records one dose.
 */
export function setDose(
  uid: string,
  dateKey: string,
  medId: string,
  time: string,
  status: DoseStatus,
): string {
  const id = doseId(dateKey, medId, time);
  void setDoc(
    doc(db, paths.dose(uid, id)),
    {
      date: dateKey,
      medId,
      scheduledAt: time,
      status,
      takenAt: status === 'taken' ? serverTimestamp() : null,
    },
    { merge: true },
  );
  return id;
}

export async function readMedication(uid: string, medId: string): Promise<Medication | null> {
  const snapshot = await getDoc(doc(db, paths.medication(uid, medId)));
  return snapshot.exists() ? (snapshot.data() as Medication) : null;
}
