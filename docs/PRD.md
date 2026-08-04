# PRD — Luwte

**Version:** 0.2
**Platform:** Android (Kotlin / Jetpack Compose) + web console (clinician)
**Stack:** Firebase / Google Cloud, `europe-west1`
**Market:** Belgium (Flanders first), Dutch language
**Companion document:** `BRAND.md` — read it before writing any UI

---

## 1. Problem

People recovering from psychosis and depression are failed by three gaps:

1. **Motivation does not come before action.** Depression removes the drive to do the things that would help. Waiting to feel like it means nothing happens.
2. **The care team is blind between appointments.** A psychiatrist sees twenty minutes every six weeks and relies on recall, which depression and medication distort. Emotional blunting in particular goes unreported, because the person can no longer tell it is unusual.
3. **Family carries the load without structure.** Relatives visit daily, worry constantly, and have no way to help that isn't nagging.

The gap is not more therapy content. It is a **shared, low-effort record between the person, their family, and their clinician**, plus a small daily structure that produces momentum.

---

## 2. Product principle

> Luwte is a **logbook and a nudge**, not a doctor.

Every decision follows from this. Luwte never diagnoses, never says "you are relapsing", never generates a treatment plan on its own. It surfaces what a person wrote to humans who decide. This is an ethical stance and it is also what keeps the product outside medical device regulation (§11).

Supporting principles:

- **Under 60 seconds a day.** Daily burden is the number one cause of abandonment. Every added field must earn its place.
- **Never punish a miss.** No streaks, no red marks, no guilt. A missed day is invisible.
- **The person owns their data.** Granular, revocable, per-supporter sharing. Default is minimal.
- **Android only in v1.** Android exposes both Health Connect and app-usage APIs; iOS effectively withholds the second. One platform, one permission model, no feature designed twice. The clinician console is web, so it works everywhere.

---

## 3. Roles

| Role | Sees | Does |
|---|---|---|
| **Patient** | Everything about themselves | Check-in, completes Today, posts, manages circle and all permissions |
| **Supporter** (family, friend, peer) | Only what the patient granted, per person | Kudos, comments, suggests activities |
| **Clinician** | Check-ins, adherence, side effects — only after patient grant | Manages medication list, reviews trends, exports PDF |
| **Admin** | No patient content, ever | Clinician verification, account support |

A patient may have many supporters and many clinicians. A supporter may support several patients. Peer patients are a variant of Supporter in v1, not a separate role.

---

## 4. Scope

### v1

| # | Feature | §  |
|---|---|---|
| 1 | Daily check-in | 6.1 |
| 2 | Today (medication, activities, optional practices) | 6.2 |
| 3 | Calendar | 6.3 |
| 4 | Circle, sharing permissions, feed, kudos | 6.4 |
| 5 | Health Connect import — sleep and activity | 6.5 |
| 6 | Insights, windline, PDF export | 6.6 |
| 7 | Clinician console | 6.7 |
| 8 | Crisis screen | 6.8 |

### Deferred, not dropped

| Feature | Phase | Why |
|---|---|---|
| Chat (supporters, then care team) | 2 | Needs a stated response window and a crisis path first (§10) |
| App/phone usage tracking | 2 | Needs months of personal baseline before it means anything (§9) |
| Early warning signs plan | 2 | Needs clinician co-authoring |
| Carer burnout support | 2 | — |
| Auto-generated action plans | 3 | Likely triggers EU MDR classification (§11) |
| Cross-patient peer network | 3 | Requires moderation capacity |
| iOS | 3 | After the product is proven |
| Streaks, points, gamification | Never | Actively harmful in this population |

---

## 5. Technical architecture

### 5.1 Stack

| Layer | Choice | Region |
|---|---|---|
| Android app | Kotlin, Jetpack Compose, MVVM | — |
| Auth | Firebase Authentication (email link + password) | see §5.5 |
| Database | Cloud Firestore, native mode | `eur3` (Europe multi-region) |
| Backend logic | Cloud Functions for Firebase, 2nd gen (Node 20 / TypeScript) | `europe-west1` |
| File storage | Cloud Storage for Firebase (PDF exports) | `europe-west1` |
| Notifications | Firebase Cloud Messaging | — |
| Scheduled jobs | Cloud Scheduler → Pub/Sub → Cloud Function | `europe-west1` |
| Abuse protection | Firebase App Check (Play Integrity) | — |
| Clinician console | React + Vite, Firebase Hosting | — |
| Feature flags | Firebase Remote Config | — |
| Crash reporting | Crashlytics, **PII stripped** | — |
| Secrets | Secret Manager | `europe-west1` |
| Health data | Health Connect (`androidx.health.connect`) | on-device |

