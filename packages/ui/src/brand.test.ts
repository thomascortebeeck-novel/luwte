import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * BRAND.md rules that are easy to break by accident, checked against the CSS
 * itself rather than against a rendered screen. A rule that only lives in a
 * document gets broken; a rule with a test does not.
 */

// Vitest runs from the workspace root, and under jsdom `import.meta.url` is
// not a file URL, so the path is resolved from the project root instead.
const here = join(process.cwd(), 'packages', 'ui', 'src');
const tokens = readFileSync(join(here, 'tokens.css'), 'utf8');

function cssFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) return cssFiles(path);
    return path.endsWith('.css') ? [path] : [];
  });
}

/**
 * Comments are prose, not style. Without this a comment explaining "no red"
 * trips the no-red rule, which is both wrong and a good way to discourage
 * writing the rule down next to the code it governs.
 */
const withoutComments = (source: string) => source.replace(/\/\*[\s\S]*?\*\//g, '');

const allCss = cssFiles(here).map((path) => ({
  path,
  source: withoutComments(readFileSync(path, 'utf8')),
}));

describe('brand tokens', () => {
  it.each([
    ['--diep', '#131a19'],
    ['--luwte-1', '#1c2524'],
    ['--luwte-2', '#27322f'],
    ['--mist', '#e3e9e6'],
    ['--nevel', '#8b9a95'],
    ['--zeeglas', '#8fc4ae'],
    ['--amber', '#d9b27c'],
  ])('defines the dark %s as %s', (token, value) => {
    expect(tokens).toContain(`${token}: ${value};`);
  });

  it.each([
    ['--diep-l', '#eaeeec'],
    ['--luwte-1-l', '#f4f7f5'],
    ['--luwte-2-l', '#d5ddda'],
    ['--mist-l', '#16201e'],
    ['--nevel-l', '#5d6c68'],
    ['--zeeglas-l', '#3e7c63'],
    ['--amber-l', '#9a6f32'],
  ])('defines the light %s as %s', (token, value) => {
    expect(tokens).toContain(`${token}: ${value};`);
  });

  it('keeps the minimum tap target at 48px', () => {
    expect(tokens).toContain('--tap-min: 48px;');
  });

  it('uses the settling easing curve and nothing springier', () => {
    expect(tokens).toContain('--ease-settle: cubic-bezier(0.22, 0.61, 0.36, 1);');
  });

  it('holds motion between 400 and 600ms', () => {
    expect(tokens).toContain('--dur-quick: 400ms;');
    expect(tokens).toContain('--dur-slow: 600ms;');
  });

  it('sets tabular figures so data does not jitter', () => {
    expect(tokens).toContain('font-variant-numeric: tabular-nums;');
  });
});

describe('brand rules across every stylesheet', () => {
  it('never goes bolder than 500', () => {
    // BRAND 3.4 — weights 400 and 500 only. Bold is emphasis, emphasis is pressure.
    const offenders = allCss.flatMap(({ path, source }) =>
      [...source.matchAll(/font-weight:\s*(\d{3}|bold|bolder)/g)]
        .filter((m) => m[1] === 'bold' || m[1] === 'bolder' || Number(m[1]) > 500)
        .map((m) => `${path}: ${m[0]}`),
    );
    expect(offenders).toEqual([]);
  });

  it('uses no red and no green-as-good', () => {
    // BRAND 3.3 — no traffic-light coding of any kind. There is no bad score.
    const forbidden =
      /\b(red|crimson|tomato|firebrick|indianred|green|limegreen|forestgreen|seagreen|lime|orangered)\b/g;
    const offenders = allCss.flatMap(({ path, source }) =>
      [...source.matchAll(forbidden)].map((m) => `${path}: ${m[0]}`),
    );
    expect(offenders).toEqual([]);
  });

  it('never animates with a spring, bounce or slide', () => {
    // BRAND 3.6 — fade and settle only.
    const offenders = allCss.flatMap(({ path, source }) =>
      [...source.matchAll(/\b(bounce|spring|slideIn|slideUp|slideDown|pop)\b/gi)].map(
        (m) => `${path}: ${m[0]}`,
      ),
    );
    expect(offenders).toEqual([]);
  });
});
