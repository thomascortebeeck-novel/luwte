# BRAND.md — Luwte

**Reference document for all design and copy decisions. Read before writing any UI.**

---

## 1. The name

**Luwte** (Dutch, *de luwte*) — the sheltered place out of the wind.

Not a cure. Not a coach. Shelter. Somewhere the wind doesn't reach, where you can catch your breath before going back out.

- **Wordmark:** `luwte` — always lowercase, never capitalised, never all-caps.
- **Tagline (nl):** *Uit de wind.*
- **Tagline (long):** *Een plek uit de wind, voor de dagen die tegenzitten.*
- **Domain:** luwte.be / luwte.app
- **Never:** "Luwte™", "LUWTE", "The Luwte App"

Pronunciation for non-Dutch speakers: *LOO-tuh*.

---

## 2. What Luwte is and is not

| Luwte is | Luwte is not |
|---|---|
| A notebook that remembers | A doctor |
| A shared thread between a person, their family, and their care team | A social network |
| A quiet daily structure | A coach, a challenge, a program |
| Honest about bad days | Positive |

**The one-line test for any feature, screen, or sentence:** would this make someone who is flat, tired, and comparing themselves to who they used to be feel *worse*? If maybe, cut it.

---

## 3. Design direction

### 3.1 The idea

Luwte is named for the absence of wind. The whole visual system is built on **stillness, and the contrast between agitated and settled**.

Deliberately avoided: the pale-cream-and-terracotta look, the purple wellness gradient, the clinical blue-and-white of medical software, and anything resembling a fitness dashboard. All three of the first cluster are defaults rather than choices, and the fourth is actively wrong for this user.

Chosen instead: **deep, still, cool.** Low luminance. Near-monochrome. One cold accent, one warm accent, each with a job.

### 3.2 Dark as the default

Luwte is **dark-first**. Light mode is fully supported and one tap away, but dark is what opens on first launch.

Reasons, in order of weight:

1. The app is used late at night and early in the morning, by someone whose sleep is disrupted. A luminous white screen at 03:00 is a physical intrusion.
2. Low-luminance interfaces read as calm. High-luminance interfaces read as demand.
3. It separates Luwte from every pastel wellness app on the store, which is a positioning decision as much as an aesthetic one.

The dark is never black. It is a deep blue-green — the colour of still water at dusk, not the colour of a switched-off screen.

### 3.3 Colour

```
/* Dark (default) */
--diep:        #131A19   /* background — deep still water */
--luwte-1:     #1C2524   /* raised surface, cards */
--luwte-2:     #27322F   /* hairlines, dividers, inactive */
--mist:        #E3E9E6   /* primary text */
--nevel:       #8B9A95   /* secondary text, labels */
--zeeglas:     #8FC4AE   /* COLD accent — the person's own data */
--amber:       #D9B27C   /* WARM accent — anything another human did */

/* Light */
--diep-l:      #EAEEEC
--luwte-1-l:   #F4F7F5
--luwte-2-l:   #D5DDDA
--mist-l:      #16201E
--nevel-l:     #5D6C68
--zeeglas-l:   #3E7C63
--amber-l:     #9A6F32
```

**The two-accent rule is structural, not decorative.** It encodes something true:

- **Zeeglas (cold)** is used only for the person's own input and their own data — check-in scores, charts, their own completed items.
- **Amber (warm)** is used only where another human has been present — a kudos, a comment, an activity a supporter suggested, a note from the doctor.

The result is that warmth on screen literally means *someone was here*. Never mix them. Never use amber for a system message.

**Forbidden:** red, green-as-good, traffic-light coding of any kind. A low mood is never coloured red. There is no such thing as a bad score in this product.

**Contrast:** all text meets WCAG AA against its background. Check `--nevel` on `--diep` specifically; do not lighten the background to fix it, darken or lighten the text.

### 3.4 Typography

Two faces, each with a job that means something.