`europe-west1` is St. Ghislain, Belgium. Data stays in the country the users live in, which is worth something both legally and in the consent conversation.

**Firebase Analytics is disabled.** Google Analytics for Firebase cannot be configured for EU-only processing and mixing behavioural analytics with special-category health data is not a defensible position. Product metrics (§12) come from Firestore aggregates written by our own Cloud Functions.

### 5.2 Firestore data model

```
users/{uid}
  role            'patient' | 'supporter' | 'clinician' | 'admin'
  displayName     string
  locale          'nl-BE'
  fcmTokens       string[]
  createdAt       timestamp

patients/{patientId}                      // patientId == uid of the patient
  displayName     string
  checkinHour     number    // 0-23, the hour their reminder fires
  timezone        'Europe/Brussels'
  healthConnect   { enabled: bool, grantedAt: timestamp, types: string[] }
  onboarded       bool

  /checkins/{yyyy-MM-dd}
    date          string
    mood          1..7
    energy        1..7
    sleepHours    number          // may be prefilled from health import
    sleepRested   1..7
    anxiety       1..7
    flatness      1..7            // "kon je vandaag iets voelen"
    note          string?         // free text, the person's own words
    source        'manual' | 'prefilled'
    createdAt     timestamp

  /weekly/{yyyy-'W'ww}
    restlessness  1..7            // akathisia screen
    stiffness     1..7
    sedation      1..7
    hopelessness  1..7
    createdAt     timestamp

  /medications/{medId}
    name          string
    dose          string
    times         string[]        // ['08:00','20:00']
    purpose       string          // plain language, clinician-authored
    activeFrom    timestamp
    activeTo      timestamp?
    authoredBy    uid             // clinician
    changeLog     [{ at, field, from, to, by }]

  /doses/{yyyy-MM-dd_medId_HHmm}
    medId, scheduledAt, takenAt, status: 'taken'|'skipped'|'pending'

  /activities/{activityId}
    title         string
    startAt       timestamp
    withPerson    string?
    createdBy     uid
    status        'suggested' | 'accepted' | 'declined'
    recurrence    rrule?

  /completions/{activityId_yyyy-MM-dd}
    completedAt   timestamp
    pleasure      1..7?           // behavioural activation
    mastery       1..7?
    postedToFeed  bool

  /health/{yyyy-MM-dd}
    sleepStart, sleepEnd, sleepMinutes, sleepFragments
    steps, activeMinutes
    syncedAt, sources: string[]

  /posts/{postId}
    activityId?, text?, createdAt
    /reactions/{uid}  { type: 'heart'|'clap'|'proud', at }
    /comments/{commentId} { authorUid, text, at }

  /circle/{memberUid}
    role          'supporter' | 'clinician'
    relation      string?         // 'broer', 'psychiater'
    permissions   {
                    checkins: bool,
                    medication: bool,
                    health: bool,
                    feed: bool,
                    calendar: bool
                  }
    grantedAt, revokedAt?

invites/{code}
  patientId, role, permissions, createdAt, expiresAt, usedBy?

clinicians/{uid}
  verified bool, riziv string?, organisation string
```

**Design notes.**
Check-ins are keyed by date string, not auto-ID — this makes one-per-day idempotent and makes offline writes safely mergeable. Permissions live on the patient's own subtree so the patient's document is the single source of truth for access, and security rules can resolve any read in one `get()`.

### 5.3 Security rules — the logic

The circle document *is* the access control list. Every read of patient data resolves through it.

```
function circle(pid) {
  return get(/databases/$(db)/documents/patients/$(pid)/circle/$(request.auth.uid)).data;
}
function isSelf(pid)  { return request.auth.uid == pid; }
function granted(pid, key) {
  return exists(circle path) && circle(pid).revokedAt == null && circle(pid).permissions[key] == true;
}
```

