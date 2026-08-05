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

**Both, and which one is written down.** A line the person added themselves is
theirs to change outright. A line their clinician set is the clinician's — and
the person can still **ask for it to be changed**, in their own words, with
the exact new dose they want.

The request waits until the clinician approves it. Approving applies exactly
what was asked and logs it; declining clears the request and changes nothing.
No refusal message is delivered — the request simply stops being pending, and
whatever needs saying is said between two people.

**"If a doctor is assigned, they approve" is answered per medication.** A
doctor is assigned to a prescription, and the app knows which prescriptions
have one. Nothing the patient can write changes that answer, which is what
makes it worth relying on.

The patient keeps their own list until a clinician arrives, which is the only
way a list can exist before the psychiatrist has an account. When a clinician
takes a line on, it becomes theirs — and the person keeps the right to ask.

### Only the care team sees medication

Family and friends are **never offered** the medication permission. Not hidden
behind a condition — absent from the list of things a supporter can be
granted, and refused by the database even if a permission record somehow says
otherwise. This was checked by hand: a brother whose card carried medication
access was still refused both the prescriptions and the doses.

What someone is prescribed is the most diagnostic thing this app holds. A
permission that cannot be given to the wrong person cannot be given to them on
a bad day.

**A clinician may only write it if all three are true:**

| Condition | Who decides |
|---|---|
| They are a verified clinician at all | An admin, checked by hand, out of band |
| They are in this person's circle, with medication shared | The patient |
| They were invited *as* a clinician, not as a supporter | The patient |

Being a doctor somewhere is not the same as being *this* person's doctor. The
patient's word settles it, and they can withdraw it at any moment.

**The patient can never mark a line as prescribed.** Otherwise they could
write their own provenance, and "your doctor set this" would not be worth
reading.

**So there are two different things, and they never mix:**

| Thing | Who writes it | Why |
|---|---|---|
| *What you are prescribed* | The clinician who set it | It is a clinical decision |
| *A request to change it* | The patient, always | Being unable to edit is not the same as having no say |
| *Whether you took it* | The patient, always | Nobody may record adherence on someone else's behalf |

The second row holds without exception. A psychiatrist can see that a dose was
missed; they cannot tick it. It was tried by hand against a real database and
refused.

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
  change my mind next week.* → Circle
- *If I skip a day, nothing happens. No guilt message, no gap, no catch-up.*

### The supporter

- *I open the link he sent me, and before I accept, I see exactly what I will
  be able to look at.* → Join
- *I get one notification when my brother finishes something he planned* —
  and only if he gave me the feed and I did not turn it off. Both of us have
  to agree, and his decision is asked first.
- *I can see what he chose to share and nothing else.* → Who you follow
- *I can send him something warm. There is no way for me to send anything
  cold, which is deliberate.*
- *I can suggest an activity. It goes into a quiet tray — it does not appear
  on his calendar unless he accepts it. If he declines, I am not told.* →
  Calendar

### The clinician

- *I open a patient and see their chart, when medication changed, how much of
  it was taken, and what they wrote in their own words.* → Console
- *I change a dose, and it appears in their app and as a marked line on the
  chart, so at the next appointment we can both see what happened after.* →
  Console
- *I can see they missed doses. I cannot tick them off for them.*

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
| Settings | Who sees anything, reminder time, which notifications you want, language, add reminder to Google Calendar |
| **Circle** | Who has access, what each of them sees, and the way to change or stop it |
| Invite | Choose what a link will carry, then get the link to send |
| Join | The other side of that link: what you will see, before you accept |
| **Calendar** | Your week, today in the middle. Plan something, or repeat it daily, weekly or on weekdays |
| Suggestions | What someone else offered, waiting for you to decide |
| **Shared** | What you finished or wrote, and what your circle said back |
| Who you follow | For a supporter: the people who share with them, their feed, and their calendar |
| **Console** | For a clinician: the people who gave them access, then one person's chart, diary, adherence and medication |
| Crisis | Three Belgian phone numbers, tappable, works with no internet |

Everything is built. What remains is hardening and the pilot.

### What gets shared, and what never does

Finishing something you planned **posts it to your feed automatically**, for
whoever you gave feed access to. They can react — heart, applause, proud — and
say something back.

