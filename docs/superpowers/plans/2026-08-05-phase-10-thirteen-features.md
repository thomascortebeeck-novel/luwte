# luwte Phase 10 — thirteen features, reviewed against the architecture

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans.

**Goal:** Take thirteen requests, check each one against what is actually built,
and say honestly which are cheap, which are expensive, which need a decision
from Thomas before anybody writes code, and which cannot be built in a PWA at
all.

**Two of these reverse things CLAUDE.md currently calls non-negotiable.** They
are marked ⚠ and must not be built until Thomas has said so, because "quietly
implemented the opposite of the stated rule" is the worst possible outcome.

---

## The short answer, per feature

| # | Feature | Fit | Cost | Blocked on |
|---|---|---|---|---|
| 2 | Comment / actual dose taken | excellent — `doses/` is already the patient's alone | S | — |
| 10 | Light theme the user can choose | **already built, no switch** | XS | — |
| 8 | Is the invite link working | needs a re-walk, `forUid` touched that rule | XS | — |
| 9 | Google sign-in | easy; one privacy note for consent | S | — |
| 12 | Firebase Hosting | hosting target already exists | S | — |
| 4 | Fewer, better check-in questions | breaking model change — **do it before the pilot** | M | — |
| 6 | Real recurring events | pure functions, well fenced | M | — |
| 13 | Day and week calendar views | `startTime` already exists | M | — |
| 7 | One question after an activity, or two | research says keep two, ask less often | S | — |
| 5 | Diary prompts, breathing | safe subset only — see the meditation warning | M | — |
| 1 | ⚠ A nurse / assistant role | mostly free, one hard decision inside it | M | **Thomas** |
| 3 | ⚠ Sharing doses with chosen family | reverses a stated non-negotiable | L | **Thomas** |
| 11 | Heart rate and sleep from a watch | **impossible in the PWA** | L | Android app |

---

## ⚠ The two that need a decision first

### 3 — Family seeing medication and doses

CLAUDE.md currently says, twice, in the non-negotiables:

> **Doses are never shared.** No post, no notification, no trace.
> **Family and friends never see medication or doses**, whatever a circle
> document says.

And the rules enforce it in two independent places: `permissionsForRole` never
offers a supporter the toggle, and `canReadClinical` checks `role == 'clinician'`
so a card carrying `medication: true` still grants nothing.

**The request is the opposite, and its reasoning is also right.** "The patient is
in full control" is the deeper principle; a blanket ban is the app deciding for
the person. Both positions have force and only Thomas can settle it.

**Recommendation — grant it, but keep the two things that made the ban work:**

1. **Split the permission in two.** `medication` (what is prescribed) and
   `doses` (whether it was taken) are clinically different questions, and
   CLAUDE.md already distinguishes them. A person may well want a partner to
   see what they take and not whether they took it.
2. **Never in the feed.** `shouldPostCompletion` keeps refusing doses. Being
   allowed to look is not the same as being told — a notification per pill is
   what turns adherence into a performance, and that was the real harm.
3. **Widening a clinical permission gets a confirmation naming what it means**
   ("Je broer ziet dan welke medicatie je neemt en of je ze nam"), and every
   permission change is written to a log the person can read back. Narrowing
   stays instant and silent. This is the honest answer to "full control on a
   bad day": you cannot both give someone real control and protect them from
   themselves, but you can make sure they were told plainly and can see later
   what they agreed to.

The correlation view the request describes — mood against medication — is the
existing chart with `showMedication`, so it needs no new component once the
permission exists.

**Cost: large.** The permission model, the rules, every rules test that asserts
the current refusal, and a permissions screen that has outgrown a flat list of
five sentences.

### 1 — A nurse or assistant

Most of this is nearly free, because the rules already separate the three
things that matter:

- `canReadClinical` — reading medication
- `isPrescriber` — writing it, which additionally requires `isVerifiedClinician()`
- the activity `create` branch — placing something on the calendar

So a `nurse` role needs `circleRoleSchema` to gain a value, `canReadClinical`
to accept it, and **nothing at all** to stop them prescribing: `isPrescriber`
already requires `role == 'clinician'`.

Two things do need deciding.

**(a) May a nurse read medication?** Recommendation: **yes, read-only.**
Somebody planning a week who cannot see there is a sedating antipsychotic at
20:00 will plan badly.

**(b) May a nurse place activities directly, rather than suggest?**
Recommendation: **no** — and this is the one worth arguing about, because the
request implies yes.

