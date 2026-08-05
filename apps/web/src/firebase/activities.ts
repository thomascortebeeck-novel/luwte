import {
  completionId,
  paths,
  type Activity,
  type ActivityStatus,
  type Completion,
} from '@luwte/core';
import {
  collection,
  doc,
  getCountFromServer,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from './client';

export type ActivityRecord = Activity & { id: string };
export type CompletionRecord = Completion & { id: string };

const toActivity = (id: string, data: Record<string, unknown>): ActivityRecord => ({
  id,
  title: (data.title ?? '') as string,
  date: (data.date ?? '') as string,
  startTime: (data.startTime ?? '') as string,
  withPerson: (data.withPerson ?? '') as string,
  createdBy: (data.createdBy ?? '') as string,
  status: (data.status ?? 'accepted') as ActivityStatus,
  recurrence: (data.recurrence ?? null) as Activity['recurrence'],
  expectedPleasure: (data.expectedPleasure ?? null) as number | null,
  expectedMastery: (data.expectedMastery ?? null) as number | null,
});

/**
 * Every activity, not a date range.
 *
 * A recurring activity is stored once, on the day it starts, so a range query
 * on `date` would miss a weekly coffee that began in March. Recurrence is
 * expanded on the device by `occursOn`. For a family-sized calendar that is
 * cheaper than the index it would otherwise need, and it is the only reading
 * that cannot silently drop a repeating entry.
 */
export async function readActivities(uid: string): Promise<ActivityRecord[]> {
  const snapshot = await getDocs(collection(db, paths.activities(uid)));
  return snapshot.docs.map((document) => toActivity(document.id, document.data()));
}

/**
 * The same, for someone reading through a circle grant. The status filter is
 * not optional: the rules refuse a listing that could return a declined
 * activity, which is how "declining is silent" is made true.
 */
export async function readSharedActivities(uid: string): Promise<ActivityRecord[]> {
  const snapshot = await getDocs(
    query(collection(db, paths.activities(uid)), where('status', 'in', ['suggested', 'accepted'])),
  );
  return snapshot.docs.map((document) => toActivity(document.id, document.data()));
}

type NewActivity = Omit<
  Activity,
  'createdBy' | 'status' | 'expectedPleasure' | 'expectedMastery'
> &
  Partial<Pick<Activity, 'expectedPleasure' | 'expectedMastery'>>;

export async function createActivity(
  uid: string,
  values: NewActivity,
  createdBy: string,
  /** 'suggested' when a supporter offers it — the rules allow them no other. */
  status: ActivityStatus = 'accepted',
): Promise<void> {
  const id = doc(collection(db, paths.activities(uid))).id;
  await setDoc(doc(db, paths.activity(uid, id)), {
    ...values,
    // An expectation is what the person thought when they planned it, so a
    // suggestion carries none — dropped here as well as refused by the rules,
    // because the suggest form has no business sending one at all.
    expectedPleasure: status === 'suggested' ? null : (values.expectedPleasure ?? null),
    expectedMastery: status === 'suggested' ? null : (values.expectedMastery ?? null),
    createdBy,
    status,
  });
}

/**
 * Accepting or declining. Declining leaves the record — what was offered is
 * worth keeping — and the rules stop the suggester from ever reading it, so
 * nothing about the decline reaches them.
 */
export async function setActivityStatus(
  uid: string,
  activityId: string,
  status: ActivityStatus,
): Promise<void> {
  await updateDoc(doc(db, paths.activity(uid, activityId)), { status });
}

export async function updateActivity(
  uid: string,
  activityId: string,
  values: Partial<Omit<Activity, 'createdBy'>>,
): Promise<void> {
  await updateDoc(doc(db, paths.activity(uid, activityId)), values);
}

export async function readCompletions(
  uid: string,
  date: string,
): Promise<Record<string, CompletionRecord>> {
  const snapshot = await getDocs(
    query(collection(db, paths.completions(uid)), where('date', '==', date)),
  );

  const byActivity: Record<string, CompletionRecord> = {};
  for (const document of snapshot.docs) {
    const data = document.data();
    byActivity[data.activityId as string] = {
      id: document.id,
      activityId: (data.activityId ?? '') as string,
      date: (data.date ?? '') as string,
      // Null when it was ticked and then unticked. Distinguishing that from
      // "completed just now" is the difference between a record and a guess.
      completedAt: data.completedAt?.toDate?.() ?? null,
      pleasure: (data.pleasure ?? null) as number | null,
      mastery: (data.mastery ?? null) as number | null,
      postedToFeed: data.postedToFeed === true,
    };
  }
  return byActivity;
}

/**
 * Not awaited by the UI. Ticking something off has to feel instant and work
 * with no signal; the keyed document id means a double sync records one.
 */
export function completeActivity(uid: string, activityId: string, date: string): string {
  const id = completionId(activityId, date);
  void setDoc(
    doc(db, paths.completion(uid, id)),
    { activityId, date, completedAt: serverTimestamp(), postedToFeed: false },
    { merge: true },
  );
  return id;
}

/**
 * How many times this was already finished, on days before `before`.
 *
 * Feeds `shouldAskRating`, which is why it is a count and not a fetch: the
 * cadence needs a number, and reading a year of a daily activity's
 * completions to get one would be a page of documents per tick.
 *
 * **Bounded to earlier days deliberately.** `completeActivity` is not awaited
 * — the tick has to feel instant offline — so counting up to and including
 * today would return a different number depending on whether that write had
 * landed yet, and the question would appear at random.
 */
export async function countCompletionsBefore(
  uid: string,
  activityId: string,
  before: string,
): Promise<number> {
  const snapshot = await getCountFromServer(
    query(
      collection(db, paths.completions(uid)),
      where('activityId', '==', activityId),
      where('date', '<', before),
    ),
  );
  return snapshot.data().count;
}

/** PRD 6.2 — the two-tap question, which may always be skipped. */
export function rateCompletion(
  uid: string,
  completionKey: string,
  ratings: { pleasure?: number; mastery?: number },
): void {
  void setDoc(doc(db, paths.completion(uid, completionKey)), ratings, { merge: true });
}

export function uncompleteActivity(uid: string, activityId: string, date: string): void {
  // Unticking is not deletion: the record stays, marked as not done, because
  // a completion that can vanish makes the history untrustworthy.
  void setDoc(
    doc(db, paths.completion(uid, completionId(activityId, date))),
    { activityId, date, completedAt: null },
    { merge: true },
  );
}
