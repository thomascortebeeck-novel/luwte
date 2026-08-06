import { describe, expect, it } from 'vitest';
import { dictionaries, LOCALES } from '../i18n/index';
import { SUPPORT_DAILY, SUPPORT_TIPS, supportTipFor } from './supporting';

/**
 * The two mechanisms behind "never tells the supporter anything about the
 * patient", below. Both are regex, both are checked against every tip and
 * daily suggestion in both dictionaries.
 *
 * 1. REFERS_TO_DATA — a reference to the person's own data: a check-in, a
 *    score, a measurement, the app named as the source of a claim
 *    ("volgens" / "according to"), or the verb that states how someone
 *    comes across ("lijkt" / "seems"). That verb is deliberately not bound
 *    to "vandaag" — the previous pattern required the literal phrase
 *    "vandaag lijkt" and missed "Jonas lijkt gespannen vandaag", the
 *    project's own canonical bad example, because the words there run the
 *    other way round.
 * 2. THIRD_PERSON — the supported person referred to in the third person:
 *    hij, zij, ze, hem, haar, z'n in Dutch; he, she, him, her, his, hers in
 *    English. Every string actually shipped addresses the supporter as
 *    "je" and speaks in general terms; none refers to the supported person
 *    at all. That is not incidental, it is the boundary — the moment a tip
 *    says "hij lijkt", it is about a specific person. Matched with word
 *    boundaries so these catch pronouns, not substrings inside ordinary
 *    words ("this" does not contain "his", "together" does not contain
 *    "her", "zijn" does not contain "zij" — in each case the boundary
 *    after the shorter word falls inside a longer one, so `\b` refuses it).
 *
 *    `zijn` is deliberately left out of the Dutch list despite being the
 *    standard possessive "his": it is equally the infinitive "to be", and
 *    two shipped strings use it that way — "Er zijn telt", "ziek zijn te
 *    gaan" — so including it would fail clean copy. `z'n`, the informal
 *    possessive, has no such collision and is checked.
 *
 * What neither catches: a name. "Jonas is gespannen", with no "lijkt" and
 * no pronoun, would still pass — a regex does not know who Jonas is. This
 * is a guard against a known mechanism, not a clinical or legal review, and
 * a green suite here is not that review.
 */
const REFERS_TO_DATA = /check-?in|score|meting|measurement|lijkt|seems|volgens|according to/i;
const THIRD_PERSON = /\b(hij|zij|ze|hem|haar|z'n|he|she|him|her|his|hers)\b/i;

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
     *
     * Checked in both dictionaries: this used to read dictionaries.nl only,
     * so an English-only regression would have shipped clean. See
     * REFERS_TO_DATA and THIRD_PERSON above for what the two checks catch
     * and — just as important — what they cannot.
     */
    for (const locale of LOCALES) {
      for (const key of [...SUPPORT_TIPS, ...SUPPORT_DAILY]) {
        const text = dictionaries[locale][key];
        expect(text, `${locale}.${key} refers to data`).not.toMatch(REFERS_TO_DATA);
        expect(text, `${locale}.${key} names the patient in the third person`).not.toMatch(
          THIRD_PERSON,
        );
      }
    }
  });
});