*"A supporter may offer, never place"* is not a detail. PRD 6.3 and D21 call it
the resolution of the central tension of the product, and a role that writes
onto somebody's day directly is a different product for the person living in
it. The ergonomic problem is real though — accepting fourteen suggestions one
at a time is miserable. So: give a nurse **"suggest a week"**, one action
producing a set, and the patient accepts the set with one tap. Same invariant,
none of the tedium.

**(c) Verification.** A nurse who can read medication must be verified by an
admin like a clinician, or the D23 protection is bypassed by naming your
brother a nurse. `clinicianIsVerified()` generalises to `careRoleIsVerified()`
covering both roles. `verpleegkundige` is already in `disciplines`.

---

## 11 — Heart rate and sleep: the advice you asked for

**Collect it. Never show a cardiac number to the person. Never go near ECG.**

Four reasons, in order of how much they should change your mind.

**1. It cannot be built in the PWA at all.** The web has no access to HealthKit
or Health Connect; there is no browser API for a watch's heart rate. This
feature *requires* the Android app, which is already scheduled after the pilot.
Nothing about it is a v1 decision, and planning it as one would waste the
effort. What v1 can do is accept typed sleep hours, which it already does.

**2. The evidence supports collecting it.** Recent work predicts psychotic
relapse from activity plus heart-rate-variability profiles (AUPRC 0.711 against
a 0.651 baseline in one 2025 study), and a 2025 scoping review covers 42 studies
of passive sensing with wearables and phones. Sleep and activity are the
strongest and simplest of these signals.

**3. The BRAND rule was about display, not collection — and it was right.**
"Uninterpreted cardiac data is harmful in both directions" describes exactly
what showing a number does: a resting rate of 96 shown to an anxious person
starts a spiral, and a normal one shown to somebody genuinely unwell is false
reassurance. Storing it, and letting a clinician who can interpret it see it
under the existing `health` permission, has neither harm. So amend BRAND to
distinguish four things it currently collapses: **collect / show the person /
show the clinician / infer from**.

**4. ECG is a hard no, and so is a relapse predictor — on regulation, not
taste.** Under EU MDR, what makes software a medical device is its *intended
purpose*. Anything presented as detecting a cardiac condition is diagnostic;
anything presented as "you may be relapsing" is clinical monitoring. Either
pulls luwte out of the wellness exemption and into Class IIa with a notified
body, which is not survivable for a solo part-time build. Collect the data,
show it in context to a clinician, and **do not ship a predictor**. That is
also, conveniently, exactly what "a logbook and a nudge, not a doctor" means.

---

## 11 revisited — Garmin, and who sees the data

**Thomas chose to collect it, via API, starting with Garmin.** That routes
around the blocker above, and it is worth being precise about why: HealthKit
and Health Connect are *on-device* APIs, which no browser can reach. Garmin's
is a **cloud** API. So the PWA is no longer the obstacle. Three other things
are.

**It needs a server, and therefore Blaze.** Garmin's program uses OAuth 2.0
with a client secret, and delivers data by pushing to a callback URL. Neither
can live in a browser: a client secret in a bundle is not a secret, and a
webhook needs somewhere to arrive. That means Cloud Functions, which means
billing on — reversing the standing decision (D15) that has kept this project
free. It is the first feature that genuinely requires it, and that is a real
cost rather than a technicality: `functions/` is currently written but never
deployed precisely so nothing on the critical path depends on one.

**It needs Garmin's approval, and it is aimed at businesses.** Their FAQ is
plain that the program is "for enterprise use", with no licensing or
maintenance fee for access but a possible fee or minimum device order for some
metrics. Applying is the first step, not building. (A third-party blog claims
the program is currently suspended; Garmin's own FAQ invites applications and
says they review quickly, so treat the claim as unconfirmed.)

**It adds a data processor to an Article 9 system.** Wearable data about
somebody with a psychosis history is special-category data arriving from a
third party. That needs a lawful basis, a consent item of its own, and a line
in the consent record — not a silent extension of the existing health grant.

### Who sees it — the answer

**The patient, always. This is not ours to grant, and not a doctor's either.**

The question was whether the doctor should give the patient access, or the
patient decide for themselves. The first option is not actually available:
under GDPR Art. 15 a person has a right of access to their own personal data,
so a design where a clinician decides whether somebody may see their own heart
rate is not a product choice, it is non-compliance. The patient decides — for
themselves and for everyone else. That is also just the product's own rule.

But **"may see" and "is shown a number" are different questions**, and the
BRAND warning was about the second. So, per datum:

