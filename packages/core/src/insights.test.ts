import { describe, expect, it } from 'vitest';
import { dictionaries, type Locale } from './i18n/index';
import {
  INSIGHTS_METRICS,
  INSIGHTS_WINDOWS,
  normaliseForChart,
  positionOf,
  windowDateKeys,
  windowDays,
} from './insights';

const locales = Object.keys(dictionaries) as Locale[];

describe('insights windows', () => {
  it('offers 2, 6 and 12 weeks, as the PRD specifies', () => {
    expect(INSIGHTS_WINDOWS).toEqual([2, 6, 12]);
  });

  it('counts whole days', () => {
    expect(windowDays(2)).toBe(14);
    expect(windowDays(12)).toBe(84);
  });

  it('ends the window on today and runs oldest first', () => {
    const keys = windowDateKeys('2026-08-04', 2);
    expect(keys).toHaveLength(14);
    expect(keys.at(-1)).toBe('2026-08-04');
    expect(keys[0]).toBe('2026-07-22');
  });

  it('steps across a month boundary correctly', () => {
    const keys = windowDateKeys('2026-03-02', 2);
    expect(keys[0]).toBe('2026-02-17');
  });
});

describe('normaliseForChart', () => {
  it('maps a 1..7 scale onto 0..1', () => {
    expect(normaliseForChart(1, 'seven')).toBe(0);
    expect(normaliseForChart(4, 'seven')).toBeCloseTo(0.5, 5);
    expect(normaliseForChart(7, 'seven')).toBe(1);
  });

  it('caps sleep at twelve hours so one long night does not flatten the chart', () => {
    expect(normaliseForChart(6, 'hours')).toBeCloseTo(0.5, 5);
    expect(normaliseForChart(12, 'hours')).toBe(1);
    expect(normaliseForChart(16, 'hours')).toBe(1);
  });

  it('clamps rather than escaping the drawing area', () => {
    expect(normaliseForChart(-3, 'seven')).toBe(0);
    expect(normaliseForChart(99, 'seven')).toBe(1);
    expect(normaliseForChart(-1, 'hours')).toBe(0);
  });
});

describe('positionOf', () => {
  const keys = windowDateKeys('2026-08-04', 2);

  it('places the oldest day at the left and today at the right', () => {
    expect(positionOf(keys[0]!, keys)).toBe(0);
    expect(positionOf('2026-08-04', keys)).toBe(1);
  });

  it('places a medication change on the day it happened', () => {
    // PRD 6.6 — a rule landing on the wrong day would misattribute a dose
    // change to the wrong fortnight, which is the whole point of the chart.
    expect(positionOf('2026-07-29', keys)).toBeCloseTo(7 / 13, 5);
  });

  it('returns null for a date outside the window', () => {
    expect(positionOf('2026-01-01', keys)).toBeNull();
  });
});

describe('insights metrics', () => {
  it('draws mood, energy, flatness and sleep', () => {
    expect(INSIGHTS_METRICS.map((m) => m.id)).toEqual([
      'mood',
      'energy',
      'flatness',
      'sleepHours',
    ]);
  });

  it('keeps sleep on its own scale rather than plotting hours as a 1..7 score', () => {
    expect(INSIGHTS_METRICS.find((m) => m.id === 'sleepHours')?.scale).toBe('hours');
    expect(INSIGHTS_METRICS.filter((m) => m.scale === 'seven')).toHaveLength(3);
  });

  it.each(locales)('has copy for every metric in %s', (locale) => {
    for (const metric of INSIGHTS_METRICS) {
      expect(dictionaries[locale][metric.labelKey], metric.labelKey).toBeTruthy();
    }
  });
});
