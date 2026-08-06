import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * WCAG 2.4.7 — focus visible.
 *
 * One `outline: none` in one stylesheet removes the keyboard focus ring for
 * whatever it matches, and nothing else in the app changes: the screens still
 * look right, the tests still pass, and somebody navigating by keyboard simply
 * cannot see where they are. It is the cheapest accessibility failure to
 * introduce and among the hardest to notice, because the people who write CSS
 * are usually holding a mouse.
 *
 * So it is asserted rather than remembered, in the same shape as
 * `contrast.test.ts`: read every stylesheet, and fail on the pattern.
 */

const ROOTS = [
  join(import.meta.dirname),
  join(import.meta.dirname, '..', '..', '..', 'apps', 'web', 'src'),
];

function stylesheets(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return stylesheets(full);
    return full.endsWith('.css') ? [full] : [];
  });
}

const files = ROOTS.flatMap(stylesheets);

describe('the keyboard focus ring survives', () => {
  it('finds the stylesheets at all, so a broken scan cannot pass silently', () => {
    expect(files.length).toBeGreaterThan(5);
  });

  it.each(files.map((f) => [f.slice(f.indexOf('src')), f] as const))(
    '%s does not suppress the outline',
    (_label, file) => {
      const css = readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
      // `outline: none`, `outline: 0`, `outline-style: none` — every spelling
      // that removes the ring. `outline-offset` is fine and must not match.
      expect(css).not.toMatch(/outline(-style)?\s*:\s*(none|0)\b/);
    },
  );

  it('defines a focus ring exactly once, in the tokens', () => {
    const tokens = readFileSync(join(import.meta.dirname, 'tokens.css'), 'utf8');
    expect(tokens).toMatch(/:focus-visible\s*\{[^}]*outline:/);
  });

  it('draws the ring in a colour that has a contrast floor', () => {
    /*
     * `--self` rather than a hardcoded colour, so `contrast.test.ts` covers it
     * as a mark at 3:1 on both surfaces in both themes. A focus ring nobody
     * can see against the background is the same failure as no ring at all.
     */
    const tokens = readFileSync(join(import.meta.dirname, 'tokens.css'), 'utf8');
    const rule = /:focus-visible\s*\{([^}]*)\}/.exec(tokens)?.[1] ?? '';
    expect(rule).toMatch(/outline:[^;]*var\(--self\)/);
  });
});
