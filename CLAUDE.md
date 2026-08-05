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
apps/web/         the whole app — patient, supporter and clinician
packages/core/    types, i18n dictionaries, copy-lint — no React, no Firebase
packages/ui/      design tokens, primitives, windline, chart — no Firebase
functions/        Cloud Functions gen2 — written, never deployed
firestore/        rules, indexes, rules tests
docs/             PRD, BRAND, QA checklist, plain-language guide, per-phase plans
scripts/          emulators.mjs (the Windows AF_UNIX wrapper), make-admin.mjs
```

**There is no `apps/console`.** PLAN.md called for one; the console is routes
under `/console` in `apps/web` instead (D19). See "The console lives in
`apps/web`" below before creating a second app.

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

**If a run is killed, its Java grandchildren can survive and hold the ports.**
The wrapper kills the whole tree on exit, and does it with `spawnSync` — an
async spawn inside a `process.on('exit')` handler is scheduled and then never
runs, which is how the emulators kept surviving a normal stop.

**A force-kill of the wrapper still orphans them**, and no handler code can
fix that: `taskkill /F` on the parent runs no handlers at all. `Ctrl-C` and
`emulators:exec` clean up properly; killing the process from outside does
not. That is why the wrapper now names the pid holding each port on startup
rather than letting Firebase say only "port taken". It kills nothing itself —
a held port may be an emulator someone is running on purpose.

Two things that waste time if you forget them: **Java is not on PATH** in this
shell, so prefix with
`export PATH="/c/Program Files/Microsoft/jdk-21.0.12.8-hotspot/bin:$PATH"`.
And **piping `pnpm emulators` into `head`** closes the pipe early, kills the
wrapper before its cleanup runs, and orphans Java — redirect to a file and
grep that instead.

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

**Local work uses none of the real projects.** Developing against the database
holding a real person's health records is not acceptable, and `demo-luwte`
makes it impossible rather than merely discouraged.

## Commands

```bash
pnpm install       # once, after corepack enable
pnpm emulators     # Firebase emulators — run alongside pnpm dev
pnpm dev           # apps/web on localhost:5173
pnpm verify        # the full gate: lint, typecheck, test, build
pnpm test:rules    # the access-control matrix, against a real emulator
pnpm test          # vitest, whole workspace
pnpm typecheck     # tsc, strict, whole repo
pnpm lint          # eslint
pnpm build         # turbo run build

node scripts/make-admin.mjs <uid>   # the one thing no screen can do

