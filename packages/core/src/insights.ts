import { previousDateKey, type DateKey } from './dates';

/**
 * PRD 6.6 — one chart. Mood, energy, flatness, sleep over a selectable
 * window, with medication changes marked as vertical rules.
 *
 * That last detail is the entire clinical value of the product: seeing
 * flatness rise in the fortnight after a dose increase is the thing that
 * changes an appointment. Everything else here is in service of it.
 */

export const INSIGHTS_WINDOWS = [2, 6, 12] as const;
export type InsightsWindow = (typeof INSIGHTS_WINDOWS)[number];

export function windowDays(weeks: InsightsWindow): number {
  return weeks * 7;
}

/** Date keys for a window ending today, oldest first. */
export function windowDateKeys(today: DateKey, weeks: InsightsWindow): DateKey[] {
  const keys: DateKey[] = [today];
  for (let i = 1; i < windowDays(weeks); i += 1) {
    keys.unshift(previousDateKey(keys[0]!));
  }
  return keys;
}

/**
 * The metrics drawn. Sleep is on its own scale — hours, not 1..7 — so it is
 * marked as such rather than silently plotted against the same axis.
 */
export type InsightsMetricId = 'mood' | 'energy' | 'flatness' | 'sleepHours';

export type InsightsMetric = {
  id: InsightsMetricId;
  labelKey: 'checkinMood' | 'checkinEnergy' | 'checkinFlatness' | 'checkinSleepHours';
  /** 1..7 for the subjective scales, hours for sleep. */
  scale: 'seven' | 'hours';
};

export const INSIGHTS_METRICS: readonly InsightsMetric[] = [
  { id: 'mood', labelKey: 'checkinMood', scale: 'seven' },
  { id: 'energy', labelKey: 'checkinEnergy', scale: 'seven' },
  // PRD 6.1 — the most important field in the product, and the reason the
  // chart exists at all.
  { id: 'flatness', labelKey: 'checkinFlatness', scale: 'seven' },
  { id: 'sleepHours', labelKey: 'checkinSleepHours', scale: 'hours' },
];

export type InsightsPoint = {
  date: DateKey;
  mood: number | null;
  energy: number | null;
  flatness: number | null;
  sleepHours: number | null;
};

/** A medication change, positioned on the timeline. */
export type InsightsMarker = {
  date: DateKey;
  /** Short, human-readable: "Quetiapine 200 mg → 300 mg". */
  label: string;
};

/**
 * Normalises a value onto 0..1 for drawing. Sleep is clamped at 12 hours
 * rather than scaled to the longest night ever recorded, so one 16-hour
 * sleep does not flatten the rest of the chart into a line.
 */
export function normaliseForChart(value: number, scale: 'seven' | 'hours'): number {
  if (scale === 'seven') return (Math.min(7, Math.max(1, value)) - 1) / 6;
  return Math.min(12, Math.max(0, value)) / 12;
}

/**
 * Where a date sits along the window, 0..1. Used for both the lines and the
 * medication rules, so a rule always lands on the day it happened.
 */
export function positionOf(date: DateKey, keys: readonly DateKey[]): number | null {
  const index = keys.indexOf(date);
  if (index === -1) return null;
  return keys.length === 1 ? 0 : index / (keys.length - 1);
}
