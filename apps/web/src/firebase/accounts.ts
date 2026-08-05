import {
  CONSENT_VERSION,
  DEFAULT_CHECKIN_HOUR,
  DEFAULT_NOTIFICATION_SETTINGS,
  DEFAULT_SHARE_SETTINGS,
  DEFAULT_TIMEZONE,
  paths,
  type ConsentGrants,
  type Locale,
  type NotificationSettings,
  type OnboardingRole,
  type Patient,
  type ShareSettings,
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

  /*
   * No `checkinHour`. At first sign-in nobody knows yet whether this person
   * keeps a logbook, and a default written here would survive an onboarding
   * that deliberately never asked — quietly enrolling a supporter in a daily
   * nudge to fill in a check-in he does not have. It is written once, by
   * `saveOnboarding`, for the person who was actually asked.
   */
  await setDoc(patientRef, {
    displayName: '',
    timezone: DEFAULT_TIMEZONE,
    onboarded: false,
    createdAt: serverTimestamp(),
  });
}

export type PatientRecord = Omit<Patient, 'createdAt'> & {
  createdAt: Date | null;
  notifications: NotificationSettings;
  share: ShareSettings;
};

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
    // Absent on every account written before Art. 17 erasure existed, which
    // reads correctly as "this person is not erasing themselves".
    erasureStartedAt: data.erasureStartedAt?.toDate?.() ?? null,
    notifications: { ...DEFAULT_NOTIFICATION_SETTINGS, ...(data.notifications ?? {}) },
    share: { ...DEFAULT_SHARE_SETTINGS, ...(data.share ?? {}) },
  };
}

/**
 * Which onboarding this person went through. `admin` never reaches a screen,
 * so anything unexpected reads as `patient` — the narrowest of the three, and
 * the one that assumes nothing about somebody else's data.
 */
export async function readRole(uid: string): Promise<OnboardingRole> {
  const snapshot = await getDoc(doc(db, paths.user(uid)));
  const stored = snapshot.data()?.role;
  return stored === 'supporter' || stored === 'clinician' ? stored : 'patient';
}

export async function saveShareSettings(uid: string, share: ShareSettings): Promise<void> {
  await updateDoc(doc(db, paths.patient(uid)), { share });
}

/**
 * `checkinHour` is absent for anyone who does not keep a logbook of their own.
 *
 * Not defaulted, not hidden — never written. A supporter who was never asked
 * when to be reminded has no hour, and `sendCheckinReminder` has nobody to
 * disturb. Writing a default would have quietly enrolled the brother in a
 * daily nudge to fill in a check-in he does not have.
 */
export async function saveOnboarding(
  uid: string,
  values: { displayName: string; checkinHour?: number; role: OnboardingRole },
): Promise<void> {
  const { role, displayName, checkinHour } = values;
  await updateDoc(doc(db, paths.patient(uid)), {
    displayName,
    ...(checkinHour === undefined ? {} : { checkinHour }),
  });
  await updateDoc(doc(db, paths.user(uid)), { displayName, role });
}

export async function saveNotificationSettings(
  uid: string,
  notifications: NotificationSettings,
): Promise<void> {
  await updateDoc(doc(db, paths.patient(uid)), { notifications });
}

export async function saveReminderHour(uid: string, checkinHour: number): Promise<void> {
  await updateDoc(doc(db, paths.patient(uid)), { checkinHour });
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
