import type { CopyKey } from '../i18n/index';
import type { DateKey } from '../dates';

/**
 * The optional things luwte offers, and the two it now walks you through.
 *
 * PRD 6.2 — offered, and ignoring them costs nothing and is never recorded.
 * **Nothing in this file writes anything.** Not a count, not a last-done date,
 * not a history. The moment a practice records that you did it, there is a
 * state in which you failed to do one, and the product is a different product.
 *
 * ## Why breathing and grounding, and not meditation
 *
 * Meditation-induced psychosis is documented, and the risk factors are
 * intensive practice, retreat conditions, sleep deprivation and a prior
 * history of psychosis — which is luwte's user. The counter-evidence is real
 * too: adapted mindfulness for psychosis shows benefit and adverse events in
 * trials are rare. What reconciles them is the *shape* of the practice.
 * **Short, guided, externally focused and eyes open** is the safe subset; long
 * silent unguided sitting is where the case reports come from.
 *
 * So: a timed breathing guide you watch, and a grounding exercise that points
 * you at the room. No meditation timer, no body scan, and no open-ended
 * silence. That line is a safety decision, not a scoping one.
 */

export const OPTIONAL_PRACTICES = [
  { id: 'gratitude', labelKey: 'practiceGratitude', href: null },
  { id: 'breathing', labelKey: 'practiceBreathing', href: '/breathing' },
  { id: 'grounding', labelKey: 'practiceGrounding', href: '/grounding' },
  { id: 'walk', labelKey: 'practiceWalk', href: null },
] as const satisfies readonly { id: string; labelKey: CopyKey; href: string | null }[];

/*
 * The diary question, rotating.
 *
 * One free-text box asked the same way every evening becomes furniture. These
 * are the same box with a different way in — and one of them is the original
 * wording, so nothing is lost on the days it comes round.
 *
 * The gratitude research this answers is weak-to-modest and mostly from
 * non-clinical samples, which is exactly why this is a rotation and not a
 * gratitude feature: "what went alright" is one of seven ways to ask, not a
 * daily instruction to find a silver lining. On a bad day that instruction is
 * the app disagreeing with you about your day.
 */
export const DIARY_PROMPTS: readonly CopyKey[] = [
  'checkinDiary',
  'diaryPromptAlright',
  'diaryPromptSmall',
  'diaryPromptWho',
  'diaryPromptHelped',
  'diaryPromptEffort',
  'diaryPromptTomorrow',
];

/**
 * Which one today gets — by the day itself, so it is stable while somebody is
 * typing and cannot change under them on a re-render.
 */
export function diaryPromptFor(day: DateKey): CopyKey {
  const [year, month, date] = day.split('-').map(Number) as [number, number, number];
  const dayNumber = Math.floor(Date.UTC(year, month - 1, date) / 86_400_000);
  return DIARY_PROMPTS[
    ((dayNumber % DIARY_PROMPTS.length) + DIARY_PROMPTS.length) % DIARY_PROMPTS.length
  ]!;
}

/*
 * Four in, four held, six out.
 *
 * The long exhale is the point: a longer out-breath than in-breath is what
 * shifts the balance towards the parasympathetic side, and it is the one
 * parameter with a mechanism behind it rather than a tradition.
 *
 * Four cycles is about fifty-six seconds, which is what "adem een minuut traag
 * in en uit" already promised on Today. Long enough to do something, short
 * enough that it is never a session.
 */
export const BREATHING_PHASES = [
  { id: 'in', labelKey: 'breathingIn', seconds: 4, scale: 1 },
  { id: 'hold', labelKey: 'breathingHold', seconds: 4, scale: 1 },
  { id: 'out', labelKey: 'breathingOut', seconds: 6, scale: 0 },
] as const satisfies readonly { id: string; labelKey: CopyKey; seconds: number; scale: 0 | 1 }[];

export type BreathingPhase = (typeof BREATHING_PHASES)[number];

export const BREATHING_CYCLES = 4;

const CYCLE_SECONDS = BREATHING_PHASES.reduce((total, phase) => total + phase.seconds, 0);

export const BREATHING_SECONDS = CYCLE_SECONDS * BREATHING_CYCLES;

/**
 * Where the guide is at `elapsed` seconds in.
 *
 * A pure function of elapsed time rather than a chain of timeouts, so a tab
 * that was hidden resumes where it left off instead of drifting a phase behind
 * the animation somebody is watching.
 *
 * `done` once the last exhale finishes. `cycle` counts from zero.
 */
export function breathingAt(elapsed: number): {
  phase: BreathingPhase;
  cycle: number;
  done: boolean;
} {
  const clamped = Math.max(0, elapsed);
  if (clamped >= BREATHING_SECONDS) {
    return { phase: BREATHING_PHASES[BREATHING_PHASES.length - 1]!, cycle: BREATHING_CYCLES, done: true };
  }

  const cycle = Math.floor(clamped / CYCLE_SECONDS);
  let within = clamped - cycle * CYCLE_SECONDS;
  for (const phase of BREATHING_PHASES) {
    if (within < phase.seconds) return { phase, cycle, done: false };
    within -= phase.seconds;
  }
  // Unreachable: the loop covers a whole cycle. Kept so the type is honest.
  return { phase: BREATHING_PHASES[0]!, cycle, done: false };
}

/*
 * 5-4-3-2-1, which is the grounding exercise with the best claim to being
 * safe here: every step points outwards, at the room, with the eyes open.
 *
 * **There is nothing to fill in.** Turning it into a form would collect data
 * about somebody's worst ten minutes and make the exercise a record instead of
 * a thing you do. It is counted out in your head, the way it is done.
 */
export const GROUNDING_STEPS = [
  { count: 5, labelKey: 'groundingSee' },
  { count: 4, labelKey: 'groundingHear' },
  { count: 3, labelKey: 'groundingTouch' },
  { count: 2, labelKey: 'groundingSmell' },
  { count: 1, labelKey: 'groundingTaste' },
] as const satisfies readonly { count: number; labelKey: CopyKey }[];