| Path | Read | Write |
|---|---|---|
| `checkins/**` | self, or `granted(pid,'checkins')` | self only |
| `weekly/**` | self, or `granted(pid,'checkins')` | self only |
| `medications/**` | self, or `granted(pid,'medication')` | verified clinician in circle; patient may not edit clinician-authored fields |
| `doses/**` | self, or `granted(pid,'medication')` | self only |
| `activities/**` | self, or `granted(pid,'calendar')` | self; supporters may create with `status:'suggested'` only |
| `health/**` | self, or `granted(pid,'health')` | self only (written by the app after Health Connect read) |
| `posts/**` | self, or `granted(pid,'feed')` | self creates posts; circle members create reactions and comments |
| `circle/**` | self, and each member reads own doc | **self only** — nobody can grant themselves access |

The last row is the one that matters. A family member must never be able to widen their own access, and during an episode the temptation to do so is real.

### 5.4 Cloud Functions

| Function | Trigger | Does |
|---|---|---|
| `onInviteRedeem` | callable | Validates code, writes `circle/{uid}`, expires the invite |
| `sendCheckinReminder` | scheduler, hourly | Finds patients whose `checkinHour` == current local hour with no check-in today, sends one FCM. **Sends once. Never chases.** |
| `sendDoseReminder` | scheduler, every 15 min | Fires medication reminders from `medications.times` |
| `onPostCreate` | Firestore trigger | Notifies circle members with `feed` permission |
| `onReactionCreate` | Firestore trigger | Notifies the patient — this is the one notification allowed to be warm |
| `generateReport` | callable | Renders the appointment PDF, writes to Cloud Storage, returns a signed URL valid 15 minutes |
| `exportMyData` | callable | GDPR Art. 20 — full JSON export |
| `deleteMyData` | callable | GDPR Art. 17 — cascading hard delete, 30-day grace |
| `revokeCircleMember` | Firestore trigger | On `revokedAt` set, purges that member's cached access and FCM subscriptions |

### 5.5 Known compliance gap: Firebase Auth residency

Firestore, Functions, and Storage can be pinned to Europe. **Firebase Authentication cannot** — auth records may be processed outside the EU. Options, in order of preference:

1. Store only an opaque email in Auth and keep all identifying and health data in Firestore under a pseudonymous `uid`. Auth then holds no special-category data. **Recommended for v1.**
2. Migrate to Google Cloud Identity Platform, which offers data-residency configuration on some tiers.
3. Self-hosted auth. Not worth it at this stage.

Document whichever choice is made in the DPIA. Do not skip this.

### 5.6 Offline

Firestore offline persistence enabled. The check-in and the Today checklist must work fully offline — a phone with no credit or no signal is common in this population. Show the offline copy from `BRAND.md` §4.2, queue the write, sync silently. Never block the check-in on the network.

---

## 6. Features and logic

### 6.1 Daily check-in

**Fields.** Mood, energy, sleep hours, how rested, anxiety, flatness — each 1–7, faces or a slider, never a visible number. Plus one optional free-text line.

**Flatness is the most important field in the product.** Medication-induced emotional blunting is the complaint that motivated Luwte, it is absent from standard scales, and making it visible over time is what turns "he seems numb since the dose change" into something a psychiatrist can act on.

**Logic.**
- One check-in per calendar day, keyed by local date. Editable until midnight, then locked.
- Reminder fires once at `checkinHour`. If missed, **nothing happens.** No second push, no badge, no catch-up prompt, no visible gap in the history.
- Sleep hours pre-fill from `health/{date}` if present. The person confirms rather than types. This removes a field from the daily burden and is the main argument for the health integration.
- A back-fill is allowed for yesterday only, reachable from Insights, never pushed.

**Weekly extra.** On the same day each week, four more items appear inline after the daily ones: restlessness, stiffness, sedation, hopelessness. The first three screen for akathisia and parkinsonism, both routinely mistaken for depression. Adds about 15 seconds, once a week.

**Hopelessness handling.** If the hopelessness item is at the top of the scale, the app shows the crisis screen (§6.8) once, calmly, with no alarm language and no notification to anyone. It does not alert the circle. Automatic escalation to family would make people stop answering honestly, which costs more than it gains.