| Role | Face | Why |
|---|---|---|
| System voice, UI, labels, data | **Schibsted Grotesk** | Modern grotesque, calm, slightly open terminals. Neutral without being cold. |
| The person's own words | **Newsreader** (serif) | The diary line, gratitude notes, comments from the circle. |

The split is the point: **everything the app says is set in the sans, everything a person wrote is set in the serif.** A user learns without being told which voice is which. Do not use the serif for headings, buttons, or system copy.

```
--font-ui:    'Schibsted Grotesk', -apple-system, sans-serif;
--font-human: 'Newsreader', Georgia, serif;

--text-xs:   13px / 1.5   /* labels, timestamps */
--text-sm:   15px / 1.6   /* secondary */
--text-base: 17px / 1.65  /* body — larger than typical, deliberately */
--text-lg:   22px / 1.4   /* section heads */
--text-xl:   30px / 1.25  /* screen titles */
--text-2xl:  42px / 1.15  /* the check-in question, standing alone */
```

Weights: 400 and 500 only. **No bold anywhere.** Bold is emphasis, emphasis is pressure. Hierarchy comes from size and colour.

Numerals: tabular figures on all data surfaces so charts and lists don't jitter.

### 3.5 Space and shape

- **8px base scale.** Section padding 24px minimum, 32px on primary screens.
- One screen, one job. If a screen has two purposes it is two screens.
- Radius: `12px` on cards, `10px` on inputs, `999px` on the single primary action button. Consistent, soft, not pill-shaped everywhere.
- Hairlines at `1px` in `--luwte-2`, used sparingly. Prefer space over lines.
- **Empty space is a feature.** Resist filling screens. Density reads as demand.

### 3.6 Motion

- Duration 400–600ms. Easing `cubic-bezier(0.22, 0.61, 0.36, 1)` — decelerating, arriving softly.
- **Fade and settle. Never slide, bounce, spring, or pop.**
- No loading spinners. Use a slow opacity pulse on a placeholder shape.
- No confetti, no celebration animation, no haptic on completion. Completing something is acknowledged quietly or not at all.
- `prefers-reduced-motion` fully respected, including the signature element below.

### 3.7 The signature: the windline

**The one memorable element. Spend the boldness here and keep everything else quiet.**

A single fine horizontal line sits at the top of the home screen. It is drawn from the last 14 days of data — mood, sleep, and activity combined into one continuous stroke.

- Unsettled stretches render as fine, close, agitated oscillation.
- Settled stretches render as a long, near-flat, slow curve.
- It moves almost imperceptibly, at about 0.2Hz — slower than breathing. It should be noticeable only if you look for it.

It carries no number, no label, no scale, and no judgement. It is not a score. It is a horizon line — a way of feeling the shape of the last two weeks in half a second, without reading anything.

The same visual language carries into the Insights chart, which is the windline expanded and made legible. Nowhere else.

### 3.8 Imagery and icons

- **No photographs of people. Ever.** Smiling faces are a direct comparison trigger for someone measuring themselves against who they used to be. This is not negotiable and it is not an aesthetic preference.
- Where imagery is needed: fine grain, gradient fog, the texture of water or stone. Abstract, dark, low contrast.
- Icons: 1.5px stroke, rounded caps, 24px grid. Sparse. Not every list item needs one.
- No illustration of characters, mascots, or plants-as-metaphor-for-growth.

---

## 4. Copy

### 4.1 Voice

Modelled on the register of Belgian ceremony writing: the hard thing said plainly, with warmth placed beside it rather than over it.

**Rules, all non-negotiable:**

