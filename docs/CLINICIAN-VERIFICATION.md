# Verifying a clinician — admin only

PRD 6.7: whether someone is a clinician is "checked manually at first". This
is that manual step, and it is deliberately not something the app can do.

A verified clinician is a document at `clinicians/{uid}`. **No client may
write one** — the security rules refuse it outright, including to the person
it would be about. Verification is granted out of band, by an admin, with
credentials the app does not have.

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

Against the emulator, for local testing:

```bash
curl -X PATCH "http://127.0.0.1:8080/v1/projects/demo-luwte/databases/(default)/documents/clinicians/THE_UID" -H "Authorization: Bearer owner" -H "Content-Type: application/json" -d "{\"fields\":{\"verifiedAt\":{\"timestampValue\":\"2026-08-04T00:00:00Z\"}}}"
```

Against a real project, this needs the Admin SDK with a service account, run
by a human who has checked the person is who they say they are. That check is
the entire point of the step, and it is not a formality: this is the one
permission in luwte that lets a person write something clinical about someone
else.

**Undoing it is deleting the document**, which needs the same admin
credentials, and — per the project rules — an explicit go-ahead before anyone
runs it.
