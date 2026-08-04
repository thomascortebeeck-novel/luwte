# CLAUDE.md — luwte

Project instructions for Claude Code. Read before doing anything in this repo.

## What this is

**luwte** — a shared logbook and daily structure for someone recovering from
psychosis and depression, their family, and their care team. Dutch-first,
Belgium. Web app (PWA) in v1; Android after the pilot.

**The product principle, from which everything else follows:**

> luwte is a logbook and a nudge, not a doctor.

Source documents, both binding:

- [docs/PRD.md](docs/PRD.md) — what to build and why
- [docs/BRAND.md](docs/BRAND.md) — **read before writing any UI or copy**
- [PLAN.md](PLAN.md) — phase roadmap and decision log
- [docs/superpowers/plans/](docs/superpowers/plans/) — per-phase implementation plans
- [docs/BRAND-QA.md](docs/BRAND-QA.md) — the checklist every screen passes before it is done

## Working rules

1. **Keep this file current.** After any change that alters architecture,
   adds a dependency, changes a rule, or completes a phase, update the
   Changelog at the bottom and the relevant section here. Do this as the last
   step of the work, in the same commit. A change nobody recorded is a change
   the next session repeats.
2. **Use the terminal directly for project setup.** PowerShell is available
   and you should drive it — Firebase CLI, gcloud, npm, git, project
   creation, auth flows. Do not hand the user a list of commands to run when
   you can run them yourself. Interactive browser-based logins
   (`firebase login`, `gcloud auth login`) are started by you; the user only
   completes the browser step.
3. **Never merge to GitHub.** The AI may push branches (with per-push
   approval) and open pull requests. Merging is a human action, performed by
   the human in the GitHub UI. The only exception is an explicit, in-the-moment
   instruction from Thomas to merge. No `gh pr merge`, no direct push to
   `main`, no releases.
4. **Every push needs explicit approval**, including dev branches. Ask, wait,
   then push.
5. **Never send email.** Any email flow is configured and triggered by a human.
6. **Ask before deleting data.** Firestore deletes, collection wipes,
   destructive migrations — every time.
7. **BRAND.md is not decoration.** Its rules are enforced by tests
   (`packages/core/src/copy-lint.ts`). If a rule blocks you, the copy is
   wrong, not the rule.
8. **Tests before implementation** for security rules, Cloud Functions,
   date/timezone logic, and copy. UI gets a smoke test plus the brand QA pass.

## Stack and repository

TypeScript end to end, pnpm workspaces + Turborepo, Node 20+. **No JVM in the
build or the runtime.**

```
apps/web/         patient + supporter PWA (React 19, Vite, react-router)
apps/console/     clinician console (from Phase 7)
packages/core/    types, i18n dictionaries, copy-lint — no React, no Firebase
packages/ui/      design tokens, primitives, windline, chart — no Firebase
functions/        Cloud Functions gen2 (from Phase 1)
firestore/        rules, indexes, rules tests
docs/             PRD, BRAND, QA checklist, per-phase plans
```

Remote: `https://github.com/thomascortebeeck-novel/luwte.git`

### Java is needed for the emulators, not for the code

The Firebase Emulator Suite ships as Java binaries — Firestore, Auth, Pub/Sub
and Storage emulators are all JVM processes, so `firebase emulators:start`
needs a JRE regardless of the codebase language. Install before Phase 1:
`winget install --id Microsoft.OpenJDK.21 -e`. Nothing in Phase 0 needs it.

The other Novel repos never need this because they keep data in Postgres and
use Firebase only for auth and FCM.

### Divergence from the house stack — revisit before Phase 1 ends

The other Novel repos are Postgres + Express on Cloud Run, with Firebase for
auth and push only. luwte instead follows the PRD's Firestore design.

The reason to keep Firestore: PRD 5.3 makes the circle document the access
control list, and security rules resolve every read through it. That model —
plus offline-first writes for the check-in (PRD 5.6) — is what Firestore is
genuinely good at, and it removes an API tier from a solo part-time build.