```

`pnpm test:rules` is **not** part of `pnpm verify`, because it needs Java and
an emulator. CI runs both. Run it yourself after touching
`firestore/firestore.rules` — that file is the access-control design, and a
mistake there is the most expensive kind in this product.

`lint`, `typecheck` and `test` run once at the root, not per package: one
ESLint config, one tsconfig, one Vitest config over `{apps,packages}/*/src`.
Turborepo orchestrates `build` and `dev` only; there is one app, so per-package
tasks would be ceremony.

## Non-negotiables that are easy to break by accident

- **No streaks, points, badges, milestones, or achievements. Ever.**
- **Reactions are warm only** — heart, applause, proud, and nothing else. The
  rules refuse any other type, so it survives the app being bypassed. Adding
  a cold one is not a feature request, it is a change to what this product is.
- **A dose is never *pushed*.** No post, no notification, no trace in the feed.
  `shouldPostCompletion` refuses anything without an activity id, so this holds
  where the decision is made rather than in every caller. A feed item for every
  pill turns adherence into a performance for the family, and that — not the
  reading — was always the harm.
- **Family and friends cannot currently see medication or doses**, whatever a
  circle document says: `canReadClinical` checks the role as well as the
  permission, and the toggle is never offered to a supporter.
  **⚠ Thomas has decided to change this** (D29, 2026-08-05) and it is **not
  built yet**, so the code still refuses. When it lands: `medication` and
  `doses` split into two permissions, still never in the feed, and widening a
  clinical permission gets a confirmation naming what it means plus a log the
  person can read back. Until then, do not quietly relax the rules — and do
  not "fix" the tests that assert the refusal.
- **⚠ A nurse role is decided and not built** (D30, 2026-08-05). A nurse reads
  medication, never prescribes (`isPrescriber` already requires
  `role == 'clinician'`), needs admin verification like a clinician, and
  **still suggests rather than places** — "a supporter may offer, never place"
  is the resolution of the central tension of this product and does not bend
  for a job title. They get "suggest a week" instead.
- **luwte may carry a conclusion somebody else is licensed to draw, and may
  never draw one.** Under EU MDR it is *intended purpose* that makes software a
  medical device. Relaying a CE-marked device's own result, attributed to it,
  is a conduit (MDCG 2019-11: storage and communication without modifying the
  data). Generating an alert, or saying "you may be relapsing", is clinical
  monitoring — Class IIa, notified body, not survivable here. No predictor, no
  interpretation in luwte's own voice, ever.
- **No red, no green-as-good, no traffic-light coding.** There is no bad score.
- **No bold text.** Weights 400 and 500 only.
- **`--zeeglas` is the person's own data. `--amber` is where another human has
  been.** Never mix them. Never use amber for a system message. **In light
  mode amber is a border colour, never a text colour** — 3.82:1 clears the
  3:1 floor for a mark and fails the 4.5:1 floor for text. `contrast.test.ts`
  asserts both halves.
- **Sans for everything the app says; serif only for what a person wrote.**
- **No exclamation marks. No emoji in system copy. `je`, never `u`.**
- **On a missed day, say nothing.** No catch-up prompt, no visible gap.
- **Never chase.** One notification per event, maximum three categories a day.
- **No photographs of people.** No mascots, no growth metaphors.
- **Firebase Analytics stays disabled.** No third-party analytics.
- Health data is GDPR Art. 9 special category. EU regions only
  (`eur3` / `europe-west1`).

## Current state

**Phases 0 to 7 complete, and 9.** A family can be invited and the
permissions changed; the psychiatrist is verified by a person and can open a
patient and change what is prescribed; the calendar takes suggestions that
never place themselves; finishing something planned shares it to the circle,
who can only answer warmly.

**382 unit tests plus 186 security-rules tests.** `pnpm verify` green.

The product produces the thing that changes an appointment: a chart with
medication changes as vertical rules, adherence as a count, and the person's
own diary lines, printable to A4.

The phases were built **0–4, 6.2, 7, 5, 6.3, 9** rather than in order, because
Thomas wanted the psychiatrist's in-app overview early and that needs the
circle, and because Phase 9 turned up two defects worth fixing before a pilot.

Every screen, by who it is for:

| For | Screens |
|---|---|
| Everyone | sign-in (email link, password, **or Google**), onboarding (**three branches — see below**), consent (Art. 9 *or* confidentiality), crisis |
| The patient | Today (windline, check-in, medication with "iets anders genomen?", activities, practices), check-in with the weekly akathisia screen and the hopelessness path, medication with "ask for a change" and "weer zelf beheren", the calendar and its suggestions tray, Overview and the diary archive, the printable report, the feed, settings (**including the light/dark switch**), the circle screens, `/dokter` to add a doctor by code **or by name** |
| A supporter | `/following` — who shares with them, their feed, their calendar, and a suggest form |
| A clinician | `/console` — the verification application when unverified, otherwise their connection code, patient list, per-patient overview, medication editor, and the approve/decline of what a patient asked for |
| An admin | `/admin` — the clinician verification queue. The **only** screen that writes `clinicians/` |
| Nobody, but useful | `/styleguide` |

**Next:** Phase 8 — hardening, the accessibility pass, GDPR export and
deletion, and the family pilot. Phase 10 is the thirteen features Thomas
asked for; the plan and its priority order are in
[docs/superpowers/plans/2026-08-05-phase-10-thirteen-features.md](docs/superpowers/plans/2026-08-05-phase-10-thirteen-features.md).
Built so far: the theme switch, Google sign-in, the actual dose taken,
hosting, the check-in redesign and real recurrence. **Still open:** the
calendar's day/week views, asking pleasure and mastery less often, the diary
prompts and breathing exercises, and the two decided-but-unbuilt items above
(D29 dose sharing, D30 the nurse role).

Nothing needs a Firebase project. `pnpm emulators` plus `pnpm dev` is the
whole setup.

### A build with no `.env.production` is a blank white screen

`pnpm build` reads `apps/web/.env.production`, which is **not in the
repository** — the values differ per project and CI supplies them. Miss it and
Vite substitutes `undefined` for every `VITE_FIREBASE_*`, **the build still
succeeds**, and Firebase throws while its modules are evaluating — before any
React error boundary exists to catch it. The deployed result is nothing at all.

For this app that is the worst failure there is: somebody opens luwte to write
down how their day went and gets a white page, with no way to tell whether it
is them, their phone, or us. Three things now stand between that and a person:

- `client.ts` names the missing variables rather than letting the SDK fail
  somewhere deep.
- `index.html` carries fallback markup **inside `#root`**, which React replaces
  the instant it mounts and which stays put when it never does — in both
  languages, with the crisis link still working. It is plain markup and not a
  script, because the CSP is `script-src 'self'` and would block one.
- The deploy workflow greps the built bundle for the project id, so a
  misconfigured deploy fails in CI instead of on somebody's phone.

`.env.development` exists and is used by `pnpm dev`, which is why this never
shows up locally.

### Deploying

`.github/workflows/deploy.yml`. **dev deploys itself when something reaches
`main`** — the merge was the human decision and this only follows it. **prod is
`workflow_dispatch` only**, with a GitHub environment that can require a
reviewer: `luwte-prod` holds one family's health records and a deploy nobody
chose is not acceptable there. That is the standing rule, not a preference.

Rules and indexes ship **with** the app and before it — better for the database
to be stricter than the app for a moment than looser. Hosting is free on Spark,
so `luwte-dev` still needs no billing.

**The hosting emulator applies no custom headers at all**, so the CSP cannot be
tested through `pnpm emulators`. It was verified by serving the real build with
the real header from a static server; `connect-src` still needs confirming
against a real deploy, because a local build talks to emulators where a
deployed one talks to googleapis.com.

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

`functions/` holds `sendCheckinReminder` (PRD 5.4) and `onPostCreate`. Both
are **written, bundled and verified loading in the emulator, but never
deployed** — Thomas decided on 2026-08-04 not to put Blaze on `luwte-dev`.

**Neither is on the critical path.** The app works with no functions at all:
the reminder is a nudge and the notification is a courtesy. Nothing a person
does depends on either firing.

**The Functions emulator does not need billing.** Blaze is only required to
deploy. So functions are developed and exercised locally as normal; the only
thing missing is a live schedule, which no amount of local work would prove
anyway.

`@luwte/core` is bundled into the function with esbuild rather than resolved
as a workspace dependency, because pnpm symlinks do not survive the deploy
upload. `functions/lib/` is generated — never edit it, never commit it.

**The decision of whom to disturb never lives in a function.** It is a pure,
tested function in core and the Cloud Function is plumbing around it —
`reminders.ts` for the daily nudge, `whoToNotify` in `feed.ts` for a post.
Follow that shape for anything new. `remindedOn` is what makes "never chase"
true rather than aspirational: without it an hourly job would fire every hour
until midnight.

For a post, **both sides must agree and the patient is asked first**: their
`feed` grant governs, and the supporter's own preference can only narrow it.

### Verified against the emulators, 2026-08-04

- Auth holds `email` and auth machinery only — no custom claims, and nothing
  clinical. PRD 5.5 option 1 holds in practice. **One qualification since
  Google sign-in landed:** a Google account's profile *does* arrive with
  `displayName` and `photoURL` attached to the Firebase user, and luwte
  **never reads either**. The name the app uses is the one typed in
  onboarding, and there are no photographs anywhere in this product. Do not
  start reading them because they happen to be there.
- The consent record stores version, grants, locale, `grantedAt` and a null
  `withdrawnAt`, keyed by version so re-consenting to the same version
  cannot silently duplicate.
- Nothing is pre-ticked on the consent screen and the action stays disabled
  until both required items are granted.

### Three people arrive at onboarding, and they need different things said

`users.role` already had the vocabulary — `patient | supporter | clinician` —
and onboarding now branches on it instead of hardcoding `patient` for everyone.
Where the answer is knowable it is **inferred, never asked**: a pending invite
carries the role the patient chose, which is a better answer than anything the
arriving person could tell us. Only someone with no invite is asked, once.

**Asking is safe because choosing grants nothing.** Verification is an admin
write to `clinicians/{uid}` that no client may touch (D20), so "I am a
clinician" changes which screens you see and never what you may read.

Two consequences that are easy to undo by accident:

- **`checkinHour` is written once, by `saveOnboarding`, for the person who was
  actually asked.** `ensureAccount` no longer seeds a default at first sign-in,
  because a default written before anyone knows who this is survives an
  onboarding that deliberately never asked. `isDueForReminder` refuses a
  candidate with no hour rather than picking one — the refusal lives there so
  no caller has to remember that a supporter is not a patient.
- **A supporter's consent is to confidentiality, not to Article 9.** They store
  no health data of their own; they are shown someone else's. The rules accept
  `essential` plus *either* `healthData` or `confidentiality`, and refuse a
  record agreeing to neither. `CONSENT_ITEMS_FOLLOWING` also carries its own
  wording for the two shared items, because the patient's text describes an
  hour this person was never asked for.

Home is not the same place for everyone: the Gate sends a supporter to
`/following` and a clinician to `/console`, and only ever from `/`.

### The circle is the access control list — read this before touching rules

PRD 5.3. Every read of patient data resolves through the reader's entry in
`patients/{pid}/circle/{uid}`. Writes stay self-only: reading how someone felt
is one thing, authoring it is another.

Two exceptions to "self-only", both deliberate and both fenced: a **verified
clinician** writes medication (below), and a **circle member** may react and
comment on a post and may create an activity as `suggested`. Those are the
only places one person authors anything about another.

**The rule that matters most: a circle member can write nothing in `circle/`
at all.** Not "cannot grant themselves more" — cannot touch the document, so
there is no field left to be clever with. A family member must never be able
to widen their own access, and during an episode the temptation is real.

The one exception is redeeming an invite, and it is fenced hard: the entry
must be for yourself, name an invite that is unused, unexpired and belongs to
this patient, and carry **exactly** the role and permissions the patient put
in it. Without that last clause a feed-only invite could be redeemed into a
card that sees everything.

PRD 5.4 puts redemption in a Cloud Function. Doing it in rules keeps the
project billing-free and the database enforces the invariant either way; a
function would additionally guarantee single use under a race, where this
relies on the client transaction. Revisit if invites become more than a family
sharing a link.

**Most of the 186 rules tests are written as the attacks someone would
actually try**, and named that way. **Add to them rather than trimming them.**
If one starts failing, the question is what broke, not whether the test is
too strict.

**On invites, `get` and `list` are split, and the split is the security.**
Naming a code is the capability — that is what a shared link is, so any
signed-in person may read an invite they can name. But a single `allow read`
also permits listing the collection, and a signed-in stranger could then
enumerate every open invite and redeem one belonging to someone else. The
invite would be genuine and every other check would pass. So `list` is the
issuer's alone, which also forces the query to filter on `patientId`. Found
while building the circle screens, when the screen needed to list the
patient's own invites (D17).

**A revoked member cannot rejoin by redeeming again**, because redemption is a
`create` and the document already exists. That is the right fence, but it
means the patient must be able to restore, or revoking by accident locks
someone out for good. Hence "weer toelaten" on the member screen (D18).

### Medication ownership — settled

**Only the care team sees medication.** `canReadClinical` requires both the
`medication` permission *and* `role == 'clinician'`, so a supporter card
carrying `medication: true` grants nothing. `permissionsForRole` never offers
the toggle to a supporter in the first place. Both halves matter: the UI stops
it being granted by accident, the rules stop it mattering if it was.

`medications/**` is writable by the patient **and** by a clinician who passes
all three of: verified by an admin, in this patient's circle with `medication`
granted, and holding `role == 'clinician'` there. Removing any one of the
three opens a hole, and there is a test for each.

`prescribedBy` carries ownership. The patient may never set it — otherwise
they could author provenance and "your doctor set this" would mean nothing —
and once it is set, only that clinician edits the line.

**The patient can always ask.** On a prescribed entry they may write
`pendingChange` and nothing else — `onlyProposes()` requires it to be the sole
changed key, so a request cannot hide a real edit. The prescriber applies or
clears it.

That is how "if a doctor is assigned, they approve" is enforced: **the answer
is `prescribedBy`**, which is already on the document. Rules cannot query the
circle for "is there a clinician somewhere", and a flag on the patient
document saying so would be written by the patient and therefore worth
nothing.

**A prescription outlives the circle entry that authorised it**, so there is a
fourth branch: when the prescriber is gone — no circle entry, or a revoked one
— the patient may clear `prescribedBy` and take the line back. Without it a
single revocation froze a line permanently, and the person locked out was its
owner. `onlyReleases()` keeps a release from carrying a dose change, so it
cannot become a way to edit a prescription nobody will ever see.

The invariant this leaves is narrower than it first reads, and worth stating
honestly: **the patient cannot disown a prescription while that clinician is
still theirs.** They can always revoke and then release — two writes, both
visible. Any stronger promise would be decoration, because the circle is theirs
to change. What actually protects provenance is `logOnlyGrows`.

**The line that must never blur:** *what you are prescribed* is a clinical
decision; *whether you took it* (`doses/**`) is always the patient's own
record. A prescribing clinician can read adherence and cannot write it.

`changeLog` may only grow. Shortening it would erase a dose change that
happened, and those changes are what draw the vertical rules on the chart.

**Verification is a decision a person makes at `/admin`** (D27), not a script
somebody runs. That moved the root of trust rather than removing it:

| Document | Written by |
|---|---|
| `admins/{uid}` | **nobody, from any client** — `scripts/make-admin.mjs`, or the Admin SDK |
| `clinicianRequests/{uid}` | the applicant, for themselves. Applying grants nothing. |
| `clinicians/{uid}` | an admin, signed with their own uid |

**`admins/` is the whole chain.** An admin cannot even make another admin —
there is a test for that, and for self-promotion, and for enumerating who the
admins are. A decided request is kept, never deleted.

**A circle card naming somebody as a clinician requires that they are one.**
`clinicianIsVerified()` gates create *and* update — without the update half,
a supporter card could be edited into a clinician one, which is the same
escalation in two writes. The patient's word decides *whose* clinician someone
is; it cannot decide *that they are one*. Anyone at all can still be a
supporter: verification gates the clinical role and nothing else.

See [docs/CLINICIAN-VERIFICATION.md](docs/CLINICIAN-VERIFICATION.md). Plain
language in [docs/HOW-IT-WORKS.md](docs/HOW-IT-WORKS.md) §3.

### How a patient and their doctor find each other

**There is no public register to search.** RIZIV/INAMI publishes a web form for
humans; there is no open dataset and no API, and healthdata.be is a
research-access platform rather than a directory. So *"search for your doctor"*
can only ever mean searching clinicians who already use luwte, and the copy
says so instead of implying a national lookup and returning nothing.

What the RIZIV number is actually for: it is what the **admin** checks at
`/admin`, and the last three digits are the competency code — which is how a
psychiatrist is distinguished from a doctor in general.

`clinicianDirectory/{code}` — **the document id is the connection code**, which
gives `get`-by-code for free. Admin-written at approval, alongside the
verification it accompanies.

**There are two ways in, and the difference is who agreed to what.** A code was
*handed over*, so entering it connects immediately — the handing over is the
consent. A name found by searching was not, so that path issues an invite
addressed to that clinician and nothing exists until they accept it in their
console. Same mechanism, one extra clause: `forUid` on the invite, checked in
`redeemable()` and again on the claim, so a stranger holding the code can
neither join nor burn it. Widening `list` to the addressee is what gives the
console its inbox without a server or a second collection.

**Doing nothing is the decline**, and there is deliberately no button for it.
The invite lapses after seven days and the person who asked is told nothing —
the same silence a declined activity and a declined medication request get. A
button reporting a refusal would turn that silence into a message.

- `get` for any signed-in person; `list` only where `listed == true`, so an
  unfiltered sweep is **refused rather than quietly filtered** (the D17 lesson
  again) and a clinician who does not want to be searchable is in nobody's
  results while their code still works.
- Kept separate from `clinicians/{uid}`, which is verification state. This one
  is a nameplate — name, discipline, practice. No contact details, no patient
  data. Widening `list` here can never widen anything else.

**The connection code needed no new write path at all.** The patient always
writes their own circle, so the code merely *names* the clinician and the
patient's write is what grants — which is also why "the doctor invites the
patient" collapses into the same flow rather than needing an inverted invite.

### The calendar and the feed — the two places another person reaches in

**A supporter may offer, never place.** They can create an activity only as
`status: 'suggested'` and in their own name; accepting, declining and editing
are the patient's. Suggestions live in their own tray and never touch the
calendar until the person says so. This is PRD 6.3 and it is the resolution of
the central tension of the product — Thomas reconfirmed it on 2026-08-05 when
asking for a family-fillable calendar (D21).

**Declining is silent by rule, not by tact.** A member cannot read a declined
activity at all, so their listing must filter on status or be refused. Nothing
to poll, nothing to infer from silence.

The friction that caused — accepting a walk onto a day just to record having
done it — is solved by **"dit heb ik gedaan"** in the tray, which accepts and
completes in one tap. The calendar is for planning ahead, not for being fed
after the fact.

**Finishing something planned auto-posts it** to whoever was granted `feed`.
`shouldPostCompletion` refuses anything without an activity id, which is what
makes "a dose never posts" true where the decision is made rather than in
every caller. On by default, one tap to turn off.

**Reactions are heart, clap and proud, checked in the rules.** Warm-only is
not a property of the buttons rendered; it survives someone writing straight
to Firestore. Comments cannot be edited after they are read.

### The console lives in `apps/web`, not `apps/console`

PLAN.md called for a separate app. It is routes under `/console` in the same
app instead (D19), because a clinician is a circle member like any other: the
rules already resolve their reads correctly, they sign in with the same auth,
and a person can be a supporter to one patient and a clinician to another. A
second Vite app would have duplicated the shell to express a distinction the
data model does not make.

The console reuses `PatientOverview`, the same component the person sees on
their own Overview. That is deliberate: at an appointment both are looking at
one picture, and two implementations would drift.

**A collection group query is how a clinician finds their patients**, and it
needs `memberUid` on the circle document, because **inside a collection group
match the document-id wildcard is null** — `isSelf(memberUid)` there fails the
whole rule with a null value error. `resource.data` is available; the path
segments after `{path=**}` are not.

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
- **The daily check-in is three scales and one number, on the circumplex.**
  Valence (`mood`) and arousal (`arousal`) span momentary affect, which is why
  `energy` and `anxiety` are gone: both were arousal, differing only in
  valence, so asking all three was the same question three ways. `sleepRested`
  went with them — largely absorbed by the two axes, and not something a watch
  can supply either, since consumer sleep staging validates weakly against
  polysomnography. **`flatness` is never folded in**: it is the *absence* of a
  response rather than a position on the circumplex, and it is what
  antipsychotics blunt. Before adding a daily item, say which existing one it
  is a rotation of.
- **`arousal` is bipolar and no other scale is**, so `CHECKIN_STEPS` carries
  `lowKey`/`highKey` per question. "weinig / veel" would ask somebody to rate
  feeling slowed down as a small amount of restlessness.
- **Recurrence is a real RFC 5545 subset** (`packages/core/src/model/recurrence.ts`):
  `FREQ` daily/weekly/monthly/yearly, `INTERVAL`, `BYDAY`, `UNTIL`. **`COUNT`
  is deliberately absent** — "ten times" cannot be answered by looking at one
  day, so it would make the predicate either expensive or wrong, and a
  recurrence that quietly shows an eleventh time is worse than one that cannot
  be expressed. **Anything unparseable means a single day**, never a guess. A
  month with no 31st is skipped rather than rolled forward, and week parity
  counts from the start's ISO week so a fortnightly rule survives the new year.
- **What was actually taken lives on `doses/`**, which is the person's own
  record in both directions: a prescribing clinician reads it — that is the
  fact they came for — and can never write it. Free text, because "de helft"
  and "150 mg" are both real answers. Offered only on a dose already ticked,
  so taking medication stays one tap.
- **The windline is not a score.** Unrest is not badness — a person can be
  unsettled and having a good week. It follows arousal **modulated by how
  unpleasant the day was**, not arousal alone: elation and agitation are both
  activated, and following the old single anxiety item drew the same restless
  line for a day spent busy and delighted. Both amplitude *and* frequency
  follow unrest, because amplitude alone reads as a chart with a y-axis where
  bigger means worse. A missed day is bridged from its neighbours, never drawn
  as a gap. It animates with `requestAnimationFrame`, so a hidden tab stops it
  for free.

## Changelog

| Date | Change |
|---|---|
| 2026-08-05 | **Real recurrence.** The field was already an rrule string, deliberately, but only three exact values were ever parsed — so a fortnightly appointment or a monthly depot injection could not be written down at all. Now a genuine RFC 5545 subset. `COUNT` is refused on purpose: it cannot be answered from one day. The compatibility property has its own tests — the three previously-storable rules still mean exactly what they meant. One test failed on the first run and **the test was what was wrong**: 2026-12-30 is 21 weeks after the fixture start, which is odd. 26 more unit tests (382). |
| 2026-08-05 | **Two decisions recorded that this file previously stated as absolute** (D29, D30). Thomas decided family may be granted medication and dose access, split into two permissions and never in the feed; and that a nurse role reads medication, never prescribes, needs verification, and still *suggests* rather than places. **Neither is built** — the code still refuses — so the non-negotiables above now say "cannot currently" with the decision beside them, rather than "never". Also recorded the MDR line for wearable data: luwte may carry a conclusion somebody else is licensed to draw, and may never draw one. |
| 2026-08-05 | **The daily check-in goes from six items to four**, before the pilot writes data in the old shape — afterwards it is a migration of real health records rather than an edit. The circumplex model says valence and arousal span momentary affect: `energy` and `anxiety` were both arousal differing only in valence, which is why answering all three felt like the same question three ways, and `sleepRested` is largely absorbed by the pair. `flatness` stays separate on purpose — it is the absence of a response, not a point on the circumplex, and it is what antipsychotics blunt. Fixing the windline came with it: it followed the single anxiety item, so a day spent busy and *delighted* drew the same restless line as one spent agitated. It now follows arousal modulated by unpleasantness, which is the actual high-arousal/unpleasant corner. `arousal` needed per-question scale ends, since "weinig / veel" would ask somebody to rate feeling slowed down as a small amount of restlessness. |
| 2026-08-05 | The pilot's small things: the **light-theme switch** (the palette, persistence and contrast floors had existed since Phase 0 — only the switch in Settings was missing), **Google sign-in** beside email with the disclosure stated on the screen, and **what was actually taken** on a dose. That last is the question a tick cannot answer, and it reaches the printable A4 as the days something different was taken. Setting up **Firebase Hosting** found that `pnpm build` with no `.env.production` ships a **blank white screen** — the build succeeds and Firebase throws while its modules evaluate, before any error boundary exists. Fixed with fallback markup inside `#root` (plain markup, because the new CSP is `script-src 'self'`), named variables in the failure, and a CI step that greps the built bundle for the project id. |
| 2026-08-05 | **Phase 9 complete** — P9.5 search by name, and P9.4 addressed invites underneath it. The two ways in differ in who agreed to what: a code was *handed over*, so it connects; a name was *found*, so it asks. `forUid` is the whole of it — one clause in `redeemable()`, one on the claim, and `list` widened to the addressee, which gives the console an inbox with no server and no second collection. Doing nothing is the decline and there is no button for it. Walked over the wire as three people: a stranger holding the code can neither join (403) nor burn it (403), an unverified doctor is refused (403) and the same doctor accepted once approved (200). Two defects found in `readMedicationMarkers` while wiring adoption into it: every changeLog entry drew a vertical rule, so a release printed a raw uid onto the A4 a psychiatrist reads — ownership changes are now logged and never drawn; and the marker date used `toISOString().slice(0, 10)`, the UTC antipattern this file warns about, putting a 23:30 Brussels change on the wrong day. 11 more rules tests (182), 11 more unit tests (347). |
| 2026-08-05 | P9.4 — **a doctor hands over a code and the person is connected.** The research finding that shaped it: there is no public register to search — RIZIV publishes a web form, not an API — so the directory can only ever cover clinicians who already use luwte, and the copy says that rather than implying a national lookup. `clinicianDirectory/{code}` uses the code as the document id, so `get`-by-code is free and a doctor who does not want to be listed still has a working code; `list` is restricted to `listed == true`, so an unfiltered sweep is refused rather than filtered. **It needed no new write path**: the patient always writes their own circle, so the code names the clinician and the patient's write grants — which is also why "the doctor invites the patient" collapses into this same flow. 8 more rules tests (171). Walked as three people: applied, approved, code issued, wrong code refused plainly, right code confirmed and connected. |
| 2026-08-05 | P9.3 — **verification of a clinician is now a decision a person makes at `/admin`** (Thomas, D27), not a script somebody runs. A clinician applies with their name, discipline and RIZIV number; an admin checks it against the register and approves. That moved the root of trust down one level rather than removing it: `admins/` is written only with the Admin SDK, and an admin cannot even make another admin. Also the clamp Thomas approved: **a circle card naming somebody as a clinician requires that they are one**, on create *and* update, since without the update half a supporter card could be promoted in a second write. Anyone can still be a supporter — verification gates the clinical role only. `scripts/make-admin.mjs` refuses any project id not starting with `demo-`. 18 more rules tests (163), 8 more unit tests (336). Walked it as three people: applied, approved, and confirmed 403 → 200 on naming her as clinician either side of the decision. |
| 2026-08-05 | P9.2 — onboarding branches on who arrived, so a supporter is no longer told "dit is een schriftje dat onthoudt wat jij vergeet" and asked what hour to remind him to check in. Inferred from a pending invite where possible, asked once otherwise; choosing grants nothing, because verification is an admin write. Walking it caught three things tests did not: the shared consent items still described "het uur van je herinnering" to someone never asked for one; the security rules refused a supporter's consent record outright, because they hardcoded `healthData == true`; and `ensureAccount` seeded a default `checkinHour` at first sign-in, so the nudge would have survived anyway — with `functions/` defaulting an absent hour to 9am, moving the bug rather than fixing it. All three fixed, and the refusal now lives in `isDueForReminder`. 2 more rules tests (145), 1 more unit test (332). |
| 2026-08-05 | Phase 9 planned, and its first defect fixed. **Revoking a prescriber froze their prescriptions permanently** — proven against the emulator before it was believed: the patient was refused an edit and refused a release, and the revoked doctor could not even read the document their patient's `pendingChange` was addressed to. A fourth update branch lets the patient take a line back once the prescriber is gone, and `onlyReleases()` stops that release carrying a dose change. An existing test broke and was right to: it asserted an invariant stronger than the system can deliver, using a state the rules cannot produce. Replaced with the real one — no disowning while the clinician is *still theirs* — plus a test for the two-write path, so the weakening is recorded rather than hidden. 10 more rules tests (143). |
| 2026-08-05 | CLAUDE.md audited against the repo. Corrected the two places that said `apps/console` — it does not exist and the console is routes in `apps/web` (D19), which a future session would otherwise have built wrong. Replaced the stale "what exists" paragraph with a table by role, and added the calendar and feed sections, which existed only in the changelog. **Fixed a live AA failure found in the audit:** a chosen reaction drew its label in `--human`, and light-mode amber on the background is 3.82:1. BRAND-QA had predicted exactly this "when the feed lands" and named the fix — the label is `--text` and the amber is the border. `contrast.test.ts` now asserts both floors, so amber text fails the suite rather than shipping. |
| 2026-08-05 | Medication tightened to the care team, and the patient given a way to ask. Family and friends are never offered the `medication` toggle and are refused the read even when a card carries it — `canReadClinical` checks the role as well as the permission. On a prescribed entry the patient may write `pendingChange` and nothing else; the prescriber approves, which applies exactly what was asked and logs it, or clears it, which says nothing. "If a doctor is assigned they approve" resolves to `prescribedBy`, already on the document, because rules cannot query the circle and a patient-written flag would be worthless. 14 more rules tests (133). Caught in walking it: approving diffed a partial proposal against the whole medication and wrote three phantom log entries per approval — the log draws the chart's vertical rules, so that mattered. |
| 2026-08-05 | The feed (PRD 6.4). Finishing a planned activity auto-posts it for whoever was granted `feed`; **a dose never posts**, enforced in `shouldPostCompletion` rather than left to each caller. Reactions are heart/clap/proud and the rules refuse anything else, so warm-only survives a client writing straight to Firestore. Comments cannot be edited after they are read. A supporter side (`/following`) shows who shares with them, their feed, and their calendar with a suggest form that says plainly it is an offer. `onPostCreate` written and loading in the emulator, not deployed; whom to notify is a pure tested function in core, and both the patient's grant and the supporter's own preference must agree. Sharing is on by default with a one-tap off switch. 14 more rules tests (119). Thomas confirmed suggest-then-accept stays — the calendar is not directly writable by supporters (D21). |
| 2026-08-04 | Phase 5 — the calendar. A week with today in the middle, activities with daily/weekly/weekday recurrence expanded on the device, a separate suggestions tray, and the optional two-tap pleasure/mastery question after ticking something off. **A supporter may suggest and nothing else** — not place, not accept their own suggestion, not edit. And **declining is silent by rule, not by tact**: a member cannot read a declined activity at all, so their listing must filter on status or be refused. 17 more rules tests (105). Verified over the wire: suggest 200, place directly 403, accept own suggestion 403, read after decline 403, unfiltered listing 403 — while the patient keeps the full record of what was offered. |
| 2026-08-04 | Phase 7 — the clinician console, as routes in `apps/web` rather than a separate app (D19). Patient list from a collection group query, per-patient overview reusing the same `PatientOverview` component the patient sees, and the medication editor. Medication ownership settled: `prescribedBy`, a verified-clinician document nobody can write from a client (D20, [docs/CLINICIAN-VERIFICATION.md](docs/CLINICIAN-VERIFICATION.md)), and a `changeLog` that may only grow. 24 more rules tests (88). Walked end to end: a verified psychiatrist prescribed, changed a dose, and the change appeared as a vertical rule on the patient's own chart. Confirmed over the wire that the patient cannot edit or disown a prescription, that a clinician cannot erase the log or tick a dose, and that self-verification is refused. |
| 2026-08-04 | Phase 6.2 — the circle screens. Invite with the permissions chosen up front, per-person permissions as the sentences themselves, revoke and restore, and a join flow that holds the code across sign-in and onboarding so a link works for someone without an account. **Found and fixed a real hole while building it:** `allow read` on invites permitted listing the collection, so any signed-in stranger could enumerate every open invite and redeem one belonging to someone else. Split into `get` (anyone who can name the code) and `list` (the issuer only). Five more rules tests. Walked end to end against the emulators as two people, and confirmed over the wire that a redeemer cannot widen their own card, read what they were not granted, enumerate invites, or un-revoke themselves — all four refused with 403. `.firebaserc` gained the `demo-luwte` hosting target, without which `pnpm emulators` did not start at all. |
| 2026-08-04 | Invite redemption fenced against privilege escalation: a redeemed circle entry must carry exactly the role and permissions the invite held. 13 more rules tests (59 total) covering escalation, self-promotion to clinician, expired and already-claimed invites, forged invites, and arriving pre-revoked to stay hidden. Added [docs/HOW-IT-WORKS.md](docs/HOW-IT-WORKS.md), the plain-language description of the whole system, which also records that medication ownership must move to the clinician when the console lands. |
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
