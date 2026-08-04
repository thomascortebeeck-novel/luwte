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

## Stack

TypeScript end to end. pnpm workspaces + Turborepo, the same shape as the
other Novel repos. **No JVM in the build or the runtime.**

| Path | What | Runtime |
|---|---|---|
| `apps/web` (`@luwte/web`) | Vite + React 19 SPA, installable PWA, react-router | Vite |
| `packages/core` (`@luwte/core`) | types, i18n dictionaries, copy-lint | library |
| `packages/ui` (`@luwte/ui`) | design tokens, primitives, charts | library |

Data and infra: **Cloud Firestore** (`eur3`) · Cloud Functions gen2
(`europe-west1`) · Firebase Auth + FCM · Firebase Hosting.
Tests: Vitest (unit) today, Playwright (e2e) from Phase 2.

> **Note this diverges from the house stack.** The other Novel repos use
> PostgreSQL with an Express API on Cloud Run, and Firebase only for auth and
> push. luwte follows the PRD's Firestore design, where the security rules
> *are* the access-control mechanism (PRD 5.3) rather than an API layer.
> See [CLAUDE.md](CLAUDE.md) for the trade-off and when to revisit it.

## Prerequisites

| Tool | Version | Needed for |
|---|---|---|
| Node | 20+ (24 in use here) | everything |
| pnpm | 9+ | `corepack enable` |
| JRE | 21 | **the Firebase emulators only, from Phase 1** |

### Why Java, in a repo with no Java in it

The **Firebase Emulator Suite** ships as Java binaries — the Firestore, Auth,
Pub/Sub and Storage emulators are all JVM processes. `firebase
emulators:start` needs a JRE no matter what language your code is written in.

The other Novel repos never hit this because they keep data in Postgres and
use Firebase only for auth and FCM, so they never start the Firestore
emulator. luwte's security rules can only be tested locally against it, and
those rules are the whole access-control design.

Nothing in Phase 0 needs it. Before Phase 1:

```bash
winget install --id Microsoft.OpenJDK.21 -e
```

The alternative is running rules tests against a throwaway cloud Firebase
project — no Java, but slower, billable, and awkward to wire into CI.

### Always start the emulators through the wrapper

```bash
pnpm emulators                 # emulators:start
pnpm emulators:exec --only firestore "pnpm test"
```

Not `firebase emulators:start` directly. On this machine the Firestore
emulator dies at startup with *"failed to create a child event loop"*,
because Java's NIO selector is built on an AF_UNIX socket created in the
system temp directory, and AF_UNIX `connect` inside `%LOCALAPPDATA%\Temp`
fails with "Invalid argument" — `bind` succeeds, `connect` does not. Any
other directory works.

`scripts/emulators.mjs` points `jdk.net.unixdomain.tmpdir` at a repo-local
`.emulator-tmp/` and is otherwise a passthrough. It is not a JDK version
problem: 17 and 21 both fail identically, and both are fine once redirected.
Most likely an endpoint-security filter on the temp directory.

## Getting started

```bash
corepack enable
pnpm install
pnpm dev
```

The app serves on <http://localhost:5173>. Two routes exist today beyond the
holding screen: `/crisis` and `/styleguide`.

## Commands

```bash
pnpm dev         # the app, with hot reload
pnpm verify      # the full gate: lint, typecheck, test, build
pnpm test        # vitest across the workspace
pnpm typecheck   # tsc, strict, whole repo
pnpm lint        # eslint
pnpm build       # production build with the service worker
pnpm preview     # serve the production build, for testing offline behaviour
```

`lint`, `typecheck` and `test` run once at the root rather than per package —
one ESLint config, one tsconfig, one Vitest config covering
`{apps,packages}/*/src`. Turborepo orchestrates `build` and `dev`, and takes
over the rest when `functions` and `apps/console` arrive.

## Repository

```
apps/web/         patient + supporter PWA
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
