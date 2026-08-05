import { describe, expect, it } from 'vitest';
import { WINDLINE_DAYS, dayUnrest, windlineSeries, type WindlineDay } from './windline';

const settled: WindlineDay = { mood: 6, arousal: 1 };
const unsettled: WindlineDay = { mood: 2, arousal: 7 };
const middling: WindlineDay = { mood: 4, arousal: 4 };

describe('dayUnrest', () => {
  it('runs from 0 to 1', () => {
    expect(dayUnrest({ mood: 7, arousal: 1 })).toBe(0);
    expect(dayUnrest({ mood: 1, arousal: 7 })).toBe(1);
  });

  it('reads a restless day as more agitated than a calm one', () => {
    expect(dayUnrest(unsettled)).toBeGreaterThan(dayUnrest(settled));
  });

  /*
   * The thing the old formula got wrong, and the reason this one is shaped
   * around the circumplex rather than around a single anxiety item.
   *
   * Elation and agitation are both high arousal. Following arousal alone drew
   * the same restless line for a day spent busy and delighted as for a day
   * spent wound up and miserable — and telling somebody their good day looked
   * unsettled is exactly the kind of false verdict BRAND forbids.
   */
  it('does not read an elated day as an unsettled one', () => {
    const elated = dayUnrest({ mood: 7, arousal: 7 });
    const agitated = dayUnrest({ mood: 1, arousal: 7 });
    expect(elated).toBeLessThan(agitated);
  });

  it('still shows some movement on an elated day rather than flattening it', () => {
    // Zeroing it would make a calm fortnight and an exhilarating one identical,
    // which is a different falsehood from the one above.
    expect(dayUnrest({ mood: 7, arousal: 7 })).toBeGreaterThan(dayUnrest({ mood: 7, arousal: 1 }));
  });

  it('is quiet when nothing is activated, however the day felt', () => {
    // Low arousal is low arousal. A flat unhappy day is not an unsettled one,
    // and the windline is not a happiness meter.
    expect(dayUnrest({ mood: 1, arousal: 1 })).toBe(0);
  });

  it('clamps input that is out of range rather than escaping 0..1', () => {
    expect(dayUnrest({ mood: -5, arousal: 42 })).toBeLessThanOrEqual(1);
    expect(dayUnrest({ mood: -5, arousal: 42 })).toBeGreaterThanOrEqual(0);
    expect(dayUnrest({ mood: 99, arousal: -7 })).toBeGreaterThanOrEqual(0);
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
