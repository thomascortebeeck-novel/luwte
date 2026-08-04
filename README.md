# luwte

*Uit de wind.*

A shared logbook and a small daily structure for someone recovering from
psychosis and depression, their family, and their care team.

> luwte is a logbook and a nudge, not a doctor.

- [docs/PRD.md](docs/PRD.md) — what this is and why
- [docs/BRAND.md](docs/BRAND.md) — **read before writing any UI or copy**
- [PLAN.md](PLAN.md) — phase roadmap and decision log
- [docs/BRAND-QA.md](docs/BRAND-QA.md) — the checklist every screen passes
- [CLAUDE.md](CLAUDE.md) — working rules for this repo

## Prerequisites

| Tool | Version | Notes |
|---|---|---|
| Node | 20+ (24 in use) | |
| pnpm | 9+ | `corepack enable` |
| Java | JDK 21 | **Only needed from Phase 1**, for the Firebase emulators |

The Firestore and Auth emulators are Java processes. Nothing in Phase 0
requires them. When you get there:

```bash
winget install --id Microsoft.OpenJDK.21 -e
```

## Getting started

```bash
pnpm install
pnpm dev
```

The app serves on <http://localhost:5173>. Two routes exist today beyond the
holding screen: `/crisis` and `/styleguide`.

## Commands

```bash
pnpm dev         # the app, with hot reload
pnpm test        # vitest across the workspace
pnpm typecheck   # tsc, strict, whole repo
pnpm lint        # eslint
pnpm build       # production build with the service worker
pnpm preview     # serve the production build, for testing offline behaviour
```

## Repository

```
apps/app/         patient + supporter PWA
packages/core/    types, i18n dictionaries, copy-lint — no React, no Firebase
packages/ui/      design tokens and primitives — no Firebase
firestore/        security rules and indexes
docs/             PRD, BRAND, QA checklist, per-phase implementation plans
```

`packages/core` and `packages/ui` are deliberately dependency-light: the copy
rules and the design system have to be usable from the clinician console and,
later, from anything else, without dragging Firebase along.

## How the brand rules are kept

BRAND.md is enforced rather than remembered.

- `packages/core/src/copy-lint.ts` runs eight rules over every dictionary
  string: no exclamation marks, no emoji, no formal `u`-form, lowercase
  wordmark, never cheerful, never compare, no gamification, no apologetic
  error voice.
- `packages/ui/src/brand.test.ts` reads the stylesheets and fails on a
  font-weight over 500, any red or green, and spring or slide keyframes.
- `packages/ui/src/contrast.test.ts` computes WCAG contrast for every
  foreground/background pair actually rendered, in both themes.

If a rule blocks you, the copy or the colour is wrong, not the rule.

## Testing offline behaviour

The crisis screen must work with no network (PRD 6.8).

```bash
pnpm build && pnpm preview
```

Open `/crisis`, then set the browser to offline and reload. The screen renders
and the numbers still dial.
