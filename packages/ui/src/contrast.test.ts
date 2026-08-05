import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * BRAND 3.3 — all text meets WCAG AA against its background, and BRAND 5
 * makes that a functional requirement rather than a compliance checkbox:
 * sedating medication affects reading speed.
 *
 * **This file used to say "these are the pairs actually rendered today, and
 * when a new pairing appears it gets a line here".** That instruction was
 * followed for the pairs anybody thought about and missed the ones nobody did,
 * which is how a light-mode failure shipped from Phase 5 to August 2026. The
 * Phase 8 pass replaced remembering with enumerating: every token × every
 * surface × both themes, plus a guard that reads the stylesheets and fails on
 * any colour this file does not cover.
 *
 * The named cases further down are kept as regressions — each one is a real
 * bug with a reason attached, and a generated matrix cannot say why.
 */

const AA_NORMAL = 4.5;

function channel(hex: string, offset: number): number {
  const v = parseInt(hex.slice(offset, offset + 2), 16) / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string): number {
  const h = hex.replace('#', '');
  return 0.2126 * channel(h, 0) + 0.7152 * channel(h, 2) + 0.0722 * channel(h, 4);
}

export function contrast(foreground: string, background: string): number {
  const [light, dark] = [luminance(foreground), luminance(background)].sort((a, b) => b - a) as [
    number,
    number,
  ];
  return (light + 0.05) / (dark + 0.05);
}

const DARK = {
  diep: '#131A19',
  luwte1: '#1C2524',
  mist: '#E3E9E6',
  nevel: '#8B9A95',
  zeeglas: '#8FC4AE',
  amber: '#D9B27C',
} as const;

const LIGHT = {
  diep: '#EAEEEC',
  luwte1: '#F4F7F5',
  mist: '#16201E',
  nevel: '#5D6C68',
  zeeglas: '#3E7C63',
  amber: '#9A6F32',
  onSelf: '#FFFFFF',
  selfText: '#3A755D',
} as const;

/** WCAG 1.4.11 — borders, icons and other non-text marks. */
const AA_NON_TEXT = 3;

/**
 * Phase 8 — the whole palette, both themes, every pairing that a stylesheet
 * can actually produce.
 *
 * The tests below this were written pair by pair, as each screen landed, and
 * that is exactly how a live AA failure survived from Phase 5 to August: the
 * calendar drew "today" in `--zeeglas-l` as text and nobody added the line.
 * Enumerating instead of remembering is the fix, and `every colour a
 * stylesheet uses is accounted for` at the bottom is what keeps it enumerated.
 */
const THEMES = {
  dark: {
    bg: '#131A19',
    surface: '#1C2524',
    line: '#27322F',
    edge: '#63736F',
    text: '#E3E9E6',
    'text-quiet': '#8B9A95',
    self: '#8FC4AE',
    'self-text': '#8FC4AE',
    'on-self': '#131A19',
    human: '#D9B27C',
  },
  light: {
    bg: '#EAEEEC',
    surface: '#F4F7F5',
    line: '#D5DDDA',
    edge: '#788683',
    text: '#16201E',
    'text-quiet': '#5D6C68',
    self: '#3E7C63',
    'self-text': '#3A755D',
    'on-self': '#FFFFFF',
    human: '#9A6F32',
  },
} as const;

type TokenName = keyof (typeof THEMES)['dark'];

/** The two surfaces anything can sit on. */
const SURFACES = ['bg', 'surface'] as const satisfies readonly TokenName[];

/** Drawn as words, so 4.5:1. */
const TEXT_TOKENS = ['text', 'text-quiet', 'self-text'] as const satisfies readonly TokenName[];

/**
 * Drawn as the edge or the fill of a control — a field's border, the ring of
 * an unticked dose, an unselected dot on a scale. 1.4.11 asks 3:1, because
 * each one carries information: where the field is, what state it is in, how
 * many options there are.
 */
