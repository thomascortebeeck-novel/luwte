import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * BRAND 3.4 — sans (`--font-ui`) for everything the app says; serif
 * (`--font-human`) only for what a person actually wrote. The split is the
 * point: someone learns which voice is which without being told, and that
 * only holds if the serif never turns up on a heading, a button, or a
 * translated prompt supplied identically to everyone.
 *
 * `Plan.module.css` broke this once already: its four worked examples are
 * the same translated strings for every reader, and the serif sat on them
 * anyway, phrased in a comment as if it were the deliberate choice it looks
 * like elsewhere in the same file. So this is asserted rather than
 * remembered, in the shape `focus.test.ts` and `contrast.test.ts` already
 * use — read every stylesheet, find every declaration that reaches for
 * `--font-human`, and fail on anything not on a short allowlist that says,
 * in one line each, whose words render there.
 */

const ROOTS = [
  join(import.meta.dirname),
  join(import.meta.dirname, '..', '..', '..', 'apps', 'web', 'src'),
];

const REPO_ROOT = join(import.meta.dirname, '..', '..', '..');

function stylesheets(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return stylesheets(full);
    return full.endsWith('.css') ? [full] : [];
  });
}

/** Repo-relative, forward-slashed, so an allowlist entry reads the same on any machine. */
function repoPath(file: string): string {
  return relative(REPO_ROOT, file).split('\\').join('/');
}

const files = ROOTS.flatMap(stylesheets);

/**
 * Every selector allowed to set the serif, keyed `path::selector`. Add an
 * entry only when a person's own writing is what renders there — never for
 * a heading, a button, or copy the app supplies. One line each, saying
 * whose words.
 */
const ALLOWED = new Set<string>([
  // The one shared primitive — its own comment says what it is for: a diary
  // line, a comment, a gratitude note.
  'packages/ui/src/primitives/HumanText.module.css::.human',
  // The check-in's diary line — the person's own words about their day.
  'apps/web/src/routes/CheckIn.module.css::.diary',
  // Today's check-in note field — the same diary line, surfaced on Today.
  'apps/web/src/routes/TodayCheckin.module.css::.note',
  // The plan's "what I notice" — the person's own warning sign, in their words.
  'apps/web/src/routes/Plan.module.css::.sign',
  // The plan's "what I do about it" — also the person's own words.
  'apps/web/src/routes/Plan.module.css::.action',
  // The crisis screen's personal contacts — the name the person typed for
  // who this is ("mijn zus", "dokter Peeters"), not the translated system
  // copy the bare `.name` rule also serves.
  'apps/web/src/routes/Crisis.module.css::.personal .name',
]);

/** `font-family` or the `font` shorthand, wherever either reaches for the serif token. */
const SETS_SERIF = /font(?:-family)?\s*:\s*[^;]*var\(--font-human\)/;

interface Usage {
  key: string;
  file: string;
  selector: string;
}

/** Every `selector { ... }` block, in every scanned stylesheet, that sets the serif. */
function serifUsages(): Usage[] {
  const found: Usage[] = [];
  for (const file of files) {
    const css = readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    for (const [, selectorRaw, body] of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      if (!SETS_SERIF.test(body ?? '')) continue;
      const selector = (selectorRaw ?? '').trim().replace(/\s+/g, ' ');
      const path = repoPath(file);
      found.push({ key: `${path}::${selector}`, file: path, selector });
    }
  }
  return found;
}

describe('the serif renders only what a person wrote', () => {
  it('finds the stylesheets at all, so a broken scan cannot pass silently', () => {
    expect(files.length).toBeGreaterThan(5);
  });

  const usages = serifUsages();

  it('finds at least the known uses, so a broken scan cannot pass silently either way', () => {
    expect(usages.length).toBeGreaterThanOrEqual(ALLOWED.size);
  });

  it.each(usages.map((u) => [u.key, u] as const))(
    '%s',
    (_key, usage) => {
      // A selector reaching for --font-human that is not on the allowlist
      // above: either it is a genuine new place a person's own words render
      // (add it, with its one-line reason) or it is system copy that should
      // stay in the sans and inherit --font-ui, same as this file's own fix
      // to Plan.module.css's .examples.
      expect(ALLOWED.has(usage.key)).toBe(true);
    },
  );

  it('lists no allowlist entry that has gone stale', () => {
    // The complement: an entry for a selector that no longer sets the serif
    // is a rule nobody is checking any more — either the CSS moved on and the
    // entry should be deleted, or something regressed silently.
    const live = new Set(usages.map((u) => u.key));
    const stale = [...ALLOWED].filter((key) => !live.has(key));
    expect(stale).toEqual([]);
  });
});