| | The patient | A verified clinician | A supporter |
|---|---|---|---|
| **Sleep duration** | shown plainly | under `health` | grantable, off by default |
| **Resting heart rate, HRV** | **stored, not charted by default** — switchable on in settings | under `health` | grantable, off by default |
| **ECG result, rhythm, Garmin's own alerts** | stored, off by default, switchable on | under `health` | **never offered** |

The middle row is the whole of it. A resting rate of 96 shown unprompted to an
anxious person starts a spiral, and a normal one shown to somebody genuinely
unwell is false reassurance — both harms come from *displaying an
uninterpreted number*, not from holding it. So it is off by default and the
person can turn it on, with copy that says why it was off. Refusing to show
someone their own data would be paternalism; showing it unasked would be the
harm BRAND named. Letting them choose is the only position consistent with
both.

**The access-control side needs almost nothing new.** `health` already exists
as a permission, already reads *"Kan zien wat je horloge doorgaf"*, and already
resolves through the circle. What is new is the ingestion tier, not the rules.

### ECG, rhythm and alerts — the line is not where I first drew it

Thomas asked for these too, and on a second look **"never touch ECG" was too
broad.** The distinction that matters is not *which* data, it is **who draws
the conclusion**.

Under EU MDR what makes software a medical device is its *intended purpose*,
and MDCG 2019-11 is explicit that software performing **storage, archival,
communication or simple search, without modifying the data**, is not medical
device software. Garmin's ECG feature is itself a regulated, CE-marked device
that produces an already-interpreted result — "sinus rhythm", "atrial
fibrillation". luwte receiving that result and showing it verbatim is a
conduit. luwte *deciding* something about a waveform is not.

So:

| luwte does this | Verdict |
|---|---|
| Stores Garmin's ECG result and shows it unchanged, attributed to Garmin | conduit — carry it |
| Relays an alert **Garmin generated** | conduit — carry it |
| Generates its own alert from heart-rate or HRV data | **medical device, Class IIa** |
| Says "your rhythm looks abnormal" in its own voice | **medical device, Class IIa** |
| Says "you may be relapsing" | **medical device, Class IIa** — clinical monitoring |

**The rule to hold, and the one to write on the wall: luwte may carry a
conclusion somebody else is licensed to draw, and may never draw one.** Every
cardiac item is shown attributed — *Garmin, 14 augustus* — never in luwte's
own voice, because the attribution is what keeps it a conduit.

Two consequences worth stating plainly.

**It is never offered to a supporter**, unlike the other health items. A
family member reading "atrial fibrillation" about somebody they love, with no
way to interpret it and no clinician in the room, is the harm BRAND named,
arriving through a third party's words instead of ours.

**And it stays off by default for the person too.** A CE-marked interpretation
is not the same as an uninterpreted number, so the BRAND objection is weaker
here than for a raw resting rate — but "AFib detected" landing on somebody
mid-episode is still a real harm, and the point of the default is that they
meet it when they have chosen to, not when the app decides.

**Unchanged and still refused: a relapse predictor.** That is luwte drawing the
conclusion, which is the one thing the table above forbids — and it is also the
line the product's own principle draws. A logbook and a nudge, not a doctor.

**To confirm at application time:** whether the Health API exposes ECG at all.
It certainly carries heart rate, HRV, sleep, stress and respiration; ECG may
sit behind a different agreement or not be available to partners. Worth asking
Garmin directly rather than designing around an assumption.

---

## 4 — The check-in questions, from the research

Today: mood, energy, sleep hours, how rested, restlessness, flatness, plus a
line of text. Weekly: restlessness, stiffness, drowsiness, hopelessness.

**Daily goes from six scales to three.** The circumplex model of core affect
holds that two orthogonal dimensions — **valence** (pleasant to unpleasant) and
**arousal** (activated to deactivated) — span momentary affect. Mood is valence.
Energy and restlessness are both arousal, differing only in valence, which is
why they feel redundant: they are.

But **flatness stays, as its own question.** It is not a point on the
circumplex, it is the absence of response. It is the core negative symptom in
psychosis, a core depression symptom, and the thing antipsychotics blunt — which
makes it precisely the item that changes an appointment. The Maastricht ESM
tradition (PsyMate, the Dutch-language standard for psychosis) keeps positive
and negative affect separate for the same reason.

So: **valence, arousal, flatness, and the line of text.** Half the questions,
none of the clinical signal.

**Sleep: take duration automatically, drop "how rested".** Duration from a watch
is reliable. *Quality* is not — consumer sleep staging validates weakly against
polysomnography — so an automatic "how rested" would be a guess presented as a
fact. And as a question it is largely absorbed by valence and arousal. Until the
Android app exists, duration stays typed.

