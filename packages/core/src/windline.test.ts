import { describe, expect, it } from 'vitest';
import { WINDLINE_DAYS, dayUnrest, windlineSeries, type WindlineDay } from './windline';

const settled: WindlineDay = { mood: 6, sleepRested: 6, anxiety: 1 };
const unsettled: WindlineDay = { mood: 2, sleepRested: 2, anxiety: 7 };
const middling: WindlineDay = { mood: 4, sleepRested: 4, anxiety: 4 };

describe('dayUnrest', () => {
  it('runs from 0 to 1', () => {
    expect(dayUnrest({ mood: 7, sleepRested: 7, anxiety: 1 })).toBe(0);
    expect(dayUnrest({ mood: 1, sleepRested: 1, anxiety: 7 })).toBe(1);
  });

  it('sits in the middle for a middling day', () => {
    expect(dayUnrest(middling)).toBeCloseTo(0.5, 5);
  });

  it('reads a restless day as more agitated than a calm one', () => {
    expect(dayUnrest(unsettled)).toBeGreaterThan(dayUnrest(settled));
  });

  it('weights anxiety most heavily, because it reports unrest directly', () => {
    const anxious = dayUnrest({ mood: 4, sleepRested: 4, anxiety: 7 });
    const unrested = dayUnrest({ mood: 4, sleepRested: 1, anxiety: 4 });
    const lowMood = dayUnrest({ mood: 1, sleepRested: 4, anxiety: 4 });
    expect(anxious).toBeGreaterThan(unrested);
    expect(unrested).toBeGreaterThan(lowMood);
  });

  it('clamps input that is out of range rather than escaping 0..1', () => {
    expect(dayUnrest({ mood: -5, sleepRested: 99, anxiety: 42 })).toBeLessThanOrEqual(1);
    expect(dayUnrest({ mood: -5, sleepRested: 99, anxiety: 42 })).toBeGreaterThanOrEqual(0);
  });
});

describe('windlineSeries', () => {
  it('returns one value per day', () => {
    const days = Array.from({ length: WINDLINE_DAYS }, () => settled);
    expect(windlineSeries(days)).toHaveLength(WINDLINE_DAYS);
  });

  it('bridges a missed day instead of showing a gap', () => {
    // BRAND 4.1 — on a missed day, say nothing. A hole in the line would be
    // the app pointing at the day the person could not manage.
    const series = windlineSeries([settled, null, unsettled]);
    expect(series[1]).toBeCloseTo((series[0]! + series[2]!) / 2, 5);
  });

  it('bridges a run of missed days', () => {
    const series = windlineSeries([settled, null, null, null, unsettled]);
    expect(series.every((value) => Number.isFinite(value))).toBe(true);
    for (const value of series) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
    }
  });

  it('carries the first known value backwards to the start', () => {
    const series = windlineSeries([null, null, unsettled]);
    expect(series[0]).toBeCloseTo(series[2]!, 5);
    expect(series[1]).toBeCloseTo(series[2]!, 5);
  });

  it('carries the last known value forwards to today', () => {
    const series = windlineSeries([settled, null, null]);
    expect(series[2]).toBeCloseTo(series[0]!, 5);
  });

  it('is flat and quiet when nothing has been filled in yet', () => {
    // A new account should not open on an agitated line.
    expect(windlineSeries([null, null, null])).toEqual([0, 0, 0]);
  });

  it('leaves known days untouched', () => {
    const series = windlineSeries([settled, middling, unsettled]);
    expect(series[0]).toBeCloseTo(dayUnrest(settled), 5);
    expect(series[1]).toBeCloseTo(dayUnrest(middling), 5);
    expect(series[2]).toBeCloseTo(dayUnrest(unsettled), 5);
  });
});
