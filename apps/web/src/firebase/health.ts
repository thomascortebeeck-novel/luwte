import {
  buildHealthDays,
  paths,
  type HealthDay,
} from '@luwte/core';
import { collection, getDocs, orderBy, query, where, writeBatch, doc } from 'firebase/firestore';
import { healthBridge } from '../health/bridge';
import { db } from './client';

/**
 * Watch data, in and out.
 *
 * The import runs on the device, reads Health Connect through the bridge, and
 * writes to Firestore as the patient. There is no server anywhere in this
 * path — which is the whole reason Health Connect was the right way in rather
 * than Garmin's cloud API.
 */

/** How far back an import looks. A fortnight covers a phone left in a drawer. */
export const IMPORT_DAYS = 14;

export type ImportResult = { available: boolean; written: number };

/**
 * Idempotent by construction: the document id is the date, so re-importing a
 * day overwrites it rather than adding a second version of the same night.
 * That matters because this runs on every app open, over a window that
 * deliberately overlaps what it already has.
 */
export async function importHealth(
  uid: string,
  timezone: string,
  now: Date = new Date(),
): Promise<ImportResult> {
  const bridge = healthBridge();
  if (!(await bridge.isAvailable())) return { available: false, written: 0 };

  const from = new Date(now.getTime() - IMPORT_DAYS * 24 * 60 * 60 * 1000);
  const { sleep, resting } = await bridge.read(from, now);
  const days = buildHealthDays(sleep, resting, timezone, now);
  if (days.length === 0) return { available: true, written: 0 };

  const batch = writeBatch(db);
  for (const day of days) batch.set(doc(db, paths.healthDay(uid, day.date)), day);
  await batch.commit();
  return { available: true, written: days.length };
}

export type HealthDayRecord = HealthDay;

/**
 * Read back what was imported.
 *
 * Handed to the screen exactly as stored, with its source attached. luwte
 * derives nothing from these numbers and says nothing about them — relaying a
 * device's own measurement, attributed to that device, is a conduit under
 * MDCG 2019-11, and interpreting it is the line this product does not cross.
 */
export async function readHealth(uid: string, fromDate: string): Promise<HealthDayRecord[]> {
  const snapshot = await getDocs(
    query(collection(db, paths.health(uid)), where('date', '>=', fromDate), orderBy('date')),
  );
  return snapshot.docs.map((d) => {
    const data = d.data();
    return {
      date: (data.date ?? d.id) as string,
      sleepMinutes: (data.sleepMinutes ?? null) as number | null,
      restingHeartRate: (data.restingHeartRate ?? null) as number | null,
      source: {
        app: (data.source?.app ?? '') as string,
        device: (data.source?.device ?? null) as string | null,
      },
      recordedAt: data.recordedAt?.toDate?.() ?? new Date(0),
    };
  });
}