**Weekly: keep the four, add a monthly six.** The current four map onto
akathisia, parkinsonism, sedation and suicidality, which are the right domains.
The reference instrument is **GASS**, the consensus patient-reported measure for
antipsychotic side effects — 22 items, about five minutes, too long for weekly
use, but its domains are the map. Its validation study found sedation and
akathisia had the *lowest specificity* of all items, meaning self-report
over-flags them — which argues for treating them as prompts to discuss and never
as scores. That is already how luwte works, and it should stay that way.

What is missing and matters: **sexual side effects, and weight or appetite.**
They are among the top reasons people stop antipsychotics and neither is asked.
Put them in a **monthly** six-item pass rather than growing the weekly one, so
the weekly stays four.

**On screen time and dependency.** Three scales plus optional text is about
twenty-five seconds. Explicitly reject multi-beep ESM — PsyMate beeps ten times
a day because it is a research instrument, not a life. One evening prompt, no
chasing, nothing said on a missed day: unchanged.

**Sequencing note: this is a breaking change to `checkins/`, and it must land
before the pilot.** After a family has three months of entries it becomes a
migration of real health records. `dayUnrest` reads `restlessness` and the
windline depends on it, so that comes with it.

---

## 7 — One question after an activity, or two

**Keep two, ask them less often.**

Mastery and pleasure are the two dimensions behavioural activation is built on,
and they come apart: some activities give mastery without pleasure and some the
reverse, with a balanced blend predicting the largest drop in depression.
Collapsing to one throws away the distinction that makes the record worth
keeping.

There is a sharper finding: *expected* mastery and pleasure — what you thought
it would be like when you planned it — contributed more than what was obtained.
Which is the same observation the product already claims for itself: *noticing
that something you expected to be hard turned out to be fine is what changes
what you do next.* The literature says that mechanism is real, so the two
questions stay.

The friction concern is still right, so:

- Ask after the **first** completion of an activity, then only occasionally. A
  repeat of Tuesday's walk needs no re-rating.
- Optionally capture the **expected** rating when a *new* activity is planned.
  One extra tap, and it makes the expectation-versus-outcome comparison real
  instead of implied.

---

## 5 — Diary prompts and exercises, with one safety limit

**Gratitude prompts: fine, low value, low risk.** The evidence in clinical
depression is weak-to-modest and mostly from non-clinical samples. It costs
almost nothing — preset questions above the diary line that already exists.

**Breathing and grounding: yes. Open-ended meditation: no.** Meditation-induced
psychosis is documented, and the risk factors are intensive practice, retreat
conditions, sleep deprivation, and a prior history of psychosis — which is
luwte's user. The counter-evidence is real too: adapted mindfulness for
psychosis shows benefit and adverse events in trials are rare. The line that
reconciles them is **short, guided, externally-focused, eyes-open** practices are
safe; long silent unguided sitting is where the case reports come from.

So ship a timed breathing animation and grounding exercises. Do not ship a
meditation timer or body-scan content.

**No video.** Cloud Storage means billing, and an embedded third-party player
means a new data processor and tracking on an Article 9 app. Text plus an
on-device animation gives the same thing and keeps both constraints.

**What else has evidence, and fits:** a **personal early-warning-signs plan** —
the person's own list of what their first signs are and what they do about them
— is standard psychosis relapse prevention and suits luwte better than anything
else on this list. Behavioural activation is already the calendar.

---

## The cheap ones

**10 — Light theme.** Already built: `[data-theme='light']` has a full palette,
`readStoredTheme`/`storeTheme` persist it, and `contrast.test.ts` asserts its
ratios. **There is simply no switch in Settings.** That is the whole task.

One decision: the light background is `#eaeeec`, a soft off-white, not the pure
white asked for. Pure white is harsher, which matters for somebody on sedating
medication — and changing it moves every contrast ratio, so `contrast.test.ts`
has to be re-run either way. Recommendation: add the switch now, treat pure
white as a separate call.

**8 — The invite link.** It was walked end to end in Phase 6.2 and passed. It
has 13 UI tests and a block of rules tests. But `forUid` has since touched
`redeemable()`, and while there is a test asserting a bearer link still works,
that deserves a real walk rather than a claim.

**9 — Google sign-in.** Straightforward; the emulator mocks the provider so
local development still needs no Firebase project. One honest note: signing in
with Google tells Google this person uses luwte, which for an Article 9 app is a
real disclosure. PRD 5.5 chose email deliberately. Add it as an equal option,
say so in the consent copy, keep email working.