### 6.2 Today

The home screen. Three sections:

1. **Medication** — clinician-authored, with a plain-language line on what each is for. Checkbox. Writes a `doses` record.
2. **Planned activities** — from the calendar. Checkbox. On completion, an optional two-tap question: *how was it* (pleasure) and *was het zwaar* (mastery). This is the behavioural-activation mechanism and it is what makes this a therapeutic tool rather than a to-do list.
3. **Optional practices** — a gratitude line, a breathing exercise, a short walk. **No checkbox, no tracking, no completion state.** Offered; ignoring them costs nothing and is never recorded.

Above all three, the windline (`BRAND.md` §3.7).

**Ordering logic:** medication first (time-critical), then activities by start time, then optional practices. Completed items grey and stay in place — they do not disappear or move, because motion on completion reads as reward mechanics.

### 6.3 Calendar

Week view, seven columns, current day centred.

- The patient creates activities freely.
- A supporter with `calendar` permission creates with `status: 'suggested'`. Suggestions appear in a separate, quiet tray — **never directly on the calendar**. The patient accepts or declines. Declining is silent; the suggester is not notified of a decline.
- Accepted activities flow into Today on their date.
- Simple recurrence (daily / weekly / weekday) via rrule.

The suggestion-not-insertion rule is the whole design. Family wanting to help and a person needing to control their own day is the central tension of this product, and this is where it is resolved.

### 6.4 Circle, permissions, feed

**Invite flow.** Patient generates a code → chooses role and the five permission toggles → shares the link → recipient signs up and redeems → `circle/{uid}` written by Cloud Function. Codes expire in 7 days and are single-use.

**Permissions.** Five independent toggles per member: checkins, medication, health, feed, calendar. Default on invite: feed and calendar only. The permissions screen is reachable in two taps from anywhere and shows, per person, exactly what they can see in plain sentences — not toggle labels. Revoking is immediate.

**Feed.** Scoped to one patient and their circle. Not a network. On completing an activity, the patient may optionally post it. Circle members react (heart, clap, proud — warm-only, no negative reaction) and comment.

Reactions and comments render in `--amber`, the warm accent, per `BRAND.md` §3.3. Everything a human did is warm; everything the system did is cold. Users learn this without being told.

### 6.5 Health Connect import

Read-only, three types: `SleepSessionRecord`, `StepsRecord`, `ExerciseSessionRecord`.

**Logic.**
- Permission is requested **after several days of use**, never at onboarding, where it reads as intrusive.
- Sync on app foreground, plus a WorkManager job once daily at 09:00 local.
- Read a rolling 7-day window and upsert into `health/{date}` — wearables backfill and correct sleep data hours later.
- One switch in settings disables import and deletes everything collected.
- The person can always view their own raw imported data. If they cannot see what is collected, it should not be collected.

**Accuracy.** Sleep timing and duration are reliable; sleep *stages* are not. Ignore stage data entirely, do not store it, do not display it.

**Explicitly not imported: heart rate, HRV, SpO2, ECG.** These invite cardiac interpretation Luwte must not offer. For a user with Brugada syndrome, a screen full of uninterpreted heart data is harmful in both directions — false alarm and false reassurance. If anyone requests this later it needs its own decision with a cardiologist present.

### 6.6 Insights and the report

One chart. Mood, energy, flatness, sleep, and steps over a selectable 2 / 6 / 12 week window, with **medication changes marked as vertical rules on the timeline** from `medications.changeLog`.

That last detail is the entire clinical value of the product. Seeing flatness rise in the fortnight after a dose increase is the thing that changes an appointment.

**Chart rules.** Soft curves, faint gridlines, `--zeeglas` only, tabular figures. No trend arrows, no percentages, no "better than last week", no red or green. There is no bad score in this product.

**PDF export.** `generateReport` renders a two-page A4: the chart, adherence percentage, side-effect trend, and the person's own diary lines set in the serif. Signed URL, 15-minute expiry. Shareable by the patient to anyone — this works even if the psychiatrist never touches the console, which is why it is v1 and the console is thin.

### 6.7 Clinician console (web)

Deliberately minimal.

- Patient list (only patients who granted access)
- Patient detail: the same chart, adherence, side-effect trend, diary notes
- Medication editor — name, dose, times, and the plain-language purpose line. Every edit appends to `changeLog`.
- Download PDF

