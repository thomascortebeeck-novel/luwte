import {
  CONSENT_VERSION,
  DEFAULT_CHECKIN_HOUR,
  DEFAULT_TIMEZONE,
  paths,
  type ConsentGrants,
  type Locale,
  type Patient,
} from '@luwte/core';
import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { db } from './client';

/**
 * Reads and writes for the documents a person owns. Kept in one place so no
 * screen builds a document shape inline, and so this moves wholesale into a
 * shared package when the clinician console needs the same access in Phase 7.
 */

export async function ensureAccount(uid: string, locale: Locale): Promise<void> {
  const patientRef = doc(db, paths.patient(uid));
  const existing = await getDoc(patientRef);
  if (existing.exists()) return;

  await setDoc(doc(db, paths.user(uid)), {
    role: 'patient',
    displayName: '',
    locale,
    createdAt: serverTimestamp(),
  });

  await setDoc(patientRef, {
    displayName: '',
    checkinHour: DEFAULT_CHECKIN_HOUR,
    timezone: DEFAULT_TIMEZONE,
    onboarded: false,
    createdAt: serverTimestamp(),
  });
}

export type PatientRecord = Omit<Patient, 'createdAt'> & { createdAt: Date | null };

export async function readPatient(uid: string): Promise<PatientRecord | null> {
  const snapshot = await getDoc(doc(db, paths.patient(uid)));
  if (!snapshot.exists()) return null;
  const data = snapshot.data();
  return {
    displayName: data.displayName ?? '',
    checkinHour: data.checkinHour ?? DEFAULT_CHECKIN_HOUR,
    timezone: data.timezone ?? DEFAULT_TIMEZONE,
    onboarded: data.onboarded === true,
    createdAt: data.createdAt?.toDate?.() ?? null,
  };
}

export async function saveOnboarding(
  uid: string,
  values: { displayName: string; checkinHour: number },
): Promise<void> {
  await updateDoc(doc(db, paths.patient(uid)), values);
  await updateDoc(doc(db, paths.user(uid)), { displayName: values.displayName });
}

/**
 * Writes the consent record first and only then marks the person onboarded.
 * If the consent write fails, they are not carried past the gate — the app
 * must never hold health data it cannot show consent for.
 */
export async function recordConsent(
  uid: string,
  grants: ConsentGrants,
  locale: Locale,
): Promise<void> {
  await setDoc(doc(db, paths.consent(uid, CONSENT_VERSION)), {
    version: CONSENT_VERSION,
    grants,
    locale,
    grantedAt: serverTimestamp(),
    withdrawnAt: null,
  });
  await updateDoc(doc(db, paths.patient(uid)), { onboarded: true });
}
