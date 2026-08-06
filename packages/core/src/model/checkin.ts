import { z } from 'zod';
import { localHour } from '../reminders';

/** Every subjective item in the product is 1..7. Never shown as a number. */
export const scaleSchema = z.number().int().min(1).max(7);
export type Scale = z.infer<typeof scaleSchema>;

/**
 * A word per step, low to high — what a screen reader says instead of a
 * digit, and what any scale outside the check-in should also be using. BRAND
 * forbids the number, not the meaning: "heel weinig" is answerable, "3 of 7"
 * invites somebody to score themselves.
 */
export const SCALE_STEP_KEYS = [
  'scaleStep1',
  'scaleStep2',
  'scaleStep3',
  'scaleStep4',
  'scaleStep5',
  'scaleStep6',
  'scaleStep7',
] as const;

/**
 * PRD 5.2 — one document per local calendar day, keyed by the date string
 * rather than an auto id. That makes one-per-day idempotent and makes an
 * offline write safely mergeable when it finally syncs.
 */
/**
 * The daily check-in, on the two axes that actually span momentary feeling —
 * plus the one thing they cannot express.
 *
 * The circumplex model of core affect holds that two orthogonal dimensions
 * cover it: **valence** (pleasant to unpleasant) and **arousal** (activated to
 * deactivated). The earlier six items did not respect that. `mood` was
 * valence; `energy` and `anxiety` were both *arousal*, differing only in
 * valence, which is why answering all three felt like being asked the same
 * question three ways. Together with valence, one arousal item already tells
 * energised from agitated: high arousal and pleasant is one, high arousal and
 * unpleasant is the other.
 *
 * **`flatness` is not folded in, and that is the point.** It is not a position
 * on the circumplex — it is the absence of a response at all, which no
 * combination of valence and arousal can express. It is a core negative
 * symptom in psychosis, a core depression symptom, and the thing
 * antipsychotics blunt, which makes it precisely the item that changes an
 * appointment. The Maastricht experience-sampling tradition keeps positive and
 * negative affect apart for the same reason.
 *
 * Three scales instead of five, and no clinical signal given up. Under half a
 * minute, which is the other half of the argument: this is a logbook somebody
 * unwell has to face every evening, and every question that earns its place
 * makes the ones that do not more expensive.
 */
export const checkinSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  /** Valence: how pleasant or unpleasant the day felt. */
  mood: scaleSchema,
  /**
   * Arousal: how activated or slowed-down, regardless of whether it was
   * pleasant. Replaces `energy` and `anxiety`, which were the same axis.
   */
  arousal: scaleSchema,
  /**
   * A quantity, not a rating, so it is the one check-in field shown as a
   * number. BRAND's "never a visible number" governs the subjective scales,
   * where a number invites scoring yourself; hours slept has no such reading.
   *
   * `sleepRested` used to sit beside this and no longer does: sleep *quality*
   * is largely absorbed by valence and arousal, and a watch cannot supply it
   * either — consumer sleep staging validates weakly against polysomnography,
   * so an automatic version would be a guess presented as a fact. Duration is
   * different, and becomes automatic when a wearable is connected.
   */
  sleepHours: z.number().min(0).max(16),
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

/**
 * The order the daily questions are asked in.
 *
 * **Two screens render this list, differently.** Today shows all of it at
 * once, which is where the check-in normally happens; `/checkin` still asks
 * one per screen, for editing a past day and for the weekly items, where the
 * questions are rare enough to be worth slowing down for.
 *
 * Each carries its own scale ends, because they are not all the same shape.
 * Valence and flatness run from little to a lot; **arousal is bipolar** — both
 * ends are a real state rather than an absence, and labelling it "weinig" to
 * "veel" would ask people to rate slowness as a low amount of restlessness.
 */
export const CHECKIN_STEPS = [
  {
    id: 'mood',
    questionKey: 'checkinMood',
    kind: 'scale',
    lowKey: 'scaleLow',
    highKey: 'scaleHigh',
  },
  {
    id: 'arousal',
    questionKey: 'checkinArousal',
    kind: 'scale',
    lowKey: 'checkinArousalLow',
    highKey: 'checkinArousalHigh',
  },
  {
    id: 'flatness',
    questionKey: 'checkinFlatness',
    kind: 'scale',
    lowKey: 'scaleLow',
    highKey: 'scaleHigh',
  },
  // Last, and a number rather than a scale. It is the one item a wearable can
  // eventually answer without asking, so it sits at the end where removing it
  // later shortens the flow instead of leaving a hole in the middle.
  {
    id: 'sleepHours',
    questionKey: 'checkinSleepHours',
    kind: 'hours',
    lowKey: 'scaleLow',
    highKey: 'scaleHigh',
  },
] as const;

/**
 * Whether the day is far enough along to ask how it went.
 *
 * The check-in now sits on Today rather than behind a button, so something
 * has to decide when it appears — and asking somebody at nine in the morning
 * how their day was is asking them to invent an answer.
 *
 * The threshold is **the hour they already chose** in Settings for their
 * reminder. One setting rather than two that can disagree, and the question
 * turns up on the screen at the same time the nudge would arrive.
 *
 * Computed in the patient's zone, like every other time decision in this
 * product, so somebody travelling still gets their own evening.
 */
export function isCheckinTime(now: Date, checkinHour: number, timeZone: string): boolean {
  return localHour(now, timeZone) >= checkinHour;
}

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
