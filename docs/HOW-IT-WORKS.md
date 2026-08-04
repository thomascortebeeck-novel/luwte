# How luwte works — in plain language

A description of the whole system without jargon: who the people are, what
each can do, what the app remembers, and how the pieces fit together.

Written for reading, not for implementing. The precise versions live in
[PRD.md](PRD.md), [BRAND.md](BRAND.md) and the code.

**Last updated 2026-08-04.** Sections marked *Not built yet* are planned but
do not exist.

---

## 1. What luwte is, in one paragraph

Someone recovering from psychosis and depression writes down a few things
about their day, in under a minute. Their family can see as much or as little
of that as the person chooses. Their psychiatrist — who sees them for twenty
minutes every six weeks and otherwise relies on memory — gets a real record
instead of a guess. That is the whole product.

> luwte is a logbook and a nudge, not a doctor.

It never diagnoses, never says "you are relapsing", and never decides
anything. It shows what a person wrote to humans who decide.

---

## 2. The four kinds of people

| Who | What they are | What they see |
|---|---|---|
| **Patient** | The person recovering. The app is theirs. | Everything about themselves |
| **Supporter** | Family, a friend, a peer. | Only what the patient specifically granted, per person |
| **Clinician** | The psychiatrist or care team. | Check-ins, medication, side effects — only after the patient grants it |
| **Admin** | Whoever runs the service. | **No patient content, ever** |

A patient can have many supporters and many clinicians. A supporter can
support several patients.

**The patient is always in control.** Nobody gets access by asking the system;
they get it because the patient granted it, and the patient can take it back
at any moment.

---

## 3. Your question: who controls the medication list?

**Today: the patient does.** They add their own medication — name, dose, what
times of day, and a plain sentence about what it is for. Nobody else can write
to it. This is deliberate for now, because the clinician console does not
exist yet, and a medication list nobody can fill in is useless.

**Intended (PRD §5.3 and §6.7): the clinician owns it.** Once the console
exists, a *verified* clinician who is in the patient's circle edits the
medication list, and the patient may not overwrite the fields the clinician
authored. The patient still ticks off whether they actually took each dose —
that part is always theirs and no one else can record it for them.

**So there are two different things, and they never mix:**

| Thing | Who writes it | Why |
|---|---|---|
| *What you are prescribed* | Clinician (patient, for now) | It is a clinical decision |
| *Whether you took it* | The patient, always | Nobody may record adherence on someone else's behalf |

**This is a gap you should know about.** The rules currently say only the
patient can write medication. When the console is built, that rule has to
change to admit verified clinicians, and to protect clinician-authored fields
from patient edits. It is written down here so it is not discovered late.

**Every change is logged, from the first day.** Whenever a medication changes
— dose, timing, stopped — the app records what changed, when, and who did it.
That log is what draws the vertical lines on the chart. It exists now, before
any clinician has an account, because a log started later cannot show a change
that already happened.

---

## 4. What people actually do — user stories

### The patient

- *In the evening I open the app, answer six short questions about my day, and
  optionally write a line about it. It takes under a minute.* → Check-in
- *Once a week there are four extra questions about restlessness, stiffness,
  drowsiness and hopelessness.* → Weekly extra
- *If I answer the hopelessness question at the very top of the scale, the app
  quietly shows me crisis numbers. It does not tell my family.* → Crisis screen
- *I tick off my medication as I take it.* → Today
- *I look at a chart of the last few weeks and see that flatness went up after
  my dose changed.* → Overview
- *Before my appointment I print a sheet to take with me.* → Report
- *I decide that my brother can see my check-ins but not my medication, and I
  change my mind next week.* → Circle *(Not built yet)*
- *If I skip a day, nothing happens. No guilt message, no gap, no catch-up.*

### The supporter

- *I get one notification when my brother finishes something he planned.*
  *(Preference exists; the trigger is not built yet)*
- *I can see what he chose to share and nothing else.* *(Not built yet)*
- *I can suggest an activity. It goes into a quiet tray — it does not appear
  on his calendar unless he accepts it. If he declines, I am not told.*
  *(Not built yet)*

### The clinician

- *I open a patient and see their chart, when medication changed, how much of
  it was taken, and what they wrote in their own words.* *(Not built yet —
  this is the next thing being built)*
- *I update their medication and it appears in their app.* *(Not built yet)*

---

## 5. The pages

**Built and working:**

| Page | What happens there |
|---|---|
| Sign in | Email link, or a password if that is easier |
| Onboarding | Four screens: what luwte is, who sees what, your name, what time to remind you |
| Consent | Explicit permission to store health data. Nothing pre-ticked |
| **Today** | The home screen: the windline, the way into the check-in, medication to tick off, and a few optional suggestions |
| Check-in | Six questions, one per screen, then an optional diary line, plus four more once a week |
| Medication | Your list, and the form to add to it |
| Overview | The chart over 2, 6 or 12 weeks, plus everything you wrote |
| Report | A printable A4 sheet for an appointment |
| Settings | Reminder time, which notifications you want, language, add reminder to Google Calendar |
| Crisis | Three Belgian phone numbers, tappable, works with no internet |

**Not built yet:** circle and invites, permissions per person, the feed,
calendar and suggestions, the clinician console.

### The windline

A single fine line at the top of Today, drawn from the last fourteen days.
Unsettled stretches wobble finely and closely; calm stretches run long and
almost flat. It has no number, no scale and no label.

