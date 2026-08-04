import { WINDLINE_DAYS, dateKey, paths, previousDateKey, type WindlineDay } from '@luwte/core';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from './client';

/**
 * The last fourteen days, oldest first, with `null` for days that were never
 * filled in. The windline bridges those; nothing anywhere shows a gap.
 */
export async function readWindlineDays(
  uid: string,
  today: string,
): Promise<(WindlineDay | null)[]> {
  const keys: string[] = [today];
  for (let i = 1; i < WINDLINE_DAYS; i += 1) {
    keys.unshift(previousDateKey(keys[0]!));
  }

  const snapshot = await getDocs(
    query(
      collection(db, paths.checkins(uid)),
      where('date', '>=', keys[0]!),
      where('date', '<=', today),
    ),
  );

  const byDate = new Map<string, WindlineDay>();
  for (const document of snapshot.docs) {
    const data = document.data();
    if (
      typeof data.mood === 'number' &&
      typeof data.sleepRested === 'number' &&
      typeof data.anxiety === 'number'
    ) {
      byDate.set(document.id, {
        mood: data.mood,
        sleepRested: data.sleepRested,
        anxiety: data.anxiety,
      });
    }
  }

  return keys.map((key) => byDate.get(key) ?? null);
}

export function windowEndingToday(timezone: string): string {
  return dateKey(new Date(), timezone);
}
