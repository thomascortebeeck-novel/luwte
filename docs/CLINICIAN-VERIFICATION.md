# Verifying a clinician — admin only

PRD 6.7: whether someone is a clinician is "checked manually at first". This
is that manual step. It is made by a person, in the app, at **`/admin`**
(D27) — and the check itself is still theirs to do, against the RIZIV
register. The panel shows the number and says so; approving is a judgement,
not a button.

A verified clinician is a document at `clinicians/{uid}`, written **only by an
admin** and signed with their uid. Nobody verifies themselves.

## Where the root of trust actually sits

Moving the check into the app moved the out-of-band step rather than removing
it. It now sits one level down:

| Document | Written by | How |
|---|---|---|
| `admins/{uid}` | **Nobody, from any client** | the Admin SDK, by a human who meant to |
| `clinicianRequests/{uid}` | the applicant, for themselves | applying grants nothing |
| `clinicians/{uid}` | an admin, from `/admin` | signed with their own uid |

**`admins/` is the whole chain.** If a client could write it, everything above
it would be worthless. The rules refuse every write to it, including from an
admin — an admin cannot make another admin. There are tests for each of those.

A decided request is **kept, never deleted**. Who asked to be trusted with
somebody else's clinical record, and what was decided, is exactly the kind of
record this project does not erase.

## Why it is a document rather than a custom claim

Two reasons. Auth is deliberately kept to an email address and auth machinery
only (PRD 5.5 option 1), so nothing about a person's role lives there. And a
custom claim only takes effect after the client refreshes its token, which
means a newly verified clinician would sit staring at a console that is not
offered yet.

## What verification does and does not do

It decides **whether the console is offered**, and it is one of the three
conditions for writing what a patient is prescribed. It grants **no access to
anybody's data on its own**.

Every read still resolves through the patient's circle. A verified clinician
who is in nobody's circle sees an empty list, which is exactly right: being a
doctor somewhere is not the same as being *this* person's doctor. The patient
decides that, by inviting them as a clinician, and can stop it at any moment.

Writing medication needs all three:

| Condition | Who grants it |
|---|---|
| Verified at all | The admin, here |
| In this patient's circle, with medication granted | The patient |
| Invited *as* a clinician, not a supporter | The patient |

## Doing it

**Verifying a clinician:** open `/admin`, check the RIZIV number against
[the register](https://www.riziv.fgov.be/nl/webtoepassingen/een-zorgverlener-zoeken),
and approve or decline. The last three digits are the competency code, which
is what distinguishes a psychiatrist from a doctor in general; the panel shows
them separately for that reason.

**Becoming an admin in the first place** is the step no screen can do:

```bash
node scripts/make-admin.mjs <uid>
```

That script refuses any project id not starting with `demo-`. Against a real
project it needs the Admin SDK and a service account, run by a human who meant
to — and per the project rules, that is not something a session does on its
own.

**Undoing verification is deleting `clinicians/{uid}`**, which an admin may do
and which takes effect immediately: every read resolves through `exists()`.
Per the project rules, ask before running it.
