import { z } from 'zod';
import type { CopyKey } from '../i18n/types';

/**
 * The person's own safety plan — Stanley & Brown's six steps.
 *
 * Step 1 (warning signs) was built first and is unchanged in substance. The
 * other five are what the evidence is actually about: Stanley et al. (2018,
 * JAMA Psychiatry) found roughly 45% fewer suicidal behaviours over six
 * months against usual care, for the whole intervention rather than a list of
 * signs on its own.
 *
 * **luwte never matches anything against this.** Comparing a check-in to
 * somebody's warning signs is generating a conclusion about their mental
 * state — clinical monitoring, Class IIa under EU MDR, and the one thing this
 * product may never do. The plan is held and handed back, like the diary.
 *
 * One collection with a `section` discriminator rather than six collections:
 * the `plan` permission, the security rules and the erasure coverage already
 * exist, and duplicating them six times is six chances to get one wrong.
 */
export const PLAN_SECTIONS = [
  'warning',
  'coping',
  'distraction',
  'help',
  'professional',
  'safer',
] as const;

export type PlanSection = (typeof PLAN_SECTIONS)[number];

export const planEntrySchema = z.object({
  /**
   * Absent on every entry written before the other five steps existed, and
   * those were all warning signs — so the default is the truth rather than a
   * guess.
   */
  section: z.enum(PLAN_SECTIONS).default('warning'),
  /** The thing itself: a sign, a strategy, a place, a person's name. */
  label: z.string().min(1).max(200),
  /** What to do with it: the response, a phone number, how they help. */
  detail: z.string().max(300).default(''),
  createdAt: z.date(),
});

export type PlanEntry = z.infer<typeof planEntrySchema>;

/**
 * What each section asks, in the person's own words.
 *
 * `safer` is deliberately worded as a note about what they **arranged**, not
 * as a prompt to enumerate means. In the protocol that step happens with a
 * clinician in the room; an app asking an unsupervised person to list what
 * they would use is doing something else entirely.
 */
export const PLAN_SECTION_COPY: Record<
  PlanSection,
  { titleKey: CopyKey; introKey: CopyKey; labelKey: CopyKey; detailKey: CopyKey }
> = {
  warning: {
    titleKey: 'planWarningTitle',
    introKey: 'planWarningIntro',
    labelKey: 'planWarningLabel',
    detailKey: 'planWarningDetail',
  },
  coping: {
    titleKey: 'planCopingTitle',
    introKey: 'planCopingIntro',
    labelKey: 'planCopingLabel',
    detailKey: 'planCopingDetail',
  },
  distraction: {
    titleKey: 'planDistractionTitle',
    introKey: 'planDistractionIntro',
    labelKey: 'planDistractionLabel',
    detailKey: 'planDistractionDetail',
  },
  help: {
    titleKey: 'planHelpTitle',
    introKey: 'planHelpIntro',
    labelKey: 'planHelpLabel',
    detailKey: 'planHelpDetail',
  },
  professional: {
    titleKey: 'planProfessionalTitle',
    introKey: 'planProfessionalIntro',
    labelKey: 'planProfessionalLabel',
    detailKey: 'planProfessionalDetail',
  },
  safer: {
    titleKey: 'planSaferTitle',
    introKey: 'planSaferIntro',
    labelKey: 'planSaferLabel',
    detailKey: 'planSaferDetail',
  },
};

/**
 * Prompts, offered as examples and never as a checklist to tick.
 *
 * A ready-made list would have somebody agreeing to signs they do not have,
 * and the plan is only useful in their own words — "ik begin mijn kamer op te
 * ruimen om vier uur 's nachts" is a real early sign and no instrument would
 * ever have printed it.
 */
export const PLAN_EXAMPLE_KEYS = [
  'planExampleSleep',
  'planExampleWithdraw',
  'planExampleThoughts',
  'planExampleMedication',
] as const;

export function entriesInSection(
  entries: readonly PlanEntry[],
  section: PlanSection,
): PlanEntry[] {
  return entries.filter((entry) => entry.section === section);
}

/** Whether there is anything worth showing to somebody it was shared with. */
export function hasPlan(entries: readonly PlanEntry[]): boolean {
  return entries.some((entry) => entry.label.trim().length > 0);
}
