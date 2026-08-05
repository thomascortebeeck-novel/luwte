import {
  paths,
  shouldPostCompletion,
  type Post,
  type ReactionType,
} from '@luwte/core';
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { db } from './client';

export type PostRecord = Post & {
  id: string;
  reactions: Record<string, ReactionType>;
  comments: { id: string; authorUid: string; text: string; at: Date | null }[];
};

const toDate = (value: unknown): Date | null =>
  typeof (value as { toDate?: () => Date })?.toDate === 'function'
    ? (value as { toDate: () => Date }).toDate()
    : null;

/**
 * The feed for one patient, newest first, with reactions and comments loaded
 * alongside. A family-sized feed is small enough that fetching the
 * subcollections is cheaper than the complexity of not doing so.
 */
export async function readFeed(patientId: string): Promise<PostRecord[]> {
  const snapshot = await getDocs(
    query(collection(db, paths.posts(patientId)), orderBy('createdAt', 'desc')),
  );

  return Promise.all(
    snapshot.docs.map(async (document) => {
      const data = document.data();
      const [reactions, comments] = await Promise.all([
        getDocs(collection(db, paths.reactions(patientId, document.id))),
        getDocs(collection(db, paths.comments(patientId, document.id))),
      ]);

      return {
        id: document.id,
        activityId: (data.activityId ?? null) as string | null,
        title: (data.title ?? '') as string,
        text: (data.text ?? '') as string,
        createdAt: toDate(data.createdAt) ?? new Date(),
        reactions: Object.fromEntries(
          reactions.docs.map((r) => [r.id, r.data().type as ReactionType]),
        ),
        comments: comments.docs
          .map((c) => ({
            id: c.id,
            authorUid: (c.data().authorUid ?? '') as string,
            text: (c.data().text ?? '') as string,
            at: toDate(c.data().at),
          }))
          .sort((a, b) => (a.at?.getTime() ?? 0) - (b.at?.getTime() ?? 0)),
      };
    }),
  );
}

export async function createPost(
  patientId: string,
  values: { activityId?: string | null; title?: string; text?: string },
): Promise<void> {
  const id = doc(collection(db, paths.posts(patientId))).id;
  await setDoc(doc(db, paths.post(patientId, id)), {
    activityId: values.activityId ?? null,
    title: values.title ?? '',
    text: values.text ?? '',
    createdAt: serverTimestamp(),
  });
}

/**
 * Posts a finished activity, if that is what the person wants.
 *
 * The decision lives in `shouldPostCompletion`, which refuses anything
 * without an activity id — so a dose passing through here posts nothing, and
 * "small things like pill completions are not shared" is true in code rather
 * than by every caller remembering.
 *
 * Not awaited. Ticking something off must feel instant and work offline; the
 * post following a moment later is fine, and a failed post must never make
 * the tick look broken.
 */
export function postCompletion(
  patientId: string,
  options: { sharingEnabled: boolean; activityId: string | null; title: string },
): void {
  if (!shouldPostCompletion(options)) return;
  void createPost(patientId, { activityId: options.activityId, title: options.title });
}

/** One per person per post, keyed by uid: reacting again changes your mind. */
export function react(
  patientId: string,
  postId: string,
  memberUid: string,
  type: ReactionType,
): void {
  void setDoc(doc(db, paths.reaction(patientId, postId, memberUid)), {
    type,
    at: serverTimestamp(),
  });
}

export function unreact(patientId: string, postId: string, memberUid: string): void {
  void deleteDoc(doc(db, paths.reaction(patientId, postId, memberUid)));
}

export async function comment(
  patientId: string,
  postId: string,
  authorUid: string,
  text: string,
): Promise<void> {
  const id = doc(collection(db, paths.comments(patientId, postId))).id;
  await setDoc(doc(db, paths.comment(patientId, postId, id)), {
    authorUid,
    text,
    at: serverTimestamp(),
  });
}
