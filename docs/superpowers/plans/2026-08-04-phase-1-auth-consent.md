# luwte Phase 1 — Auth, accounts, onboarding, consent

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans.

**Goal:** A person can create an account, be told what luwte is, choose when
they are reminded, give explicit and granular consent, and land on an empty
Today — in Dutch or English, and with their data readable by nobody but them.

**Architecture:** Firebase Auth holds an email and nothing else. Everything
identifying or clinical lives in Firestore under the pseudonymous `uid`
(PRD 5.5, option 1). Security rules are written and tested before any screen
can write through them.

**Tech Stack:** Firebase JS SDK v11 · zod · `@firebase/rules-unit-testing`

## Global Constraints

Everything in the Phase 0 plan's Global Constraints still applies —
BRAND.md's colour, type, motion, copy and accessibility rules are unchanged
and enforced by the same tests. In addition, for this phase:

- **Auth stores only an email.** No display name, no date of birth, no health
  data — not in Auth custom claims, not in the Auth profile. PRD 5.5.
- **Consent is explicit, granular, versioned and logged with a timestamp.**
  GDPR Art. 9. It must be withdrawable later, so it is stored as a record
  rather than a boolean.
- **No pre-ticked consent boxes.** Ever. That is not consent.
- **Nobody can read another person's data.** The rules tests are the proof,
  not the intention.
- **The app must not send email from a developer machine.** Sign-in links are
  tested against the Auth emulator, which prints the link instead of sending
  it. Enabling real email delivery on a cloud project is Thomas's to
  configure and trigger.
- **Offline tolerant.** Onboarding and consent may be completed with a flaky
  connection; writes queue via Firestore persistence.

---

## Data written this phase

```
users/{uid}
  role         'patient' | 'supporter' | 'clinician' | 'admin'
  displayName  string          // what they choose to be called, not a legal name
  locale       'nl' | 'en'
  createdAt    timestamp

patients/{uid}                 // patientId == uid, per PRD 5.2
  displayName  string
  checkinHour  number          // 0-23, local hour the reminder fires
  timezone     'Europe/Brussels'
  onboarded    bool
  createdAt    timestamp

  /consents/{consentId}
    version    string          // e.g. '2026-08-04'
    grants     { essential: bool, healthData: bool, reminders: bool }
    grantedAt  timestamp
    withdrawnAt timestamp?
    locale     'nl' | 'en'     // which wording they actually read
```

`locale` is stored on the consent record deliberately: if consent is ever
questioned, what matters is the wording the person actually read.

---

## Task P1.1 — Firebase client, environment, emulator wiring

**Files:** `apps/web/src/firebase/client.ts` · `apps/web/.env.development` ·
`apps/web/.env.example` · `.gitignore`

- [ ] Register a web app in `luwte-dev` and read its config:
      `firebase apps:create web luwte-web --project luwte-dev` then
      `firebase apps:sdkconfig web --project luwte-dev`.
- [ ] Write `.env.development` with the `VITE_FIREBASE_*` values. **Committed
      deliberately** — the Firebase web API key is a public identifier, not a
      secret; access is controlled by security rules. Production values go in
      `.env.production.local`, which stays ignored.
- [ ] `client.ts` initialises the app, auth and Firestore, enables offline
      persistence, and connects to the emulators when `VITE_USE_EMULATORS`
      is set. Emulator connection must happen before any other SDK call.
- [ ] Verify: `pnpm dev` boots with no console errors and the Firestore tab
      of the emulator UI shows a connected client.

## Task P1.2 — Core model

**Files:** `packages/core/src/model/{user,patient,consent}.ts` ·
`packages/core/src/model/paths.ts` · matching `.test.ts` files

- [ ] zod schemas for the documents above, exported with inferred types.
      `checkinHour` is `z.number().int().min(0).max(23)`.
- [ ] `CONSENT_VERSION` and the consent item definitions — an id, a copy key
      for the label, a copy key for the explanation, and `required: boolean`.
      Three items: **essential** (required), **healthData** (required — the
      product cannot function without it, and saying so plainly is more
      honest than pretending it is optional), **reminders** (optional).
