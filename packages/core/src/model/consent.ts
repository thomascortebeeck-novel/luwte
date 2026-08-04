import { z } from 'zod';
import type { CopyKey } from '../i18n/types';

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
export const CONSENT_VERSION = '2026-08-04';

export type ConsentItem = {
  id: 'essential' | 'healthData' | 'reminders';
  labelKey: CopyKey;
  explanationKey: CopyKey;
  /** Required items cannot be declined. Saying so plainly beats a fake choice. */
  required: boolean;
};

export const CONSENT_ITEMS: readonly ConsentItem[] = [
  {
    id: 'essential',
    labelKey: 'consentEssentialLabel',
    explanationKey: 'consentEssentialExplanation',
    required: true,
  },
  {
    id: 'healthData',
    labelKey: 'consentHealthLabel',
    explanationKey: 'consentHealthExplanation',
    required: true,
  },
  {
    id: 'reminders',
    labelKey: 'consentRemindersLabel',
    explanationKey: 'consentRemindersExplanation',
    required: false,
  },
];

export const consentGrantsSchema = z.object({
  essential: z.boolean(),
  healthData: z.boolean(),
  reminders: z.boolean(),
});

export type ConsentGrants = z.infer<typeof consentGrantsSchema>;

export const consentRecordSchema = z.object({
  version: z.string().min(1),
  grants: consentGrantsSchema,
  locale: z.enum(['nl', 'en']),
  grantedAt: z.date(),
  withdrawnAt: z.date().nullable().optional(),
});

export type ConsentRecord = z.infer<typeof consentRecordSchema>;

/** Every required item must be granted before the app may store anything. */
export function hasRequiredConsent(grants: ConsentGrants): boolean {
  return CONSENT_ITEMS.filter((item) => item.required).every((item) => grants[item.id]);
}
