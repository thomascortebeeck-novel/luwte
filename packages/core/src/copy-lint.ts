/**
 * BRAND.md section 4 turned into tests.
 *
 * These rules exist so that a cheerful, comparative or exclaimed string
 * cannot reach a screen — not this month and not in a year, when whoever is
 * writing the copy has not read BRAND.md that morning. If a rule blocks a
 * string, the string is wrong.
 */

export type Locale = 'nl' | 'en';

export type Violation = { rule: string; detail: string };

type Rule = {
  rule: string;
  detail: string;
  locales?: readonly Locale[];
  test: RegExp;
};

/**
 * The formal second person. Ordinary words that merely start with a u are
 * not violations, so the pronoun has to stand alone: `nu`, `uur` and `uit`
 * all pass, `u` and `uw` do not.
 */
const U_FORM = /(^|[^\p{L}])(u|uw|uwe)([^\p{L}]|$)/iu;

/** BRAND 1 — the wordmark is always lowercase. Anything else is a violation. */
const WORDMARK = /\b(?!luwte\b)[Ll][Uu][Ww][Tt][Ee]\b/;

const RULES: readonly Rule[] = [
  {
    rule: 'no-exclamation',
    detail: 'exclamation mark',
    test: /!/,
  },
  {
    rule: 'no-emoji',
    detail: 'emoji in system copy',
    test: /\p{Extended_Pictographic}/u,
  },
  {
    rule: 'no-u-form',
    detail: 'formal u-form',
    locales: ['nl'],
    test: U_FORM,
  },
  {
    rule: 'wordmark-lowercase',
    detail: 'capitalised wordmark',
    test: WORDMARK,
  },
  {
    rule: 'never-cheerful',
    detail: 'cheerful phrasing',
    test: /\b(goed bezig|fantastisch|geweldig|proficiat|gefeliciteerd|knap gedaan|je kan dit|great job|well done|keep it up|awesome|amazing|congrats|congratulations|you got this|nice work)\b/i,
  },
  {
    rule: 'never-compare',
    detail: 'comparison or progress language',
    test: /\b(beter dan|slechter dan|better than|worse than|improv(e|es|ed|ing|ement)|vooruitgang|je gaat vooruit|\d+\s?%)/i,
  },
  {
    rule: 'no-gamification',
    detail: 'streak, points or achievement language',
    test: /\b(streak|badge|badges|punten|points|level up|achievement|mijlpaal|milestone|reeks van)\b/i,
  },
  {
    rule: 'no-oops',
    detail: 'apologetic error voice',
    test: /\b(oops|oeps|sorry|excuses)\b/i,
  },
];

export function lintCopy(value: string, locale: Locale): Violation[] {
  return RULES.filter((r) => (r.locales ?? (['nl', 'en'] as const)).includes(locale))
    .filter((r) => r.test.test(value))
    .map(({ rule, detail }) => ({ rule, detail }));
}
