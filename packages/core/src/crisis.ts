import type { CopyKey } from './i18n/types';

/**
 * PRD 6.8 — the three Belgian services, and nothing else. These are data, not
 * copy: the numbers are identical in every language. `dial` is stripped of
 * spaces so the link works on every dialer.
 */
export type CrisisService = {
  id: string;
  nameKey: CopyKey;
  display: string;
  dial: string;
};

export const CRISIS_SERVICES: readonly CrisisService[] = [
  { id: 'zelfmoordlijn', nameKey: 'crisisZelfmoordlijn', display: '1813', dial: 'tel:1813' },
  { id: 'cps', nameKey: 'crisisCps', display: '0800 32 123', dial: 'tel:080032123' },
  { id: 'emergency', nameKey: 'crisisEmergency', display: '112', dial: 'tel:112' },
];
