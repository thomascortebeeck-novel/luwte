import { PLAN_SECTIONS, paths, type PlanEntry, type PlanSection } from '@luwte/core';
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { db } from './client';

export type PlanEntryRecord = PlanEntry & { id: string };

/**
 * Guards the `section` read back from a document nothing validates —
 * `/plan/{entryId}` has no shape rule for it (see firestore.rules), and this
 * module is what starts writing a real value onto every new entry. A value
 * outside `PLAN_SECTIONS` would otherwise type as valid via an unchecked
 * cast and then silently disappear from every `entriesInSection` grouping:
 * no crash, no error, just an entry that never appears again. On a safety
 * plan that is the wrong failure mode, so anything unrecognised — absent,
 * malformed, or simply wrong — falls back to `warning`, the same default the
 * schema itself applies to an entry written before the other five steps
 * existed.
 */
export function toPlanSection(value: unknown): PlanSection {
  return typeof value === 'string' && (PLAN_SECTIONS as readonly string[]).includes(value)
    ? (value as PlanSection)
    : 'warning';
}

/**
 * The safety plan.
 *
 * **luwte never reads this to decide anything.** It is stored and handed
 * back, the way the diary is. Matching a check-in against somebody's warning
 * signs would be generating a conclusion about their mental state — clinical
 * monitoring, Class IIa under EU MDR, the one thing this product may never do.
 */
export async function readPlan(uid: string): Promise<PlanEntryRecord[]> {
  const snapshot = await getDocs(collection(db, paths.plan(uid)));
  return snapshot.docs
    .map((document) => {
      const data = document.data();
      return {
        id: document.id,
        section: toPlanSection(data.section),
        label: (data.label ?? '') as string,
        detail: (data.detail ?? '') as string,
        createdAt: data.createdAt?.toDate?.() ?? new Date(0),
      };
    })
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
}

export async function addPlanEntry(
  uid: string,
  values: { section: PlanSection; label: string; detail: string },
): Promise<void> {
  const id = doc(collection(db, paths.plan(uid))).id;
  await setDoc(doc(db, paths.planEntry(uid, id)), { ...values, createdAt: serverTimestamp() });
}

export async function updatePlanEntry(
  uid: string,
  id: string,
  values: { label: string; detail: string },
): Promise<void> {
  await updateDoc(doc(db, paths.planEntry(uid, id)), values);
}

/**
 * Deleted rather than marked, unlike almost everything else here.
 *
 * The rest of this database is a record of what happened, and a record that
 * can vanish is not worth keeping. A plan is not a record — it is a current
 * intention, and a sign that has stopped being true is noise in the one
 * document somebody needs to read quickly on a bad day.
 */
export async function removePlanEntry(uid: string, id: string): Promise<void> {
  await deleteDoc(doc(db, paths.planEntry(uid, id)));
}
