# luwte — Phase 8, the Android app, and the Garmin question

**Written 2026-08-05**, after Phase 10 closed with twelve of thirteen features
built. Three questions, in the order they change the work:

1. **Garmin is not actually blocked, and the block was mine.**
2. **Phase 8 — Milestone B**, and what "hardened" has to mean before a real
   family uses this.
3. **Phase A — Android**, including the five things Thomas asked for.

---

## 1. Garmin — the block was the wrong architecture, not a closed door

I said this needed Garmin's enterprise approval *and* a server *and* Blaze.
Every one of those is true **of Garmin's cloud Health API**, and that is the
wrong way in.

**Garmin Connect for Android writes to Health Connect.** Since around May 2026
it publishes daily steps, resting heart rate and aggregated sleep. It is a
one-way sync — Garmin delivers and refuses to accept — which is exactly the
direction luwte needs.

Health Connect is an **on-device** API. So:

| | Garmin cloud Health API | Health Connect on Android |
|---|---|---|
| Garmin's approval | required, enterprise programme | **none** |
| OAuth client secret | required | **none** |
| Webhook endpoint | required | **none** |
| Server, therefore Blaze | required | **none** |
| Works with other watches | Garmin only | **any watch that writes to Health Connect** |

The last row matters more than the rest. Fitbit, Samsung, Oura and Withings
all write to Health Connect. Building against Garmin's API would have bought a
Garmin-only feature at the price of a server; building against Health Connect
gets every watch and needs no backend at all. **The app reads locally and
writes to Firestore as the patient, through the rules that already exist.**

I got this wrong in a specific and correctable way. I established that
HealthKit and Health Connect are on-device APIs no browser can reach, and that
Garmin's is a cloud API — both true — and then concluded "so use the cloud
API" instead of "so do it in the Android app, which is already planned".

### What is genuinely lost by going this way

Being honest about the trade rather than selling it:

- **ECG is not a Health Connect data type.** Neither is Body Battery or
  Garmin's Stress score. If the ECG result matters, it needs Garmin's own
  API — which means the enterprise application and the server after all. My
  recommendation: **ship sleep and resting heart rate via Health Connect, and
  treat ECG as a separate decision later**, because it is the item with the
  most regulatory weight and the least daily value.
- **HRV support is ambiguous** in what I could confirm — Health Connect
  documents a heart-rate-variability type, and secondary sources say Garmin
  does not populate it. Treat it as unknown until tested on a real device with
  a real watch. Do not design around it.
- **The gate moves rather than vanishes.** Google Play requires a **Health
  apps declaration** and a per-data-type justification for Health Connect
  permissions, plus a publicly reachable privacy policy. Requests without
  enough detail are refused. But this is a gate we pass through to ship on
  Play at all, and it is a form rather than a partnership.

### What does not change

Everything already decided in the Phase 10 plan still holds, because none of
it was about the transport:

- **The patient decides who sees it.** GDPR Art. 15 makes "the doctor grants
  access to your own heart rate" non-compliance rather than a product choice.
- **Sleep duration is shown plainly; resting heart rate is stored and not
  charted by default**, switchable on, because an uninterpreted cardiac number
  shown unprompted is harmful in both directions.
- **luwte may carry a conclusion somebody else is licensed to draw, and may
  never draw one.** No predictor. Not from this data, not from the check-in,
  not from the early-warning-signs plan.
- **It needs its own consent item.** Reading from Health Connect is new
  processing of Article 9 data even though it never leaves the device on the
  way in.

---

## 2. Phase 8 — Milestone B

Exit: **v1 live with a real family.** Then the PRD's own rule applies — stop,
and two months of real use before building anything else.

### P8.1 — The accessibility pass *(overdue, and now evidenced)*

Not a checkbox. On 2026-08-05 a **live AA failure** was found that had been
shipping since Phase 5: `--zeeglas-l` drawn as text is 4.20:1, and the
calendar had been drawing "today" in it since the week view landed. It
survived because `contrast.test.ts` lists "the pairs actually rendered today"
and nobody added the pairing. That is exactly what this pass is for.

- **Every colour pairing on every screen gets a line in `contrast.test.ts`.**
  Generate the list from the stylesheets rather than by eye, so a pairing
  cannot be missed the way this one was.
- Keyboard: every screen reachable and operable, visible focus everywhere,
  no traps. The ScaleInput's roving focus already does this; nothing else has
  been checked.
- Screen reader: one full pass in Dutch. The reaction icons landed with the
  word as the accessible name — verify that reads well in practice.
- 200% zoom and 320px width without horizontal scroll.
- `prefers-reduced-motion`: the windline and the breathing circle both animate.
  The global reset collapses transitions; confirm the breathing guide still
  *guides* when it cannot move.
- Tap targets: 48px everywhere. The reaction buttons just changed shape.

### P8.2 — GDPR export and deletion

Article 15 and Article 17, and the pilot needs both before it starts rather
than after.

- **Export**: every collection the person owns, as one JSON file, generated on
  the device. No Cloud Function — the report is already built this way (D16)
  and for Article 9 data on-device is the better answer anyway.
- **Deletion**: the hard part is that almost everything in this database
  refuses `delete` on purpose. Deletion has to be a deliberate, separate path
  — and it must reach the sub-collections, the circle, the invites, and the
  `clinicianRequests` document if there is one.
- **What deletion does to other people's data.** A supporter's comment on a
  post is the supporter's words about the patient's day. Deleting the patient
  deletes the post it hangs on. Decide and write down which of the two that
  serves.