The reason to reconsider: it is not the stack Thomas has muscle memory for,
and security rules are their own skill.

Switching is cheap while there is no data layer, and expensive once Phase 1
lands. Raise it before Phase 1 is finished, not after.

## Commands

```bash
pnpm install       # once, after corepack enable
pnpm dev           # apps/web on localhost:5173
pnpm verify        # the full gate: lint, typecheck, test, build
pnpm test          # vitest, whole workspace
pnpm typecheck     # tsc, strict, whole repo
pnpm lint          # eslint
pnpm build         # turbo run build
```

`lint`, `typecheck` and `test` run once at the root, not per package: one
ESLint config, one tsconfig, one Vitest config over `{apps,packages}/*/src`.
Turborepo currently orchestrates `build` and `dev` only, and takes over the
rest when `functions` and `apps/console` make per-package tasks real.

## Non-negotiables that are easy to break by accident

- **No streaks, points, badges, milestones, or achievements. Ever.**
- **No red, no green-as-good, no traffic-light coding.** There is no bad score.
- **No bold text.** Weights 400 and 500 only.
- **`--zeeglas` is the person's own data. `--amber` is where another human has
  been.** Never mix them. Never use amber for a system message.
- **Sans for everything the app says; serif only for what a person wrote.**
- **No exclamation marks. No emoji in system copy. `je`, never `u`.**
- **On a missed day, say nothing.** No catch-up prompt, no visible gap.
- **Never chase.** One notification per event, maximum three categories a day.
- **No photographs of people.** No mascots, no growth metaphors.
- **Firebase Analytics stays disabled.** No third-party analytics.
- Health data is GDPR Art. 9 special category. EU regions only
  (`eur3` / `europe-west1`).

## Current state

**Phase 0 — Foundations: complete.** 90 tests, typecheck, lint and build all
green. Next up is Phase 1 (auth, accounts, onboarding, consent), which is the
first phase needing a real Firebase project and a JDK for the emulators.

What exists: the monorepo, both dictionaries, the copy-lint and brand guards,
design tokens in both themes, five primitives plus `ScaleInput`, the PWA
shell, the crisis screen, and `/styleguide`. No Firebase project is required
to run any of it.

### Decisions worth knowing before changing code

- **Dark opens always**, regardless of `prefers-color-scheme` (BRAND 3.2).
- **Dutch opens always**, regardless of browser language. Same asymmetry
  argument: a Dutch speaker who is unwell and lands in English is stuck; an
  English-speaking supporter taps once. Only a remembered, explicit choice
  moves either one.
- `--on-self` exists because light-mode `--diep-l` on `--zeeglas-l` is 4.20:1
  and fails AA. The primary button label is white in light mode.
- `resolveLocale` treats anything not clearly English as Dutch.
- Check-in dates will be keyed in `Europe/Brussels`, not UTC (Phase 2).

## Changelog

| Date | Change |
|---|---|
| 2026-08-04 | Aligned with the house stack: `apps/app` → `apps/web` (`@luwte/web`), Turborepo added, `pnpm verify` gate. Clarified that the JRE is for the Firebase emulators only — no JVM in build or runtime. Recorded the Firestore-vs-Postgres divergence (D11 in PLAN.md) as reversible until Phase 1 lands. Pushed `phase-0-foundations` to GitHub. |
| 2026-08-04 | Phase 0 complete. Monorepo, i18n (nl/en), copy-lint, design tokens, primitives, ScaleInput, PWA shell, crisis screen, styleguide. 90 tests green. Found and fixed a light-mode AA contrast failure on the primary button; added `contrast.test.ts`. Logged a known issue: amber-as-text in light mode is 3.82:1, to resolve when the feed lands in Phase 6 (see docs/BRAND-QA.md). |
| 2026-08-04 | Repo created. PLAN.md roadmap approved: web-first v1, family pilot, clinician console in scope, Dutch + English. Phase 0 plan written and started. |