No messaging in v1. No write access to anything except medication. Verified clinicians only, checked manually at first.

### 6.8 Crisis screen

Reachable from settings, from the check-in flow, and shown once automatically on a top-of-scale hopelessness answer.

Copy per `BRAND.md` §4.4 — this is the one surface where the voice becomes direct rather than soft. Zelfmoordlijn 1813, Centre de Prévention du Suicide 0800 32 123, 112. Tappable to dial. Works offline. Never behind more than one tap.

---

## 7. Screen inventory

### Android — patient

| # | Screen | Notes |
|---|---|---|
| 1 | Splash / auth | Email link preferred over password |
| 2 | Onboarding 1 — what Luwte is | *Dit is geen dokter.* |
| 3 | Onboarding 2 — sharing control | Sets the expectation early |
| 4 | Onboarding 3 — reminder time | Sets `checkinHour` |
| 5 | Consent | Explicit, granular, GDPR Art. 9. Logged with timestamp and version |
| 6 | **Today** | Home. Windline, medication, activities, optional practices |
| 7 | Check-in flow | 6 steps, one question per screen, large type, swipe or tap |
| 8 | Weekly extra | Appended inline to the check-in, once a week |
| 9 | Check-in confirmation | *Bewaard.* Nothing more |
| 10 | Calendar week | |
| 11 | Activity detail / edit | |
| 12 | Suggestions tray | Accept or decline supporter suggestions |
| 13 | Post-activity rating | Optional, two taps, dismissible |
| 14 | Feed | |
| 15 | Post detail | Comments |
| 16 | Medication list | |
| 17 | Medication detail | Dose, times, purpose, history |
| 18 | Insights | Chart, window selector, export |
| 19 | Diary archive | Their own notes, serif, scrollable by date |
| 20 | Circle | Members, relation, what each can see |
| 21 | Invite | Role, permission toggles, share sheet |
| 22 | Permissions per member | Plain sentences, not toggle labels |
| 23 | Health Connect intro | Explains each data type before the system dialog |
| 24 | Health data view | Raw imported values, per day |
| 25 | Settings | Reminder time, theme, language, health, notifications |
| 26 | Data and privacy | Export, delete, consent history |
| 27 | Crisis | Always reachable |
| 28 | Profile | |

### Android — supporter

Same binary, different navigation graph.

| # | Screen |
|---|---|
| S1 | Circle home — the people they support |
| S2 | Patient overview — only permitted surfaces |
| S3 | Feed and reactions |
| S4 | Suggest an activity |
| S5 | Insights, read-only, if `checkins` granted |
| S6 | Settings |

### Web — clinician

| # | Screen |
|---|---|
| W1 | Login (verified accounts only) |
| W2 | Patient list |
| W3 | Patient detail — chart, adherence, notes |
| W4 | Medication editor |
| W5 | Report download |
| W6 | Account |

---

## 8. Notification policy

The most dangerous surface in a product for depressed users. Rules:

- **Maximum three notifications per day**: one check-in reminder, medication reminders at scheduled times, and kudos from the circle.
- **Never chase.** One reminder per event. A missed check-in is never followed up.
- **Never guilt.** No "you haven't opened Luwte in 4 days". No re-engagement campaigns of any kind, ever.
- **No streak, milestone, or achievement notifications.**
- Notification copy follows `BRAND.md` §4 — no exclamation marks, no cheerfulness.
- All categories individually disableable. Disabling all of them leaves a fully functional app.

---

## 9. Passive sensing — phased

**Sleep and activity — v1.** Health Connect aggregates Fitbit, Samsung Health, Garmin, and Google Fit, so this is one integration rather than several. See §6.5.

**App and phone usage — Phase 2.** `UsageStatsManager` provides the data with a permission grant. The problem is interpretation: screen time up 30% means nothing without a personal baseline, and baselines drift with seasons and life events. Scope when built: total screen time, unlock count, and time in user-chosen categories. **Not** which specific apps, never any content. Displayed alongside mood, uninterpreted.

The reason it is worth building at all: screen time at 04:00 is a visible marker of a disrupted night that neither the person nor the family may otherwise register.

