# luwte Phase 0 — Foundations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** An empty but entirely real product — monorepo, design system, both
languages, copy-lint, a working crisis screen, and a styleguide — with
nothing faked.

**Architecture:** pnpm monorepo. `packages/core` holds types, i18n
dictionaries and the copy-lint rules with no React dependency.
`packages/ui` holds BRAND.md's tokens and primitives with no Firebase
dependency. `apps/app` composes them into a Vite React PWA. Firebase config
lives at the root but no Firebase project is required to run Phase 0.

**Tech Stack:** pnpm 9 · Node 24 · TypeScript 5 (strict) · React 19 ·
Vite 6 · react-router 7 · Vitest + Testing Library · vite-plugin-pwa ·
@fontsource-variable · ESLint 9 flat config + Prettier · firebase-tools 13

## Global Constraints

Every task's requirements implicitly include this section. Values are copied
verbatim from `docs/BRAND.md` and `docs/PRD.md`.

- **Wordmark is `luwte`** — always lowercase. Never "Luwte™", "LUWTE", "The Luwte App".
- **Colours, dark (default):** `--diep #131A19` · `--luwte-1 #1C2524` ·
  `--luwte-2 #27322F` · `--mist #E3E9E6` · `--nevel #8B9A95` ·
  `--zeeglas #8FC4AE` · `--amber #D9B27C`
- **Colours, light:** `--diep-l #EAEEEC` · `--luwte-1-l #F4F7F5` ·
  `--luwte-2-l #D5DDDA` · `--mist-l #16201E` · `--nevel-l #5D6C68` ·
  `--zeeglas-l #3E7C63` · `--amber-l #9A6F32`
- **Two-accent rule is structural.** `--zeeglas` only for the person's own
  input and own data. `--amber` only where another human has been. Never
  amber for a system message. Never mix.
- **Forbidden:** red, green-as-good, traffic-light coding of any kind.
- **Type:** `--font-ui: 'Schibsted Grotesk'` for everything the app says;
  `--font-human: 'Newsreader'` for everything a person wrote. Never serif for
  headings, buttons or system copy.
- **Type scale:** xs 13/1.5 · sm 15/1.6 · base 17/1.65 · lg 22/1.4 ·
  xl 30/1.25 · 2xl 42/1.15. **Weights 400 and 500 only. No bold anywhere.**
  Tabular figures on all data surfaces.
- **Space/shape:** 8px base scale; section padding ≥24px, 32px on primary
  screens; radius 12px cards / 10px inputs / 999px the single primary button;
  hairlines 1px in `--luwte-2`, used sparingly.
- **Motion:** 400–600ms, `cubic-bezier(0.22, 0.61, 0.36, 1)`, fade and
  settle. Never slide, bounce, spring or pop. No loading spinners — slow
  opacity pulse on a placeholder shape. No confetti, no celebration, no
  haptic on completion. `prefers-reduced-motion` fully respected.
- **Dark is the default theme on first launch**, regardless of
  `prefers-color-scheme`. Light is one tap away.
- **No photographs of people. Ever.** No character illustrations, mascots, or
  plants-as-growth-metaphor. Icons 1.5px stroke, rounded caps, 24px grid, sparse.
- **Copy:** short declarative sentences · `je`, never `u` · **no exclamation
  marks anywhere** · no emoji in system copy · invite, never instruct · say the
  plain word · never cheerful · present tense, active voice · **never compare**
  · on a missed day, say nothing.
- **Accessibility floor:** WCAG AA on all text and interactive elements ·
  minimum tap target 48×48 · full screen-reader labels · dynamic type to 200%
  without layout breaking · works one-handed, primary actions in the lower third.
- **No streaks, points, gamification, or achievement anything. Ever.**
- **Firebase Analytics stays disabled.** No third-party analytics, ever.

---

## Prerequisites (human, before Task 9 can be verified)

Node 24.13, pnpm 9.15.9, git 2.54 and firebase-tools 13.29.3 are already
installed on this machine. One thing is missing:

**A JDK is required by the Firebase emulators** (Firestore and Auth
emulators are Java processes). Not needed for Tasks 1–8. Install with:

```bash
winget install --id Microsoft.OpenJDK.21 -e
```

Then reopen the terminal and confirm `java -version` prints 21.

---

## File Structure

