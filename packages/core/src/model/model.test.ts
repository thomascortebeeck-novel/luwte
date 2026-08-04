import { describe, expect, it } from 'vitest';
import { dictionaries, type Locale } from '../i18n/index';
import {
  CONSENT_ITEMS,
  CONSENT_VERSION,
  consentRecordSchema,
  hasRequiredConsent,
} from './consent';
import { DEFAULT_CHECKIN_HOUR, patientSchema } from './patient';
import { paths } from './paths';
import { userSchema } from './user';

const locales = Object.keys(dictionaries) as Locale[];

describe('userSchema', () => {
  const valid = {
    role: 'patient' as const,
    displayName: 'Jonas',
    locale: 'nl' as const,
    createdAt: new Date(),
  };

  it('accepts a patient', () => {
    expect(userSchema.parse(valid)).toMatchObject({ role: 'patient' });
  });

  it('rejects an unknown role', () => {
    expect(() => userSchema.parse({ ...valid, role: 'doctor' })).toThrow();
  });

  it('rejects an empty display name', () => {
    expect(() => userSchema.parse({ ...valid, displayName: '' })).toThrow();
  });
});

describe('patientSchema', () => {
  const valid = {
    displayName: 'Jonas',
    checkinHour: DEFAULT_CHECKIN_HOUR,
    timezone: 'Europe/Brussels',
    onboarded: false,
    createdAt: new Date(),
  };

  it('accepts every hour of the day', () => {
    for (let hour = 0; hour <= 23; hour += 1) {
      expect(patientSchema.parse({ ...valid, checkinHour: hour }).checkinHour).toBe(hour);
    }
  });

  it.each([-1, 24, 1.5])('rejects %s as a reminder hour', (checkinHour) => {
    expect(() => patientSchema.parse({ ...valid, checkinHour })).toThrow();
  });
});

describe('consent', () => {
  it('has a version', () => {
    expect(CONSENT_VERSION).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('requires the essential and health-data items', () => {
    const required = CONSENT_ITEMS.filter((i) => i.required).map((i) => i.id);
    expect(required).toEqual(['essential', 'healthData']);
  });

  it('leaves reminders optional, because the app works with them off', () => {
    expect(CONSENT_ITEMS.find((i) => i.id === 'reminders')?.required).toBe(false);
  });

  it('is not satisfied until every required item is granted', () => {
    expect(hasRequiredConsent({ essential: true, healthData: true, reminders: false })).toBe(true);
    expect(hasRequiredConsent({ essential: true, healthData: false, reminders: true })).toBe(false);
    expect(hasRequiredConsent({ essential: false, healthData: true, reminders: true })).toBe(false);
  });

  it('records which wording the person actually read', () => {
    const record = consentRecordSchema.parse({
      version: CONSENT_VERSION,
      grants: { essential: true, healthData: true, reminders: false },
      locale: 'nl',
      grantedAt: new Date(),
    });
    expect(record.locale).toBe('nl');
  });

  it.each(locales)('has copy for every consent item in %s', (locale) => {
    for (const item of CONSENT_ITEMS) {
      expect(dictionaries[locale][item.labelKey], `${locale}.${item.labelKey}`).toBeTruthy();
      expect(
        dictionaries[locale][item.explanationKey],
        `${locale}.${item.explanationKey}`,
      ).toBeTruthy();
    }
  });
});

describe('paths', () => {
  it('nests consents under the patient, so one get resolves access', () => {
    expect(paths.consents('abc')).toBe('patients/abc/consents');
    expect(paths.consent('abc', 'c1')).toBe('patients/abc/consents/c1');
  });
});
