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

## Repository

```
apps/app/         patient + supporter PWA (React, Vite)
apps/console/     clinician console (from Phase 7)
packages/core/    types, i18n dictionaries, copy-lint — no React, no Firebase
packages/ui/      design tokens, primitives, windline, chart — no Firebase
functions/        Cloud Functions (from Phase 1)
firestore/        rules, indexes, rules tests
docs/             PRD, BRAND, QA checklist, per-phase plans
```

Remote: `https://github.com/thomascortebeeck-novel/luwte.git`

## Commands

```bash
pnpm install       # once
pnpm dev           # apps/app on localhost
pnpm test          # vitest, whole workspace
pnpm typecheck     # tsc across all packages
pnpm lint          # eslint
pnpm build         # production build of apps/app
```

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

**Phase 0 — Foundations.** In progress.

## Changelog

| Date | Change |
|---|---|
| 2026-08-04 | Repo created. PLAN.md roadmap approved: web-first v1, family pilot, clinician console in scope, Dutch + English. Phase 0 plan written and started. |