- `dataDeletion` copy already exists: *"Weg is weg. Dat kunnen we niet
  terugdraaien."*

### P8.3 — The full rules matrix

The 220 rules tests grew case by case, as attacks somebody would actually try.
PRD 5.3 asks for the matrix — every (role × permission × collection ×
operation) cell, table-driven — so a gap is visible as an empty cell rather
than as a test nobody wrote. Expect this to find something.

### P8.4 — Error handling in the BRAND voice

`genericError` and `offline` exist and are barely used. A sweep: every write
path, every read that can 403, and the offline case, with PII-stripped
logging. No stack traces, no "oops" (copy-lint already refuses that one).

### P8.5 — DPIA-lite, retention, and the residency note

Article 9 processing by a solo developer for a family pilot still needs the
paperwork to exist: what is processed, why, where it lives, how long, who the
processors are, and what happens when somebody withdraws consent. Plus the
auth-residency note (D1) — Firebase Auth cannot be pinned to Europe, which is
why it holds an email and nothing else.

### P8.6 — The pilot

Deploy, install as a PWA on the family's actual devices, and watch. Not a
demo — a fortnight of ordinary use before anything is judged.

---

## 3. Phase A — the Android app

### (a) Framework: Capacitor

**Capacitor, not React Native or a rewrite.** The whole app is already a PWA
that works offline; Capacitor wraps it and gives native APIs through plugins.
A React Native port would rebuild every screen to reach the same place. The
things Android is needed for — Health Connect, real notifications, deep links,
the Play Store — are all plugin surface, not app-architecture surface.

Consequence worth stating: `apps/web` becomes the shared codebase rather than
"the web app". Nothing about the Firestore rules, the models or the screens
changes.

### (b) Push notifications — local first, and free

**The daily check-in reminder should be a local notification scheduled on the
device**, not a push. It is a fixed hour the person chose, it needs no server,
it works with no signal, and it costs nothing. `sendCheckinReminder` exists as
a Cloud Function and would need Blaze; a local notification needs neither.

That leaves only *circle* events — somebody reacted, somebody suggested
something — which genuinely originate elsewhere. FCM is free on Spark; only
*sending* from a Cloud Function needs Blaze. Options, in order of preference:

1. Show them in-app on next open. No notification, no cost, and consistent
   with **never chase**.
2. FCM plus one Cloud Function, accepting Blaze for that alone.

`whoToNotify` in core already decides who gets told, and both sides must agree
— that logic is transport-independent and does not change either way.

### (c) Play Store requirements

- Health apps declaration and per-data-type Health Connect justification.
- Privacy policy at a public, non-geofenced URL — needed anyway for GDPR.
- Data safety form. This one is unusually easy to answer honestly: no
  third-party analytics, no ads, no data sold, EU regions only.
- Target API level, signing, and a closed testing track for the pilot family
  before anything is public.
- **The listing must not claim a medical purpose.** Under EU MDR it is
  *intended purpose* that makes software a device, and store copy is intended
  purpose in evidence. "A logbook and a nudge, not a doctor" is a legal
  position as much as a product one.

### (d) Health data and usage analytics

- **Health Connect** for sleep duration and resting heart rate, per section 1.
  Sleep prefill is the point: `sleepHours` is currently typed, and it is the
  one check-in item a device can answer better than a person.
- **Usage analytics stays out.** Firebase Analytics is disabled by decision
  and should remain so; PRD 12's measures go to a private `metrics` collection
  the person's own data never leaves. Android gives no reason to revisit that.
- Garmin sleep via a third-party aggregator (Terra, Rook, Vital) is possible
  and **not recommended**: it adds a data processor to an Article 9 system to
  solve a problem Health Connect solves on the device for free.

### (e) Deep links for the invite

`inviteLink()` already builds `/join/{code}` from an origin, and `Join` holds
the code across sign-in and onboarding — so the hard part is done. What
Android adds is **App Links**: a `assetlinks.json` on the hosting domain and
an intent filter, so tapping the link in WhatsApp opens the app rather than
the browser. Fall back to the web app when it is not installed, which is what
already happens today.

Worth testing explicitly: the link arriving for somebody with **no account**,
which is the case the whole flow was designed around.

---

## Order

1. **P8.1 accessibility** and **P8.2 GDPR** — the two the pilot cannot start
   without, and the first is evidenced overdue.
2. **P8.3 rules matrix**, **P8.4 errors**, **P8.5 docs**.
3. **P8.6 the pilot.** Then stop for two months.
4. **Phase A**, in the order (a) Capacitor shell → (e) deep links →
   (b) local notifications → (c) store paperwork → (d) Health Connect.
   Health Connect last on purpose: it is the only one with an external
   reviewer attached, and everything before it is shippable without it.

---

## Sources

- [Garmin Connect and Health Connect — what is and is not shared](https://www.androidcentral.com/wearables/garmin/heres-everything-garmin-will-and-wont-share-with-google-health-connect)
- [Health Connect data types](https://developer.android.com/health-and-fitness/health-connect/data-types)
- [Publish your health app on Google Play](https://developer.android.com/health-and-fitness/health-connect/publish)
- [Android health permissions: guidance and FAQs](https://support.google.com/googleplay/android-developer/answer/12991134?hl=en)
- [Garmin Connect Developer Program — Health API](https://developer.garmin.com/gc-developer-program/health-api/)
- [Capacitor Push Notifications API](https://capacitorjs.com/docs/apis/push-notifications)
