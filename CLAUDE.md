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
- [docs/HOW-IT-WORKS.md](docs/HOW-IT-WORKS.md) — the whole system in plain language: roles,
  user stories, pages, data, permissions, architecture. Keep it current when
  behaviour changes; it is the document a non-engineer reads.

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
needs a JRE regardless of the codebase language. JDK 21 is installed at
`C:\Program Files\Microsoft\jdk-21.0.12.8-hotspot`.

The other Novel repos never need this because they keep data in Postgres and
use Firebase only for auth and FCM.

**Always start the emulators with `pnpm emulators`, never `firebase
emulators:start`.** Java's NIO selector needs an AF_UNIX socket in the system
temp directory, and on this machine AF_UNIX `connect` inside
`%LOCALAPPDATA%\Temp` fails with "Invalid argument" — `bind` succeeds,
`connect` does not — so the emulator dies with "failed to create a child
event loop". `scripts/emulators.mjs` redirects the socket to a repo-local
`.emulator-tmp/`. Not a JDK version issue: 17 and 21 fail identically and
both work once redirected.

Note the `TEMP` seen inside Claude Code's shell is the 8.3 short form
(`C:\Users\THOMAS~1\...`) while the real user variable is the long path. Both
fail here, so the wrapper is needed either way.

### Firestore, decided 2026-08-04 — do not relitigate

The other Novel repos are Postgres + Express on Cloud Run, with Firebase for
auth and push only. luwte deliberately diverges and follows the PRD's
Firestore design. Thomas confirmed this after being shown the trade-off.

Why: PRD 5.3 makes the circle document the access control list, with security
rules resolving every read through it, and PRD 5.6 needs offline-first writes
for the check-in. Firestore is genuinely good at both, and it removes an API
tier from a solo part-time build.

The cost is real and accepted: security rules are their own skill, and this
is not the stack with the most muscle memory behind it.

### Firebase projects

| Alias | Project ID | Use |
|---|---|---|
| — | `demo-luwte` | **local development.** Not a real project; emulator-only by the `demo-` prefix. |
| `dev` | `luwte-dev` | deployed staging only. Not used by local work. |
| `prod` | `luwte-prod` | real family data. Blaze enabled. |

Two projects, not one, because developing against the database holding a real
person's health records is not acceptable. `firebase use dev` is the default;
switch deliberately, never casually.

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

**Phases 0 to 4 complete — Milestone A reached.** 238 unit tests plus 33
security-rules tests. `pnpm verify` green, CI green.

The product now produces the thing that changes an appointment: a chart with
medication changes as vertical rules, adherence as a count, and the person's
own diary lines, printable to A4. Next is Phase 5 (calendar and suggestions),
but the PRD's own advice is to pause here and use it.

What exists: the monorepo, both dictionaries, the copy-lint and brand guards,
design tokens in both themes, seven primitives plus `ScaleInput`, the PWA
shell, the crisis screen, `/styleguide`, the whole account flow (sign-in,
onboarding, GDPR Art. 9 consent), and **the daily check-in** — six questions,
a diary line, the weekly akathisia screen, and the hopelessness path to the
crisis screen.

Phase 0 needs no Firebase project. Phase 1 onwards needs `pnpm emulators`.

### Local development touches no Firebase project at all

The dev config uses the project id **`demo-luwte`**. Firebase treats any
`demo-` prefixed id as emulator-only: the SDKs and the emulator suite both
refuse to contact live Google services for it. A missing or mistyped
`VITE_USE_EMULATORS` therefore fails loudly instead of silently writing to a
database holding a real person's health records.

Consequence worth knowing: **clone the repo, `pnpm emulators`, `pnpm dev`, and
everything works.** No Firebase project, no login, no billing.

`luwte-dev` is now only useful as a deployed staging target — somewhere to try
a real build that is not the project holding real family data. It is free on
Spark and nothing breaks if it is deleted; local work does not use it.

