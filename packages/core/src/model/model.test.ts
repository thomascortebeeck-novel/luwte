import { describe, expect, it } from 'vitest';
import { dictionaries, type Locale } from '../i18n/index';
import {
  CONSENT_ITEMS,
  CONSENT_VERSION,
  NO_CONSENT,
  consentItemsFor,
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
    const grants = { ...NO_CONSENT };
    expect(hasRequiredConsent({ ...grants, essential: true, healthData: true })).toBe(true);
    expect(hasRequiredConsent({ ...grants, essential: true, reminders: true })).toBe(false);
    expect(hasRequiredConsent({ ...grants, healthData: true, reminders: true })).toBe(false);
  });

  /*
   * A supporter is shown somebody else's health data and stores none of their
   * own, so consenting to the processing of theirs would be meaningless — and
   * would hide the obligation they actually take on.
   */
  it('asks a supporter for confidentiality rather than for their own health data', () => {
    const ids = consentItemsFor('supporter').map((i) => i.id);
    expect(ids).toEqual(['essential', 'confidentiality', 'reminders']);
    expect(ids).not.toContain('healthData');
  });

  it('asks a clinician the same, for the same reason', () => {
    expect(consentItemsFor('clinician')).toEqual(consentItemsFor('supporter'));
  });

  it('still asks the person keeping the logbook for Article 9 consent', () => {
    expect(consentItemsFor('patient').map((i) => i.id)).toContain('healthData');
  });

  it('will not let a supporter through on the patient’s required items', () => {
    // healthData granted, confidentiality not: complete for one list, not the
    // other. The screen and the check take the same list so they cannot drift.
    const grants = { ...NO_CONSENT, essential: true, healthData: true };
    expect(hasRequiredConsent(grants, consentItemsFor('patient'))).toBe(true);
    expect(hasRequiredConsent(grants, consentItemsFor('supporter'))).toBe(false);
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