| Path | Responsibility |
|---|---|
| `package.json`, `pnpm-workspace.yaml` | Workspace root, shared scripts |
| `tsconfig.base.json` | Strict TS options inherited by every package |
| `eslint.config.js`, `.prettierrc` | Lint and format for the whole repo |
| `packages/core/src/i18n/nl.ts` | Dutch dictionary — the source of truth for copy |
| `packages/core/src/i18n/en.ts` | English dictionary — mirrors the voice rules |
| `packages/core/src/i18n/types.ts` | `Dictionary` type; `nl.ts` and `en.ts` must both satisfy it |
| `packages/core/src/i18n/index.ts` | `dictionaries`, `Locale`, `resolveLocale` |
| `packages/core/src/copy-lint.ts` | Pure functions returning copy-rule violations |
| `packages/core/src/copy-lint.test.ts` | Rules proven against known-bad strings |
| `packages/core/src/i18n/dictionaries.test.ts` | Every dictionary value passes copy-lint; nl and en have identical keys |
| `packages/ui/src/tokens.css` | BRAND §3.3–3.6 as CSS custom properties, both themes |
| `packages/ui/src/fonts.css` | Self-hosted `@fontsource-variable` imports |
| `packages/ui/src/theme.ts` | `Theme` type, `applyTheme`, `readStoredTheme` (dark default) |
| `packages/ui/src/theme.test.ts` | Proves dark default and that light is opt-in |
| `packages/ui/src/primitives/Screen.tsx` | Page scaffold: padding, title slot, lower-third action slot |
| `packages/ui/src/primitives/Button.tsx` | `primary` (999px radius) and `quiet` variants |
| `packages/ui/src/primitives/Card.tsx` | 12px radius surface on `--luwte-1` |
| `packages/ui/src/primitives/Hairline.tsx` | 1px `--luwte-2` divider |
| `packages/ui/src/primitives/HumanText.tsx` | Serif wrapper — the only way serif enters the app |
| `packages/ui/src/ScaleInput.tsx` | The 1–7 input. No visible number, ever |
| `packages/ui/src/ScaleInput.test.tsx` | Keyboard, aria, and the no-digits guarantee |
| `apps/app/src/main.tsx` | Entry: providers + router mount |
| `apps/app/src/providers/ThemeProvider.tsx` | Applies theme, exposes toggle |
| `apps/app/src/providers/LocaleProvider.tsx` | Exposes `t()` and locale switch |
| `apps/app/src/routes/Crisis.tsx` | The crisis screen |
| `apps/app/src/routes/Styleguide.tsx` | Living reference for tokens and primitives |
| `apps/app/vite.config.ts` | Vite + PWA (crisis screen precached) |
| `firebase.json`, `.firebaserc` | Two hosting sites, emulator ports |
| `firestore/firestore.rules` | Deny-all stub; the real matrix lands in Phase 1+ |
| `docs/BRAND-QA.md` | Per-screen checklist run before any screen is called done |
| `README.md` | Setup, scripts, prerequisites |

---

## Task 1: Monorepo scaffold and tooling

**Files:**
- Create: `package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`,
  `eslint.config.js`, `.prettierrc`, `.gitignore`, `vitest.workspace.ts`
- Create: `packages/core/package.json`, `packages/core/tsconfig.json`
- Create: `packages/ui/package.json`, `packages/ui/tsconfig.json`

**Interfaces:**
- Produces: workspace packages `@luwte/core` and `@luwte/ui`, both resolvable
  by `workspace:*`. Root scripts `pnpm test`, `pnpm lint`, `pnpm typecheck`.

- [ ] **Step 1: `git init` and write `.gitignore`**

```
node_modules/
dist/
dev-dist/
.firebase/
*.local
.env
.env.*
!.env.example
firebase-debug.log
firestore-debug.log
ui-debug.log
coverage/
.DS_Store
```

- [ ] **Step 2: Write the workspace root**

`pnpm-workspace.yaml`:

```yaml
packages:
  - 'apps/*'
  - 'packages/*'
  - 'functions'
```

`package.json`:

```json
{
  "name": "luwte",
  "private": true,
  "type": "module",
  "engines": { "node": ">=20" },
  "scripts": {
    "dev": "pnpm --filter @luwte/app dev",
    "build": "pnpm -r build",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc -b",
    "lint": "eslint .",
    "format": "prettier --write ."
  },
  "devDependencies": {
    "@eslint/js": "^9",
    "eslint": "^9",
    "prettier": "^3",
    "typescript": "^5.7",
    "typescript-eslint": "^8",
    "vitest": "^3"
  }
}
```

- [ ] **Step 3: Write `tsconfig.base.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "noFallthroughCasesInSwitch": true,
    "verbatimModuleSyntax": true,
    "isolatedModules": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "esModuleInterop": true
  }
}
```

`noUncheckedIndexedAccess` is deliberate: check-in scores are indexed by
1–7 and dates by string, and a silent `undefined` in either is a data bug.

- [ ] **Step 4: Create the two packages**

`packages/core/package.json`:

```json
{
  "name": "@luwte/core",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": { ".": "./src/index.ts" }
}
```

`packages/ui/package.json` — same shape, name `@luwte/ui`, plus:

```json
  "dependencies": {
    "@fontsource-variable/newsreader": "^5",
    "@fontsource-variable/schibsted-grotesk": "^5"
  },
  "peerDependencies": { "react": "^19", "react-dom": "^19" }
```

Each package `tsconfig.json` extends `../../tsconfig.base.json` with
`"include": ["src"]`.

- [ ] **Step 5: Install and verify the workspace resolves**