### Nothing in development needs billing. Keep it that way.

The emulator suite covers auth, firestore, functions, pubsub, hosting and the
UI — all local, all free. The app makes **no callable function calls and uses
no Cloud Storage**, so there is no deployed service it depends on.

The report is printed by the browser rather than rendered by a Cloud Function
(D16), which removed the last thing that would have required Blaze on dev.
Before adding anything that needs billing, check whether it can be done on the
device instead — for Article 9 data that is usually the better answer anyway.

### Cloud Functions, and why Blaze is not needed to build them

`functions/` holds `sendCheckinReminder` (PRD 5.4). It is **written, bundled
and verified loading in the emulator, but never deployed** — Thomas decided
on 2026-08-04 not to put Blaze on `luwte-dev`.

**The Functions emulator does not need billing.** Blaze is only required to
deploy. So functions are developed and exercised locally as normal; the only
thing missing is a live schedule, which no amount of local work would prove
anyway.

`@luwte/core` is bundled into the function with esbuild rather than resolved
as a workspace dependency, because pnpm symlinks do not survive the deploy
upload. `functions/lib/` is generated — never edit it, never commit it.

**The decision of whom to disturb lives in `packages/core/src/reminders.ts`,
not in the function.** It is a pure function with 17 tests. The Cloud Function
is plumbing around it. `remindedOn` is what makes "never chase" true rather
than aspirational: without it an hourly job would fire every hour until
midnight.

### Verified against the emulators, 2026-08-04

- Auth holds `email` and auth machinery only — no `displayName`, no
  `photoUrl`, no custom claims. PRD 5.5 option 1 holds in practice.
- The consent record stores version, grants, locale, `grantedAt` and a null
  `withdrawnAt`, keyed by version so re-consenting to the same version
  cannot silently duplicate.
- Nothing is pre-ticked on the consent screen and the action stays disabled
  until both required items are granted.

### Decisions worth knowing before changing code

- **Dark opens always**, regardless of `prefers-color-scheme` (BRAND 3.2).
- **Dutch opens always**, regardless of browser language. Same asymmetry
  argument: a Dutch speaker who is unwell and lands in English is stuck; an
  English-speaking supporter taps once. Only a remembered, explicit choice
  moves either one.
- `--on-self` exists because light-mode `--diep-l` on `--zeeglas-l` is 4.20:1
  and fails AA. The primary button label is white in light mode.
- `resolveLocale` treats anything not clearly English as Dutch.
- **Check-in dates are keyed in the patient's timezone, not UTC.**
  `packages/core/src/dates.ts`, tested across both DST transitions and the
  ISO week-year boundary. Never use `toISOString().slice(0,10)` for a date
  key — it is UTC and puts a 23:30 Brussels entry on the wrong day.
- The **midnight lock is enforced in the client, not in the rules.** Security
  rules have no timezone support, so they cannot know what "today in
  Brussels" is. The rules enforce the boundary that matters — nobody else can
  read or write — plus `document id == date field`, which is what makes an
  offline write idempotent when it syncs twice.
- The **weekly extra is anchored to the weekday the account was created.**
  If it is missed, it returns next week. The app never chases.
- `sleepHours` is the one check-in field shown as a number. It is a quantity,
  not a rating; BRAND's "never a visible number" governs the subjective
  scales, where a number invites scoring yourself.
- **The windline is not a score.** Unrest is not badness — a person can be
  unsettled and having a good week. Both amplitude *and* frequency follow
  unrest, because amplitude alone reads as a chart with a y-axis where bigger
  means worse. A missed day is bridged from its neighbours, never drawn as a
  gap. It animates with `requestAnimationFrame`, so a hidden tab stops it for
  free.

## Changelog

