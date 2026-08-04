import { paths } from '@luwte/core';
import { doc, getDoc } from 'firebase/firestore';
import { db } from './client';

/**
 * PRD 6.7 — "checked manually at first".
 *
 * Verification is a document in `clinicians/{uid}` that only an admin can
 * create, out of band, with the admin SDK. Reading it here decides whether
 * the console is offered at all; it decides nothing about access. Every read
 * of patient data still resolves through the circle, and the rules refuse a
 * medication write from anyone this returns false for — so a tampered client
 * gains a menu item and nothing else.
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
