import { describe, expect, it } from 'vitest';
import { lintCopy } from './copy-lint';

const rules = (s: string, l: 'nl' | 'en' = 'nl') => lintCopy(s, l).map((v) => v.rule);

describe('lintCopy', () => {
  it('accepts copy that follows the brand voice', () => {
    expect(lintCopy('Hoe was vandaag?', 'nl')).toEqual([]);
    expect(lintCopy('Dit is geen dokter.', 'nl')).toEqual([]);
    expect(lintCopy('These are not conclusions.', 'en')).toEqual([]);
  });

  it('rejects exclamation marks in any locale', () => {
    expect(rules('Bewaard!')).toContain('no-exclamation');
    expect(rules('Saved!', 'en')).toContain('no-exclamation');
  });

  it('rejects emoji in system copy', () => {
    expect(rules('Bewaard ✨')).toContain('no-emoji');
  });

  it('rejects the formal u-form in Dutch', () => {
    expect(rules('Hoe voelt u zich?')).toContain('no-u-form');
    expect(rules('Uw gegevens')).toContain('no-u-form');
  });

  it('does not mistake ordinary Dutch words for the u-form', () => {
    expect(rules('Een uur geleden, uit de wind.')).toEqual([]);
    expect(rules('Centre de Prevention du Suicide')).toEqual([]);
    expect(rules('Als het nu te zwaar is, bel iemand.')).toEqual([]);
  });

  it('does not apply the u-form rule to English', () => {
    expect(rules('Turn u around', 'en')).not.toContain('no-u-form');
  });

  it('rejects cheerfulness', () => {
    expect(rules('Goed bezig')).toContain('never-cheerful');
    expect(rules('Great job, keep it up', 'en')).toContain('never-cheerful');
  });

  it('rejects a pep talk but allows an ordinary sentence that starts the same way', () => {
    expect(rules('Je kan dit.')).toContain('never-cheerful');
    expect(rules('Je kan dit')).toContain('never-cheerful');
    // The app has to be able to describe a setting.
    expect(rules('Je kan dit later uitzetten.')).toEqual([]);
    expect(rules('Je kan dit elk moment veranderen.')).toEqual([]);
  });

  it('rejects comparison and progress language', () => {
    expect(rules('Beter dan vorige week')).toContain('never-compare');
    expect(rules('You are improving', 'en')).toContain('never-compare');
    expect(rules('20% beter')).toContain('never-compare');
  });

  it('rejects streak and gamification language', () => {
    expect(rules('Je streak is 5 dagen')).toContain('no-gamification');
    expect(rules('You earned a badge', 'en')).toContain('no-gamification');
  });

  it('rejects apologetic error voice', () => {
    expect(rules('Oeps, dat ging mis')).toContain('no-oops');
    expect(rules('Oops, something broke', 'en')).toContain('no-oops');
  });

  it('rejects a capitalised wordmark', () => {
    // BRAND 1 — luwte is always lowercase, never capitalised, never all-caps.
    expect(rules('Wil je dat Luwte dat overneemt?')).toContain('wordmark-lowercase');
    expect(rules('LUWTE', 'en')).toContain('wordmark-lowercase');
    expect(rules('Wil je dat luwte dat overneemt?')).toEqual([]);
  });

  it('reports every violation in one string, not just the first', () => {
    expect(rules('Goed bezig! Beter dan gisteren!')).toEqual(
      expect.arrayContaining(['no-exclamation', 'never-cheerful', 'never-compare']),
    );
  });
});
