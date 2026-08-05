import { z } from 'zod';

/**
 * The person's own early-warning-signs plan.
 *
 * Standard psychosis relapse prevention, and the item on the whole feature
 * list that suits this product best: it is entirely the person's own words
 * about their own patterns, and luwte's job is to hold it and hand it back —
 * not to detect anything.
 *
 * **luwte never matches a check-in against this list.** That would be
 * generating a conclusion about somebody's mental state, which is clinical
 * monitoring, Class IIa under EU MDR, and the one thing this product may never
 * do. The plan is a thing the person wrote and can re-read, in the same way
 * the diary is. If it ever grows a "we noticed three of your signs this week",
 * that is a different product with a notified body attached.
 *
 * Each entry is a pair, because a sign without a response is a worry list.
 * Naming what you do about it is the whole mechanism.
 */
export const planEntrySchema = z.object({
  /** What the person notices first. Their words, not a checklist. */
  sign: z.string().min(1).max(200),
  /** What they do about it. May be empty while they are still thinking. */
  action: z.string().max(300).default(''),
  createdAt: z.date(),
});

export type PlanEntry = z.infer<typeof planEntrySchema>;

/**
 * Prompts, offered as examples and never as a checklist to tick.
 *
 * A ready-made list of warning signs would have somebody agreeing to symptoms
 * they do not have, and the plan is only useful in their own words — "ik begin
 * mijn kamer op te ruimen om vier uur 's nachts" is a real early sign and no
 * instrument would ever have printed it.
 */
export const PLAN_EXAMPLE_KEYS = [
  'planExampleSleep',
  'planExampleWithdraw',
  'planExampleThoughts',
  'planExampleMedication',
] as const;

/** Whether there is anything worth showing to somebody the person shared it with. */
export function hasPlan(entries: readonly PlanEntry[]): boolean {
  return entries.some((entry) => entry.sign.trim().length > 0);
}
