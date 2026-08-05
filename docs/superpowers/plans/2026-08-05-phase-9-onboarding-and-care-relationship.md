# luwte Phase 9 — Onboarding and the care relationship

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans.

**Goal:** A person and their doctor end up connected, whichever of them started,
and the app is honest at every step about who owns what is prescribed. Nobody is
forced through a screen that does not apply to them, and a person with no doctor
loses nothing.

**Architecture:** No new access-control mechanism. The patient still writes their
own circle, and the one fenced exception — redeeming an invite — grows a single
optional field rather than gaining a sibling. The clinician directory is the only
genuinely new surface, and it holds nothing but a nameplate.

**Tech Stack:** unchanged.

---

## What the research says, and what it changes

### 1. There is no public register to search

The Belgian provider register is real and authoritative — RIZIV/INAMI issues every
practitioner a number whose last three digits are a competency code, so
*psychiater* is machine-distinguishable from *huisarts*. But
[Een zorgverlener zoeken](https://www.riziv.fgov.be/nl/webtoepassingen/een-zorgverlener-zoeken)
is a web form for humans. There is no open dataset and no API; healthdata.be is a
research-access platform under strict conditions, not a directory.

**So "search for your doctor" cannot mean searching all Belgian doctors.** It can
only mean searching doctors already on luwte. The copy must say that plainly
rather than implying a national lookup and then returning nothing — a person who
searches for their psychiatrist, finds nothing, and concludes the app is broken
is a worse outcome than one who was told up front.

The RIZIV number keeps its use: it is what the **admin** checks when verifying a
clinician (D20, [CLINICIAN-VERIFICATION.md](../../CLINICIAN-VERIFICATION.md)),
and the competency code is how you confirm someone is a psychiatrist rather than
merely a doctor.

### 2. A connection code is the established pattern

Clinician-facing tools converge on the same shape: the clinician gets a short,
stable code and hands it to the person, who enters it. It needs no directory, no
email and no server. It is exactly what "the doctor invites the patient" wants to
be, and it costs us nothing we do not already have.

### 3. Every screen before value costs completion

The consistent finding across onboarding studies is that each pre-value screen
drops completion by roughly 10–15%, and that flows taking longer than about ten
minutes to reach value abandon at around three times the rate of short ones.
Progressive onboarding — introducing a thing at the moment it becomes relevant
rather than up front — traces back to Sweller's work on cognitive load: working
memory has hard limits and overloading it blocks learning rather than slowing it.

For luwte this is not a growth tactic, it is the same argument BRAND 5 already
makes about sedating medication and reading speed. luwte's onboarding is already
four screens plus consent. **Finding your doctor must not become a mandatory
sixth.** It belongs where it becomes relevant: offered once during onboarding
with skip as an equal-weight option, and again on the medication screen and in
settings, where a person who now has a psychiatrist will actually look.

Sources: [RIZIV — Een zorgverlener zoeken](https://www.riziv.fgov.be/nl/webtoepassingen/een-zorgverlener-zoeken) ·
[RIZIV — bevoegdheidscodes](https://www.riziv.fgov.be/nl/professionals/info-voor-allen/bevoegdheidscodes) ·
[healthdata.be](https://healthdata.sciensano.be/nl/over-healthdatabe) ·
[Bright Therapeutics](https://www.brighttherapeutics.com/) ·
[Digia — mobile app onboarding](https://www.digia.tech/post/mobile-app-onboarding-activation-retention/) ·
[Formbricks — onboarding best practices](https://formbricks.com/blog/user-onboarding-best-practices)

---

## The email in "the doctor gets an email to confirm"

The doctor being **asked to confirm** is the right requirement and this plan keeps
it. The transport is the part that changes.

luwte has no email infrastructure by decision: sending needs a Cloud Function and
a provider, which needs Blaze on dev (D15, kept off deliberately), and an email
provider is a new GDPR data processor handling a message whose mere existence —
*this person asked that psychiatrist to follow them* — is health-adjacent. Email
is also admin-configured and admin-triggered in this project by standing rule
([EMAIL-SETUP.md](../../EMAIL-SETUP.md)).

So the request is a **document the doctor sees in their console inbox**. That is
better than email for the pilot in every dimension that matters: no billing, no
new processor, no deliverability, and it is where the doctor already is. The
request is the durable thing; a notification is a courtesy on top of it, exactly
as PRD 5.4 treats the check-in reminder. If email is wanted later, it is an
admin-configured add-on that reads the same document and changes nothing else.

---

## The three ways in — and why there is still only one write

Everything below reduces to one invariant, unchanged from PRD 5.3:

> **The patient writes their own circle. Nobody grants themselves access.**

| Journey | Who acts | New write path? |
|---|---|---|
| **J1** Doctor hands over a connection code | patient enters it, patient grants | none — the patient already owns their circle |
| **J2** Patient searches and asks | patient issues an addressed invite; doctor redeems | one optional field on the existing invite |
| **J3** Doctor invites the patient | collapses into J1 | none |

**J3 is worth stating explicitly**, because it is the flow described as the future
normal. A clinician cannot issue an invite *into* a patient's data — the patient
does not exist yet, and a grant nobody authored is not a grant. What the doctor
actually hands over is their own connection code. So the flow you want needs no
new machinery at all: a printed card, a link, or a code read aloud.

J2 is the only one that touches the rules, and it is one clause. An invite gains
an optional `forUid`; when set, only that person may redeem it. The doctor's
console lists invites addressed to them. **The patient still authored the grant
and still chose the permissions** — the doctor accepting is consent, not
escalation. That is why this is safe to add to the most dangerous rule in the
system, and why a separate `careRequests` collection would have been worse: two
mechanisms to keep correct instead of one.

---

## The journeys nobody asked for, which will happen anyway

### J4 — no doctor, ever (already works, do not break it)

`prescribedBy == null` means the line is the person's own and they change it
outright (D24). This is already true and needs no work. Note it is resolved **per
medication, not per account** — someone with a psychiatrist still fully owns the
magnesium they added themselves — which is better than the account-level rule
that was asked for.

### J5 — a doctor arrives after the person has been self-managing

This will happen at every single pilot onboarding, and it is not designed yet.
The doctor opens the console and sees lines the patient entered. They can **adopt**
a line by setting `prescribedBy` to themselves; the rules already permit this.

The work is making it visible. A line silently changing from *mine to edit* to *I
can only ask* is precisely the quiet loss of control this product must not do.
Adoption appends to `changeLog`, and the medication screen says, per line, who
owns it. Adoption does not need a second confirmation from the patient — they
invited this person and granted `medication` — but it must be **told, never
discovered**.

### J6 — the doctor leaves, and the prescription freezes ← a defect today

Revoke a clinician and every line they prescribed becomes **permanently
uneditable by anyone**. The patient fails the self-edit branch (`prescribedBy` is
set), can only write `pendingChange` — to someone who can no longer read it — and
the prescriber branch fails because `granted()` is false for a revoked member.

**Confirmed against the emulator**, not inferred. With the prescriber revoked,
all four of these are refused:

| Attempt | Result |
|---|---|
| The patient changes the dose | **403** |
| The patient clears `prescribedBy` to take the line back | **403** |
| The revoked doctor changes the dose | **403** |
| The revoked doctor *reads* the line at all | **403** |

The last row is the sharp one: `pendingChange` is the patient's only remaining
move, and it writes into a void — the person it is addressed to can no longer
read the document it lives on.

A second clinician in the circle can take the line over, so this only dead-ends
when there is no clinician left. That is exactly the pilot: one psychiatrist, who
may be removed before another is added. **This is the highest-value item in the
plan and the only outright bug.**

The fix: the patient may release a prescription back to themselves when the
prescriber's circle entry is gone or revoked, changing `prescribedBy` and the log
and nothing else — so a release cannot smuggle a dose change. The log gains an
honest line, and the chart keeps its vertical rules.

### J7 — a supporter or clinician is walked through the patient's onboarding ← a defect today

`ensureAccount` writes `role: 'patient'` and a patient document for **everyone**,
and `Onboarding.tsx` branches on nothing. So the brother who follows an invite
link is told *"dit is een schriftje dat onthoudt wat jij vergeet"* and asked what
hour to remind him to check in. A psychiatrist signing up gets the same.

Where the answer is knowable it should be inferred, not asked: someone arriving
with a pending supporter invite is a supporter, and someone arriving with a
clinician connection code is a patient. Only a clinician signing up cold has to
be asked, and asking is safe because **declaring yourself a clinician grants
nothing** — verification is an admin act out of band (D20). The answer routes
screens and nothing else.

Consent branches too, and this is a real GDPR point rather than a cosmetic one:
the current screen is consent to processing **your own** Article 9 data. A
supporter is not storing health data about themselves; what they need to agree to
is confidentiality about someone else's. Different text, same versioned record.

### J8 — the doctor never answers

Silence must cost nothing. The invite already expires after seven days, nothing
is chased (PRD 8), and the person keeps full ownership of every line meanwhile.
No pending state blocks anything.

### J9 — two clinicians

A psychiatrist and a GP are two circle members with `role: 'clinician'`, and each
prescription is owned by whoever set it. This already works; it needs a test that
says so.

### J10 — the patient names a friend as "my doctor"

Today `canReadClinical` checks the grant and the role but **not verification**, so
a patient can hand anyone a clinician card and that person reads medication. It
is the patient's own data and their own choice, so it is not an escalation — but
it sits badly against D23's reasoning, that a permission which cannot be given to
the wrong person cannot be given to them on a bad day. Being persuaded to name
someone "my doctor" is a thing that happens during an episode.

**Recommendation: require verification for the clinician role**, both on
redemption and on the patient's direct write. The cost is real — a doctor must be
verified before a patient can name them, so the directory becomes the only
practical path. In a pilot that is one admin action that is already documented.
**Flagged for Thomas: this changes who can see medication in the pilot.**

---

## Data written this phase

```
clinicianDirectory/{code}        // the code IS the document id; admin-written
  uid           string           // the clinician's auth uid
  displayName   string           // 'Dr. An Peeters'
  discipline    string           // 'psychiater' | 'huisarts' | 'psycholoog'
  practice      string           // 'UZ Gent, dienst psychiatrie'
  searchName    string           // lowercased displayName, for prefix search
  listed        bool             // opt in to being searchable

invites/{code}
  forUid        string | null    // NEW. If set, only they may redeem.

users/{uid}
  role          ... unchanged, but now actually set from onboarding
```

The directory is a **separate collection from `clinicians/{uid}`** on purpose.
That one is verification state and may hold things a clinician would not
broadcast; this one is a nameplate — a name, a discipline, a practice, no contact
details and no patient data. Splitting them means widening `list` on the
directory can never widen anything else. Same instinct as D17.

The code being the document id gives `get`-by-code for free, which is what makes
J1 work for a doctor who does **not** want to be searchable: `listed: false` still
resolves by code.

---

## Task P9.1 — Release a frozen prescription (the bug)

**Files:** `firestore/firestore.rules` · `firestore/rules.test.ts` ·
`packages/core/src/model/medication.ts` · `apps/web/src/firebase/medication.ts` ·
`apps/web/src/routes/Medication.tsx`

- [ ] Rules test first, written as the situation: a prescriber is revoked, and
      the patient can no longer edit or meaningfully propose. Assert the dead end
      exists before fixing it.
- [ ] `prescriberGone(pid)` — the prescriber's circle entry is absent, or carries
      `revokedAt != null`.
- [ ] Medication `update` gains a fourth branch: the patient may clear
      `prescribedBy` when `prescriberGone`, with `affectedKeys().hasOnly(['prescribedBy', 'changeLog'])`
      so a release cannot carry a dose change.
- [ ] Tests: release works when revoked; **refused while the prescriber is
      active**; refused when it also changes the dose; refused for anyone but the
      patient; the log still may only grow.
- [ ] The medication screen offers it in plain words when the state arises, and
      says what happens: the line becomes theirs again.

## Task P9.2 — Onboarding knows who it is talking to

**Files:** `apps/web/src/routes/Onboarding.tsx` · `Consent.tsx` ·
`apps/web/src/firebase/accounts.ts` · `packages/core/src/i18n/*`

- [ ] `ensureAccount` takes the intent rather than assuming `patient`.
- [ ] Infer where it is knowable: a pending supporter invite means supporter; a
      clinician connection code means patient. Ask only when nothing is known,
      once, in one plain screen.
- [ ] Supporter onboarding: no check-in hour, no windline framing, and the
      confidentiality consent rather than the Article 9 one. Same versioned
      record, different `grants` and different copy.
- [ ] Clinician onboarding ends at the console gate, telling them plainly whether
      they are verified yet and that verification is done by a person.
- [ ] Tests: each intent renders its own steps; the supporter path never writes
      `checkinHour`; every new string exists in both dictionaries and passes
      copy-lint.
- [ ] BRAND-QA pass on every new screen.

## Task P9.3 — The clinician directory

**Files:** `firestore/firestore.rules` · `firestore/rules.test.ts` ·
`firestore/firestore.indexes.json` · `packages/core/src/model/clinician.ts` ·
`scripts/verify-clinician.mjs`

- [ ] Schema and path helpers. Reuse `inviteCode()` for the code — one tested,
      unbiased generator, and an alphabet already chosen for being read aloud.
- [ ] Rules: `get` for any signed-in person; `list` only where `listed == true`;
      **no client may write**, like `clinicians/`.
- [ ] Composite index for `listed == true` plus the `searchName` prefix range.
- [ ] Extend the admin verification script to write both documents at once, so a
      verified clinician cannot exist without a way to be found.
- [ ] Tests, as attacks: an unfiltered listing is **refused, not filtered** (the
      D17 lesson); an unlisted clinician is still gettable by code; no client can
      write the directory; the directory leaks no patient data.

## Task P9.4 — Addressed invites

**Files:** `firestore/firestore.rules` · `firestore/rules.test.ts` ·
`packages/core/src/model/circle.ts` · `apps/web/src/firebase/circle.ts`

- [ ] `forUid` on the invite schema, optional and null by default.
- [ ] `redeemable()` gains: when `forUid` is set, the redeemer must be them.
- [ ] `list` widens to the addressee, which forces their query to filter on
      `forUid` — the same forcing that makes the issuer's listing safe.
- [ ] **The verification clamp (J10):** redeeming a `clinician` invite requires
      `isVerifiedClinician()`, and the patient's direct create of a clinician card
      requires the member to exist in `clinicians/`.
- [ ] Tests, as attacks: a third party cannot redeem an addressed invite; the
      addressee cannot alter the permissions on redemption; an unverified person
      cannot redeem a clinician invite; a patient cannot name an unverified person
      as clinician; an unfiltered listing is refused.

## Task P9.5 — The screens

**Files:** `apps/web/src/routes/FindClinician.tsx` (+`.module.css`, test) ·
`ConsoleInbox.tsx` · `Onboarding.tsx` · `Medication.tsx` · `Settings.tsx`

- [ ] **Enter a code** — one field, resolves to a name and discipline, then
      *"Dr. An Peeters, psychiater. Klopt dat?"* before anything is written.
- [ ] **Search by name** — says plainly that it searches doctors who use luwte,
      not every doctor. Empty result offers the invite link instead of a dead end.
- [ ] Both reachable from onboarding (**skip is equal weight**), from the
      medication screen, and from settings.
- [ ] **Console inbox** — invites addressed to this clinician, with what is being
      granted stated as sentences. Accept or leave; declining says nothing to
      anyone, like a declined activity and a declined medication request.
- [ ] Medication screen shows per line who owns it, and says when a line was
      adopted.
- [ ] BRAND-QA on every screen. Nothing here is red, nothing is urgent, and a
      pending request is not a chore with a badge on it.

## Task P9.6 — Verify and document

- [ ] Walk all three journeys against the emulators as three people: doctor hands
      over a code; patient searches and asks; patient never connects anyone.
- [ ] Walk J5 and J6 end to end — adoption appears on the chart as a vertical
      rule, and a revoked prescriber's line can be released and then edited.
- [ ] Confirm over the wire that each refusal in P9.3 and P9.4 is a 403.
- [ ] `pnpm verify` and `pnpm test:rules` green.
- [ ] Update `CLAUDE.md`, `PLAN.md` (decisions), and
      [HOW-IT-WORKS.md](../../HOW-IT-WORKS.md) §3 — it currently describes
      medication ownership without any of this.

---

## Phase 9 exit criteria

- [ ] A doctor hands over a code and the person is connected, with no email sent
- [ ] A person finds their doctor by name, asks, and the doctor confirms in-app
- [ ] A person with no doctor edits every line of their own medication
- [ ] A doctor adopting a self-entered line is visible to the person, not silent
- [ ] A revoked prescriber no longer freezes a prescription — proven by a test
- [ ] A supporter is never asked when to be reminded to check in
- [ ] An unverified person cannot hold a clinician card — proven by a test
- [ ] A directory listing without `listed == true` is refused, not filtered
- [ ] `pnpm verify` and the rules matrix both green

---

## If the pilot should not wait

Two items here are defects rather than features, and both are small:

- **P9.1** (frozen prescription) — a real dead end that a single revocation
  reaches.
- **P9.2** (onboarding intent) — the brother in the pilot will hit this on his
  first screen.

Both can be pulled into Phase 8 hardening, leaving the directory and addressed
invites for after the pilot. The pilot does not strictly need them: a patient can
already invite their psychiatrist with the existing circle invite link.