Run: `pnpm install`
Expected: lockfile written, `@luwte/core` and `@luwte/ui` listed as workspace projects.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: scaffold pnpm monorepo with strict TypeScript"
```

---

## Task 2: i18n dictionaries and copy-lint

The most load-bearing task in Phase 0. BRAND.md's copy rules are enforced by
tests, so a cheerful string cannot reach a screen even months from now.

**Files:**
- Create: `packages/core/src/copy-lint.ts`, `packages/core/src/copy-lint.test.ts`
- Create: `packages/core/src/i18n/types.ts`, `nl.ts`, `en.ts`, `index.ts`
- Create: `packages/core/src/i18n/dictionaries.test.ts`
- Create: `packages/core/src/index.ts`

**Interfaces:**
- Produces:
  - `type Locale = 'nl' | 'en'`
  - `type Dictionary = Record<CopyKey, string>` where `CopyKey` is a string-literal union
  - `const dictionaries: Record<Locale, Dictionary>`
  - `function lintCopy(value: string, locale: Locale): Violation[]`
  - `type Violation = { rule: string; detail: string }`

- [ ] **Step 1: Write the failing copy-lint test**

`packages/core/src/copy-lint.test.ts`:

```ts
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
  });

  it('rejects cheerfulness', () => {
    expect(rules('Goed bezig, je kan dit')).toContain('never-cheerful');
    expect(rules('Great job, keep it up', 'en')).toContain('never-cheerful');
  });

  it('rejects comparison language', () => {
    expect(rules('Beter dan vorige week')).toContain('never-compare');
    expect(rules('You are improving', 'en')).toContain('never-compare');
    expect(rules('20% beter')).toContain('never-compare');
  });

  it('rejects streak and gamification language', () => {
    expect(rules('Je streak is 5 dagen')).toContain('no-gamification');
  });

  it('rejects apologetic error voice', () => {
    expect(rules('Oeps, dat ging mis')).toContain('no-oops');
    expect(rules('Oops, something broke', 'en')).toContain('no-oops');
  });

  it('reports every violation in one string, not just the first', () => {
    expect(rules('Goed bezig! Beter dan gisteren!')).toEqual(
      expect.arrayContaining(['no-exclamation', 'never-cheerful', 'never-compare']),
    );
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `pnpm vitest run packages/core/src/copy-lint.test.ts`
Expected: FAIL — cannot resolve `./copy-lint`.

- [ ] **Step 3: Implement `copy-lint.ts`**

`packages/core/src/copy-lint.ts`:

```ts
export type Violation = { rule: string; detail: string };

type Rule = {
  rule: string;
  detail: string;
  locales?: readonly ('nl' | 'en')[];
  test: RegExp;
};

// Ordinary words are not violations. Only the standalone pronoun is.
const U_FORM = /(^|[^\p{L}])(u|U|uw|Uw|Uw?e)([^\p{L}]|$)/u;

const RULES: readonly Rule[] = [
  { rule: 'no-exclamation', detail: 'exclamation mark', test: /!/ },
  {
    rule: 'no-emoji',
    detail: 'emoji in system copy',
    test: /\p{Extended_Pictographic}/u,
  },
  { rule: 'no-u-form', detail: 'formal u-form', locales: ['nl'], test: U_FORM },
  {
    rule: 'never-cheerful',
    detail: 'cheerful phrasing',
    test: /\b(goed bezig|fantastisch|geweldig|proficiat|gefeliciteerd|je kan dit|great job|well done|keep it up|awesome|amazing|congrats|congratulations|you got this)\b/i,
  },
  {
    rule: 'never-compare',
    detail: 'comparison or progress language',
    test: /\b(beter dan|slechter dan|better than|worse than|you are improving|je gaat vooruit|vooruitgang|improvement|\d+\s?%)/i,
  },
  {
    rule: 'no-gamification',
    detail: 'streak, points or achievement language',
    test: /\b(streak|badge|punten|points|level up|achievement|mijlpaal|milestone|reeks van \d+)\b/i,
  },
  { rule: 'no-oops', detail: 'apologetic error voice', test: /\b(oops|oeps|sorry)\b/i },
];

export function lintCopy(value: string, locale: 'nl' | 'en'): Violation[] {
  return RULES.filter((r) => (r.locales ?? ['nl', 'en']).includes(locale))
    .filter((r) => r.test.test(value))
    .map(({ rule, detail }) => ({ rule, detail }));
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm vitest run packages/core/src/copy-lint.test.ts`
Expected: PASS, 10 tests.

- [ ] **Step 5: Write the dictionary contract test (failing)**

`packages/core/src/i18n/dictionaries.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { lintCopy } from '../copy-lint';
import { dictionaries, type Locale } from './index';

const locales = Object.keys(dictionaries) as Locale[];

describe('dictionaries', () => {
  it('has identical keys in every locale', () => {
    const [first, ...rest] = locales;
    const reference = Object.keys(dictionaries[first!]).sort();
    for (const locale of rest) {
      expect(Object.keys(dictionaries[locale]).sort()).toEqual(reference);
    }
  });

  it.each(locales)('has no empty values in %s', (locale) => {
    for (const [key, value] of Object.entries(dictionaries[locale])) {
      expect(value.trim(), `${locale}.${key} is empty`).not.toBe('');
    }
  });

  it.each(locales)('passes copy-lint on every value in %s', (locale) => {
    const failures = Object.entries(dictionaries[locale]).flatMap(([key, value]) =>
      lintCopy(value, locale).map((v) => `${locale}.${key}: ${v.detail} in "${value}"`),
    );
    expect(failures).toEqual([]);
  });
});
```

- [ ] **Step 6: Write the dictionaries**

`packages/core/src/i18n/nl.ts` — BRAND §4.2 verbatim. Do not paraphrase; this
file is the source of truth and the English file mirrors it.

```ts
import type { Dictionary } from './types';

export const nl: Dictionary = {
  appTagline: 'Uit de wind.',
  onboardingWhat: 'Dit is geen dokter. Dit is een schriftje dat onthoudt wat jij vergeet.',
  onboardingSharing: 'Jij bepaalt wie wat ziet. Altijd. Je kan het elk moment veranderen.',
  checkinEntry: 'Hoe was vandaag?',
  checkinMood: 'Hoe voelde je je?',
  checkinEnergy: 'Hoeveel energie had je?',
  checkinSleep: 'Hoe heb je geslapen?',
  checkinAnxiety: 'Hoe onrustig was het?',
  checkinFlatness: 'Kon je vandaag iets voelen?',
  checkinDiary: 'Iets dat je wil onthouden van vandaag?',
  checkinDone: 'Bewaard.',
  todayEmpty: 'Vandaag staat er niets. Dat mag.',
  optionalPractice: 'Als je zin hebt.',
  medicationSection: 'Wat je vandaag neemt, en waarvoor.',
  feedEmpty: 'Nog niets vandaag.',
  kudosSent: 'Verstuurd.',
  insightsHeader: 'De laatste twee weken.',
  insightsCaveat: 'Dit zijn geen conclusies. Dit is wat je hebt opgeschreven.',
  healthImportAsk:
    'Je horloge weet wanneer je sliep. Wil je dat Luwte dat overneemt, zodat je het niet hoeft in te vullen?',
  dataDeletion: 'Weg is weg. Dat kunnen we niet terugdraaien.',
  genericError: 'Dat is niet gelukt. Probeer het straks nog eens.',
  offline: 'Geen verbinding. Wat je invult wordt bewaard en later verstuurd.',

  crisisTitle: 'Als het nu te zwaar is, bel iemand.',
  crisisZelfmoordlijn: 'Zelfmoordlijn',
  crisisCps: 'Centre de Prévention du Suicide',
  crisisEmergency: 'Noodgeval',
  crisisBack: 'Terug',

  navToday: 'Vandaag',
  navCrisis: 'Hulp nu',
  themeToggle: 'Licht of donker',
  localeToggle: 'Taal',
  scaleLow: 'weinig',
  scaleHigh: 'veel',
  windlineLabel: 'Overzicht van de laatste veertien dagen',
};
```

`packages/core/src/i18n/en.ts` — mirrors the voice, not the words. Contractions
are the English equivalent of `je`: informal, warm, unfussy.

```ts
import type { Dictionary } from './types';

export const en: Dictionary = {
  appTagline: 'Out of the wind.',
  onboardingWhat: 'This is not a doctor. This is a notebook that remembers what you forget.',
  onboardingSharing: 'You decide who sees what. Always. You can change it at any time.',
  checkinEntry: 'How was today?',
  checkinMood: 'How did you feel?',
  checkinEnergy: 'How much energy did you have?',
  checkinSleep: 'How did you sleep?',
  checkinAnxiety: 'How restless was it?',
  checkinFlatness: 'Could you feel anything today?',
  checkinDiary: 'Anything you want to remember about today?',
  checkinDone: 'Saved.',
  todayEmpty: 'Nothing today. That is allowed.',
  optionalPractice: 'If you feel like it.',
  medicationSection: 'What you take today, and what for.',
  feedEmpty: 'Nothing yet today.',
  kudosSent: 'Sent.',
  insightsHeader: 'The last two weeks.',
  insightsCaveat: 'These are not conclusions. This is what you wrote down.',
  healthImportAsk:
    'Your watch knows when you slept. Do you want Luwte to take that over, so you do not have to fill it in?',
  dataDeletion: 'Gone is gone. We cannot undo that.',
  genericError: 'That did not work. Try again later.',
  offline: 'No connection. What you fill in is saved and sent later.',

  crisisTitle: 'If it is too much right now, call someone.',
  crisisZelfmoordlijn: 'Suicide helpline (Zelfmoordlijn)',
  crisisCps: 'Centre de Prévention du Suicide',
  crisisEmergency: 'Emergency',
  crisisBack: 'Back',

  navToday: 'Today',
  navCrisis: 'Help now',
  themeToggle: 'Light or dark',
  localeToggle: 'Language',
  scaleLow: 'little',
  scaleHigh: 'a lot',
  windlineLabel: 'Overview of the last fourteen days',
};
```

`types.ts` derives the key union from the Dutch file so a key can never exist
in one language only:

```ts
import type { nl } from './nl';
export type CopyKey = keyof typeof nl;
export type Dictionary = Record<CopyKey, string>;
```

Since `nl.ts` imports `Dictionary` and `types.ts` imports `nl`, declare
`nl` without the annotation and derive from it:

```ts
// nl.ts
export const nl = { /* ...as above... */ } as const satisfies Record<string, string>;
// types.ts
import { nl } from './nl';
export type CopyKey = keyof typeof nl;
export type Dictionary = Record<CopyKey, string>;
// en.ts
import type { Dictionary } from './types';
export const en: Dictionary = { /* ... */ };
```

`index.ts`:

```ts
import { nl } from './nl';
import { en } from './en';
export type { CopyKey, Dictionary } from './types';
export type Locale = 'nl' | 'en';
export const DEFAULT_LOCALE: Locale = 'nl';
export const dictionaries = { nl, en } satisfies Record<Locale, Record<string, string>>;
export function resolveLocale(candidate: string | undefined | null): Locale {
  return candidate?.toLowerCase().startsWith('en') ? 'en' : DEFAULT_LOCALE;
}
```

- [ ] **Step 7: Run the dictionary tests**

Run: `pnpm vitest run packages/core`
Expected: PASS. If `never-compare` flags a legitimate string, fix the copy —
not the rule.

- [ ] **Step 8: Commit**

```bash
git add packages/core
git commit -m "feat(core): Dutch and English dictionaries with copy-lint enforced by tests"
```

---

## Task 3: Design tokens and self-hosted fonts

**Files:**
- Create: `packages/ui/src/tokens.css`, `packages/ui/src/fonts.css`
- Create: `packages/ui/src/theme.ts`, `packages/ui/src/theme.test.ts`
- Create: `packages/ui/src/index.ts`

**Interfaces:**
- Produces: `type Theme = 'dark' | 'light'`, `applyTheme(theme, root?)`,
  `readStoredTheme(storage?)`, `storeTheme(theme, storage?)`, and the CSS
  custom properties listed in Global Constraints.

- [ ] **Step 1: Write the failing theme test**

`packages/ui/src/theme.test.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { applyTheme, readStoredTheme, storeTheme } from './theme';

class MemoryStorage {
  private map = new Map<string, string>();
  getItem = (k: string) => this.map.get(k) ?? null;
  setItem = (k: string, v: string) => void this.map.set(k, v);
}

describe('theme', () => {
  let storage: MemoryStorage;
  beforeEach(() => {
    storage = new MemoryStorage();
    document.documentElement.removeAttribute('data-theme');
  });

  it('opens dark on first launch', () => {
    expect(readStoredTheme(storage as unknown as Storage)).toBe('dark');
  });

  it('stays dark even when the system prefers light', () => {
    // BRAND 3.2: dark is what opens, regardless of system preference.
    expect(readStoredTheme(storage as unknown as Storage)).toBe('dark');
  });

  it('remembers an explicit choice of light', () => {
    storeTheme('light', storage as unknown as Storage);
    expect(readStoredTheme(storage as unknown as Storage)).toBe('light');
  });

  it('ignores a stored value that is not a theme', () => {
    storage.setItem('luwte.theme', 'neon');
    expect(readStoredTheme(storage as unknown as Storage)).toBe('dark');
  });

  it('applies the theme to the document root', () => {
    applyTheme('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `pnpm vitest run packages/ui/src/theme.test.ts`
Expected: FAIL — cannot resolve `./theme`. (Requires `environment: 'jsdom'`
in the ui vitest config and `jsdom` installed.)

- [ ] **Step 3: Implement `theme.ts`**

```ts
export type Theme = 'dark' | 'light';

const KEY = 'luwte.theme';
const isTheme = (v: unknown): v is Theme => v === 'dark' || v === 'light';

/** BRAND 3.2 — dark is what opens on first launch. System preference does not override it. */
export function readStoredTheme(storage: Storage = localStorage): Theme {
  try {
    const stored = storage.getItem(KEY);
    return isTheme(stored) ? stored : 'dark';
  } catch {
    return 'dark';
  }
}

export function storeTheme(theme: Theme, storage: Storage = localStorage): void {
  try {
    storage.setItem(KEY, theme);
  } catch {
    /* private mode — the theme simply does not persist */
  }
}

export function applyTheme(theme: Theme, root: HTMLElement = document.documentElement): void {
  root.setAttribute('data-theme', theme);
}
```

- [ ] **Step 4: Write `tokens.css`**

Every value from BRAND §3.3–3.6. Semantic aliases (`--bg`, `--surface`,
`--text`, `--text-quiet`, `--line`, `--self`, `--human`) are what components
consume, so a component never hard-codes a theme-specific name.

```css
:root,
:root[data-theme='dark'] {
  --diep: #131a19;
  --luwte-1: #1c2524;
  --luwte-2: #27322f;
  --mist: #e3e9e6;
  --nevel: #8b9a95;
  --zeeglas: #8fc4ae;
  --amber: #d9b27c;

  --bg: var(--diep);
  --surface: var(--luwte-1);
  --line: var(--luwte-2);
  --text: var(--mist);
  --text-quiet: var(--nevel);
  --self: var(--zeeglas);   /* the person's own data — never anything else */
  --human: var(--amber);    /* another human was here — never a system message */
}

:root[data-theme='light'] {
  --bg: #eaeeec;
  --surface: #f4f7f5;
  --line: #d5dddA;
  --text: #16201e;
  --text-quiet: #5d6c68;
  --self: #3e7c63;
  --human: #9a6f32;
}

:root {
  --font-ui: 'Schibsted Grotesk Variable', 'Schibsted Grotesk', -apple-system, sans-serif;
  --font-human: 'Newsreader Variable', Newsreader, Georgia, serif;

  --text-xs: 13px;   --leading-xs: 1.5;
  --text-sm: 15px;   --leading-sm: 1.6;
  --text-base: 17px; --leading-base: 1.65;
  --text-lg: 22px;   --leading-lg: 1.4;
  --text-xl: 30px;   --leading-xl: 1.25;
  --text-2xl: 42px;  --leading-2xl: 1.15;

  --space-1: 8px;  --space-2: 16px; --space-3: 24px;
  --space-4: 32px; --space-5: 40px; --space-6: 48px;

  --radius-card: 12px;
  --radius-input: 10px;
  --radius-action: 999px;

  --tap-min: 48px;

  --ease-settle: cubic-bezier(0.22, 0.61, 0.36, 1);
  --dur-quick: 400ms;
  --dur-slow: 600ms;
}

*, *::before, *::after { box-sizing: border-box; }

html {
  background: var(--bg);
  color-scheme: dark;
}
:root[data-theme='light'] { color-scheme: light; }

body {
  margin: 0;
  background: var(--bg);
  color: var(--text);
  font-family: var(--font-ui);
  font-size: var(--text-base);
  line-height: var(--leading-base);
  font-weight: 400;
  font-variant-numeric: tabular-nums;      /* BRAND 3.4 — data must not jitter */
  -webkit-font-smoothing: antialiased;
}

/* BRAND 3.4 — no bold anywhere. Hierarchy is size and colour. */
b, strong { font-weight: 500; }

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

- [ ] **Step 5: Write `fonts.css` and install the font packages**

```bash
pnpm --filter @luwte/ui add @fontsource-variable/schibsted-grotesk @fontsource-variable/newsreader
```

`packages/ui/src/fonts.css`:

```css
/* Self-hosted. No runtime request ever leaves for fonts.googleapis.com. */
@import '@fontsource-variable/schibsted-grotesk/index.css';
@import '@fontsource-variable/newsreader/index.css';
```

- [ ] **Step 6: Run the theme tests**

Run: `pnpm vitest run packages/ui`
Expected: PASS, 5 tests.

- [ ] **Step 7: Commit**

```bash
git add packages/ui
git commit -m "feat(ui): brand design tokens, both themes, self-hosted fonts"
```

---

## Task 4: UI primitives

**Files:**
- Create: `packages/ui/src/primitives/{Screen,Button,Card,Hairline,HumanText}.tsx`
- Create: `packages/ui/src/primitives/primitives.test.tsx`
- Modify: `packages/ui/src/index.ts`

**Interfaces:**
- Consumes: tokens from Task 3.
- Produces:
  - `<Screen title?: string; children; action?: ReactNode>` — `action` renders in the lower third.
  - `<Button variant?: 'primary' | 'quiet'; …ButtonHTMLAttributes>`
  - `<Card as?: ElementType; children>`
  - `<Hairline />`
  - `<HumanText as?: 'p' | 'span' | 'blockquote'; children>` — the only serif in the app.

- [ ] **Step 1: Write the failing primitives test**

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Button, HumanText, Screen } from './index';

describe('primitives', () => {
  it('renders a screen title as a heading', () => {
    render(<Screen title="Vandaag">inhoud</Screen>);
    expect(screen.getByRole('heading', { name: 'Vandaag' })).toBeTruthy();
  });

  it('gives buttons a tap target of at least 48px', () => {
    render(<Button>Bewaren</Button>);
    const style = getComputedStyle(screen.getByRole('button'));
    expect(parseInt(style.minHeight, 10)).toBeGreaterThanOrEqual(48);
  });

  it('sets the human serif only through HumanText', () => {
    render(<HumanText>ik heb vandaag gewandeld</HumanText>);
    expect(screen.getByText('ik heb vandaag gewandeld').className).toContain('human');
  });
});
```

- [ ] **Step 2: Run and watch it fail**

Run: `pnpm vitest run packages/ui/src/primitives`
Expected: FAIL — module not found. Install `@testing-library/react`,
`@testing-library/jest-dom`, `jsdom` first.

- [ ] **Step 3: Implement the primitives with a co-located CSS module each**

`Button.tsx` — `primary` uses `--radius-action` (999px) and is the single
primary action; `quiet` is a text button. Neither animates on press beyond
opacity, per BRAND §3.6.

```tsx
import type { ButtonHTMLAttributes } from 'react';
import styles from './Button.module.css';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'quiet' };

