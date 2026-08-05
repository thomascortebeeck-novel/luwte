import { describe, expect, it } from 'vitest';
import { dictionaries, LOCALES } from '../i18n/index';
import {
  BREATHING_CYCLES,
  BREATHING_PHASES,
  BREATHING_SECONDS,
  DIARY_PROMPTS,
  GROUNDING_STEPS,
  OPTIONAL_PRACTICES,
  breathingAt,
  diaryPromptFor,
} from './practices';

describe('the diary prompt', () => {
  it('keeps the original wording in the rotation', () => {
    // Otherwise adding variety would quietly delete the question the product
    // has been asking since Phase 2.
    expect(DIARY_PROMPTS).toContain('checkinDiary');
  });

  it('is the same all day, so it cannot change while somebody is typing', () => {
    expect(diaryPromptFor('2026-08-05')).toBe(diaryPromptFor('2026-08-05'));
  });

  it('moves on the next day', () => {
    expect(diaryPromptFor('2026-08-06')).not.toBe(diaryPromptFor('2026-08-05'));
  });

  it('comes round rather than running out', () => {
    expect(diaryPromptFor('2026-08-05')).toBe(diaryPromptFor('2026-08-12'));
  });

  it('offers every one of them across a cycle', () => {
    const seen = new Set(
      Array.from({ length: DIARY_PROMPTS.length }, (_, i) =>
        diaryPromptFor(`2026-08-${String(5 + i).padStart(2, '0')}`),
      ),
    );
    expect(seen.size).toBe(DIARY_PROMPTS.length);
  });

  it('survives a date before the epoch rather than indexing backwards', () => {
    // A negative modulo would return undefined and blank the question.
    expect(DIARY_PROMPTS).toContain(diaryPromptFor('1965-03-02'));
  });
});

describe('the breathing guide', () => {
  it('breathes out for longer than it breathes in', () => {
    /*
     * The one parameter with a mechanism behind it rather than a tradition.
     * If someone shortens the exhale to make the cycle rounder, this fails.
     */
    const inhale = BREATHING_PHASES.find((p) => p.id === 'in')!;
    const exhale = BREATHING_PHASES.find((p) => p.id === 'out')!;
    expect(exhale.seconds).toBeGreaterThan(inhale.seconds);
  });

  it('is about a minute, which is what Today already promised', () => {
    expect(BREATHING_SECONDS).toBeGreaterThan(45);
    expect(BREATHING_SECONDS).toBeLessThan(75);
  });

  it('names the phase you are in', () => {
    expect(breathingAt(0).phase.id).toBe('in');
    expect(breathingAt(3.9).phase.id).toBe('in');
    expect(breathingAt(4).phase.id).toBe('hold');
    expect(breathingAt(8).phase.id).toBe('out');
    expect(breathingAt(13.9).phase.id).toBe('out');
  });

  it('starts the next breath after the last one ends', () => {
    expect(breathingAt(14).phase.id).toBe('in');
    expect(breathingAt(14).cycle).toBe(1);
  });

  it('is done at the end and not before', () => {
    expect(breathingAt(BREATHING_SECONDS - 0.1).done).toBe(false);
    expect(breathingAt(BREATHING_SECONDS).done).toBe(true);
    expect(breathingAt(BREATHING_SECONDS + 60).done).toBe(true);
  });

  it('counts the breaths it said it would', () => {
    expect(breathingAt(BREATHING_SECONDS).cycle).toBe(BREATHING_CYCLES);
  });

  it('treats time before the start as the start', () => {
    // A tab restored with a clock that moved backwards should not land
    // somewhere undefined.
    expect(breathingAt(-5).phase.id).toBe('in');
    expect(breathingAt(-5).done).toBe(false);
  });
});

describe('grounding', () => {
  it('counts down five to one, which is the exercise', () => {
    expect(GROUNDING_STEPS.map((s) => s.count)).toEqual([5, 4, 3, 2, 1]);
  });

  it('points at the room in every step', () => {
    // The safety property: externally focused and eyes open. If a step ever
    // asks somebody to look inward, this list is the wrong place for it.
    expect(GROUNDING_STEPS.map((s) => s.labelKey)).toEqual([
      'groundingSee',
      'groundingHear',
      'groundingTouch',
      'groundingSmell',
      'groundingTaste',
    ]);
  });
});

describe('the optional practices', () => {
  it('offers exactly the two guided ones, and no meditation', () => {
    /*
     * Meditation-induced psychosis is documented and the risk factors are
     * this user. Short, guided, externally focused and eyes open is the safe
     * subset; a meditation timer or a body scan is not, and adding one is a
     * safety decision rather than a feature.
     */
    const guided = OPTIONAL_PRACTICES.filter((p) => p.href !== null).map((p) => p.id);
    expect(guided).toEqual(['breathing', 'grounding']);
  });

  it('keeps the plain ones plain', () => {
    // A link is a way in; the ones without are still just text on Today.
    expect(OPTIONAL_PRACTICES.filter((p) => p.href === null).map((p) => p.id)).toEqual([
      'gratitude',
      'walk',
    ]);
  });

  it('stores no completion state for any of them', () => {
    /*
     * PRD 6.2 — no checkbox, no tracking, no completion state. Ignoring one
     * costs nothing and is never recorded, which is why they are constants
     * rather than documents.
     *
     * This used to assert the exact key list, which broke the moment a link
     * was added. The invariant was never the shape — it is that nothing here
     * remembers whether you did it. Named fields, so a `lastDoneAt` or a
     * `count` appearing fails the suite while an ordinary presentational
     * field does not.
     */
    for (const practice of OPTIONAL_PRACTICES) {
      for (const forbidden of ['done', 'count', 'streak', 'lastDoneAt', 'completedAt']) {
        expect(practice, practice.id).not.toHaveProperty(forbidden);
      }
    }
  });

  it.each(LOCALES)('has copy for every practice in %s', (locale) => {
    for (const practice of OPTIONAL_PRACTICES) {
      expect(dictionaries[locale][practice.labelKey], practice.labelKey).toBeTruthy();
    }
  });

  it.each(LOCALES)('has copy for every diary prompt and guided step in %s', (locale) => {
    const keys = [
      ...DIARY_PROMPTS,
      ...BREATHING_PHASES.map((p) => p.labelKey),
      ...GROUNDING_STEPS.map((s) => s.labelKey),
    ];
    for (const key of keys) expect(dictionaries[locale][key], key).toBeTruthy();
  });
});
