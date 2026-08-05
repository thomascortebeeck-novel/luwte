import { z } from 'zod';
import type { CopyKey } from '../i18n/types';
import { keepsOwnLogbook, type OnboardingRole } from './user';

/**
 * GDPR Article 9 consent for special-category health data.
 *
 * Consent is stored as a versioned, timestamped record rather than a boolean,
 * because it has to be auditable and withdrawable. The locale is part of the
 * record: if consent is ever questioned, what matters is the wording the
 * person actually read, not today's translation of it.
 *
 * Bump the version whenever the wording of any item changes materially. An
 * old record then plainly refers to old wording instead of silently seeming
 * to agree to new terms.
 */
/*
 * Bumped from '2026-08-04' when watch data was added. A new item is a material
 * change to what is being agreed to, so an old record must plainly refer to
 * old wording rather than appear to consent to something nobody was shown.
 */
export const CONSENT_VERSION = '2026-08-05';

export type ConsentItemId =
  | 'essential'
  | 'healthData'
  | 'reminders'
  | 'confidentiality'
  | 'watchData';

export type ConsentItem = {
  id: ConsentItemId;
  labelKey: CopyKey;
  explanationKey: CopyKey;
  /** Required items cannot be declined. Saying so plainly beats a fake choice. */
  required: boolean;
};

const ESSENTIAL: ConsentItem = {
  id: 'essential',
  labelKey: 'consentEssentialLabel',
  explanationKey: 'consentEssentialExplanation',
  required: true,
};

const REMINDERS: ConsentItem = {
  id: 'reminders',
  labelKey: 'consentRemindersLabel',
  explanationKey: 'consentRemindersExplanation',
  required: false,
};

/**
 * Reading sleep and resting heart rate from the phone's health store.
 *
 * **Optional, and separate from `healthData`.** Agreeing to keep a logbook is
 * not agreeing to let an app read what your watch recorded while you slept —
 * that is a different source, a different kind of measurement, and it happens
 * without you doing anything each day. It stays off until somebody says yes,
 * and the app works exactly as well with it off.
 *
 * Only the Android app can act on it; a browser cannot reach Health Connect at
 * all. It is offered everywhere anyway, because consent recorded on the web
 * and honoured on the phone is one decision rather than two.
 */
const WATCH_DATA: ConsentItem = {
  id: 'watchData',
  labelKey: 'consentWatchLabel',
  explanationKey: 'consentWatchExplanation',
  required: false,
};

/** What the person keeping the logbook agrees to: their own Article 9 data. */
export const CONSENT_ITEMS: readonly ConsentItem[] = [
  ESSENTIAL,
  {
    id: 'healthData',
    labelKey: 'consentHealthLabel',
    explanationKey: 'consentHealthExplanation',
    required: true,
  },
  REMINDERS,
  WATCH_DATA,
];

/**
 * What a supporter or clinician agrees to, which is a different thing.
 *
 * They are not storing health data about themselves — they are being shown
 * somebody else's. Asking them to consent to the processing of their own
 * special-category data would be meaningless, and worse, it would obscure the
 * obligation they actually take on: keeping what they read to themselves.
 */
export const CONSENT_ITEMS_FOLLOWING: readonly ConsentItem[] = [
  /*
   * Its own wording, not the patient's. Both shared items describe things this
   * person does not have: "het uur van je herinnering" was never asked for,
   * and the daily nudge is not what they will be sent. Reusing the patient's
   * explanations would have made the consent screen describe someone else.
   */
  {
    ...ESSENTIAL,
    explanationKey: 'consentEssentialFollowingExplanation',
  },
  {
    id: 'confidentiality',
    labelKey: 'consentConfidentialityLabel',
    explanationKey: 'consentConfidentialityExplanation',
    required: true,
  },
  {
    ...REMINDERS,
    explanationKey: 'consentRemindersFollowingExplanation',
  },
];

export function consentItemsFor(role: OnboardingRole): readonly ConsentItem[] {
  return keepsOwnLogbook(role) ? CONSENT_ITEMS : CONSENT_ITEMS_FOLLOWING;
}

export const consentGrantsSchema = z.object({
  essential: z.boolean(),
  healthData: z.boolean().default(false),
  reminders: z.boolean(),
  confidentiality: z.boolean().default(false),
  /** Absent on every record written before watch data existed, which reads
      correctly as never having agreed to it. */
  watchData: z.boolean().default(false),
});

/** Nothing is ticked to begin with. A pre-ticked box is not consent. */
export const NO_CONSENT: ConsentGrants = {
  essential: false,
  healthData: false,
  reminders: false,
  confidentiality: false,
  watchData: false,
};

export type ConsentGrants = z.infer<typeof consentGrantsSchema>;

export const consentRecordSchema = z.object({
  version: z.string().min(1),
  grants: consentGrantsSchema,
  locale: z.enum(['nl', 'en']),
  grantedAt: z.date(),
  withdrawnAt: z.date().nullable().optional(),
});

export type ConsentRecord = z.infer<typeof consentRecordSchema>;

/**
 * Every required item must be granted before the app may store anything.
 *
 * Takes the list rather than the role so the screen and this check can never
 * disagree about which items were actually on offer.
 */
export function hasRequiredConsent(
  grants: ConsentGrants,
  items: readonly ConsentItem[] = CONSENT_ITEMS,
): boolean {
  return items.filter((item) => item.required).every((item) => grants[item.id]);
}
