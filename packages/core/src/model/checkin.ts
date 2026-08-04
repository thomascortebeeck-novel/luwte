import { z } from 'zod';

/** Every subjective item in the product is 1..7. Never shown as a number. */
export const scaleSchema = z.number().int().min(1).max(7);
export type Scale = z.infer<typeof scaleSchema>;

/**
 * PRD 5.2 — one document per local calendar day, keyed by the date string
 * rather than an auto id. That makes one-per-day idempotent and makes an
 * offline write safely mergeable when it finally syncs.
 */
export const checkinSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  mood: scaleSchema,
  energy: scaleSchema,
  /**
   * A quantity, not a rating, so it is the one check-in field shown as a
   * number. BRAND's "never a visible number" governs the subjective scales,
   * where a number invites scoring yourself; hours slept has no such reading.
   */
  sleepHours: z.number().min(0).max(16),
  sleepRested: scaleSchema,
  anxiety: scaleSchema,
  /**
   * PRD 6.1 — the most important field in the product. Medication-induced
   * emotional blunting is absent from standard scales, and making it visible
   * over time is what turns "he seems numb since the dose change" into
   * something a psychiatrist can act on.
   */
  flatness: scaleSchema,
  /** The person's own words. Rendered in the serif, never analysed. */
  note: z.string().max(2000).optional(),
  source: z.enum(['manual', 'prefilled']),
});

export type Checkin = z.infer<typeof checkinSchema>;

/**
 * PRD 6.1 — four extra items once a week. The first three screen for
 * akathisia and parkinsonism, both routinely mistaken for depression, which
 * is the entire reason they are worth fifteen seconds a week.
 */
export const weeklySchema = z.object({
  restlessness: scaleSchema,
  stiffness: scaleSchema,
  sedation: scaleSchema,
  hopelessness: scaleSchema,
});

export type Weekly = z.infer<typeof weeklySchema>;

/** The order the daily questions are asked in. One question per screen. */
export const CHECKIN_STEPS = [
  { id: 'mood', questionKey: 'checkinMood', kind: 'scale' },
  { id: 'energy', questionKey: 'checkinEnergy', kind: 'scale' },
  { id: 'sleepHours', questionKey: 'checkinSleepHours', kind: 'hours' },
  { id: 'sleepRested', questionKey: 'checkinSleep', kind: 'scale' },
  { id: 'anxiety', questionKey: 'checkinAnxiety', kind: 'scale' },
  { id: 'flatness', questionKey: 'checkinFlatness', kind: 'scale' },
] as const;

export const WEEKLY_STEPS = [
  { id: 'restlessness', questionKey: 'weeklyRestlessness' },
  { id: 'stiffness', questionKey: 'weeklyStiffness' },
  { id: 'sedation', questionKey: 'weeklySedation' },
  { id: 'hopelessness', questionKey: 'weeklyHopelessness' },
] as const;

/**
 * PRD 6.1 — a top-of-scale hopelessness answer shows the crisis screen once,
 * calmly. It does not alert the circle. Automatic escalation to family would
 * make people stop answering honestly, which costs more than it gains.
 */
export const HOPELESSNESS_CRISIS_THRESHOLD = 7;

export function shouldOfferCrisis(weekly: Pick<Weekly, 'hopelessness'>): boolean {
  return weekly.hopelessness >= HOPELESSNESS_CRISIS_THRESHOLD;
}
