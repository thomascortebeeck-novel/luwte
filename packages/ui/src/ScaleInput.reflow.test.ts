import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * WCAG 1.4.10 — reflow. Content must work at 320px with no horizontal
 * scrolling, which is a 1280px page at 400% zoom as much as it is a small
 * phone.
 *
 * **The check-in failed this and nobody knew.** Seven options at `min-width:
 * 40px` plus six 4px gaps need 304px; the content box at 320px is 272px. The
 * most-used screen in the product scrolled sideways by 8px on the smallest
 * phone somebody might own.
 *
 * jsdom does no layout, so a rendering test cannot catch this. What it *can*
 * do is the arithmetic — which is all the bug ever was.
 */

/** The narrowest viewport 1.4.10 requires. */
const NARROWEST_VIEWPORT = 320;

/** `Screen` pads 24px each side; see Screen.module.css. */
const SCREEN_PADDING = 24;

const CONTENT_WIDTH = NARROWEST_VIEWPORT - SCREEN_PADDING * 2;

/** 1 to 7. Changing this changes the sum, which is the point of the test. */
const OPTIONS = 7;

const css = readFileSync(join(import.meta.dirname, 'ScaleInput.module.css'), 'utf8');

function px(block: string, property: string): number {
  const section = css.slice(css.indexOf(block));
  const match = new RegExp(`${property}:\\s*(\\d+)px`).exec(section);
  if (match === null) throw new Error(`${property} not found in ${block}`);
  return Number(match[1]);
}

describe('the scale fits the narrowest screen WCAG asks for', () => {
  const minWidth = px('.option {', 'min-width');
  const gap = px('.group {', 'gap');

  it('reads the real numbers out of the stylesheet', () => {
    // If the selectors are renamed this fails loudly rather than passing on a
    // default, which is the failure mode that makes guards like this useless.
    expect(minWidth).toBeGreaterThan(0);
    expect(gap).toBeGreaterThan(0);
  });

  it('needs no more room than a 320px screen has', () => {
    const needed = OPTIONS * minWidth + (OPTIONS - 1) * gap;
    expect(needed).toBeLessThanOrEqual(CONTENT_WIDTH);
  });

  it('would have failed at the 40px it used to be', () => {
    // The bug, kept as arithmetic so the reason survives the fix.
    expect(OPTIONS * 40 + (OPTIONS - 1) * gap).toBeGreaterThan(CONTENT_WIDTH);
  });

  it('still gives each option a 48px tap height', () => {
    /*
     * The dimension that actually matters for a thumb on a horizontal row,
     * and the one BRAND 5 is about. Width shrinking at 320px is the trade;
     * height is not negotiable.
     */
    expect(css).toMatch(/min-height:\s*var\(--tap-min\)/);
  });

  it('leaves every option above the 24px WCAG 2.5.8 floor once shared out', () => {
    const each = (CONTENT_WIDTH - (OPTIONS - 1) * gap) / OPTIONS;
    expect(each).toBeGreaterThanOrEqual(24);
  });
});