**It is not a score.** Being unsettled is not being bad — a person can be
unsettled and having a good week. It is a horizon line: a way of feeling the
shape of a fortnight in half a second. Days you did not fill in are smoothed
over so there is never a visible gap.

---

## 6. What the app remembers

Think of it as one folder per person, with a few notebooks inside.

```
The person
  who they are          name they chose, language, when they joined
  their settings        reminder hour, which notifications they want

  Daily check-ins       one page per day, filed by date
                        mood, energy, hours slept, how rested,
                        restlessness, flatness, and their own line of text

  Weekly extras         one page per week
                        restlessness, stiffness, drowsiness, hopelessness

  Medication            what they take, when, and what it is for
                        plus a log of every change ever made

  Doses                 one tick per medicine per time per day

  Consent               what they agreed to, in which language, when
                        never deleted — withdrawing adds to it

  The circle            one card per person who has access,
                        and exactly what each of them may see
```

Two details that matter more than they look:

**Days are filed by the local date in Belgium, not by clock time.** A check-in
at 23:30 belongs to that day, not the next one. Getting this wrong would be
invisible most of the year and wrong twice a day at the edges.

**Nothing is ever deleted from the record.** Stopping a medication marks it
stopped. Withdrawing consent adds a withdrawal. Removing someone's access
marks it revoked. Erasing the past would make the record untrustworthy — and
for consent, a log that can be erased is not a log. Full deletion of an
account is a separate, deliberate act that removes everything at once.

---

## 7. Who can see what

Every person with access has a card in the patient's circle. That card lists
five things they may or may not see:

| Toggle | In plain words |
|---|---|
| Check-ins | Can see how you felt |
| Medication | Can see what you take and whether you took it |
| Health | Can see what your watch reported |
| Feed | Can see what you share, and can respond |
| Calendar | Can see your calendar and suggest something |

The permissions screen shows these as sentences, never as toggle names.
Nobody meaningfully agrees to "checkins: true".

**A new supporter starts with feed and calendar only** — not everything. An
invite sent on a bad day should not hand over a clinical record by accident.

### The single most important rule in the system

**Only the patient can change these cards. Nobody else can touch them at
all** — not to add themselves, not to widen what they see, not to undo being
removed.

This is not a preference. During an episode the temptation for a worried
family member to give themselves more access is real, and the whole product
depends on that being impossible. It is enforced by the database itself, not
by the app being polite, and there are thirteen automated tests that
specifically try to break it — including a supporter attempting to grant
themselves check-in access, and someone trying to un-revoke themselves after
being cut off.

**Reading and writing are separate.** A supporter granted "check-ins" can
*read* how the person felt. They can never *write* it. Nobody records someone
else's feelings for them.

---

## 8. How it is built

**Everything is TypeScript.** One codebase, shared between the app and the
server pieces.

| Piece | What it is |
|---|---|
| The app | A website that installs like an app on a phone |
| The database | Google Cloud Firestore, stored in Europe |
| The rules | A permission layer that runs inside the database itself |
| Background jobs | Small server functions — currently just the daily reminder |

**The database enforces the rules, not the app.** If someone bypassed the app
entirely and talked to the database directly, they would still be refused.
The app being well-behaved is not what keeps the data safe.

**It works offline.** A check-in written with no signal is saved on the phone
and sent later. Someone with no credit can still use it, and the app never
makes them wait for the network.

**The health data stays in Europe.** One known exception: the sign-in system
cannot be pinned to Europe, so it holds an email address and nothing else —
no name, no health information. That is a deliberate trade, written down for
the privacy assessment.

**The printable report is made on the phone or laptop itself.** It is never
uploaded, never rendered on a server, never stored anywhere. It exists only
where the person makes it.

---

## 9. Rules the app cannot break, because tests enforce them

These are not guidelines. Something fails to build if one is broken.

- No streaks, points, badges or achievements. Ever.
- No red, no green-as-good, no traffic-light colouring. There is no bad score.
- No exclamation marks, no cheerfulness, no comparison to last week.
- Nothing bold — emphasis is pressure.
- The app's own voice is one typeface; anything a person wrote is another.
- One colour means "your own data", another means "another human was here".
  They are never mixed.
- On a missed day, the app says nothing at all.
- One reminder per event, never chased. Every notification can be turned off,
  and the app still works with all of them off.
- All text is readable against its background, checked mathematically.

---

## 10. What is deliberately not here

- **No advice.** The app never suggests what to do about what it shows.
- **No automatic alerts to family.** Not even for a top-of-scale hopelessness
  answer. Automatic escalation would make people stop answering honestly,
  which costs more than it gains.
- **No analytics.** No third-party tracking of any kind.
- **No heart rate or ECG**, even when a watch offers it. Uninterpreted cardiac
  data is harmful in both directions.
- **No streaks or gamification**, which are actively harmful for this group.

---

## 11. Where things stand

| | Status |
|---|---|
| Account, onboarding, consent | Working |
| Daily check-in, weekly extras, crisis path | Working |
| Today, medication, doses, practices | Working |
| Overview chart and printable report | Working |
| Notification preferences, calendar export | Working |
| Who-sees-what rules | Enforced in the database |
| Circle screens — invite, permissions, revoke | **Next** |
| Clinician console | **After that** |
| Calendar and activity suggestions | Later |
| Feed and reactions | Later |
| Watch and phone data | After the Android app |

The daily reminder is written and tested but not switched on, because turning
it on means paying for the server side and that has not been needed yet.
