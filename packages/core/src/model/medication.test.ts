import { describe, expect, it } from 'vitest';
import { dictionaries, type Locale } from '../i18n/index';
import {
  OPTIONAL_PRACTICES,
  diffMedication,
  doseId,
  doseTimeSchema,
  medicationSchema,
  prescriberGone,
  releaseChange,
  type Medication,
} from './medication';

const locales = Object.keys(dictionaries) as Locale[];
const at = new Date('2026-08-04T10:00:00Z');

const valid: Medication = {
  name: 'Quetiapine',
  dose: '200 mg',
  times: ['08:00', '20:00'],
  purpose: 'Om je gedachten rustiger te maken.',
  activeFrom: new Date('2026-01-01T00:00:00Z'),
  activeTo: null,
  prescribedBy: null,
};

describe('doseTimeSchema', () => {
  it.each(['00:00', '08:00', '23:59'])('accepts %s', (time) => {
    expect(doseTimeSchema.parse(time)).toBe(time);
  });

  it.each(['8:00', '24:00', '20:60', 'ochtend', ''])('rejects %s', (time) => {
    expect(() => doseTimeSchema.parse(time)).toThrow();
  });
});

describe('medicationSchema', () => {
  it('accepts a medication with a plain-language purpose', () => {
    expect(medicationSchema.parse(valid).purpose).toContain('rustiger');
  });

  it('requires at least one time, because a dose with no time cannot be reminded', () => {
    expect(() => medicationSchema.parse({ ...valid, times: [] })).toThrow();
  });

  it('allows an empty purpose, because the patient enters these before a clinician does', () => {
    expect(medicationSchema.parse({ ...valid, purpose: '' }).purpose).toBe('');
  });
});

describe('doseId', () => {
  it('is keyed by day, medication and time, so an offline tick is idempotent', () => {
    expect(doseId('2026-08-04', 'med1', '08:00')).toBe('2026-08-04_med1_0800');
  });

  it('separates two doses of the same medication on the same day', () => {
    expect(doseId('2026-08-04', 'med1', '08:00')).not.toBe(doseId('2026-08-04', 'med1', '20:00'));
  });

  it('separates the same time on different days', () => {
    expect(doseId('2026-08-04', 'med1', '08:00')).not.toBe(doseId('2026-08-05', 'med1', '08:00'));
  });
});

describe('diffMedication', () => {
  it('logs a dose change, which is what the chart marks', () => {
    // PRD 6.6 — seeing flatness rise in the fortnight after a dose increase
    // is the thing that changes an appointment.
    const changes = diffMedication(valid, { ...valid, dose: '300 mg' }, 'uid-jonas', at);
    expect(changes).toEqual([
      { at, field: 'dose', from: '200 mg', to: '300 mg', by: 'uid-jonas' },
    ]);
  });

  it('logs a change to the times in a form a person can read', () => {
    const changes = diffMedication(valid, { ...valid, times: ['08:00'] }, 'uid-jonas', at);
    expect(changes[0]).toMatchObject({ field: 'times', from: '08:00, 20:00', to: '08:00' });
  });

  it('logs stopping a medication', () => {
    const stopped = { ...valid, activeTo: new Date('2026-08-04T00:00:00Z') };
    const changes = diffMedication(valid, stopped, 'uid-jonas', at);
    expect(changes[0]).toMatchObject({ field: 'activeTo', from: null, to: '2026-08-04' });
  });

  it('logs several fields changing at once', () => {
    const changes = diffMedication(
      valid,
      { ...valid, name: 'Seroquel', dose: '300 mg' },
      'uid-jonas',
      at,
    );
    expect(changes.map((c) => c.field).sort()).toEqual(['dose', 'name']);
  });

  it('says nothing when nothing changed', () => {
    expect(diffMedication(valid, { ...valid }, 'uid-jonas', at)).toEqual([]);
  });

  it('records who made the change, so a clinician edit is distinguishable', () => {
    const changes = diffMedication(valid, { ...valid, dose: '300 mg' }, 'uid-psychiater', at);
    expect(changes[0]!.by).toBe('uid-psychiater');
  });
});

describe('a prescription whose clinician has gone', () => {
  const prescribed = { prescribedBy: 'uid-psychiater' };
  const active = [{ uid: 'uid-psychiater', revokedAt: null }];

  it('is not gone while they are still in the circle', () => {
    expect(prescriberGone(prescribed, active)).toBe(false);
  });

  it('is gone once they are revoked', () => {
    expect(prescriberGone(prescribed, [{ uid: 'uid-psychiater', revokedAt: at }])).toBe(true);
  });

  it('is gone when they are not in the circle at all', () => {
    expect(prescriberGone(prescribed, [])).toBe(true);
  });

  it('is never gone for a line nobody prescribed — there is nothing to take back', () => {
    expect(prescriberGone({ prescribedBy: null }, [])).toBe(false);
  });

  it('ignores other members, revoked or not', () => {
    expect(prescriberGone(prescribed, [{ uid: 'uid-broer', revokedAt: at }, ...active])).toBe(
      false,
    );
  });

  it('logs the release as ending the relationship, never as erasing it', () => {
    // `from` names who prescribed it. The log may only grow, so the chart
    // keeps every vertical rule their changes drew.
    const change = releaseChange(prescribed, 'uid-jonas', at);
    expect(change).toEqual({
      at,
      field: 'prescribedBy',
      from: 'uid-psychiater',
      to: null,
      by: 'uid-jonas',
    });
  });
});

describe('optional practices', () => {
  it('offers three, and stores no completion state for any of them', () => {
    // PRD 6.2 — no checkbox, no tracking, no completion state. Ignoring one
    // costs nothing and is never recorded, which is why they are constants
    // rather than documents.
    expect(OPTIONAL_PRACTICES.map((p) => p.id)).toEqual(['gratitude', 'breathing', 'walk']);
    for (const practice of OPTIONAL_PRACTICES) {
      expect(Object.keys(practice)).toEqual(['id', 'labelKey']);
    }
  });

  it.each(locales)('has copy for every practice in %s', (locale) => {
    for (const practice of OPTIONAL_PRACTICES) {
      expect(dictionaries[locale][practice.labelKey], practice.labelKey).toBeTruthy();
    }
  });
});