**Automated action plans — Phase 3.** A research problem, and the point at which medical device regulation engages (§11).

**Surveillance risk.** This carries more weight here than in most products. Passive monitoring of someone with paranoid features can do real harm if it feels like being watched. Non-negotiables for every sensing feature: opt-in, requested separately, plain-language disclosure of exactly what is and is not collected, raw data always visible to the person, one switch off with deletion, and separate control over whether supporters see it.

---

## 10. Chat — Phase 2 constraints

"A direct line to doctors in case they feel bad" is the highest-risk item on the roadmap. If someone writes *ik kan niet meer* at 02:00 into a channel nobody is watching, the app has created an expectation of help and failed it. It is deferred rather than cut because it is valuable — it just cannot be built casually.

When built:

1. **The response window is stated on the compose screen itself.** *Je team leest berichten op weekdagen tussen 9 en 17 uur. Dit is niet voor noodgevallen.*
2. **A permanent crisis button above the input**, always visible, going to real services. Not in a menu.
3. **Keyword safety net** — certain phrases immediately surface the crisis screen regardless of whether any human is online.
4. **Separate channels.** Supporters and care team are different things with different expectations. Never merged.
5. **Written sign-off from every clinician** on what they are and are not committing to, before their account is enabled.

Ship the supporter channel first. A chat with family that people actually answer is worth more than a chat with a doctor that nobody reads.

---

## 11. Legal and regulatory

**Applies in Belgium and the EU. Not optional.**

- **GDPR Art. 9.** Health data is special category. Required: explicit consent (logged, versioned, withdrawable), a lawful basis, a **DPIA**, EU data residency, encryption in transit and at rest, a retention policy, and a Google Cloud DPA with SCCs. See §5.5 for the one known residency gap.
- **EU MDR.** Software intended for diagnosis, prevention, monitoring, prediction, or treatment may be a medical device. A logbook that displays what the user entered generally is not. Software that **analyses data and outputs a clinical recommendation** likely is, potentially Class IIa. This is the entire reason automated action plans sit in Phase 3 and why §2 is written as it is.
- **Clinician obligations.** A psychiatrist using Luwte professionally has their own record-keeping and confidentiality duties. Get this confirmed before onboarding any clinician outside the family.
- **Capacity and consent during episodes.** Decide in advance what happens to sharing consent when capacity fluctuates. A family member must never silently gain access — hence §5.3.
- **Minors.** Out of scope for v1. State it in the terms.

Budget for a Belgian lawyer with health-tech experience before any launch beyond your own family.

---

## 12. Success metrics

For a v1 with a handful of users, DAU/MAU is meaningless. Measure:

- **Check-in completion rate** over 8 weeks. Target >60% of days.
- **Did a real appointment change** because of a Luwte export? Yes/no. This is the true product-market-fit signal and it is worth more than every other number here.
- **Activity completion rate**, planned versus suggested.
- **Pleasure/mastery ratings trend** — the behavioural activation loop working.
- Qualitative, asked monthly and directly: *does he feel more in control, or more watched?* If the answer is ever the second, stop and redesign.

Computed by a scheduled Cloud Function into a private `metrics` collection. Not by third-party analytics.

---

## 13. Build order

1. Firebase project, `eur3` Firestore, App Check, security rules, emulator suite
2. Auth, patient account, onboarding, consent logging
3. **Check-in flow + local persistence** — usable alone on day one
4. Today, with medication entered manually by the patient
5. Insights chart + PDF export
6. Health Connect: permission flow, sync worker, settings switch, prefill
7. Calendar and suggestions tray
8. Circle: invites, permissions, feed, kudos, FCM
9. Clinician console
10. **Stop. Use it for two months with real people before adding anything.**

Steps 1–5 already produce the PDF that changes an appointment. That is a legitimate milestone to pause and test at.

---

## 14. Open questions

- Who is the first real user, and will they use it daily for eight weeks?
- Does he have an Android phone, and a wearable? If not, step 6 is theoretical and self-report carries v1 alone.
- Will his psychiatrist look at an export? If no, redesign around the family loop and drop the console entirely.
- Dutch only for v1, or Dutch and French? Belgium makes this a real question sooner than it would be elsewhere.
- **Is this for one family, or a product?** The answer changes almost everything in §11.
