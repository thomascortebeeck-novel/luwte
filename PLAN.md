# luwte — v1 development plan

**Date:** 2026-08-04
**Inputs:** [docs/PRD.md](docs/PRD.md) (v0.2), [docs/BRAND.md](docs/BRAND.md)
**Status:** awaiting approval

This is the roadmap. Each phase gets its own bite-sized implementation plan
(in `docs/superpowers/plans/`) when that phase starts. This document decides
scope, order, architecture, and exit criteria.

---

## 1. Decisions made 2026-08-04 — these supersede parts of the PRD

| # | Decision | Consequence |
|---|---|---|
| 1 | **Family pilot first.** Thomas's family; the brother's friends join as supporters (PRD's Supporter role already covers friends and peers). | Legal workstream at pilot scale (consent + DPIA-lite + retention policy). Architecture stays product-ready. Lawyer engaged only before any launch beyond the family. |
| 2 | **Web-first v1.** Patient + supporter app is an installable web app (PWA). The Android app moves to a post-v1 phase. *Supersedes PRD §2 "Android only in v1".* | Health Connect (PRD §6.5) is Android-only → **deferred to the Android phase; sleep is self-reported in v1** (the PRD's check-in already treats manual entry as the base case). In return: the circle works on every device including iPhones, there is no Play Store gate before the pilot, and the patient app and clinician console share one stack. |
| 3 | **Clinician console stays in v1.** The psychiatrist is proactively onboarded to the web console. | PRD build step 9 stays. Medication becomes clinician-authored once the console lands; patient-entered before that. |
| 4 | **Dutch default + full English version.** | i18n from day one. `nl-BE` is the copy source of truth (BRAND §4.2 verbatim); English mirrors the voice rules (informal, no exclamation marks, plain words, never cheerful). |

Everything else in the PRD stands unchanged: data model (§5.2), security
model (§5.3), Cloud Functions (§5.4), feature logic (§6), notification
policy (§8), phased sensing (§9), and every rule in BRAND.md.

---

## 2. v1 architecture (web)

Replaces the Android rows of PRD §5.1. Backend rows are unchanged.

| Layer | Choice | Notes |
|---|---|---|
| Patient + supporter app | React + TypeScript + Vite, PWA (`vite-plugin-pwa`) | Installable, offline app shell, mobile-first layout |
| Clinician console | Same stack, separate deploy target | Desktop-first, verified clinicians only |
| Design system | Shared package implementing BRAND.md tokens | BRAND §3.3 already provides the CSS custom properties |
| Fonts | Schibsted Grotesk + Newsreader, **self-hosted** (`@fontsource`) | No Google Fonts CDN at runtime (GDPR) |
| Data | Firebase JS SDK, Firestore with persistent local cache | Offline check-in requirement, PRD §5.6 |
| Charts / windline | Hand-rolled SVG (`d3-shape` for curves at most) | No chart library — brand rules preclude library defaults |
| Push | FCM web push via service worker | Reminder logic stays server-side per PRD §5.4. iOS caveat: §7 risks |
| Backend | Firestore `eur3`, Functions gen2 Node 20 TS `europe-west1`, Storage `europe-west1`, Scheduler, FCM, Remote Config, Secret Manager | Exactly per PRD. Firebase Analytics stays disabled |
| Monorepo | pnpm workspaces | One Firebase project, two Hosting sites (`app`, `console`) |

```
luwte/
  apps/web/         patient + supporter PWA
  apps/console/     clinician console
  packages/ui/      tokens, primitives, windline, scale input, chart
  packages/core/    types, zod schemas, Firestore paths/converters, i18n dictionaries, copy-lint
  functions/        Cloud Functions (TypeScript)
  firestore/        firestore.rules, indexes, rules tests
  docs/             PRD.md, BRAND.md, DPIA notes, per-phase plans
  firebase.json     hosting multi-site: app, console
```

---

## 3. Working agreement

- Per-phase implementation plans are written and executed task-by-task with
  tests; this roadmap never gets speculative code.
- TDD where it pays: **security rules, Cloud Functions, date/timezone
  logic, copy-lint**. UI is verified against the brand QA checklist plus a
  Playwright smoke test per screen.
- Git from Phase 0, frequent commits. Nothing is pushed to any remote
  without Thomas's explicit per-push OK. No email is ever sent by the app
  or the tooling — notification surface is push only.
- Definition of done per phase = exit criteria below + brand QA checklist
  green on every new screen.

---

## 4. Phases

### Phase 0 — Foundations *(est. 2–4 build-days)*

Empty product, everything real.

- Scaffold monorepo, tooling (pnpm, TS strict, ESLint/Prettier, Vitest), git init.
- Firebase project — Thomas creates project + Blaze billing (guided); config:
  Firestore `eur3`, defaults `europe-west1`, Analytics off, emulator suite running locally.
- Design system: both themes from BRAND §3.3 (dark default), type scale §3.4,
  spacing/radius §3.5, motion tokens §3.6, fonts self-hosted.
- Primitives: screen scaffold, button, card, hairline, 1–7 scale input (faces, no numbers).
- i18n skeleton `nl` + `en`; BRAND §4.2 library entered verbatim; English pass drafted for review.
- **Copy-lint as a test**: fails on `!` in dictionary values, emoji in system
  copy, `u`-form in Dutch, forbidden phrases (*Goed bezig*, *Fantastisch*, "oops", comparison language).
- `/styleguide` route showing tokens, type, components in both themes.
- **Crisis screen** (BRAND §4.4 copy, tel: links, offline-cached, global nav slot).
  Built first so it exists before any check-in ships — PRD §6.8: never behind more than one tap.
- `docs/BRAND-QA.md`: the per-screen checklist (two-accent rule, no red/green
  judgment, no bold, sans=system / serif=human, 400–600ms fade-and-settle, no
  spinners, empty space, copy rules).

**Exit:** emulators up; styleguide correct in dark + light; copy-lint and unit tests run; crisis screen works offline.

### Phase 1 — Auth, accounts, onboarding, consent *(2–3 days)*

- Email-link sign-in (preferred, PRD §7) + password fallback. Auth stores the
  email only; all identifying and health data lives in Firestore under the
  pseudonymous uid (PRD §5.5 option 1).
- `users/{uid}`, `patients/{uid}`, roles; onboarding screens 1–3 with BRAND copy
  (*Dit is geen dokter…*), reminder-hour picker.
- Consent screen: explicit, granular, GDPR Art. 9 — logged with timestamp and
  version to a `consents` subcollection; withdrawable from Data & privacy.
- Security rules skeleton + first table-driven rules tests (self-only access).

**Exit:** sign up → onboarding → consent → empty Today, in nl and en, offline-tolerant.

### Phase 2 — Daily check-in *(3–4 days)*

The core loop, exactly per PRD §6.1.

- Six one-question screens, 1–7 faces/slider, never a visible number, large
  type, swipe or tap; optional diary line (Newsreader); *Bewaard.* confirmation.
- Keyed by Europe/Brussels local date; one per day; editable until midnight,
  then locked; back-fill yesterday only, reachable from Insights only.
- Weekly extras inline (restlessness, stiffness, sedation, hopelessness);
  week anchor = weekday of first check-in.
- **Hopelessness at top of scale → crisis screen shown once, calmly. No
  notification to anyone.**
- Offline: queue the write, show BRAND offline copy, sync silently. Never block on network.
- `sendCheckinReminder` function (hourly scheduler; matches `checkinHour`; sends
  once; **never chases**). Push permission asked gently after the first
  check-in — not at onboarding. Notification settings with per-category toggles from day one.

**Exit:** airplane-mode check-in completes and syncs later; reminder fires once in emulator test; missed day produces zero side effects; checkins rules row tested.

### Phase 3 — Today + medication + windline *(3–4 days)*

- Today: medication → activities → optional practices (PRD §6.2 ordering).
  Completed items grey in place — no motion, no reward mechanics.
- Medication patient-entered for now, **with `changeLog` from the first edit**
  (so chart markers exist before the console does). `doses` records;
  `sendDoseReminder` (15-min scheduler).
- Optional practices: offered, never tracked, no completion state.
- **Windline** (BRAND §3.7): SVG from last 14 days of mood+sleep+activity;
  ~0.2 Hz drift; static under `prefers-reduced-motion`; described to screen
  readers as *"Overzicht van de laatste veertien dagen."*

**Exit:** the app is usable alone, day one (PRD §13 step 4).

### Phase 4 — Insights, diary, PDF — **Milestone A** *(3–5 days)*

- One chart, 2/6/12-week window: mood, energy, flatness, sleep (steps absent
  until the Android phase), **medication changes as vertical rules** from
  `changeLog`. Soft curves, `--zeeglas` only, tabular figures, no trends/percentages.
- Insights caveat copy; diary archive (serif, by date).
- `generateReport`: headless-Chromium render in a gen2 function → 2-page A4
  (chart, adherence %, side-effect trend, diary lines in serif) → Storage →
  signed URL, 15-minute expiry.
- GDPR functions: `exportMyData` (full JSON), `deleteMyData` (30-day grace via
  `deletionRequestedAt` + scheduled purge). Data & privacy screen complete.

**Exit: the PDF that changes an appointment exists.** Real daily use by the
first user can start here — PRD §13 names steps 1–5 a legitimate pause point.

> **Reordered 2026-08-04.** Thomas asked for the psychiatrist to see each
> patient's overview *inside the app* rather than only on paper. That is the
> clinician console, and it cannot exist without the circle that decides who
> may see what. So the order is now **6 → 7 → 5**: circle, then console, then
> calendar. The calendar is not cut, only later.

### Phase 5 — Calendar + suggestions *(2–3 days)*

- Week view, current day centred; activity CRUD; recurrence limited to
  daily/weekly/weekdays (stored as rrule string, only these three parsed).
- Accepted activities flow into Today; completion → optional two-tap
  pleasure/mastery → `completions`.
- Suggestions tray: quiet, separate, **never directly on the calendar**;
  declining is silent. (Fully live once the circle exists.)

**Exit:** planned activity → Today → completion with ratings recorded.

### Phase 6 — Circle, permissions, feed, kudos *(4–5 days)*

- Invite codes: 7-day, single-use, role + five permission toggles (default:
  feed + calendar), share link; `onInviteRedeem`.
- Supporter navigation (S1–S6) in the same web app.
- Permissions per member shown as **plain sentences**; revocation immediate
  (`revokeCircleMember` purges access + push subscriptions).
- Feed scoped to one patient; posts, reactions (heart/clap/proud — warm-only),
  comments. Everything human renders `--amber`, comments in Newsreader.
- `onPostCreate` / `onReactionCreate` notifications; policy enforced: max
  three categories/day, one per event, all individually disableable.

**Exit:** family and the brother's friends join via invite on their own phones;
full rules matrix green, including **"nobody can widen their own access"**.

### Phase 7 — Clinician console *(3–4 days)*

- `apps/console`: verified-clinician gate via custom claim, set manually by
  admin script (PRD: "checked manually at first").
- Patient list (granted only); patient detail = shared chart + adherence +
  side-effect trend + diary notes; PDF download.
- Medication editor: name, dose, times, plain-language purpose line; **every
  edit appends to `changeLog`**; rules protect clinician-authored fields.

**Exit:** the psychiatrist can review trends and edit medication; a dose change
appears as a vertical rule in the patient's chart.

### Phase 8 — Hardening + pilot — **Milestone B** *(3–4 days)*

- Full PRD §5.3 rules matrix as table-driven emulator tests.
- Accessibility pass: WCAG AA (check `--nevel` on `--diep`), 48px targets,
  keyboard + screen reader, 200% zoom, reduced motion (BRAND §5).
- Metrics scheduled function → private `metrics` collection (PRD §12 measures;
  no third-party analytics).
- Error-handling sweep with BRAND error voice; PII-stripped minimal error logging.
- `docs/`: DPIA-lite, retention policy, auth-residency note (decision D1).
- Deploy to Firebase Hosting (luwte.be or `*.web.app` for the pilot); PWA
  install walked through on the family's actual devices.

**Exit: v1 live. Then the PRD's own rule applies — stop. Two months of real
use before building anything else.**

### Phase A — after the pilot *(not scheduled)*

Android app (Kotlin/Compose) per the original PRD, reusing the entire
backend; **Health Connect lands here** and sleep prefill becomes real. Then
PRD Phase 2 items in PRD order and under PRD constraints: supporter chat
first (§10), usage sensing (§9).

---

## 5. Technical decision log

| # | Decision |
|---|---|
| D1 | Auth residency: PRD §5.5 option 1 — Auth holds an opaque email only; pseudonymous uid; documented in DPIA notes. |
| D2 | Reminders server-side (Scheduler → FCM web push) per PRD §5.4. Revisit as local notifications in the Android phase. |
| D3 | PDF via headless Chromium in a gen2 function (1 GiB, `europe-west1`); HTML template shares the design tokens. Fallback `pdf-lib` if cold starts hurt. |
| D4 | No chart library. SVG by hand; `d3-shape` only for curve math. |
| D5 | Fonts self-hosted; no runtime requests to Google Fonts. |
| D6 | i18n: `nl-BE` source of truth; English mirrors BRAND voice rules; copy-lint enforces both. |
| D7 | App Check deferred until any launch beyond the family (web App Check = reCAPTCHA, a privacy trade-off to assess in the DPIA). Access control is carried entirely by security rules regardless. |
| D8 | No third-party error reporting in v1. Crashlytics becomes relevant in the Android phase. |
| D9 | One Firebase project; two Hosting sites; pnpm workspaces + Turborepo, matching the other Novel repos. |
| D10 | All date keys computed in Europe/Brussels; midnight-lock and week-anchor logic covered by unit tests. |
| D11 | **Firestore confirmed 2026-08-04**, rather than the house Postgres + Express stack: PRD 5.3 makes security rules the access-control design and PRD 5.6 needs offline-first writes. Settled — not to be relitigated. |
| D13 | Two Firebase projects, `luwte-dev` and `luwte-prod`. Developing against the database holding a real person's health records is not acceptable. |
| D12 | A JRE is required for the Firebase emulators only. Nothing in the build or runtime touches the JVM. |
| D14 | **Google Calendar by prefilled template link, not the Calendar API.** No OAuth consent, no calendar scopes, no stored refresh token, no new data processor, no DPIA entry. The person presses save in Google's own UI or does not. The cost is that luwte cannot read, update or remove events — which for "put this in my diary" is the whole job. Two-way sync would need its own decision. |
| D15 | **Blaze stays off `luwte-dev`** (Thomas, 2026-08-04). Functions are developed against the emulator, which needs no billing, and deployed only when there is a reason to. |
| D23 | **Medication and doses are the care team's alone**, and the permission is never offered to a supporter (Thomas, 2026-08-05). Enforced twice over: `permissionsForRole` omits the toggle from what a supporter's screen can render, and `canReadClinical` requires `role == 'clinician'` as well as the grant, so a card carrying it anyway grants nothing. What someone is prescribed is the most diagnostic thing here; a permission that cannot be given to the wrong person cannot be given to them on a bad day. |
| D24 | **A patient may always *ask* for a medication change; the prescriber approves.** "If there is a doctor assigned" is resolved per medication by `prescribedBy`, which is already on the document — rules cannot query the circle for "is there a clinician somewhere", and a `hasClinician` flag on the patient document would be written by the patient and therefore worthless. On a prescribed entry the patient may write `pendingChange` and nothing else. Declining delivers no message: the request stops being pending and the conversation happens between two people. |
| D21 | **Supporters suggest; they never write the calendar directly.** Confirmed by Thomas 2026-08-05 after he asked for the calendar to be fillable by family and the doctor. Keeping PRD 6.3 intact means a suggestion always waits in the tray, and the friction that caused — having to accept a walk onto a day just to record having done it — is solved instead by a **"dit heb ik gedaan"** button in the tray, which accepts and completes in one tap. The calendar stays for planning ahead rather than being fed after the fact. |
| D22 | **A completed activity auto-posts; a dose never does.** The decision lives in `shouldPostCompletion`, which refuses anything without an activity id, so "small things like pill completions are not shared" cannot be broken by a caller forgetting. On by default with a one-tap off switch — auto-sharing health-adjacent activity to family is exactly the kind of thing that must remain the person's to stop. |
| D19 | **The clinician console is routes in `apps/web`, not a separate `apps/console`.** Supersedes the Phase 7 line above. A clinician is a circle member like any other: the rules already resolve their reads, they sign in with the same auth, and one person can be a supporter to one patient and a clinician to another — which two apps make awkward and one app makes free. The overview is the *same component* the patient sees, so the picture cannot drift between the two people discussing it. Reversible: the components are the deliverable and the shell is not. |
| D20 | **A verified clinician is a document in `clinicians/{uid}` that no client may write, not a custom claim.** Auth stays an email and auth machinery only (PRD 5.5 option 1, D1), and a claim would need a token refresh before a newly verified clinician saw the console. Verification grants no data access on its own — every read still resolves through the circle — so it is one of three conditions for prescribing, not a key. |
| D17 | **Invites: `get` is open to any signed-in person, `list` is the issuer's alone.** Knowing a code is the capability, so naming one has to work — that is what a shared link is. But a single `allow read` also permits listing the collection, and any signed-in person could then enumerate every open invite and redeem a stranger's. Found while building the circle screens, when the screen needed to list the patient's own invites. Five rules tests cover it, including the unfiltered listing the patient themselves is refused. |
| D18 | **A revoked circle member is restored by the patient, not by redeeming again.** Redemption is a `create` and the document already exists, so a revoked person cannot rejoin themselves — which is the correct fence, but it means revoking by accident would lock someone out permanently. The circle screen therefore offers "weer toelaten". Deleting the card instead was rejected: who once had access is worth keeping. |
| D16 | **The report is rendered in the browser, not by `generateReport`.** Supersedes PRD 5.4 for that one function. The health data never leaves the device: no upload, no server-side render, no PDF in a bucket, no signed URL to leak — a materially better position for Article 9 data, and it removes the last reason dev would need billing. The cost: the person passes through the browser's print dialog, and the clinician console cannot generate it server-side later. Reversible; the data it reads is unchanged. |

---

## 6. Risks and human tasks

**Thomas's tasks (nobody else can do these):**
1. Create the Firebase project + Blaze billing (Phase 0, guided).
2. The two conversations that gate everything: the brother's consent and
   interest — before real use at Milestone A — and the psychiatrist's
   willingness to use the console — **before** Phase 7 effort is spent.
   The Milestone A PDF is the natural artifact to open that conversation with.
3. Domain decision (luwte.be) — pilot can run on `*.web.app` meanwhile.
4. Review the English copy pass (Phase 0) — voice rules survive translation only with human judgment.

**Risks:**
- **Web push on iOS** works only for an installed PWA (16.4+). Supporters on
  iPhone may miss kudos notifications — acceptable. If the *patient* uses
  iOS it's not acceptable and we revisit; expectation is Android.
- Check-in reminders require granted notification permission; asked gently
  after the first check-in, and the app remains fully functional without.
- Date/timezone edge cases (midnight lock, week anchor, DST) — mitigated by tests (D10).
- Scope creep — the PRD's stop-rule after Milestone B is the mitigation.
- Auth residency is documented, not solved (D1) — accepted for the family pilot, revisit with the lawyer before wider launch.

---

## 7. Rough calendar

Part-time solo + Claude Code: **Milestone A ≈ 3–4 weeks** from start;
**Milestone B (v1 live) ≈ 7–9 weeks**. Full-time roughly halves it. The
exit criteria are the real clock, not these numbers.

---

## 8. Next step

On approval: write the Phase 0 implementation plan (bite-sized tasks) and
start executing. First concrete session: monorepo scaffold + design tokens +
crisis screen, all runnable locally against emulators before any Firebase
project exists.
