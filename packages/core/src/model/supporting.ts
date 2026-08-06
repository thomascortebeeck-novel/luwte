import type { DateKey } from '../dates';
import type { CopyKey } from '../i18n/types';

/**
 * What helps, for the person doing the supporting.
 *
 * Family intervention is the best-evidenced psychosocial addition in
 * psychosis — NICE recommends it, and it reduces relapse and readmission. The
 * mechanism with the strongest evidence behind it is **expressed emotion**:
 * criticism, hostility and emotional over-involvement predict relapse
 * (Butzlaff & Hooley, 1998, meta-analysis). Everything below is that, said
 * plainly, without ever using the term.
 *
 * **General education, never advice about this person.** Nothing here reads a
 * check-in, a mood or a medication. A sentence that began "vandaag lijkt hij"
 * would be a conclusion drawn about a named person from their health data —
 * Class IIa under EU MDR, the line this product does not cross. A test
 * asserts it rather than trusting it.
 *
 * Deliberately short. A wall of advice is its own kind of pressure, and the
 * people reading this are usually tired.
 */
export const SUPPORT_TIPS: readonly CopyKey[] = [
  'supportTipAsk',
  'supportTipListen',
  'supportTipSmall',
  'supportTipBlame',
  'supportTipPace',
  'supportTipYourself',
  'supportTipPresence',
];

/** The two or three things that are worth doing on an ordinary day. */
export const SUPPORT_DAILY: readonly CopyKey[] = [
  'supportDailyOrdinary',
  'supportDailyOffer',
  'supportDailyRoutine',
];

/**
 * One tip a day, rotating. The same sentence every morning becomes furniture
 * and stops being read; the rotation is by date so it does not change while
 * somebody is looking at it.
 *
 * Same day-index arithmetic as `diaryPromptFor` in `./practices`, on
 * purpose: two rotations in the same codebase should not behave differently
 * from one another. The floor-then-double-modulo shape (rather than
 * `Math.abs`) matters at the epoch boundary — see supporting.test.ts.
 */
export function supportTipFor(day: DateKey): CopyKey {
  const [year, month, date] = day.split('-').map(Number) as [number, number, number];
  const dayNumber = Math.floor(Date.UTC(year, month - 1, date) / 86_400_000);
  return SUPPORT_TIPS[
    ((dayNumber % SUPPORT_TIPS.length) + SUPPORT_TIPS.length) % SUPPORT_TIPS.length
  ]!;
}
