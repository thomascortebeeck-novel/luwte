import { z } from 'zod';
import type { CopyKey } from '../i18n/types';

/**
 * PRD 6.4 — the feed. Scoped to one patient and their circle, and **not a
 * network**: there is no discovery, no follower count, no ordering by
 * anything but time.
 *
 * The one rule that shapes everything here: **reactions are warm only.** No
 * negative reaction exists, not because disapproval never happens but because
 * a person recovering from psychosis reading a thumbs-down from their mother
 * at 2am is a harm this product will not create. There is no way to add one
 * later without changing this list, which is the point of it being a list.
 */

export const REACTIONS = [
  { id: 'heart', labelKey: 'reactionHeart' },
  { id: 'clap', labelKey: 'reactionClap' },
  { id: 'proud', labelKey: 'reactionProud' },
] as const satisfies readonly { id: string; labelKey: CopyKey }[];

export type ReactionType = (typeof REACTIONS)[number]['id'];

export const reactionTypeSchema = z.enum(['heart', 'clap', 'proud']);

export const reactionSchema = z.object({
  type: reactionTypeSchema,
  at: z.date(),
});

export type Reaction = z.infer<typeof reactionSchema>;

export const commentSchema = z.object({
  authorUid: z.string().min(1),
  text: z.string().min(1).max(1000),
  at: z.date(),
});

export type Comment = z.infer<typeof commentSchema>;

/**
 * A post is either something the person finished, or something they wrote.
 *
 * `activityId` is set when completing a planned activity posted it. Doses are
 * deliberately never a post: what a person took is between them and their
 * clinician, and a feed item for every pill would turn adherence into a
 * performance for the family.
 */
export const postSchema = z.object({
  activityId: z.string().nullable().default(null),
  title: z.string().max(120).default(''),
  text: z.string().max(1000).default(''),
  createdAt: z.date(),
});

export type Post = z.infer<typeof postSchema>;

/**
 * Whether finishing this activity should post.
 *
 * Two conditions, and both are the patient's: sharing is on at all, and this
 * was a planned activity rather than a dose. PRD 6.2's medication ticks pass
 * through here and are refused, which is what makes "small things like pill
 * completions should not be shared" true in code rather than in a comment.
 */
export function shouldPostCompletion(
  options: { sharingEnabled: boolean; activityId: string | null },
): boolean {
  return options.sharingEnabled && typeof options.activityId === 'string' && options.activityId !== '';
}

export type NotifiableMember = {
  uid: string;
  /** From the patient's circle entry for this person. */
  canSeeFeed: boolean;
  revoked: boolean;
  /** That person's own notification preference. */
  wantsSupportedActivity: boolean;
};

/**
 * Who to tell when a patient posts.
 *
 * Both sides have to agree, and they are asked in this order because the
 * patient's decision is the one that governs: a supporter who wants
 * notifications and was never granted `feed` gets nothing, and a supporter
 * who was granted `feed` but turned notifications off gets nothing either.
 *
 * Pure, and tested, for the same reason `reminders.ts` is: the decision about
 * whom to disturb is the part worth getting right, and a Cloud Function is
 * plumbing around it.
 */
export function whoToNotify(members: readonly NotifiableMember[]): string[] {
  return members
    .filter((member) => !member.revoked)
    .filter((member) => member.canSeeFeed)
    .filter((member) => member.wantsSupportedActivity)
    .map((member) => member.uid);
}
