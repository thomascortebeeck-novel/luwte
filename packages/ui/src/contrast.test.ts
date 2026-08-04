import { describe, expect, it } from 'vitest';

/**
 * BRAND 3.3 — all text meets WCAG AA against its background, and BRAND 5
 * makes that a functional requirement rather than a compliance checkbox:
 * sedating medication affects reading speed.
 *
 * These are the pairs actually rendered today. When a new colour pairing
 * appears on a screen, it gets a line here.
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
  onSelf: '#FFFFFF',
} as const;

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
  ])('%s', (_label, fg, bg) => {
    expect(contrast(fg, bg)).toBeGreaterThanOrEqual(AA_NORMAL);
  });

  it('would have failed with the background colour as the button label', () => {
    // The bug this token exists to prevent. If someone reverts --on-self to
    // --diep-l in light mode, the button drops to 4.2:1.
    expect(contrast(LIGHT.diep, LIGHT.zeeglas)).toBeLessThan(AA_NORMAL);
  });
});
