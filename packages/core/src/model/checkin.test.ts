import { describe, expect, it } from 'vitest';
import { dictionaries, type Locale } from '../i18n/index';
import {
  CHECKIN_STEPS,
  HOPELESSNESS_CRISIS_THRESHOLD,
  WEEKLY_STEPS,
  checkinSchema,
  shouldOfferCrisis,
  weeklySchema,
} from './checkin';

const locales = Object.keys(dictionaries) as Locale[];

const validCheckin = {
  date: '2026-08-04',
  mood: 4,
  energy: 3,
  sleepHours: 7.5,
  sleepRested: 4,
  anxiety: 5,
  flatness: 2,
  source: 'manual' as const,
};

describe('checkinSchema', () => {
  it('accepts a complete day', () => {
    expect(checkinSchema.parse(validCheckin).date).toBe('2026-08-04');
  });

  it('accepts a diary line but does not require one', () => {
    expect(checkinSchema.parse(validCheckin).note).toBeUndefined();
    expect(checkinSchema.parse({ ...validCheckin, note: 'gewandeld' }).note).toBe('gewandeld');
  });

  it.each([0, 8])('rejects %s on a 1..7 scale', (mood) => {
    expect(() => checkinSchema.parse({ ...validCheckin, mood })).toThrow();
  });

  it('rejects a fractional scale value', () => {
    expect(() => checkinSchema.parse({ ...validCheckin, mood: 3.5 })).toThrow();
  });

  it('allows half hours of sleep but not a negative night', () => {
    expect(checkinSchema.parse({ ...validCheckin, sleepHours: 6.5 }).sleepHours).toBe(6.5);
    expect(() => checkinSchema.parse({ ...validCheckin, sleepHours: -1 })).toThrow();
  });

  it('rejects a date that is not a date key', () => {
    expect(() => checkinSchema.parse({ ...validCheckin, date: '4 augustus' })).toThrow();
  });
});

describe('the daily questions', () => {
  it('asks six things, in the PRD order', () => {
    expect(CHECKIN_STEPS.map((s) => s.id)).toEqual([
      'mood',
      'energy',
      'sleepHours',
      'sleepRested',
      'anxiety',
      'flatness',
    ]);
  });

  it('asks hours as a quantity and everything else on a scale', () => {
    const hours = CHECKIN_STEPS.filter((s) => s.kind === 'hours').map((s) => s.id);
    expect(hours).toEqual(['sleepHours']);
  });

  it.each(locales)('has copy for every daily question in %s', (locale) => {
    for (const step of CHECKIN_STEPS) {
      expect(dictionaries[locale][step.questionKey], step.questionKey).toBeTruthy();
    }
  });

  it.each(locales)('has copy for every weekly question in %s', (locale) => {
    for (const step of WEEKLY_STEPS) {
      expect(dictionaries[locale][step.questionKey], step.questionKey).toBeTruthy();
    }
  });
});

describe('weeklySchema', () => {
  it('screens for akathisia, parkinsonism, sedation and hopelessness', () => {
    expect(WEEKLY_STEPS.map((s) => s.id)).toEqual([
      'restlessness',
      'stiffness',
      'sedation',
      'hopelessness',
    ]);
    expect(
      weeklySchema.parse({ restlessness: 3, stiffness: 2, sedation: 5, hopelessness: 4 }),
    ).toBeTruthy();
  });
});

describe('shouldOfferCrisis', () => {
  it('offers the crisis screen only at the top of the scale', () => {
    // PRD 6.1 — shown once, calmly, with no alarm language. It does not
    // alert the circle: automatic escalation to family would make people
    // stop answering honestly, which costs more than it gains.
    expect(HOPELESSNESS_CRISIS_THRESHOLD).toBe(7);
    expect(shouldOfferCrisis({ hopelessness: 7 })).toBe(true);
  });

  it.each([1, 2, 3, 4, 5, 6])('stays quiet at %s', (hopelessness) => {
    expect(shouldOfferCrisis({ hopelessness })).toBe(false);
  });
});
