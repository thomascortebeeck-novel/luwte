import {
  DEFAULT_NOTIFICATION_SETTINGS,
  DEFAULT_TIMEZONE,
  dateKey,
  selectDue,
  whoToNotify,
  type NotifiableMember,
  type ReminderCandidate,
} from '@luwte/core';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
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
        // Not defaulted. An absent hour means this person was never asked for
        // one, and `isDueForReminder` refuses them rather than picking a time.
        checkinHour: data.checkinHour ?? null,
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

/**
 * PRD 5.4 — `onPostCreate`. When a patient shares something, tell the people
 * they gave the feed to.
 *
 * Both sides have to agree and they are asked in that order: the patient's
 * grant governs, and the supporter's own preference can only narrow it
 * further. That decision lives in `@luwte/core/feed` as a pure function with
 * its own tests; what is left here is plumbing.
 *
 * One notification per post and no retry. A repeated "your brother went for a
 * walk" is worse than a missed one, and PRD 8 caps what may reach anyone.
 */
export const onPostCreate = onDocumentCreated(
  // `retry: false` for the same reason the reminder uses retryCount 0: a
  // retried notification is a second notification.
  { document: 'patients/{patientId}/posts/{postId}', region: REGION, retry: false },
  async (event) => {
    const patientId = event.params.patientId;
    const db = getFirestore();

    const circle = await db.collection(`patients/${patientId}/circle`).get();

    const members: NotifiableMember[] = await Promise.all(
      circle.docs.map(async (member) => {
        const data = member.data();
        const theirSettings = await db.doc(`patients/${member.id}`).get();
        const notifications = {
          ...DEFAULT_NOTIFICATION_SETTINGS,
          ...(theirSettings.data()?.notifications ?? {}),
        };
        return {
          uid: member.id,
          canSeeFeed: data.permissions?.feed === true,
          revoked: data.revokedAt != null,
          wantsSupportedActivity: notifications.supportedActivity === true,
        };
      }),
    );

    const uids = whoToNotify(members);
    if (uids.length === 0) return;

    const tokens = (
      await Promise.all(
        uids.map(async (uid) => {
          const supporter = await db.doc(`patients/${uid}`).get();
          return (supporter.data()?.fcmTokens ?? []) as string[];
        }),
      )
    ).flat();

    if (tokens.length === 0) return;

    try {
      await getMessaging().sendEachForMulticast({
        tokens,
        // Names nothing. A lock screen is read by whoever is holding it, and
        // "Jonas finished his walk" on a train is health data in public.
        notification: { title: 'luwte' },
        data: { route: `/feed/${patientId}` },
      });
    } catch (error) {
      logger.warn('post notification failed', { patientId, error });
    }

    logger.info('post notified', { patientId, recipients: uids.length });
  },
);
