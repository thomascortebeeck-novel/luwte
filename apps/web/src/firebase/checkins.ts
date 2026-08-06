import { paths, type Checkin, type Weekly } from '@luwte/core';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from './client';

/**
 * PRD 5.6 — the check-in must work fully offline. These writes are not
 * awaited by the UI: Firestore queues them locally and the screen moves on
 * immediately, so a phone with no credit still gets a saved check-in and the
 * person is never blocked on the network.
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
 * The returned promise does not settle until the server has acknowledged the
 * write, which may be hours later on a bad connection — a caller must not
 * await it before confirming to the person, the same reason `finish()` in
 * `CheckIn.tsx` calls this and moves on in the same tick.
 *
 * It is still returned, rather than swallowed here with `void`, so a caller
 * can attach its own `.catch` and hear about the genuinely broken case —
 * before this task nothing could, because the promise was discarded inside
 * this function and a rejection had nowhere to go.
 */
export function saveCheckin(uid: string, dateKey: string, checkin: Checkin): Promise<void> {
  return setDoc(
    doc(db, paths.checkin(uid, dateKey)),
    { ...checkin, date: dateKey, createdAt: serverTimestamp() },
    { merge: true },
  );
}

export function saveWeekly(uid: string, weekKey: string, weekly: Weekly): Promise<void> {
  return setDoc(
    doc(db, paths.weekly(uid, weekKey)),
    { ...weekly, createdAt: serverTimestamp() },
    { merge: true },
  );
}
