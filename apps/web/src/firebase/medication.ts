import {
  adoptionChange,
  applyPendingChange,
  diffMedication,
  doseId,
  hasAnnotation,
  paths,
  releaseChange,
  type DoseAnnotation,
  type DoseStatus,
  type Medication,
  type PendingChange,
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

export type MedicationRecord = Medication & {
  id: string;
  pendingChange: PendingChange | null;
};

const toPendingChange = (value: unknown): PendingChange | null => {
  if (value == null || typeof value !== 'object') return null;
  const data = value as Record<string, unknown>;
  return {
    proposedBy: (data.proposedBy ?? '') as string,
    proposedAt:
      (data.proposedAt as { toDate?: () => Date })?.toDate?.() ??
      (data.proposedAt instanceof Date ? data.proposedAt : new Date()),
    ...(data.name === undefined ? {} : { name: data.name as string }),
    ...(data.dose === undefined ? {} : { dose: data.dose as string }),
    ...(data.times === undefined ? {} : { times: data.times as string[] }),
    ...(data.purpose === undefined ? {} : { purpose: data.purpose as string }),
    ...(data.stopping === undefined ? {} : { stopping: data.stopping as boolean }),
    ...(data.note === undefined ? {} : { note: data.note as string }),
  };
};

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
        prescribedBy: (data.prescribedBy ?? null) as string | null,
        pendingChange: toPendingChange(data.pendingChange),
      };
    })
    .sort((a, b) => (a.times[0] ?? '').localeCompare(b.times[0] ?? ''));
}

export async function createMedication(
  uid: string,
  values: Omit<Medication, 'activeFrom' | 'activeTo' | 'prescribedBy'>,
  /**
   * The clinician's uid when a verified clinician is writing, null when the
   * patient is keeping their own list. The rules refuse any other pairing:
   * a patient may not set it, and a clinician may not set it to someone else.
   */
  prescribedBy: string | null = null,
): Promise<void> {
  const id = doc(collection(db, paths.medications(uid))).id;
  await setDoc(doc(db, paths.medication(uid, id)), {
    ...values,
    prescribedBy,
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
  /** Set when a clinician is editing, so the entry becomes theirs. */
  prescribedBy?: string,
): Promise<void> {
  const at = new Date();
  const changes = diffMedication(before, after, by, at);

  /*
   * Taking over a line the person wrote is logged as its own entry, not left
   * implicit in the field diff — `diffMedication` deliberately tracks only
   * what a human reads on a timeline, and ownership is not one of those
   * fields. Without this the person's list would simply start saying "je
   * dokter heeft dit ingesteld" one day, with nothing recording when or by
   * whom (J5).
   */
  const adoption =
    prescribedBy === undefined ? null : adoptionChange(before, prescribedBy, at);
  if (adoption) changes.push(adoption);

  if (changes.length === 0 && prescribedBy === undefined) return;

  await updateDoc(doc(db, paths.medication(uid, medId)), {
    ...after,
    ...(prescribedBy === undefined ? {} : { prescribedBy }),
    // arrayUnion, never a replacement: the rules refuse a log that shrinks,
    // because shortening it would erase a dose change that happened.
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

/** What was actually taken today, where the person said something about it. */
export async function readDoseAnnotations(
  uid: string,
  dateKey: string,
): Promise<Record<string, DoseAnnotation>> {
  const snapshot = await getDocs(
    query(collection(db, paths.doses(uid)), where('date', '==', dateKey)),
  );
  const notes: Record<string, DoseAnnotation> = {};
  for (const document of snapshot.docs) {
    const data = document.data();
    const annotation: DoseAnnotation = {
      ...(data.actualDose ? { actualDose: data.actualDose as string } : {}),
      ...(data.note ? { note: data.note as string } : {}),
    };
    if (hasAnnotation(annotation)) notes[document.id] = annotation;
  }
  return notes;
}

/**
 * Recording that what was taken is not what was prescribed.
 *
 * Merged onto the dose the tick already created, never replacing it — the
 * tick is the load-bearing fact and this is a remark on it. Written after the
 * tick has been saved, so abandoning this form loses nothing, exactly as the
 * pleasure and mastery questions do.
 */
export async function annotateDose(
  uid: string,
  doseKey: string,
  annotation: DoseAnnotation,
): Promise<void> {
  await setDoc(
    doc(db, paths.dose(uid, doseKey)),
    {
      actualDose: annotation.actualDose?.trim() ?? '',
      note: annotation.note?.trim() ?? '',
    },
    { merge: true },
  );
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

/**
 * The person asking for a change to something their clinician prescribed.
 *
 * Only `pendingChange` is written, because that is the only field the rules
 * will let them touch on a prescribed entry — and that refusal is the point:
 * asking and doing are different acts, and only one of them is theirs.
 */
export async function proposeMedicationChange(
  uid: string,
  medId: string,
  change: Omit<PendingChange, 'proposedBy' | 'proposedAt'>,
): Promise<void> {
  await updateDoc(doc(db, paths.medication(uid, medId)), {
    pendingChange: { ...change, proposedBy: uid, proposedAt: serverTimestamp() },
  });
}

/**
 * The clinician deciding. Approving applies the values the person asked for
 * and logs the change like any other; declining clears the request and
 * changes nothing.
 *
 * Declining writes no message. The person sees their request is no longer
 * pending, and whatever needs saying is said between them — the app does not
 * deliver a refusal.
 */
export async function resolvePendingChange(
  uid: string,
  medication: MedicationRecord,
  by: string,
  approve: boolean,
): Promise<void> {
  if (!approve) {
    await updateDoc(doc(db, paths.medication(uid, medication.id)), {
      pendingChange: null,
      prescribedBy: by,
    });
    return;
  }

  const change = medication.pendingChange;
  if (!change) return;

  const requested = applyPendingChange(change);
  /*
   * Merged over the current values before diffing. A proposal carries only
   * the fields the person asked about, and diffing that against the whole
   * medication reads every untouched field as having been cleared — which
   * would write three phantom entries into the log for every approval, and
   * the log is what draws the vertical rules on the chart.
   */
  const after = { ...medication, ...requested };
  const changes = diffMedication(medication, after, by, new Date());

  await updateDoc(doc(db, paths.medication(uid, medication.id)), {
    ...requested,
    prescribedBy: by,
    pendingChange: null,
    changeLog: arrayUnion(...changes),
  });
}

/**
 * Taking a line back when the clinician who owned it is gone.
 *
 * Only `prescribedBy`, the log, and any stale request are written. The rules
 * refuse a release that also changes the dose, and that refusal is the point:
 * releasing must not become a way to edit a prescription no prescriber will
 * ever see. Change it afterwards instead, and the log records both steps.
 */
export async function releasePrescription(
  uid: string,
  medication: MedicationRecord,
): Promise<void> {
  await updateDoc(doc(db, paths.medication(uid, medication.id)), {
    prescribedBy: null,
    pendingChange: null,
    changeLog: arrayUnion(releaseChange(medication, uid, new Date())),
  });
}

export async function readMedication(uid: string, medId: string): Promise<Medication | null> {
  const snapshot = await getDoc(doc(db, paths.medication(uid, medId)));
  return snapshot.exists() ? (snapshot.data() as Medication) : null;
}
