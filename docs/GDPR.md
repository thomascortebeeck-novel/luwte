# GDPR — what luwte processes, and what a person can do about it

Health data is **Article 9 special category**. This document is the record of
what is processed and why, plus the two rights the pilot cannot start without.

Plain-language version for the family: [HOW-IT-WORKS.md](HOW-IT-WORKS.md).

## What is processed

| Data | Why | Legal basis |
|---|---|---|
| Check-ins: valence, arousal, flatness, sleep hours, a diary line | the logbook itself | Art. 9(2)(a) explicit consent |
| Weekly: sedation, hopelessness | side effects worth noticing | as above |
| Medication, and doses taken | what is prescribed, and adherence | as above |
| Calendar activities and completions | behavioural activation | as above |
| Posts, reactions, comments | the circle | as above |
| The early-warning-signs plan | the person's own intentions | as above |
| Circle membership and permissions | the access control list | as above |
| Email address | sign-in only | Art. 6(1)(b) |

**Consent is a versioned record**, not a boolean: version, grants, locale,
`grantedAt`, `withdrawnAt`. The locale is stored because if consent is ever
questioned, what matters is the wording the person actually read.

Nothing is pre-ticked, and the action stays disabled until every required item
is granted. A supporter consents to **confidentiality** rather than Article 9 —
they store no health data of their own, they are shown somebody else's.

## Where it lives

| | Region |
|---|---|
| Firestore | `eur3` — Europe multi-region |
| Everything else, if it ever exists | `europe-west1` — St. Ghislain, Belgium |

**Firebase Auth cannot be pinned to Europe** (D1). That is exactly why it holds
an email address and auth machinery and nothing else — no display name, no
photo, no custom claims, nothing clinical. A Google account arrives carrying
`displayName` and `photoURL`; luwte never reads either. The name the app uses
is the one typed in onboarding.

**Firebase Analytics is disabled** and there is no third-party analytics, no
advertising and no data sold.

### Processors

Google Ireland Limited (Firebase / Google Cloud), under Google's Data
Processing Addendum. There are no others. Adding one to an Article 9 system is
a decision to be argued for, not a convenience — which is why watch data goes
through on-device Health Connect rather than an aggregator.

## Article 15 — a copy of everything

Settings → **Alles downloaden**. One JSON file containing the account and
patient documents, every sub-collection, the reactions and comments attached
to each post, invites, and the verification request if there is one.

**Generated on the device.** The printable report set that precedent (D16): a
Cloud Function would need Blaze to do what the client already has permission
for, and Article 9 data is better off not making the trip.

`buildExport` **throws rather than shipping a partial file**. An export
silently missing `doses` is indistinguishable from the export of somebody who
never ticked one off, so Article 15 would be answered wrongly with nothing
looking wrong.

## Article 17 — erasure

Settings → **Alles verwijderen**, behind one confirmation carrying the existing
copy: *Weg is weg. Dat kunnen we niet terugdraaien.*

### Why it needs a marker

This database refuses `delete` nearly everywhere **on purpose**. A dose log
that can be shortened is not a record; `changeLog` may only grow because it
draws the vertical rules on the chart a psychiatrist reads; a comment cannot be
unsaid once read. Those refusals protect a record's integrity *while it
exists*. Erasure is not an edit — it is the record ceasing to exist — but a
security rule cannot tell the two apart by looking at one delete.

So the person writes `erasureStartedAt` onto their own patient document first,
and `erasing()` in the rules is what opens the door. Normal operation keeps
every refusal it had.

### The order is the design

1. **Invites** — an unredeemed invite is a pending grant, so nobody can join
   halfway through.
2. **The circle** — cuts off everyone who already had access.
3. **Posts**, with the reactions and comments hanging off each.
4. **Content** — check-ins, weekly, medication, doses, calendar, plan,
   permission log, consents.
5. **The verification request**, if undecided.
6. **The patient document**, late, because the rules read the marker from it.
7. **The account document, then the sign-in itself.**

Access is revoked before anything is removed. Run the other way round, a
teardown interrupted by a flat battery leaves the remaining months readable by
the whole circle; run this way, the same interruption leaves the person with
their own data and nobody else's access to it.

### Two things it does to other people's data

**A supporter's comment goes with the post.** It is the supporter's own words,
and it is also about this person's day, attached to this person's post, inside
this person's subtree — and it does not survive the post it answers in any
meaningful form. The patient's right governs.

**A decided verification request is kept.** It records that an admin granted
somebody clinical access to other people's records — the accountability trail
for a decision already acted upon, which Art. 17(3)(e) contemplates. Erasing it
would leave a verified clinician in circles with no record of who checked them
or when. An *undecided* request is deleted, because nothing was granted on it.

Consequence, stated rather than buried: **a clinician who erases their account
leaves that one document behind.** It holds their own name, discipline and
RIZIV number — no patient data.

### What is not promised

- **The sign-in may need a fresh login.** Firebase refuses `deleteUser` on an
  old session. The data is already gone at that point, so the screen says so
  rather than reporting a generic failure that reads as nothing happened.
- **Backups.** `luwte-prod` has delete protection, which is not a backup.
  Nothing is currently scheduled, so there is no backup retention window for
  erasure to have to reach into. If scheduled backups are ever turned on, this
  section needs a retention period and a statement of how erasure interacts
  with it — decide before real records land, not after.

## Retention

While the account exists, everything is kept: the point of a logbook is the
year before this month, and the chart a psychiatrist reads spans months.
Nothing expires on a timer. Retention ends when the person ends it, which is
what makes Article 17 the whole retention policy here.

## Withdrawing consent

`withdrawnAt` on the consent record, never a delete — a consent log that can be
erased is not a log. Withdrawal stops further processing; the existing record
is then the person's to export or erase.

## Risks, and what answers them

| Risk | Answer |
|---|---|
| A family member widens their own access | `circle/**` is unwritable by members — not "cannot escalate", cannot touch |
| Somebody enumerates invites and joins a stranger's circle | `get` and `list` split; `list` is the issuer's alone (D17) |
| A patient anoints anyone as their prescriber | `clinicianIsVerified()` gates create **and** update |
| Someone deletes one inconvenient day | every delete is gated on the erasure marker |
| Health data outlives an erasure request | `PATIENT_SUBCOLLECTIONS` is enumerated, and a test reads `paths.ts` and fails on any collection not covered |
| A conclusion is drawn about someone's mental state | no predictor exists; luwte may carry a conclusion somebody else is licensed to draw and may never draw one |

The last row is EU MDR rather than GDPR, and it is the line this product does
not cross. Generating an alert, or saying "you may be relapsing", is clinical
monitoring — Class IIa, notified body. See CLAUDE.md.