1. **Short declarative sentences.** One idea each. Full stops carry the rhythm.
2. **`je`, never `u`.** Close, not formal.
3. **No exclamation marks anywhere in the product.**
4. **No emoji in system copy.** Users may use them; the app does not.
5. **Invite, never instruct.** *Als je wil.* *Wanneer het past.* Not *Doe dit nu.*
6. **Say the plain word.** Depression is depression, not "low mood". Psychosis is psychosis. Euphemism reads as embarrassment.
7. **Never cheerful.** Warmth without brightness. No *Goed bezig!*, no *Fantastisch!*, no *Je kan dit!*
8. **Present tense.** Active voice. A button says what happens: *Bewaren*, not *Verzenden*.
9. **Never compare.** No "better than last week", no "you're improving", no percentages of progress. He already compares himself to his past self constantly; the app must not join in.
10. **On a missed day, say nothing.** No catch-up prompt, no "we missed you", no visible gap.

### 4.2 The library

| Surface | Copy (nl) |
|---|---|
| App opening line | *Uit de wind.* |
| Onboarding, screen 1 | *Dit is geen dokter. Dit is een schriftje dat onthoudt wat jij vergeet.* |
| Onboarding, sharing | *Jij bepaalt wie wat ziet. Altijd. Je kan het elk moment veranderen.* |
| Check-in entry | *Hoe was vandaag?* |
| Mood | *Hoe voelde je je?* |
| Energy | *Hoeveel energie had je?* |
| Sleep | *Hoe heb je geslapen?* |
| Anxiety | *Hoe onrustig was het?* |
| **Flatness** | *Kon je vandaag iets voelen?* |
| Diary line | *Iets dat je wil onthouden van vandaag?* |
| Check-in done | *Bewaard.* |
| Today, empty | *Vandaag staat er niets. Dat mag.* |
| Optional practice | *Als je zin hebt.* |
| Medication section | *Wat je vandaag neemt, en waarvoor.* |
| Feed, empty | *Nog niets vandaag.* |
| Kudos sent | *Verstuurd.* |
| Insights header | *De laatste twee weken.* |
| Insights caveat | *Dit zijn geen conclusies. Dit is wat je hebt opgeschreven.* |
| Health import ask | *Je horloge weet wanneer je sliep. Wil je dat Luwte dat overneemt, zodat je het niet hoeft in te vullen?* |
| Data deletion | *Weg is weg. Dat kunnen we niet terugdraaien.* |
| Generic error | *Dat is niet gelukt. Probeer het straks nog eens.* |
| Offline | *Geen verbinding. Wat je invult wordt bewaard en later verstuurd.* |

### 4.3 Errors and empty states

Errors state what happened and what to do. They do not apologise, do not use "oops", do not use humour, and are written in the interface's voice rather than a person's. Empty states are an invitation or a permission — never a prompt to do more.

### 4.4 Crisis copy

The one place the voice changes. When crisis resources are shown, the register becomes direct and concrete. No softness, no metaphor, no *luwte*. Numbers, names, and one action.

> *Als het nu te zwaar is, bel iemand.*
> *Zelfmoordlijn — 1813*
> *Centre de Prévention du Suicide — 0800 32 123*
> *Noodgeval — 112*

---

## 5. Accessibility floor

Not optional, not a phase-two item.

- WCAG AA contrast on all text and interactive elements
- Minimum tap target 48×48dp
- Full TalkBack labels, including the windline (described as text: *"Overzicht van de laatste veertien dagen"*)
- Dynamic type supported to 200% without layout breaking
- `prefers-reduced-motion` disables the windline animation entirely
- Works one-handed; primary actions in the lower third of the screen

Sedating medication affects fine motor control, reaction time, and reading speed. Every one of these is a functional requirement for this specific audience, not a compliance checkbox.

---

## 6. Quick reference for implementation

```
Name          luwte (lowercase, always)
Tagline       Uit de wind.
Mode          Dark default, light supported
Background    #131A19
Text          #E3E9E6
Cold accent   #8FC4AE — the person's own data
Warm accent   #D9B27C — where another human has been
UI face       Schibsted Grotesk, weights 400/500 only
Human face    Newsreader (user-written text only)
Radius        12 / 10 / 999
Motion        400–600ms, fade and settle, never slide
Signature     The windline
Language      Dutch, informal je, no exclamation marks
Never         Red, streaks, photos of people, bold text, comparison, cheerfulness
```
