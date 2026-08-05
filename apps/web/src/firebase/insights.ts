import {
  DEFAULT_TIMEZONE,
  dateKey,
  paths,
  windowDateKeys,
  type InsightsMarker,
  type InsightsPoint,
  type InsightsWindow,
} from '@luwte/core';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from './client';

/** One row per day in the window, oldest first, nulls where nothing was filled in. */
export async function readInsights(
  uid: string,
  today: string,
  weeks: InsightsWindow,
): Promise<InsightsPoint[]> {
  const keys = windowDateKeys(today, weeks);

  const snapshot = await getDocs(
    query(
      collection(db, paths.checkins(uid)),
      where('date', '>=', keys[0]!),
      where('date', '<=', today),
    ),
  );

  const byDate = new Map<string, InsightsPoint>();
  for (const document of snapshot.docs) {
    const data = document.data();
    byDate.set(document.id, {
      date: document.id,
      mood: typeof data.mood === 'number' ? data.mood : null,
      energy: typeof data.energy === 'number' ? data.energy : null,
      flatness: typeof data.flatness === 'number' ? data.flatness : null,
      sleepHours: typeof data.sleepHours === 'number' ? data.sleepHours : null,
    });
  }

  return keys.map(
    (date) =>
      byDate.get(date) ?? { date, mood: null, energy: null, flatness: null, sleepHours: null },
  );
}

/**
 * PRD 6.6 — medication changes as vertical rules. Read from every
 * medication's `changeLog`, including ones that have been stopped, because a
 * change that happened inside the window still explains what the lines did.
 *
 * **Ownership handovers are logged but never drawn.** `prescribedBy` moving
 * from nobody to a psychiatrist, or back again when they leave, is provenance
 * — it belongs in the log, which is why the log records it. It is not a
 * clinical change, so a vertical rule for it would tell a reader that
 * something happened to the medication when nothing did. It would also print
 * a raw uid on the A4 a psychiatrist reads at an appointment, which is
 * meaningless to everyone in the room.
 */
export async function readMedicationMarkers(
  uid: string,
  keys: readonly string[],
): Promise<InsightsMarker[]> {
  const snapshot = await getDocs(collection(db, paths.medications(uid)));
  const markers: InsightsMarker[] = [];

  for (const document of snapshot.docs) {
    const data = document.data();
    const name = data.name ?? '';
    for (const change of (data.changeLog ?? []) as {
      at?: { toDate?: () => Date };
      field?: string;
      from?: string | null;
      to?: string | null;
    }[]) {
      const at = change.at?.toDate?.();
      if (!at) continue;
      if (change.field === 'prescribedBy') continue;
      // The patient's own day, not UTC. A change made at 23:30 in Brussels
      // belongs on that evening, and `toISOString().slice(0, 10)` would draw
      // its rule on the following morning — a day out from the check-ins it
      // is meant to explain.
      const date = dateKey(at, DEFAULT_TIMEZONE);
      if (!keys.includes(date)) continue;
      markers.push({
        date,
        label: `${date} · ${name} · ${change.from ?? '—'} → ${change.to ?? '—'}`,
      });
    }
  }

  return markers.sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * PRD 6.6 — adherence, as a plain count rather than a percentage on screen.
 * Percentages of progress are forbidden in the interface (BRAND 4.1); the
 * report states it as "x of y", which is a fact rather than a score.
 */
export async function readAdherence(
  uid: string,
  keys: readonly string[],
): Promise<{ taken: number; scheduled: number }> {
  const snapshot = await getDocs(
    query(
      collection(db, paths.doses(uid)),
      where('date', '>=', keys[0]!),
      where('date', '<=', keys.at(-1)!),
    ),
  );

  let taken = 0;
  let scheduled = 0;
  for (const document of snapshot.docs) {
    scheduled += 1;
    if (document.data().status === 'taken') taken += 1;
  }
  return { taken, scheduled };
}

export async function readDiary(
  uid: string,
  keys: readonly string[],
): Promise<{ date: string; note: string }[]> {
  const snapshot = await getDocs(
    query(
      collection(db, paths.checkins(uid)),
      where('date', '>=', keys[0]!),
      where('date', '<=', keys.at(-1)!),
    ),
  );

  return snapshot.docs
    .map((document) => ({ date: document.id, note: (document.data().note ?? '') as string }))
    .filter((entry) => entry.note.trim().length > 0)
    .sort((a, b) => b.date.localeCompare(a.date));
}