export function Button({ variant = 'primary', className = '', ...rest }: Props) {
  return <button className={`${styles.base} ${styles[variant]} ${className}`} {...rest} />;
}
```

```css
/* Button.module.css */
.base {
  min-height: var(--tap-min);
  min-width: var(--tap-min);
  padding: 0 var(--space-3);
  font: inherit;
  font-weight: 500;
  border: 0;
  cursor: pointer;
  transition: opacity var(--dur-quick) var(--ease-settle);
}
.base:disabled { opacity: 0.4; cursor: default; }
.primary {
  border-radius: var(--radius-action);
  background: var(--self);
  color: var(--bg);
}
.quiet {
  border-radius: var(--radius-input);
  background: transparent;
  color: var(--text-quiet);
}
```

`Screen.tsx` places `action` in a footer so primary actions sit in the lower
third, one-handed (BRAND §5). Padding `--space-4` (32px) on primary screens.

`Card.tsx`: `background: var(--surface); border-radius: var(--radius-card); padding: var(--space-3)`.

`Hairline.tsx`: `<div role="presentation">` with `height:1px; background: var(--line)`.

`HumanText.tsx`: applies `.human { font-family: var(--font-human); }`.

- [ ] **Step 4: Run the tests**

Run: `pnpm vitest run packages/ui`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/ui
git commit -m "feat(ui): Screen, Button, Card, Hairline and HumanText primitives"
```

