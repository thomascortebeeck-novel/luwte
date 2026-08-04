export { lintCopy, type Violation } from './copy-lint';
export {
  DEFAULT_LOCALE,
  LOCALES,
  dictionaries,
  resolveLocale,
  type CopyKey,
  type Dictionary,
  type Locale,
} from './i18n/index';
export { CRISIS_SERVICES, type CrisisService } from './crisis';

export {
  CONSENT_ITEMS,
  CONSENT_VERSION,
  consentGrantsSchema,
  consentRecordSchema,
  hasRequiredConsent,
  type ConsentGrants,
  type ConsentItem,
  type ConsentRecord,
} from './model/consent';
export { roleSchema, userSchema, type Role, type User } from './model/user';
export {
  DEFAULT_CHECKIN_HOUR,
  DEFAULT_TIMEZONE,
  patientSchema,
  type Patient,
} from './model/patient';
export { paths } from './model/paths';