**12 — Firebase Hosting.** The target already exists — `pnpm emulators` serves
hosting on 5000 from `apps/web/dist`. What is missing: a deploy of rules and
indexes alongside (the `clinicianDirectory` composite index added in Phase 9 is
not deployed anywhere), security headers, and a GitHub Actions workflow.
Hosting is free on Spark so `luwte-dev` needs no billing. **Prod deploy stays a
human action** per the standing rules — dev deploys on merge, prod does not.

---

## 6 and 13 — the calendar, done together

**Recurrence.** `recurrence` is already stored as an rrule string, deliberately,
so the field would not have to change — but only three values are ever parsed.
Extend to a real subset of RFC 5545: `FREQ` (DAILY/WEEKLY/MONTHLY/YEARLY),
`INTERVAL`, `BYDAY`, and `UNTIL` or `COUNT`. Standard rather than a growing
enum, and it is what a calendar export would need anyway. Expansion is already
pure and client-side (`occursOn`, `onDay`), so this is contained, testable work
in `packages/core`.

**Views.** `startTime` already exists on an activity and is optional. So:

- **Day (default):** an agenda for one day — timed items in order, untimed ones
  below.
- **Week:** seven columns of chips.

Deliberately **not** a Google-Calendar time grid. A grid of empty hours is a
visual reproach on a bad day, and most activities here have no time at all. Take
from Google Calendar the *navigation* — a persistent day/week switch, today
always reachable in one tap — not the empty grid.

---

## Priority

**First, because they are small and the pilot needs them:**
1. **10** light-theme switch · **8** re-walk the invite · **9** Google sign-in ·
   **12** hosting. Together these are roughly one phase and they are what makes
   a pilot possible with people who are not sitting at your laptop.
2. **2** actual dose and comment. Small, no invariant touched, and the highest
   clinical value per line of code on this whole list — a psychiatrist can
   already see *whether* a dose was taken and never *what was actually taken*.

**Second, because delay makes it expensive:**
3. **4** the check-in redesign. Every week of pilot data written in the old
   shape makes this a migration of real health records instead of an edit.

**Third, the substance:**
4. ~~**6 + 13 + 7** the calendar as one piece of work.~~ **Done 2026-08-05.**
   Recurrence is a real RFC 5545 subset; the calendar is a day view and a week
   view of one anchor date; the completion question keeps both halves and
   appears the first time then every fifth, with the *expected* rating
   captured at planning time. Seven columns was built and removed after
   measuring — 83px inside the reading measure.
5. ~~**5** diary prompts, breathing, early-warning-signs plan.~~ **Done
   2026-08-05.** Breathing and grounding ship; no meditation timer, no body
   scan, no video. The diary question rotates. The early-warning-signs plan
   has its own permission, and luwte never matches anything against it.

**Fourth, once Thomas has decided:**
6. ~~**3** granular sharing · **1** the nurse role.~~ **Both done 2026-08-05**
   (D29, D30).

**Last, and blocked on Garmin plus a Blaze decision:**
7. **11** watch data. Design settled above; nothing to build until an
   application is approved and billing is turned on somewhere.

---

## Sources

- [Behavioral activation: is it the expectation or achievement of mastery or pleasure?](https://pubmed.ncbi.nlm.nih.gov/29906719/)
- [Glasgow Antipsychotic Side-effect Scale, clinical validation against UKU](https://pubmed.ncbi.nlm.nih.gov/32500804/)
- [Experience sampling methodology in mental health research (Myin-Germeys, World Psychiatry)](https://onlinelibrary.wiley.com/doi/full/10.1002/wps.20513)
- [Relapse prediction from wearable data in psychotic disorders (Scientific Reports, 2025)](https://www.nature.com/articles/s41598-025-03856-1)
- [Passive sensing for mental health monitoring: scoping review (JMIR, 2025)](https://www.jmir.org/2025/1/e77066)
- [Psychosis triggered by intensive meditation: case report and risk factors (BJPsych Open)](https://www.cambridge.org/core/journals/bjpsych-open/article/psychosis-triggered-by-intensive-meditation-a-case-report-and-review-of-risk-factors/8AEC909B877D26747DAC0896EB3F9C21)
- [Is mindfulness for psychosis harmful? Deconstructing a myth (BJPsych)](https://www.cambridge.org/core/journals/the-british-journal-of-psychiatry/article/is-mindfulness-for-psychosis-harmful-deconstructing-a-myth/C06294A7E3B18A5C97661BFA64EDC410)
- [MDCG guidance on qualification and classification of software](https://health.ec.europa.eu/document/download/b45335c5-1679-4c71-a91c-fc7a4d37f12b_en)