**Ticking off medication shares nothing.** Not a post, not a notification, not
a trace. What a person takes is between them and their clinician, and a feed
item for every pill would turn taking your medication into a performance for
your family. This is enforced where the sharing decision is made, not left to
each screen to remember.

Auto-sharing can be switched off in one tap. With it off the app works exactly
as before, and nothing asks about it again.

**Reactions are warm only.** There is no thumbs-down, no sad face, nothing
that can read as disapproval — and the database refuses one even if the app is
bypassed. Not because disapproval never happens, but because reading a
thumbs-down from your mother at 2am is a harm this product will not create.

### Suggesting, not placing

Someone in the circle with calendar access can **offer** something. It never
lands on the day. It waits in a separate, quiet tray until the person says
yes, and the app calls it what it is: *someone in your circle suggested this,
you decide whether it happens.*

Family wanting to help and a person needing to control their own day is the
central tension of this whole product, and this is where it is settled. A
supporter can suggest and nothing else — not place, not accept their own
suggestion, not edit what was planned.

**Declining is silent, and that is enforced rather than promised.** Nobody is
notified, and the person who suggested it cannot read a declined item at all —
so there is nothing to check and nothing to infer from silence. The person
keeps their own record of what was offered.

### After doing something

Ticking something off may be followed by two short questions: how did it feel,
and how hard was it. Both are optional, both are dismissible, and the tick is
already saved before they appear — so closing them loses nothing.

This is the point of the calendar rather than a decoration on it. Noticing
that something you expected to be hard turned out to be fine is the
observation that changes what you do next; a to-do list cannot show you that.

Nothing counts anything. There is no "two of three", no bar, and a day with
nothing ticked says only that nothing is ticked. A completed item goes quiet
and **stays exactly where it is** — things that vanish or slide on completion
are reward mechanics.

The console shows the person exactly the same chart the person sees
themselves — one component, used twice — because at an appointment the two of
them are looking at one picture, and two implementations would drift until
they were not. The sentence above the chart is the same in both: *this is not
a conclusion, this is what you wrote down.*

### How someone joins

The patient makes a link. The link carries a code, and the code is the whole
key — anyone holding it can accept, which is exactly how sharing a link works.
It lasts seven days and works once.

Opening it while signed out is fine: the code is held while you sign in and
make an account, then you land back on the invitation. Before accepting, the
screen lists what you will be able to see, in the same plain sentences the
patient chose from. Accepting writes one card, carrying **exactly** what the
patient put in the link and nothing more.

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

  Activities            what is planned, who suggested it, whether it
                        was accepted, and whether it repeats

  Completions           one per activity per day, with the optional
                        two answers about how it went

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

| Toggle | In plain words | Offered to |
|---|---|---|
| Check-ins | Can see how you felt | Anyone |
| Medication | Can see what you take and whether you took it | **Care team only** |
| Health | Can see what your watch reported | Anyone |
| Feed | Can see what you share, and can respond | Anyone |
| Calendar | Can see your calendar and suggest something | Anyone |

The permissions screen shows these as sentences, never as toggle names.
Nobody meaningfully agrees to "checkins: true".

**A new supporter starts with feed and calendar only** — not everything. An
invite sent on a bad day should not hand over a clinical record by accident.
Widening it afterwards takes two taps; unsending a link that already handed
over a clinical record is not possible at all.

### The single most important rule in the system

**Only the patient can change these cards. Nobody else can touch them at
all** — not to add themselves, not to widen what they see, not to undo being
removed.

This is not a preference. During an episode the temptation for a worried
family member to give themselves more access is real, and the whole product
depends on that being impossible. It is enforced by the database itself, not
by the app being polite, and there are automated tests that specifically try
to break it — including a supporter attempting to grant themselves check-in
access, and someone trying to un-revoke themselves after being cut off.

Both were also tried by hand, from a real browser against a real database,
and both were refused.

**Stopping access ends everything at once.** The card keeps a record of what
that person could once see, but while it is stopped none of it applies — so
there is no gap between changing your mind and it taking effect. If you stop
someone by accident you can let them back in; they cannot let themselves back
in.

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
| Circle screens — invite, permissions, revoke | Working |
| Clinician console, with the medication editor | Working |
| Calendar, suggestions, and the after-the-fact questions | Working |
| Feed, auto-shared completions, warm reactions | Working |
| Watch and phone data | After the Android app |

The daily reminder is written and tested but not switched on, because turning
it on means paying for the server side and that has not been needed yet.
