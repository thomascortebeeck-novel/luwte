import { z } from 'zod';
import type { CopyKey } from '../i18n/types';

/**
 * PRD 8 — the most dangerous surface in a product for depressed users.
 *
 * The hard limits, which the categories below encode rather than merely
 * document: **at most three notification kinds reach a patient in a day** —
 * one check-in reminder, medication reminders at their scheduled times, and
 * warmth from the circle. Every category is individually disableable, and an
 * app with all of them off is still a fully working app.
 *
 * There is no re-engagement category and there never will be one. "You have
 * not opened luwte in four days" is exactly the message this product exists
 * not to send.
 */

export type NotificationAudience = 'patient' | 'supporter';

export type NotificationCategory = {
  id: 'checkinReminder' | 'medicationReminder' | 'kudos' | 'supportedActivity';
  labelKey: CopyKey;
  explanationKey: CopyKey;
  audience: NotificationAudience;
};

export const NOTIFICATION_CATEGORIES: readonly NotificationCategory[] = [
  {
    id: 'checkinReminder',
    labelKey: 'notifyCheckinLabel',
    explanationKey: 'notifyCheckinExplanation',
    audience: 'patient',
  },
  {
    id: 'medicationReminder',
    labelKey: 'notifyMedicationLabel',
    explanationKey: 'notifyMedicationExplanation',
    audience: 'patient',
  },
  {
    // PRD 5.4 — the one notification allowed to be warm.
    id: 'kudos',
    labelKey: 'notifyKudosLabel',
    explanationKey: 'notifyKudosExplanation',
    audience: 'patient',
  },
  {
    /**
     * For someone supporting a patient: a note when the person they follow
     * has done something they planned. It can only ever fire if the patient
     * granted that supporter `feed` permission — the patient's sharing
     * settings gate this, not the supporter's preference.
     */
    id: 'supportedActivity',
    labelKey: 'notifySupportedActivityLabel',
    explanationKey: 'notifySupportedActivityExplanation',
    audience: 'supporter',
  },
];

export const notificationSettingsSchema = z.object({
  checkinReminder: z.boolean(),
  medicationReminder: z.boolean(),
  kudos: z.boolean(),
  supportedActivity: z.boolean(),
});

/**
 * Not a notification setting — a sharing one, but it lives beside them
 * because it answers the same question the person is already asking on that
 * screen: what leaves this app and reaches another human.
 *
 * Finishing something planned posts it to the feed for whoever was granted
 * `feed`. On by default, because a circle exists to be told things. Off in
 * one tap, and with it off the app works exactly as before — nothing nags
 * about it being off and nothing asks again.
 *
 * Doses are never posted whatever this says. See `shouldPostCompletion`.
 */
export const shareSettingsSchema = z.object({
  shareCompletions: z.boolean(),
});

export type ShareSettings = z.infer<typeof shareSettingsSchema>;

export const DEFAULT_SHARE_SETTINGS: ShareSettings = { shareCompletions: true };

export type NotificationSettings = z.infer<typeof notificationSettingsSchema>;

/**
 * On by default, because each one is either something the person explicitly
 * asked for (they chose a reminder hour during onboarding) or something warm
 * that another human did. Turning any of them off costs nothing.
 */
export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  checkinReminder: true,
  medicationReminder: true,
  kudos: true,
  supportedActivity: true,
};

export function categoriesFor(audience: NotificationAudience): NotificationCategory[] {
  return NOTIFICATION_CATEGORIES.filter((c) => c.audience === audience);
}

/** PRD 8 — a patient may receive at most three kinds of notification a day. */
export const MAX_PATIENT_CATEGORIES = 3;