---

## Task 5: ScaleInput

The single most-used control in the product. Six of these are the entire
daily check-in.

**Files:**
- Create: `packages/ui/src/ScaleInput.tsx`, `ScaleInput.module.css`, `ScaleInput.test.tsx`
- Modify: `packages/ui/src/index.ts`

**Interfaces:**
- Produces:
  ```ts
  export type ScaleValue = 1 | 2 | 3 | 4 | 5 | 6 | 7;
  export type ScaleInputProps = {
    name: string;
    legend: string;                 // the question, e.g. 'Hoe voelde je je?'
    value: ScaleValue | null;
    onChange: (value: ScaleValue) => void;
    lowLabel: string;               // words, never numbers
    highLabel: string;
    stepLabels?: readonly string[]; // 7 accessible labels; defaults to low…high phrasing
  };
  ```

**Rules this control must satisfy:** no digit is ever rendered (BRAND: "never
a visible number"); every option is a ≥48×48 tap target; the group is a
`radiogroup` with roving focus and arrow-key support; selection is drawn in
`--self` because it is the person's own input; no colour encodes good or bad,
so all seven options look identical apart from selection.

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ScaleInput } from './ScaleInput';

const setup = (value: 1 | 2 | 3 | 4 | 5 | 6 | 7 | null = null) => {
  const onChange = vi.fn();
  render(
    <ScaleInput
      name="mood"
      legend="Hoe voelde je je?"
      value={value}
      onChange={onChange}
      lowLabel="weinig"
      highLabel="veel"
    />,
  );
  return { onChange };
};

