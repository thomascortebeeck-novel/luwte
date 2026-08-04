import {
  DEFAULT_CHECKIN_HOUR,
  DEFAULT_NOTIFICATION_SETTINGS,
  DEFAULT_TIMEZONE,
  dateKey,
  selectDue,
  type ReminderCandidate,
} from '@luwte/core';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { logger } from 'firebase-functions';

initializeApp();

/** PRD 5.1 — EU only. Health data does not leave the region. */
const REGION = 'europe-west1';

/**
 * PRD 5.4 — `sendCheckinReminder`. Runs hourly, finds the people whose chosen
 * hour it is in their own timezone and who have not checked in today, and
 * sends exactly one push.
 *
 * **It sends once and never chases.** The `remindedOn` marker written at the
 * end is what makes that true: without it an hourly job with a
 * missed-check-in condition would fire every hour until midnight, which is
 * the single most harmful thing this product could do to the person using it.
 *
 * The decision of whom to disturb lives in `@luwte/core/reminders` as a pure
 * function with its own tests. What is left here is plumbing.
 */
export const sendCheckinReminder = onSchedule(
  {
    schedule: 'every 1 hours',
    region: REGION,
    timeZone: 'Etc/UTC',
    retryCount: 0, // A retried reminder is a second reminder. Never.
  },
  async () => {
    const db = getFirestore();
    const now = new Date();

    const snapshot = await db.collection('patients').where('onboarded', '==', true).get();

    const candidates: ReminderCandidate[] = snapshot.docs.map((docSnapshot) => {
      const data = docSnapshot.data();
      const notifications = { ...DEFAULT_NOTIFICATION_SETTINGS, ...(data.notifications ?? {}) };
      return {
        patientId: docSnapshot.id,
        checkinHour: data.checkinHour ?? DEFAULT_CHECKIN_HOUR,
        timezone: data.timezone ?? DEFAULT_TIMEZONE,
        remindersEnabled: notifications.checkinReminder === true,
        lastCheckinDate: data.lastCheckinDate ?? null,
        alreadyRemindedOn: data.remindedOn ?? null,
        fcmTokens: data.fcmTokens ?? [],
      };
    });

    const due = selectDue(candidates, now);
    if (due.length === 0) return;

    for (const candidate of due) {
      const today = dateKey(now, candidate.timezone);
      try {
        await getMessaging().sendEachForMulticast({
          tokens: [...(candidate.fcmTokens ?? [])],
          // No body text: the notification says the app's name and nothing
          // about health. A lock screen is read by whoever is holding it.
          notification: { title: 'luwte' },
          data: { route: '/checkin' },
        });
      } catch (error) {
        // A failed send is not retried. Missing one reminder is a non-event;
        // sending two is not.
        logger.warn('reminder send failed', { patientId: candidate.patientId, error });
      }

      // Written whether or not the send succeeded, so a partial failure can
      // never turn into a second attempt later in the day.
      await db.doc(`patients/${candidate.patientId}`).update({ remindedOn: today });
    }

    logger.info('reminders sent', { count: due.length });
  },
);