const MARK_TOKENS = ['edge', 'self', 'human'] as const satisfies readonly TokenName[];

describe('every text colour on every surface, in both themes', () => {
  const cases = (['dark', 'light'] as const).flatMap((theme) =>
    TEXT_TOKENS.flatMap((fg) => SURFACES.map((bg) => [theme, fg, bg] as const)),
  );

  it.each(cases)('%s: --%s on --%s', (theme, fg, bg) => {
    expect(contrast(THEMES[theme][fg], THEMES[theme][bg])).toBeGreaterThanOrEqual(AA_NORMAL);
  });

  it.each(['dark', 'light'] as const)('%s: the primary button label on its fill', (theme) => {
    expect(contrast(THEMES[theme]['on-self'], THEMES[theme].self)).toBeGreaterThanOrEqual(
      AA_NORMAL,
    );
  });
});

describe('every control edge on every surface, in both themes', () => {
  const cases = (['dark', 'light'] as const).flatMap((theme) =>
    MARK_TOKENS.flatMap((fg) => SURFACES.map((bg) => [theme, fg, bg] as const)),
  );

  it.each(cases)('%s: --%s on --%s', (theme, fg, bg) => {
    expect(contrast(THEMES[theme][fg], THEMES[theme][bg])).toBeGreaterThanOrEqual(AA_NON_TEXT);
  });
});

/*
 * `--line` is deliberately absent from `MARK_TOKENS` and would fail there —
 * 1.33:1 dark, 1.18:1 light.
 *
 * That is correct for what it is left doing: the hairline between two
 * sections, the gridlines behind the chart, the frame around a styleguide
 * swatch. None of those carries information, and 1.4.11 exempts purely
 * decorative elements. Everything that *did* carry information moved to
 * `--edge` in the Phase 8 pass — a field's border, the unticked dose ring,
 * the unselected scale dots, the progress pips.
 *
 * If `--line` ever creeps back onto a control, the guard at the bottom will
 * not catch it (both are legitimate tokens) — but this note is where to look.
 */
describe('the decorative rule stays decorative', () => {
  it.each(['dark', 'light'] as const)('%s: --line is too faint to be a control', (theme) => {
    expect(contrast(THEMES[theme].line, THEMES[theme].bg)).toBeLessThan(AA_NON_TEXT);
  });
});

describe('the contrast formula itself', () => {
  it('gives 21 for black on white and 1 for a colour on itself', () => {
    expect(contrast('#000000', '#FFFFFF')).toBeCloseTo(21, 1);
    expect(contrast('#8FC4AE', '#8FC4AE')).toBeCloseTo(1, 5);
  });
});

describe('dark theme meets AA', () => {
  it.each([
    ['primary text on the background', DARK.mist, DARK.diep],
    // BRAND 3.3 asks for this pair specifically.
    ['secondary text on the background', DARK.nevel, DARK.diep],
    ['secondary text on a card', DARK.nevel, DARK.luwte1],
    ['the cold accent on the background', DARK.zeeglas, DARK.diep],
    ['the warm accent on the background', DARK.amber, DARK.diep],
    ['the primary button label on its fill', DARK.diep, DARK.zeeglas],
  ])('%s', (_label, fg, bg) => {
    expect(contrast(fg, bg)).toBeGreaterThanOrEqual(AA_NORMAL);
  });
});