| Date | Change |
|---|---|
| 2026-08-04 | Circle access control (PRD 5.3). Reads of check-ins, weekly items, medication and doses now resolve through the circle document; writes stay self-only. 13 new rules tests cover the attacks that matter — a member widening their own access, un-revoking themselves, adding themselves to a circle, reading another member's entry, or authoring someone else's check-in. Phases reordered to 6 → 7 → 5 so the clinician overview arrives sooner. |
| 2026-08-04 | Local development moved to `demo-luwte`, a project id Firebase treats as emulator-only. The repo now needs no Firebase project to run. |
| 2026-08-04 | Phase 4 complete — **Milestone A**. Insights chart (2/6/12 weeks, medication changes as vertical rules, `--zeeglas` only, series told apart by opacity), diary archive in the serif, adherence as a count rather than a percentage, and a printable A4 report. The report renders in the browser rather than in a Cloud Function (D16), so health data never leaves the device and dev needs no billing. |
| 2026-08-04 | Phase 3 complete. Medication with a `changeLog` written from the first entry, keyed `doses` so an offline tick is idempotent, the medication screen, and optional practices as plain text with no completion state. Today now follows PRD 6.2 order: windline, check-in, medication, practices. |
| 2026-08-04 | The windline (BRAND 3.7) — unrest per day in `packages/core/src/windline.ts`, geometry in `packages/ui/src/windline/`. A missed day is bridged from its neighbours so the line never shows a gap. Both amplitude and frequency follow unrest, because amplitude alone reads as a chart with a y-axis. Now sits at the top of Today. GitHub Actions runs the full gate plus the rules matrix on every PR. |
| 2026-08-04 | Notification preferences (four categories, all individually disableable), a settings screen, and Google Calendar export via a prefilled template link — deliberately no OAuth, no calendar scopes, no stored token. `sendCheckinReminder` written and verified loading in the emulator; not deployed, since Blaze stays off `luwte-dev` by decision. |
| 2026-08-04 | Phase 2 complete, minus the reminder function (needs Blaze on dev). Europe/Brussels date logic tested across both DST transitions; check-in and weekly models, rules and rules tests; six-question check-in with diary line and weekly akathisia screen; top-of-scale hopelessness goes to the crisis screen with no notification to anyone. Walked end to end against the emulators and checked at the database. Added `docs/EMAIL-SETUP.md` for the admin-only email configuration. |
| 2026-08-04 | Phase 1 complete. Firebase client with offline persistence, security rules with 17 table-driven tests, sign-in (email link + password), four onboarding screens, GDPR Art. 9 consent, empty Today, route gate. Walked end to end against the emulators in Dutch and English. Copy-lint and the brand guard each caught a false positive in their own rules — both narrowed and given regression tests. |
| 2026-08-04 | Firestore confirmed over the house Postgres stack — settled. Created `luwte-dev` and `luwte-prod`, aliased in `.firebaserc`, `dev` active. JDK 21 installed. Diagnosed and worked around a Windows AF_UNIX failure that killed the Firestore emulator; `pnpm emulators` now wraps it. Emulators verified starting and stopping cleanly. |
| 2026-08-04 | Aligned with the house stack: `apps/app` → `apps/web` (`@luwte/web`), Turborepo added, `pnpm verify` gate. Clarified that the JRE is for the Firebase emulators only — no JVM in build or runtime. Recorded the Firestore-vs-Postgres divergence (D11 in PLAN.md) as reversible until Phase 1 lands. Pushed `phase-0-foundations` to GitHub. |
| 2026-08-04 | Phase 0 complete. Monorepo, i18n (nl/en), copy-lint, design tokens, primitives, ScaleInput, PWA shell, crisis screen, styleguide. 90 tests green. Found and fixed a light-mode AA contrast failure on the primary button; added `contrast.test.ts`. Logged a known issue: amber-as-text in light mode is 3.82:1, to resolve when the feed lands in Phase 6 (see docs/BRAND-QA.md). |
| 2026-08-04 | Repo created. PLAN.md roadmap approved: web-first v1, family pilot, clinician console in scope, Dutch + English. Phase 0 plan written and started. |