- [ ] Typed path helpers so no string literals appear in screens.
- [ ] Dutch and English copy for every consent item, added to both
      dictionaries. Copy-lint applies as always.
- [ ] Tests: schemas reject out-of-range `checkinHour`, reject unknown roles,
      and every consent item has copy in both locales.

## Task P1.3 — Security rules, written and tested first

**Files:** `firestore/firestore.rules` · `firestore/rules.test.ts` ·
`firestore/README.md`

This task comes before any screen that writes data. The rules are the access
control design (PRD 5.3); a screen built against permissive rules teaches you
nothing.

- [ ] Rules: a signed-in user may read and write `users/{uid}` and
      `patients/{uid}` only where `uid == request.auth.uid`, and may create
      consent records under their own patient document. Consent records are
      **create and update only — never delete**, because a consent log that
      can be erased is not a log.
- [ ] Table-driven tests with `@firebase/rules-unit-testing` against the
      emulator, covering at minimum:
      - self can read and write own `users` and `patients` doc
      - **another signed-in user cannot read either** — the row that matters
      - unauthenticated access is denied everywhere
      - a user cannot create a document under someone else's patient id
      - consent records cannot be deleted
      - everything not explicitly allowed is denied
- [ ] Run with `pnpm emulators:exec --only firestore "pnpm test:rules"`.

## Task P1.4 — Auth

**Files:** `apps/web/src/firebase/auth.ts` ·
`apps/web/src/providers/AuthProvider.tsx` · `apps/web/src/routes/SignIn.tsx`

- [ ] Email link is the primary path (PRD 7): send the link, store the email
      locally, complete sign-in on return. Password is the fallback for
      anyone who finds mail links awkward.
- [ ] `AuthProvider` exposes `{ user, status }` where status is
      `'loading' | 'signed-out' | 'signed-in'`, so screens never flash the
      wrong state.
- [ ] On first sign-in, create `users/{uid}` and `patients/{uid}` if absent.
- [ ] Copy from the dictionaries only. Errors use the BRAND error voice —
      state what happened and what to do, no apology, no humour.
- [ ] Tests: the provider reports each status correctly; the sign-in screen
      validates an email before enabling the action.

## Task P1.5 — Onboarding, consent, Today

**Files:** `apps/web/src/routes/Onboarding.tsx` ·
`apps/web/src/routes/Consent.tsx` · `apps/web/src/routes/Today.tsx` ·
`apps/web/src/routes/RequireAuth.tsx`

- [ ] Onboarding, three screens, one job each, copy verbatim from BRAND 4.2:
      1. *Dit is geen dokter. Dit is een schriftje dat onthoudt wat jij vergeet.*
      2. *Jij bepaalt wie wat ziet. Altijd. Je kan het elk moment veranderen.*
      3. Reminder hour → `checkinHour`.
- [ ] Consent screen: each item its own control, **nothing pre-ticked**,
      plain sentences rather than toggle labels. Writes a consent record with
      version, locale and timestamp. Sets `onboarded: true` only after it
      succeeds.
- [ ] Route guards: signed out → sign-in; signed in but not onboarded →
      onboarding; onboarded → Today. No flicker while auth is loading.
- [ ] Today shows the empty state — *Vandaag staat er niets. Dat mag.*
- [ ] Every new screen passes `docs/BRAND-QA.md`.

## Task P1.6 — Verify and document

- [ ] Walk the whole flow against the emulators, in Dutch and in English.
- [ ] Confirm in the emulator UI that Auth holds an email and nothing else,
      and that the consent record carries version, locale and timestamp.
- [ ] `pnpm verify` green; rules tests green.
- [ ] Update `CLAUDE.md` (current state, changelog) and the README.

## Phase 1 exit criteria

- [ ] Sign up → onboarding → consent → empty Today works end to end
- [ ] The same flow works in Dutch and English
- [ ] A second user cannot read the first user's data — proven by a test
- [ ] Consent is stored versioned, timestamped, and cannot be deleted
- [ ] Auth holds no special-category data
- [ ] `pnpm verify` and the rules tests both pass