describe('ScaleInput', () => {
  it('exposes seven options in a labelled radiogroup', () => {
    setup();
    expect(screen.getByRole('radiogroup', { name: 'Hoe voelde je je?' })).toBeTruthy();
    expect(screen.getAllByRole('radio')).toHaveLength(7);
  });

  it('never renders a digit', () => {
    setup(4);
    const group = screen.getByRole('radiogroup');
    expect(group.textContent ?? '').not.toMatch(/\d/);
    for (const radio of screen.getAllByRole('radio')) {
      expect(radio.getAttribute('aria-label') ?? '').not.toMatch(/\d/);
    }
  });

  it('reports the chosen value', async () => {
    const { onChange } = setup();
    await userEvent.click(screen.getAllByRole('radio')[2]!);
    expect(onChange).toHaveBeenCalledWith(3);
  });

  it('moves with the arrow keys', async () => {
    const { onChange } = setup(3);
    screen.getAllByRole('radio')[2]!.focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(onChange).toHaveBeenCalledWith(4);
  });

  it('does not move past either end', async () => {
    const { onChange } = setup(7);
    screen.getAllByRole('radio')[6]!.focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('keeps only the selected option in the tab order', () => {
    setup(5);
    const tabbable = screen.getAllByRole('radio').filter((r) => r.tabIndex === 0);
    expect(tabbable).toHaveLength(1);
    expect(tabbable[0]!.getAttribute('aria-checked')).toBe('true');
  });

  it('puts nothing in the tab order twice when unanswered', () => {
    setup(null);
    expect(screen.getAllByRole('radio').filter((r) => r.tabIndex === 0)).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run and watch it fail**

Run: `pnpm vitest run packages/ui/src/ScaleInput.test.tsx`
Expected: FAIL — cannot resolve `./ScaleInput`.

- [ ] **Step 3: Implement**

```tsx
import { useId } from 'react';
import styles from './ScaleInput.module.css';

export type ScaleValue = 1 | 2 | 3 | 4 | 5 | 6 | 7;
const VALUES = [1, 2, 3, 4, 5, 6, 7] as const;

export type ScaleInputProps = {
  name: string;
  legend: string;
  value: ScaleValue | null;
  onChange: (value: ScaleValue) => void;
  lowLabel: string;
  highLabel: string;
  stepLabels?: readonly string[];
};

export function ScaleInput({
  name, legend, value, onChange, lowLabel, highLabel, stepLabels,
}: ScaleInputProps) {
  const id = useId();
  const labelFor = (v: ScaleValue) => stepLabels?.[v - 1] ?? `${lowLabel} – ${highLabel}`;
  const focusValue = value ?? 4;

  const move = (from: ScaleValue, delta: number) => {
    const next = from + delta;
    if (next < 1 || next > 7) return;
    onChange(next as ScaleValue);
  };

  return (
    <div className={styles.wrap}>
      <div role="radiogroup" aria-label={legend} className={styles.group} id={id}>
        {VALUES.map((v) => (
          <button
            key={v}
            type="button"
            role="radio"
            name={name}
            aria-checked={value === v}
            aria-label={labelFor(v)}
            tabIndex={v === focusValue ? 0 : -1}
            className={styles.option}
            data-selected={value === v || undefined}
            onClick={() => onChange(v)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); move(v, 1); }
              if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); move(v, -1); }
            }}
          >
            <span className={styles.dot} aria-hidden="true" />
          </button>
        ))}
      </div>
      <div className={styles.anchors} aria-hidden="true">
        <span>{lowLabel}</span>
        <span>{highLabel}</span>
      </div>
    </div>
  );
}
```

The dot grows subtly left to right so the scale has direction without a
number. Selection is a filled `--self` dot with a ring. No hue changes across
the scale — there is no bad score.

- [ ] **Step 4: Run the tests**

Run: `pnpm vitest run packages/ui`
Expected: PASS, all ScaleInput tests green.

- [ ] **Step 5: Commit**

```bash
git add packages/ui
git commit -m "feat(ui): accessible 1-7 ScaleInput that never shows a number"
```

---

## Task 6: App shell

**Files:**
- Create: `apps/app/package.json`, `index.html`, `vite.config.ts`, `tsconfig.json`
- Create: `apps/app/src/main.tsx`, `src/App.tsx`
- Create: `apps/app/src/providers/{ThemeProvider,LocaleProvider}.tsx`
- Create: `apps/app/src/providers/locale.test.tsx`

**Interfaces:**
- Consumes: `@luwte/core` (`dictionaries`, `resolveLocale`), `@luwte/ui` (tokens, theme, primitives).
- Produces: `useLocale(): { locale, t, setLocale }`, `useTheme(): { theme, setTheme }`,
  routes `/`, `/crisis`, `/styleguide`.

- [ ] **Step 1: Write the failing locale test**

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { LocaleProvider, useLocale } from './LocaleProvider';

function Probe() {
  const { t, setLocale } = useLocale();
  return (
    <>
      <p>{t('checkinEntry')}</p>
      <button onClick={() => setLocale('en')}>switch</button>
    </>
  );
}

describe('LocaleProvider', () => {
  it('starts in Dutch', () => {
    render(<LocaleProvider><Probe /></LocaleProvider>);
    expect(screen.getByText('Hoe was vandaag?')).toBeTruthy();
  });

  it('switches to English', async () => {
    render(<LocaleProvider><Probe /></LocaleProvider>);
    await userEvent.click(screen.getByRole('button', { name: 'switch' }));
    expect(screen.getByText('How was today?')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run and watch it fail**

Run: `pnpm vitest run apps/app`
Expected: FAIL — module not found.

- [ ] **Step 3: Scaffold the app and implement the providers**

```bash
pnpm --filter @luwte/app add react react-dom react-router
pnpm --filter @luwte/app add -D @vitejs/plugin-react vite vite-plugin-pwa
```

`LocaleProvider` holds `locale` state seeded from `localStorage` then
`navigator.language` via `resolveLocale`, and exposes
`t = (key: CopyKey) => dictionaries[locale][key]`. `ThemeProvider` calls
`applyTheme(readStoredTheme())` on mount and writes through `storeTheme`.

`vite.config.ts` registers the PWA plugin with `registerType: 'autoUpdate'`
and precaches the built assets so the crisis screen loads with no network.

`index.html` sets `<html lang="nl" data-theme="dark">` and
`<meta name="theme-color" content="#131A19">` so the browser chrome does not
flash white on launch.

- [ ] **Step 4: Run the tests and the dev server**

Run: `pnpm vitest run apps/app` → PASS
Run: `pnpm dev` → app serves on localhost with a dark background and no font flash.

- [ ] **Step 5: Commit**

```bash
git add apps/app
git commit -m "feat(app): PWA shell with dark-default theme and nl/en locale providers"
```

---

## Task 7: Crisis screen

Built before any check-in exists, because PRD §6.8 requires it to be
reachable from everywhere and it must never depend on a feature that could
fail. This is the one surface where the voice is direct (BRAND §4.4).

**Files:**
- Create: `apps/app/src/routes/Crisis.tsx`, `Crisis.module.css`, `Crisis.test.tsx`
- Modify: `apps/app/src/App.tsx` (route + persistent link)

**Interfaces:**
- Consumes: `useLocale`, `Screen`, `Card` from Task 4/6.

**Requirements:** works offline; `tel:` links that dial; never behind more
than one tap; no soft language, no metaphor, no `luwte` wordplay; three
numbers exactly — Zelfmoordlijn 1813, Centre de Prévention du Suicide
0800 32 123, Noodgeval 112.

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { LocaleProvider } from '../providers/LocaleProvider';
import { Crisis } from './Crisis';

const renderCrisis = () => render(<LocaleProvider><Crisis /></LocaleProvider>);

describe('Crisis', () => {
  it('offers the three Belgian services as dialable links', () => {
    renderCrisis();
    const numbers = screen.getAllByRole('link').map((a) => a.getAttribute('href'));
    expect(numbers).toEqual(
      expect.arrayContaining(['tel:1813', 'tel:080032123', 'tel:112']),
    );
  });

  it('states the direct instruction', () => {
    renderCrisis();
    expect(screen.getByText('Als het nu te zwaar is, bel iemand.')).toBeTruthy();
  });

  it('names each service next to its number', () => {
    renderCrisis();
    expect(screen.getByRole('link', { name: /Zelfmoordlijn/ })).toBeTruthy();
    expect(screen.getByRole('link', { name: /Noodgeval/ })).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run and watch it fail**

Run: `pnpm vitest run apps/app/src/routes/Crisis.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement**

Each row is a full-width `<a href="tel:…">` at least 64px tall — sedating
medication affects fine motor control (BRAND §5), so these targets are
generous rather than merely compliant. Number set in `--text-xl`, tabular
figures. No accent colour: this screen is not the person's data and not
another human, so it uses `--text` on `--surface` only.

- [ ] **Step 4: Run tests, then verify offline by hand**

Run: `pnpm vitest run apps/app` → PASS
Run: `pnpm --filter @luwte/app build && pnpm --filter @luwte/app preview`,
open `/crisis`, then set the browser to offline and reload.
Expected: the screen still renders and the numbers still dial.

- [ ] **Step 5: Commit**

```bash
git add apps/app
git commit -m "feat(app): crisis screen with dialable Belgian services, works offline"
```

---

## Task 8: Styleguide route

**Files:**
- Create: `apps/app/src/routes/Styleguide.tsx`
- Modify: `apps/app/src/App.tsx`

- [ ] **Step 1: Build the route**

Sections: colour swatches with token names and the two-accent rule stated in
words; the full type scale in both faces; the primitives; a live `ScaleInput`;
a theme toggle; a locale toggle. Not linked from product navigation —
reachable at `/styleguide` only.

- [ ] **Step 2: Verify by eye in both themes**

Run: `pnpm dev`, open `/styleguide`, toggle dark ↔ light.
Expected: dark on load; no red or green anywhere; nothing bolder than 500;
serif appears only in the `HumanText` sample.

- [ ] **Step 3: Commit**

```bash
git add apps/app
git commit -m "feat(app): styleguide route showing tokens and primitives in both themes"
```

---

## Task 9: Firebase config, brand QA checklist, README

**Files:**
- Create: `firebase.json`, `.firebaserc`, `firestore/firestore.rules`,
  `firestore/firestore.indexes.json`
- Create: `docs/BRAND-QA.md`, `README.md`

- [ ] **Step 1: Write the deny-all rules stub**

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Phase 1 replaces this with the PRD 5.3 matrix. Until then, nothing is readable.
    match /{document=**} { allow read, write: if false; }
  }
}
```

- [ ] **Step 2: Write `firebase.json` with two hosting sites and emulator ports**

Hosting targets `app` → `apps/app/dist` and `console` → `apps/console/dist`,
both with the SPA rewrite. Emulators: auth 9099, firestore 8080, functions
5001, storage 9199, hosting 5000, ui 4000.

- [ ] **Step 3: Write `docs/BRAND-QA.md`**

The checklist to run against every new screen before calling it done — colour,
type, motion, copy, accessibility, and the two-accent rule. Derived from
BRAND.md; each line cites its section.

- [ ] **Step 4: Write `README.md`**

Prerequisites (including the JDK note), install, `pnpm dev`, `pnpm test`,
where the PRD and BRAND live, and the rule that BRAND.md is read before any
UI work.

- [ ] **Step 5: Verify the whole workspace is green**

```bash
pnpm install && pnpm typecheck && pnpm lint && pnpm test && pnpm build
```
Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: firebase config, brand QA checklist and README"
```

---

## Phase 0 exit criteria

- [ ] `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build` all pass
- [ ] `/styleguide` renders correctly in dark and light
- [ ] Copy-lint fails the build on a cheerful, comparative, or exclaimed string
- [ ] The crisis screen works with the network off and its numbers dial
- [ ] Both languages render every string with no missing keys
- [ ] `docs/BRAND-QA.md` exists and every Phase 0 screen passes it
- [ ] No Firebase project is required to run any of the above
