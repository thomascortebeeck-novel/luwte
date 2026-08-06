import { describe, expect, it } from 'vitest';
import { dictionaries, LOCALES } from '../i18n/index';
import { SUPPORT_DAILY, SUPPORT_TIPS, supportTipFor } from './supporting';

describe('what a supporter is told', () => {
  it.each(LOCALES)('has copy for every tip and daily suggestion in %s', (locale) => {
    for (const key of [...SUPPORT_TIPS, ...SUPPORT_DAILY]) {
      expect(dictionaries[locale][key], `${locale}.${key}`).toBeTruthy();
    }
  });

  it('rotates one tip per day and comes back round', () => {
    // The same sentence every day becomes furniture and stops being read.
    const first = supportTipFor('2026-08-06');
    expect(supportTipFor('2026-08-06')).toBe(first);
    expect(supportTipFor('2026-08-07')).not.toBe(first);
    const cycle = SUPPORT_TIPS.length;
    expect(supportTipFor('2026-08-06')).toBe(
      supportTipFor(`2026-08-${String(6 + cycle).padStart(2, '0')}`),
    );
  });

  it('offers every tip across a full cycle', () => {
    const seen = new Set(
      Array.from({ length: SUPPORT_TIPS.length }, (_, i) =>
        supportTipFor(`2026-08-${String(6 + i).padStart(2, '0')}`),
      ),
    );
    expect(seen.size).toBe(SUPPORT_TIPS.length);
  });

  it('survives a date before the epoch rather than indexing backwards', () => {
    // A negative modulo would return undefined and blank the tip. Real dates
    // in luwte never reach back this far, but diaryPromptFor (./practices)
    // is held to this bar and the two rotations should not behave
    // differently just because nobody would notice for this one.
    expect(SUPPORT_TIPS).toContain(supportTipFor('1965-03-02'));
  });

  it('continues the same cyclic sequence across the epoch, rather than mirroring around it', () => {
    // The day before 1970-01-01 should be one step away from 1970-01-01,
    // the same way any two neighbouring days are — not a mirror image of
    // it. `Math.abs(index) % length` fails this: day -1 and day +1 both
    // have absolute value 1, so they would land on the same tip either
    // side of the epoch instead of two different ones.
    const before = supportTipFor('1969-12-31');
    const epoch = supportTipFor('1970-01-01');
    const after = supportTipFor('1970-01-02');
    expect(before).not.toBe(epoch);
    expect(after).not.toBe(epoch);
    expect(before).not.toBe(after);
  });

  it('never tells the supporter anything about the patient', () => {
    /*
     * The MDR line, asserted rather than trusted. Every one of these is
     * general education. A sentence naming the person, or referring to their
     * check-in, would be a conclusion drawn from health data — clinical
     * monitoring, and the thing this product may never do.
     */
    for (const key of [...SUPPORT_TIPS, ...SUPPORT_DAILY]) {
      const text = dictionaries.nl[key];
      expect(text).not.toMatch(/check-?in|score|meting|vandaag lijkt|volgens/i);
    }
  });
});
