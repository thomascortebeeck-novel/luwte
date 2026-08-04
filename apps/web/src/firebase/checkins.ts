import { paths, type Checkin, type Weekly } from '@luwte/core';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from './client';

/**
 * PRD 5.6 — the check-in must work fully offline. These writes are not
 * awaited by the UI: Firestore's local cache accepts them immediately and
 * syncs when there is a connection, so a phone with no credit still gets a
 * saved check-in and the person is never blocked on the network.
 */

export async function readCheckin(uid: string, dateKey: string): Promise<Checkin | null> {
  const snapshot = await getDoc(doc(db, paths.checkin(uid, dateKey)));
  return snapshot.exists() ? (snapshot.data() as Checkin) : null;
}

export async function readWeekly(uid: string, weekKey: string): Promise<Weekly | null> {
  const snapshot = await getDoc(doc(db, paths.weekly(uid, weekKey)));
  return snapshot.exists() ? (snapshot.data() as Weekly) : null;
}

/**
 * Returns as soon as the write is in the local cache. The returned promise
 * from setDoc only settles once the server has it, which may be hours later
 * on a bad connection — awaiting it would block the confirmation screen for
 * exactly the person least able to tolerate that.
 */
export function saveCheckin(uid: string, dateKey: string, checkin: Checkin): void {
  void setDoc(
    doc(db, paths.checkin(uid, dateKey)),
    { ...checkin, date: dateKey, createdAt: serverTimestamp() },
    { merge: true },
  );
}

export function saveWeekly(uid: string, weekKey: string, weekly: Weekly): void {
  void setDoc(
    doc(db, paths.weekly(uid, weekKey)),
    { ...weekly, createdAt: serverTimestamp() },
    { merge: true },
  );
}