describe('light theme meets AA', () => {
  it.each([
    ['primary text on the background', LIGHT.mist, LIGHT.diep],
    ['secondary text on the background', LIGHT.nevel, LIGHT.diep],
    ['secondary text on a card', LIGHT.nevel, LIGHT.luwte1],
    ['the primary button label on its fill', LIGHT.onSelf, LIGHT.zeeglas],
    ['the cold accent drawn as text', LIGHT.selfText, LIGHT.diep],
    ['the cold accent drawn as text on a card', LIGHT.selfText, LIGHT.luwte1],
  ])('%s', (_label, fg, bg) => {
    expect(contrast(fg, bg)).toBeGreaterThanOrEqual(AA_NORMAL);
  });

  it('would have failed with the background colour as the button label', () => {
    // The bug this token exists to prevent. If someone reverts --on-self to
    // --diep-l in light mode, the button drops to 4.2:1.
    expect(contrast(LIGHT.diep, LIGHT.zeeglas)).toBeLessThan(AA_NORMAL);
  });

  it('would have failed with --self itself as text, which is the same 4.2:1', () => {
    /*
     * The other half of the pair above, and the half nobody looked at: the
     * calendar drew "today" in --self from Phase 5 onwards, so a live AA
     * failure sat in the light theme for as long as the light theme existed.
     * Found by adding two more usages, fixed with a darker token rather than
     * a relaxed floor — the same answer this file gives for amber.
     */
    expect(contrast(LIGHT.zeeglas, LIGHT.diep)).toBeLessThan(AA_NORMAL);
  });
});

/**
 * BRAND-QA logged this before the feed existed, and the feed is where it
 * became live: the warm accent is a **border colour in light mode, never a
 * text colour**. It clears the 3:1 floor for a non-text mark and fails the
 * 4.5:1 floor for normal text.
 *
 * If amber text is ever genuinely needed, the fix is a darker `--amber-strong`
 * token, not relaxing this.
 */
describe('the warm accent in light mode', () => {
  it('is strong enough to outline something', () => {
    expect(contrast(LIGHT.amber, LIGHT.diep)).toBeGreaterThanOrEqual(AA_NON_TEXT);
  });

  it('is NOT strong enough to be read as text, which is why nothing draws it', () => {
    expect(contrast(LIGHT.amber, LIGHT.diep)).toBeLessThan(AA_NORMAL);
  });
});

/**
 * The guard, and the reason this file stops needing to be remembered.
 *
 * Both AA failures found so far were the same mistake: a stylesheet started
 * drawing something in a colour, and nobody added the pairing here. So rather
 * than trust the next person to remember, read the stylesheets and assert that
 * every colour token they use as text, as a border or as a fill is one this
 * file already covers.
 *
 * A new token fails this test until somebody decides which floor it has to
 * clear and adds it to `TEXT_TOKENS` or `MARK_TOKENS`. That is the whole
 * point — the failure arrives at the moment of writing the CSS rather than
 * years later on somebody's phone.
 */
describe('every colour a stylesheet uses is accounted for', () => {
  const stylesheets = (dir: string): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) return stylesheets(full);
      return full.endsWith('.css') && !full.endsWith('tokens.css') ? [full] : [];
    });

  /** Tokens that are never a colour: spacing, radii, fonts, durations. */
  const NOT_A_COLOUR = /^--(space|radius|text-(xs|sm|base|lg|xl|2xl)|leading|font|dur|ease|tap|breath)/;

  const used = new Set<string>();
  for (const root of [
    join(import.meta.dirname, '..', 'src'),
    join(import.meta.dirname, '..', '..', '..', 'apps', 'web', 'src'),
  ]) {
    for (const file of stylesheets(root)) {
      const css = readFileSync(file, 'utf8');
      for (const [, token] of css.matchAll(
        /(?:color|background(?:-color)?|border(?:-[a-z]+)?-color|border|outline|stroke|fill|accent-color|box-shadow):[^;]*?var\((--[a-z0-9-]+)/g,
      )) {
        if (token && !NOT_A_COLOUR.test(token)) used.add(token.slice(2));
      }
    }
  }

  it('finds the colours at all, so a broken scan cannot pass silently', () => {
    expect(used.size).toBeGreaterThan(4);
    expect(used).toContain('text');
  });

  it.each([...used].sort())('--%s has a contrast floor written down', (token) => {
    const covered = [
      ...TEXT_TOKENS,
      ...MARK_TOKENS,
      ...SURFACES,
      'line',
      'on-self',
    ] as readonly string[];
    expect(covered).toContain(token);
  });
});
