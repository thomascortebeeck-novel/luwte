# Safety plan, crisis contacts, supporter guidance, and the last of Phase 8

> **For agentic workers:** REQUIRED SUB-SKILL: use `superpowers:subagent-driven-development`
> (recommended) or `superpowers:executing-plans` to implement this plan
> task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the Stanley–Brown safety plan, surface the person's own
crisis contacts on the crisis screen, give supporters daily guidance grounded
in family-intervention evidence, and close Phase 8 with the full rules matrix
and an error-handling sweep.

**Architecture:** The safety plan extends the existing `patients/{pid}/plan`
collection with a `section` discriminator rather than adding collections — the
permission, the security rules and the erasure coverage already exist and
should not be duplicated. **Steps 4 and 5 of Stanley–Brown are the crisis
contacts**, so the crisis screen reads the plan rather than a second list.
Supporter guidance is static content in `@luwte/core` (like `DIARY_PROMPTS`),
so it is copy-linted and testable and carries no patient data at all.

**Tech Stack:** TypeScript, zod 4, React 19, react-router 7, Firestore,
Vitest 3, `@firebase/rules-unit-testing`.

## Global Constraints

Copied from CLAUDE.md and BRAND.md. Every task's requirements implicitly
include this section.

- **luwte may carry a conclusion somebody else is licensed to draw, and may
  never draw one.** No matching a check-in against the plan, no scoring, no
  "you may be relapsing". That is Class IIa under EU MDR.
- **No streaks, points, badges, milestones or achievements. Ever.**
- **No red, no green-as-good, no traffic-light coding.** There is no bad score.
- **No bold text.** Font weights 400 and 500 only.
- **No comma before `en` or `of` in Dutch.** Copy-lint refuses it.
- **No exclamation marks. No emoji in system copy. `je`, never `u`.**
- Sans (`--font-ui`) for everything the app says; serif (`--font-human`) only
  for what a person wrote.
- `--self` is the person's own data; `--human` is where another human has
  been. Never mix. `--line` is decoration, `--edge` is a control (3:1).
- Tap targets **48px** (`--tap-min`). Content must reflow at **320px**.
- Every new copy key goes in **both** `nl.ts` and `en.ts`; Dutch is the source
  of truth.
- Run `pnpm verify` before every commit. `pnpm test:rules` after touching
  `firestore/firestore.rules`.

---

## Phase 1 — The Stanley–Brown safety plan

The existing `/plan` screen holds step 1 only: *what I notice* paired with
*what I do*. Stanley & Brown's Safety Planning Intervention has six steps, and
the full set is what the evidence is about — Stanley et al. (2018, *JAMA
Psychiatry*) found roughly 45% fewer suicidal behaviours over six months
against usual care.

**Two things this plan deliberately does not do.** It does not turn the plan
into a wizard — the screen stays one page, each section a small group, because
somebody re-reads this on a bad day and scrolling beats navigating. And step 6
(making the environment safer) is worded as **the person's own note about what
they arranged**, never as a prompt to enumerate means. In the protocol that
step is done with a clinician present; an app that asks an unsupervised person
to list what they would use is doing something else entirely.

### Task 1.1: Extend the plan model with sections

**Files:**
- Modify: `packages/core/src/model/plan.ts`
- Modify: `packages/core/src/index.ts`
- Test: `packages/core/src/model/plan.test.ts`

**Interfaces:**
- Produces: `PLAN_SECTIONS`, `type PlanSection`, `planEntrySchema` with
  `{ section: PlanSection; label: string; detail: string; createdAt: Date }`,
  `PLAN_SECTION_COPY: Record<PlanSection, { titleKey: CopyKey; introKey: CopyKey; labelKey: CopyKey; detailKey: CopyKey }>`,
  `entriesInSection(entries, section)`, `hasPlan(entries)`.

**The rename is safe now and will not be later.** `sign`/`action` do not read
as anything sensible for "somebody I can ring", and `luwte-prod` is live and
empty on purpose — nobody signs in until the pilot. After the pilot this is a
migration of real health records rather than an edit. Do it now or keep the
names forever.

- [ ] **Step 1: Write the failing test**

Add to `packages/core/src/model/plan.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  PLAN_SECTIONS,
  PLAN_SECTION_COPY,
  entriesInSection,
  hasPlan,
  planEntrySchema,
} from './plan';
import { dictionaries } from '../i18n/index';

describe('the six steps of a safety plan', () => {
  it('has all six, in the protocol order', () => {
    // Stanley & Brown's order is not cosmetic: coping alone comes before
    // asking anybody, and the professionals come before the emergency line.
    expect([...PLAN_SECTIONS]).toEqual([
      'warning',
      'coping',
      'distraction',
      'help',
      'professional',
      'safer',
    ]);
  });

  it('has copy for every section in both languages', () => {
    for (const section of PLAN_SECTIONS) {
      const keys = PLAN_SECTION_COPY[section];
      for (const key of [keys.titleKey, keys.introKey, keys.labelKey, keys.detailKey]) {
        expect(dictionaries.nl[key], `nl is missing ${key}`).toBeTruthy();
        expect(dictionaries.en[key], `en is missing ${key}`).toBeTruthy();
      }
    }
  });

  it('reads an entry written before sections existed as a warning sign', () => {
    // The only shape that ever reached a database. Defaulting keeps it
    // meaningful instead of dropping it into an unnamed bucket.
    const parsed = planEntrySchema.parse({
      label: 'ik ruim mijn kamer op om vier uur',
      detail: 'ik bel mijn zus',
      createdAt: new Date(),
    });
    expect(parsed.section).toBe('warning');
  });

  it('groups entries by section, keeping the order they were written in', () => {
    const at = (n: number) => new Date(2026, 0, n);
    const entries = [
      { section: 'coping' as const, label: 'douche', detail: '', createdAt: at(2) },
      { section: 'warning' as const, label: 'slecht slapen', detail: '', createdAt: at(1) },
      { section: 'coping' as const, label: 'wandelen', detail: '', createdAt: at(3) },
    ];
    expect(entriesInSection(entries, 'coping').map((e) => e.label)).toEqual([
      'douche',
      'wandelen',
    ]);
    expect(entriesInSection(entries, 'professional')).toEqual([]);
  });

  it('counts a plan as present when any section has something in it', () => {
    const at = new Date();
    expect(hasPlan([])).toBe(false);
    expect(
      hasPlan([{ section: 'help', label: 'mijn zus', detail: '0470 12 34 56', createdAt: at }]),
    ).toBe(true);
  });

  it('refuses a label longer than the field allows', () => {
    expect(() =>
      planEntrySchema.parse({ label: 'x'.repeat(201), detail: '', createdAt: new Date() }),
    ).toThrow();
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run packages/core/src/model/plan.test.ts`
Expected: FAIL — `PLAN_SECTIONS` is not exported.

- [ ] **Step 3: Rewrite `packages/core/src/model/plan.ts`**

```ts
import { z } from 'zod';
import type { CopyKey } from '../i18n/types';

/**
 * The person's own safety plan — Stanley & Brown's six steps.
 *
 * Step 1 (warning signs) was built first and is unchanged in substance. The
 * other five are what the evidence is actually about: Stanley et al. (2018,
 * JAMA Psychiatry) found roughly 45% fewer suicidal behaviours over six
 * months against usual care, for the whole intervention rather than a list of
 * signs on its own.
 *
 * **luwte never matches anything against this.** Comparing a check-in to
 * somebody's warning signs is generating a conclusion about their mental
 * state — clinical monitoring, Class IIa under EU MDR, and the one thing this
 * product may never do. The plan is held and handed back, like the diary.
 *
 * One collection with a `section` discriminator rather than six collections:
 * the `plan` permission, the security rules and the erasure coverage already
 * exist, and duplicating them six times is six chances to get one wrong.
 */
export const PLAN_SECTIONS = [
  'warning',
  'coping',
  'distraction',
  'help',
  'professional',
  'safer',
] as const;

export type PlanSection = (typeof PLAN_SECTIONS)[number];

export const planEntrySchema = z.object({
  /**
   * Absent on every entry written before the other five steps existed, and
   * those were all warning signs — so the default is the truth rather than a
   * guess.
   */
  section: z.enum(PLAN_SECTIONS).default('warning'),
  /** The thing itself: a sign, a strategy, a place, a person's name. */
  label: z.string().min(1).max(200),
  /** What to do with it: the response, a phone number, how they help. */
  detail: z.string().max(300).default(''),
  createdAt: z.date(),
});

export type PlanEntry = z.infer<typeof planEntrySchema>;

/**
 * What each section asks, in the person's own words.
 *
 * `safer` is deliberately worded as a note about what they **arranged**, not
 * as a prompt to enumerate means. In the protocol that step happens with a
 * clinician in the room; an app asking an unsupervised person to list what
 * they would use is doing something else entirely.
 */
export const PLAN_SECTION_COPY: Record<
  PlanSection,
  { titleKey: CopyKey; introKey: CopyKey; labelKey: CopyKey; detailKey: CopyKey }
> = {
  warning: {
    titleKey: 'planWarningTitle',
    introKey: 'planWarningIntro',
    labelKey: 'planWarningLabel',
    detailKey: 'planWarningDetail',
  },
  coping: {
    titleKey: 'planCopingTitle',
    introKey: 'planCopingIntro',
    labelKey: 'planCopingLabel',
    detailKey: 'planCopingDetail',
  },
  distraction: {
    titleKey: 'planDistractionTitle',
    introKey: 'planDistractionIntro',
    labelKey: 'planDistractionLabel',
    detailKey: 'planDistractionDetail',
  },
  help: {
    titleKey: 'planHelpTitle',
    introKey: 'planHelpIntro',
    labelKey: 'planHelpLabel',
    detailKey: 'planHelpDetail',
  },
  professional: {
    titleKey: 'planProfessionalTitle',
    introKey: 'planProfessionalIntro',
    labelKey: 'planProfessionalLabel',
    detailKey: 'planProfessionalDetail',
  },
  safer: {
    titleKey: 'planSaferTitle',
    introKey: 'planSaferIntro',
    labelKey: 'planSaferLabel',
    detailKey: 'planSaferDetail',
  },
};

/**
 * Prompts, offered as examples and never as a checklist to tick.
 *
 * A ready-made list would have somebody agreeing to signs they do not have,
 * and the plan is only useful in their own words — "ik begin mijn kamer op te
 * ruimen om vier uur 's nachts" is a real early sign and no instrument would
 * ever have printed it.
 */
export const PLAN_EXAMPLE_KEYS = [
  'planExampleSleep',
  'planExampleWithdraw',
  'planExampleThoughts',
  'planExampleMedication',
] as const;

export function entriesInSection(
  entries: readonly PlanEntry[],
  section: PlanSection,
): PlanEntry[] {
  return entries.filter((entry) => entry.section === section);
}

/** Whether there is anything worth showing to somebody it was shared with. */
export function hasPlan(entries: readonly PlanEntry[]): boolean {
  return entries.some((entry) => entry.label.trim().length > 0);
}
```

- [ ] **Step 4: Export the new names**

In `packages/core/src/index.ts`, replace the existing plan export block with:

```ts
export {
  PLAN_EXAMPLE_KEYS,
  PLAN_SECTIONS,
  PLAN_SECTION_COPY,
  entriesInSection,
  hasPlan,
  planEntrySchema,
  type PlanEntry,
  type PlanSection,
} from './model/plan';
```

- [ ] **Step 5: Add the copy, Dutch first**

In `packages/core/src/i18n/nl.ts`, beside the existing `planExample*` keys:

```ts
  // De zes stappen van een veiligheidsplan (Stanley en Brown).
  planWarningTitle: 'Wat je merkt',
  planWarningIntro: 'Waar merk je zelf het eerst aan dat het minder gaat?',
  planWarningLabel: 'Wat je merkt',
  planWarningDetail: 'Wat je dan doet',
  planCopingTitle: 'Wat je alleen kan doen',
  planCopingIntro: 'Dingen die je zonder iemand anders kan doen om het te laten zakken.',
  planCopingLabel: 'Wat je doet',
  planCopingDetail: 'Waarom het helpt',
  planDistractionTitle: 'Waar je heen kan',
  planDistractionIntro: 'Plekken of mensen die je gedachten even ergens anders brengen.',
  planDistractionLabel: 'Waar of bij wie',
  planDistractionDetail: 'Wanneer dat past',
  planHelpTitle: 'Wie je kan bellen',
  planHelpIntro: 'Mensen die je mag bellen als het zwaar wordt. Zet er hun nummer bij.',
  planHelpLabel: 'Wie',
  planHelpDetail: 'Nummer',
  planProfessionalTitle: 'Je hulpverleners',
  planProfessionalIntro: 'Je dokter, je begeleider of de wachtdienst. Met hun nummer.',
  planProfessionalLabel: 'Wie',
  planProfessionalDetail: 'Nummer',
  planSaferTitle: 'Wat je afsprak',
  /*
   * Vraagt niet wat iemand zou gebruiken. In het protocol gebeurt die stap
   * samen met een hulpverlener, en een app die daar alleen naar vraagt doet
   * iets anders. Dit is een notitie over wat al geregeld is.
   */
  planSaferIntro: 'Afspraken die je maakte om het jezelf veiliger te maken.',
  planSaferLabel: 'De afspraak',
  planSaferDetail: 'Met wie',
```

And the mirror in `packages/core/src/i18n/en.ts`:

```ts
  // The six steps of a safety plan (Stanley and Brown).
  planWarningTitle: 'What you notice',
  planWarningIntro: 'What do you notice first when things get harder?',
  planWarningLabel: 'What you notice',
  planWarningDetail: 'What you then do',
  planCopingTitle: 'What you can do alone',
  planCopingIntro: 'Things you can do without anyone else to let it settle.',
  planCopingLabel: 'What you do',
  planCopingDetail: 'Why it helps',
  planDistractionTitle: 'Where you can go',
  planDistractionIntro: 'Places or people that take your mind somewhere else for a while.',
  planDistractionLabel: 'Where or who',
  planDistractionDetail: 'When that suits',
  planHelpTitle: 'Who you can call',
  planHelpIntro: 'People you may call when it gets heavy. Add their number.',
  planHelpLabel: 'Who',
  planHelpDetail: 'Number',
  planProfessionalTitle: 'Your care providers',
  planProfessionalIntro: 'Your doctor, your support worker or the out-of-hours line. With their number.',
  planProfessionalLabel: 'Who',
  planProfessionalDetail: 'Number',
  planSaferTitle: 'What you arranged',
  planSaferIntro: 'Arrangements you made to keep yourself safer.',
  planSaferLabel: 'The arrangement',
  planSaferDetail: 'With whom',
```

- [ ] **Step 6: Run the tests and the copy lint**

Run: `npx vitest run packages/core`
Expected: PASS, including `dictionaries.test.ts` and `copy-lint.test.ts`.

- [ ] **Step 7: Commit**

```bash
git add packages/core/src/model/plan.ts packages/core/src/model/plan.test.ts packages/core/src/index.ts packages/core/src/i18n/nl.ts packages/core/src/i18n/en.ts
git commit -m "feat(plan): the safety plan grows from one step to six"
```

### Task 1.2: Update the Firestore layer and the screen

**Files:**
- Modify: `apps/web/src/firebase/plan.ts`
- Modify: `apps/web/src/routes/Plan.tsx`
- Modify: `apps/web/src/routes/Plan.test.tsx`
- Modify: `apps/web/src/routes/Plan.module.css`

**Interfaces:**
- Consumes: `PLAN_SECTIONS`, `PLAN_SECTION_COPY`, `entriesInSection`, `type PlanSection` from Task 1.1.
- Produces: `readPlan(uid): Promise<PlanEntryRecord[]>` where
  `PlanEntryRecord = PlanEntry & { id: string }`;
  `addPlanEntry(uid, { section, label, detail }): Promise<void>`;
  `updatePlanEntry(uid, id, { label, detail }): Promise<void>`;
  `removePlanEntry(uid, id): Promise<void>`.

- [ ] **Step 1: Update the Firestore module**

Replace the body of `apps/web/src/firebase/plan.ts`:

```ts
import { paths, type PlanEntry, type PlanSection } from '@luwte/core';
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { db } from './client';

export type PlanEntryRecord = PlanEntry & { id: string };

/**
 * The safety plan.
 *
 * **luwte never reads this to decide anything.** It is stored and handed
 * back, the way the diary is. Matching a check-in against somebody's warning
 * signs would be generating a conclusion about their mental state — clinical
 * monitoring, Class IIa under EU MDR, the one thing this product may never do.
 */
export async function readPlan(uid: string): Promise<PlanEntryRecord[]> {
  const snapshot = await getDocs(collection(db, paths.plan(uid)));
  return snapshot.docs
    .map((document) => {
      const data = document.data();
      return {
        id: document.id,
        // Absent on entries written before the other five steps existed, and
        // every one of those was a warning sign.
        section: (data.section ?? 'warning') as PlanSection,
        label: (data.label ?? '') as string,
        detail: (data.detail ?? '') as string,
        createdAt: data.createdAt?.toDate?.() ?? new Date(0),
      };
    })
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
}

export async function addPlanEntry(
  uid: string,
  values: { section: PlanSection; label: string; detail: string },
): Promise<void> {
  const id = doc(collection(db, paths.plan(uid))).id;
  await setDoc(doc(db, paths.planEntry(uid, id)), { ...values, createdAt: serverTimestamp() });
}

export async function updatePlanEntry(
  uid: string,
  id: string,
  values: { label: string; detail: string },
): Promise<void> {
  await updateDoc(doc(db, paths.planEntry(uid, id)), values);
}

/**
 * Deleted rather than marked, unlike almost everything else here.
 *
 * The rest of this database is a record of what happened, and a record that
 * can vanish is not worth keeping. A plan is not a record — it is a current
 * intention, and a strategy that stopped working is noise in the one document
 * somebody needs to read quickly on a bad day.
 */
export async function removePlanEntry(uid: string, id: string): Promise<void> {
  await deleteDoc(doc(db, paths.planEntry(uid, id)));
}
```

- [ ] **Step 2: Render the six sections**

In `apps/web/src/routes/Plan.tsx`, replace the single list with a loop over
`PLAN_SECTIONS`. Each section renders its title, its intro, its existing
entries, and one add row. The screen stays **one page** — somebody re-reads
this on a bad day and scrolling beats navigating.

```tsx
{PLAN_SECTIONS.map((section) => {
  const copy = PLAN_SECTION_COPY[section];
  const rows = entriesInSection(entries, section);
  return (
    <section className={styles.section} key={section}>
      <h2 className={styles.sectionTitle}>{t(copy.titleKey)}</h2>
      <p className={styles.intro}>{t(copy.introKey)}</p>
      {rows.map((entry) => (
        <PlanRow
          key={entry.id}
          entry={entry}
          labelLabel={t(copy.labelKey)}
          detailLabel={t(copy.detailKey)}
          onSave={(values) => void updatePlanEntry(uid, entry.id, values).then(reload)}
          onRemove={() => void removePlanEntry(uid, entry.id).then(reload)}
        />
      ))}
      <PlanAdd
        labelLabel={t(copy.labelKey)}
        detailLabel={t(copy.detailKey)}
        onAdd={(values) => void addPlanEntry(uid, { section, ...values }).then(reload)}
      />
    </section>
  );
})}
```

- [ ] **Step 3: Keep the "luwte checks nothing" line visible**

The existing `planNoMatching` copy must stay on the screen, once, near the
top. It is the sentence that makes the MDR position visible to the person
rather than only to a reviewer.

- [ ] **Step 4: Update the screen test**

In `apps/web/src/routes/Plan.test.tsx`, assert every section heading renders:

```tsx
it('shows all six steps of the safety plan', () => {
  render(<Plan />, { wrapper: Providers });
  for (const section of PLAN_SECTIONS) {
    expect(screen.getByText(dictionaries.nl[PLAN_SECTION_COPY[section].titleKey])).toBeTruthy();
  }
});
```

- [ ] **Step 5: Run the gate**

Run: `pnpm verify`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/firebase/plan.ts apps/web/src/routes/Plan.tsx apps/web/src/routes/Plan.test.tsx apps/web/src/routes/Plan.module.css
git commit -m "feat(plan): six sections on one page, and the plan reads as a plan"
```

---

## Phase 2 — The crisis screen shows the person's own people

**Steps 4 and 5 of the safety plan are the personalised crisis contacts**, so
there is no second list to build and no second thing to keep in sync. The
crisis screen reads the plan.

**What must not regress.** PRD 6.8: the crisis screen is never more than one
tap away, signed in or not, and it works offline. The national numbers are
static data in `crisis.ts` and **render first, always, before any read is
attempted**. A failed or slow Firestore read must leave the screen exactly as
it is today. Firestore's offline cache serves the contacts when the person has
opened the app before, which is the case that matters.

### Task 2.1: A pure function for which contacts to show

**Files:**
- Create: `packages/core/src/model/contacts.ts`
- Create: `packages/core/src/model/contacts.test.ts`
- Modify: `packages/core/src/index.ts`

**Interfaces:**
- Consumes: `type PlanEntry`, `PLAN_SECTIONS` from Task 1.1.
- Produces: `type PersonalContact = { name: string; dial: string; display: string }`,
  `personalContacts(entries: readonly PlanEntry[]): PersonalContact[]`,
  `toDial(raw: string): string | null`.

- [ ] **Step 1: Write the failing test**

`packages/core/src/model/contacts.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { personalContacts, toDial } from './contacts';

const at = new Date();

describe('turning what somebody typed into something a phone can dial', () => {
  it.each([
    ['0470 12 34 56', 'tel:0470123456'],
    ['+32 470 12 34 56', 'tel:+32470123456'],
    ['02/512.34.56', 'tel:025123456'],
    ['1813', 'tel:1813'],
  ])('%s dials as %s', (raw, expected) => {
    expect(toDial(raw)).toBe(expected);
  });

  it('refuses anything that is not a number', () => {
    // A name in the number field must not become a broken tel: link that
    // silently does nothing when somebody taps it in a crisis.
    expect(toDial('bel mijn zus')).toBeNull();
    expect(toDial('')).toBeNull();
    expect(toDial('12')).toBeNull();
  });
});

describe('which of the plan becomes a crisis contact', () => {
  it('takes the people and the professionals, in that order', () => {
    // Stanley and Brown's order: somebody who knows you before a service.
    const contacts = personalContacts([
      { section: 'professional', label: 'dokter Peeters', detail: '02 512 34 56', createdAt: at },
      { section: 'help', label: 'mijn zus', detail: '0470 12 34 56', createdAt: at },
      { section: 'coping', label: 'douche', detail: '', createdAt: at },
    ]);
    expect(contacts.map((c) => c.name)).toEqual(['mijn zus', 'dokter Peeters']);
  });

  it('leaves out anybody without a usable number', () => {
    // Shown, it would be a row that does nothing when tapped.
    const contacts = personalContacts([
      { section: 'help', label: 'mijn zus', detail: '', createdAt: at },
      { section: 'help', label: 'mijn broer', detail: 'weet ik niet', createdAt: at },
    ]);
    expect(contacts).toEqual([]);
  });

  it('keeps what was typed as the thing on screen', () => {
    // The dial string is stripped for the dialer; the display keeps the
    // spacing somebody recognises.
    const contacts = personalContacts([
      { section: 'help', label: 'mijn zus', detail: '0470 12 34 56', createdAt: at },
    ]);
    expect(contacts[0]).toEqual({
      name: 'mijn zus',
      display: '0470 12 34 56',
      dial: 'tel:0470123456',
    });
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run packages/core/src/model/contacts.test.ts`
Expected: FAIL — cannot find module `./contacts`.

- [ ] **Step 3: Write `packages/core/src/model/contacts.ts`**

```ts
import type { PlanEntry } from './plan';

/**
 * The person's own people, on the crisis screen.
 *
 * These are steps 4 and 5 of the safety plan rather than a separate list —
 * one thing to fill in, one thing to keep current. The national services in
 * `crisis.ts` are unchanged and still render first in the markup; these sit
 * above them on screen because Stanley and Brown put somebody who knows you
 * before a service, and because a familiar voice is often what is needed.
 */
export type PersonalContact = {
  name: string;
  /** What was typed, kept as-is: people recognise their own spacing. */
  display: string;
  /** Stripped so every dialer accepts it. */
  dial: string;
};

/**
 * Belgian numbers are written with spaces, slashes and dots, and every one of
 * those breaks a `tel:` link on some dialer. A leading `+` survives because
 * international numbers need it.
 *
 * Returns null for anything that is not plausibly a number. A row that looks
 * tappable and does nothing is worse than no row, and this is the one screen
 * where that matters most.
 */
export function toDial(raw: string): string | null {
  const trimmed = raw.trim();
  if (trimmed === '') return null;
  const plus = trimmed.startsWith('+') ? '+' : '';
  const digits = trimmed.replace(/\D/g, '');
  // Shortest real Belgian service number is four digits (1813, 1733).
  if (digits.length < 3) return null;
  // Anything with letters in it was a note, not a number.
  if (/[a-z]/i.test(trimmed)) return null;
  return `tel:${plus}${digits}`;
}

const CONTACT_SECTIONS = ['help', 'professional'] as const;

export function personalContacts(entries: readonly PlanEntry[]): PersonalContact[] {
  return CONTACT_SECTIONS.flatMap((section) =>
    entries
      .filter((entry) => entry.section === section)
      .flatMap((entry) => {
        const dial = toDial(entry.detail);
        if (dial === null || entry.label.trim() === '') return [];
        return [{ name: entry.label.trim(), display: entry.detail.trim(), dial }];
      }),
  );
}
```

- [ ] **Step 4: Export it**

In `packages/core/src/index.ts`:

```ts
export {
  personalContacts,
  toDial,
  type PersonalContact,
} from './model/contacts';
```

- [ ] **Step 5: Run the tests**

Run: `npx vitest run packages/core/src/model/contacts.test.ts`
Expected: PASS, 9 tests.

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/model/contacts.ts packages/core/src/model/contacts.test.ts packages/core/src/index.ts
git commit -m "feat(crisis): the plan's people become dialable contacts"
```

### Task 2.2: Show them on the crisis screen

**Files:**
- Modify: `apps/web/src/routes/Crisis.tsx`
- Modify: `apps/web/src/routes/Crisis.module.css`
- Modify: `apps/web/src/routes/Crisis.test.tsx`
- Modify: `packages/core/src/i18n/nl.ts`, `packages/core/src/i18n/en.ts`

- [ ] **Step 1: Write the failing tests first**

In `apps/web/src/routes/Crisis.test.tsx`, add:

```tsx
it('shows the national numbers before anything is loaded', () => {
  // PRD 6.8 — signed in or not, online or not. Nothing about the personal
  // contacts may delay or replace these.
  render(<Crisis />, { wrapper: Providers });
  expect(screen.getByText('1813')).toBeTruthy();
  expect(screen.getByText('112')).toBeTruthy();
});

it('still shows them when the plan cannot be read', async () => {
  vi.mocked(readPlan).mockRejectedValueOnce(new Error('offline'));
  render(<Crisis />, { wrapper: Providers });
  expect(screen.getByText('1813')).toBeTruthy();
  await waitFor(() => expect(screen.getByText('112')).toBeTruthy());
});
```

- [ ] **Step 2: Run and watch the second fail**

Run: `npx vitest run apps/web/src/routes/Crisis.test.tsx`
Expected: FAIL — `readPlan` is not yet called by `Crisis`.

- [ ] **Step 3: Add the section to `Crisis.tsx`**

The national list is rendered unconditionally and **first in the component
body**. The personal list is added above it in the layout with `order: -1`, so
a failed read changes nothing about what is already on screen.

```tsx
const [contacts, setContacts] = useState<PersonalContact[]>([]);

useEffect(() => {
  if (!user) return;
  // A failure here is silent on purpose. The national numbers are already on
  // screen and an error message on the crisis screen helps nobody.
  void readPlan(user.uid)
    .then((entries) => setContacts(personalContacts(entries)))
    .catch(() => setContacts([]));
}, [user]);
```

```tsx
{contacts.length > 0 ? (
  <section className={styles.personal}>
    <h2 className={styles.personalTitle}>{t('crisisYourPeople')}</h2>
    <ul className={styles.list}>
      {contacts.map((contact) => (
        <li key={`${contact.name}-${contact.dial}`}>
          <a className={styles.row} href={contact.dial}>
            <span className={styles.name}>{contact.name}</span>
            <span className={styles.number}>{contact.display}</span>
          </a>
        </li>
      ))}
    </ul>
  </section>
) : null}
```

- [ ] **Step 4: Add the copy**

`nl.ts`: `crisisYourPeople: 'Mensen die je zelf koos',`
`en.ts`: `crisisYourPeople: 'People you chose yourself',`

- [ ] **Step 5: Reuse the wrapping row style**

`.personal .row` must inherit the same `flex-wrap: wrap` fix the national rows
have, or a long name beside a long number reintroduces the 320px overflow
fixed on 2026-08-06.

- [ ] **Step 6: Run the gate, then check 320px in the browser**

Run: `pnpm verify`
Then: `pnpm dev`, open `/crisis` at 320px wide, confirm
`document.documentElement.scrollWidth === clientWidth`.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/routes/Crisis.tsx apps/web/src/routes/Crisis.module.css apps/web/src/routes/Crisis.test.tsx packages/core/src/i18n/nl.ts packages/core/src/i18n/en.ts
git commit -m "feat(crisis): your own people, above the national numbers"
```

---

## Phase 3 — Supporter guidance on `/following`

NICE recommends family intervention in psychosis; it reduces relapse and
readmission. The single best-evidenced mechanism is **expressed emotion** —
criticism, hostility and emotional over-involvement predict relapse
(Butzlaff & Hooley, 1998, *Archives of General Psychiatry*, meta-analysis).
That is what the guidance should be about, in plain words, without ever naming
it.

**The hard line: this is general education for the supporter, never advice
about this patient.** "Mensen vinden het vaak fijn als je vraagt hoe het gaat
zonder meteen op te lossen" is education. "Jonas lijkt gespannen, probeer
vandaag rustig te praten" is a conclusion drawn about a named person from
their data, which is the MDR line. Nothing in this phase reads a single
check-in.

### Task 3.1: The guidance itself, as data in core

**Files:**
- Create: `packages/core/src/model/supporting.ts`
- Create: `packages/core/src/model/supporting.test.ts`
- Modify: `packages/core/src/index.ts`
- Modify: `packages/core/src/i18n/nl.ts`, `packages/core/src/i18n/en.ts`

**Interfaces:**
- Produces: `SUPPORT_TIPS: readonly CopyKey[]`, `SUPPORT_DAILY: readonly CopyKey[]`,
  `supportTipFor(day: DateKey): CopyKey`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import { SUPPORT_DAILY, SUPPORT_TIPS, supportTipFor } from './supporting';
import { dictionaries } from '../i18n/index';

describe('what a supporter is told', () => {
  it('has copy for every tip in both languages', () => {
    for (const key of [...SUPPORT_TIPS, ...SUPPORT_DAILY]) {
      expect(dictionaries.nl[key], `nl is missing ${key}`).toBeTruthy();
      expect(dictionaries.en[key], `en is missing ${key}`).toBeTruthy();
    }
  });

  it('rotates one tip per day and comes back round', () => {
    // The same sentence every day becomes furniture and stops being read.
    const first = supportTipFor('2026-08-06');
    expect(supportTipFor('2026-08-06')).toBe(first);
    expect(supportTipFor('2026-08-07')).not.toBe(first);
    const cycle = SUPPORT_TIPS.length;
    expect(supportTipFor('2026-08-06')).toBe(
      supportTipFor(`2026-08-${String(6 + cycle).padStart(2, '0')}`),
    );
  });

  it('never tells the supporter anything about the patient', () => {
    /*
     * The MDR line, asserted rather than trusted. Every one of these is
     * general education. A sentence naming the person, or referring to their
     * check-in, would be a conclusion drawn from health data — clinical
     * monitoring, and the thing this product may never do.
     */
    for (const key of [...SUPPORT_TIPS, ...SUPPORT_DAILY]) {
      const text = dictionaries.nl[key];
      expect(text).not.toMatch(/check-?in|score|meting|vandaag lijkt|volgens/i);
    }
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run packages/core/src/model/supporting.test.ts`
Expected: FAIL — cannot find module `./supporting`.

- [ ] **Step 3: Write `packages/core/src/model/supporting.ts`**

```ts
import type { DateKey } from '../dates';
import type { CopyKey } from '../i18n/types';

/**
 * What helps, for the person doing the supporting.
 *
 * Family intervention is the best-evidenced psychosocial addition in
 * psychosis — NICE recommends it, and it reduces relapse and readmission. The
 * mechanism with the strongest evidence behind it is **expressed emotion**:
 * criticism, hostility and emotional over-involvement predict relapse
 * (Butzlaff & Hooley, 1998, meta-analysis). Everything below is that, said
 * plainly, without ever using the term.
 *
 * **General education, never advice about this person.** Nothing here reads a
 * check-in, a mood or a medication. A sentence that began "vandaag lijkt hij"
 * would be a conclusion drawn about a named person from their health data —
 * Class IIa under EU MDR, the line this product does not cross. A test
 * asserts it rather than trusting it.
 *
 * Deliberately short. A wall of advice is its own kind of pressure, and the
 * people reading this are usually tired.
 */
export const SUPPORT_TIPS = [
  'supportTipAsk',
  'supportTipListen',
  'supportTipSmall',
  'supportTipBlame',
  'supportTipPace',
  'supportTipYourself',
  'supportTipPresence',
] as const satisfies readonly CopyKey[];

/** The two or three things that are worth doing on an ordinary day. */
export const SUPPORT_DAILY = [
  'supportDailyOrdinary',
  'supportDailyOffer',
  'supportDailyRoutine',
] as const satisfies readonly CopyKey[];

/**
 * One tip a day, rotating. The same sentence every morning becomes furniture
 * and stops being read; the rotation is by date so it does not change while
 * somebody is looking at it.
 */
export function supportTipFor(day: DateKey): CopyKey {
  const [year, month, date] = day.split('-').map(Number);
  const index = Date.UTC(year ?? 0, (month ?? 1) - 1, date ?? 1) / 86_400_000;
  return SUPPORT_TIPS[Math.abs(Math.trunc(index)) % SUPPORT_TIPS.length]!;
}
```

- [ ] **Step 4: Add the copy**

`nl.ts`:

```ts
  // Wat helpt, voor wie meekijkt. Algemeen, nooit over deze persoon.
  supportTipAsk: 'Vragen hoe het gaat helpt meer dan raden. Ook als het antwoord kort is.',
  supportTipListen: 'Luisteren zonder meteen op te lossen is vaak genoeg. Het hoeft niet beter te worden van jouw antwoord.',
  supportTipSmall: 'Kleine dingen tellen. Samen koffie drinken is een bezoek.',
  supportTipBlame: 'Het is geen kwestie van willen. Verwijten maken het zwaarder en helpen niet.',
  supportTipPace: 'Herstel gaat met ups en downs. Een slechte week betekent niet dat het misloopt.',
  supportTipYourself: 'Zorg ook voor jezelf. Je houdt dit alleen vol als je zelf overeind blijft.',
  supportTipPresence: 'Er zijn telt. Je hoeft niets te zeggen dat het oplost.',
  supportDailyOrdinary: 'Doe gewone dingen samen. Niet elk gesprek hoeft over ziek zijn te gaan.',
  supportDailyOffer: 'Bied iets concreets aan in plaats van te vragen wat je kan doen.',
  supportDailyRoutine: 'Vaste momenten geven houvast. Elke dinsdag bellen werkt beter dan af en toe.',
```

`en.ts`:

```ts
  // What helps, for whoever is looking on. General, never about this person.
  supportTipAsk: 'Asking how things are helps more than guessing. Even when the answer is short.',
  supportTipListen: 'Listening without fixing it is often enough. It does not have to get better from your answer.',
  supportTipSmall: 'Small things count. Having coffee together is a visit.',
  supportTipBlame: 'It is not a matter of wanting to. Blame makes it heavier and does not help.',
  supportTipPace: 'Recovery goes in ups and downs. A bad week does not mean it is going wrong.',
  supportTipYourself: 'Look after yourself too. You can only keep this up if you stay standing.',
  supportTipPresence: 'Being there counts. You do not have to say anything that solves it.',
  supportDailyOrdinary: 'Do ordinary things together. Not every conversation has to be about being ill.',
  supportDailyOffer: 'Offer something concrete instead of asking what you can do.',
  supportDailyRoutine: 'Fixed moments give something to hold on to. Calling every Tuesday works better than now and then.',
```

- [ ] **Step 5: Export and run**

Add to `packages/core/src/index.ts`:

```ts
export {
  SUPPORT_DAILY,
  SUPPORT_TIPS,
  supportTipFor,
} from './model/supporting';
```

Run: `npx vitest run packages/core`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/model/supporting.ts packages/core/src/model/supporting.test.ts packages/core/src/index.ts packages/core/src/i18n/nl.ts packages/core/src/i18n/en.ts
git commit -m "feat(supporters): what helps, as data and in plain words"
```

### Task 3.2: Put it on the supporter's home screen

**Files:**
- Modify: `apps/web/src/routes/Following.tsx`
- Create: `apps/web/src/routes/Following.module.css`
- Modify: `packages/core/src/i18n/nl.ts`, `packages/core/src/i18n/en.ts`

- [ ] **Step 1: Add the section below the list of people**

Below the people and above the footer, so it never pushes what they came for
off the screen:

```tsx
<Hairline />

<section className={styles.support}>
  <h2 className={styles.supportTitle}>{t('supportTitle')}</h2>
  {/* One a day, rotating, so it does not become furniture. */}
  <p className={styles.tip}>{t(supportTipFor(today))}</p>
  <ul className={styles.daily}>
    {SUPPORT_DAILY.map((key) => (
      <li key={key} className={styles.dailyItem}>
        {t(key)}
      </li>
    ))}
  </ul>
</section>
```

`today` comes from `dateKey(new Date(), DEFAULT_TIMEZONE)` — the supporter has
no patient record of their own, so there is no personal timezone to use.

- [ ] **Step 2: Add the heading copy**

`nl.ts`: `supportTitle: 'Wat helpt',`
`en.ts`: `supportTitle: 'What helps',`

- [ ] **Step 3: Style it quietly**

`--text-quiet` on the list, `--surface` behind the section, no accent colour.
**Not `--human`** — amber means *another human has been here*, and this is the
app talking, not a person.

- [ ] **Step 4: Run the gate and look at it**

Run: `pnpm verify`
Then open `/following` at 320px and 1280px and confirm no horizontal scroll.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/routes/Following.tsx apps/web/src/routes/Following.module.css packages/core/src/i18n/nl.ts packages/core/src/i18n/en.ts
git commit -m "feat(supporters): what to say and what to do, on the home screen"
```

---

## Phase 4 — P8.3, the full rules matrix

The 245 rules tests grew case by case, as attacks somebody would actually try,
and they are good at that. PRD 5.3 asks for the other thing: **every cell**,
so a gap shows up as an empty cell rather than as a test nobody thought to
write. **Expect this to find something** — that is the point of running it.

### Task 4.1: Generate the matrix

**Files:**
- Create: `firestore/matrix.test.ts`

No config change: `vitest.rules.config.ts` already includes
`firestore/**/*.test.ts`, so a new file in that directory is picked up by
`pnpm test:rules` on its own.

- [ ] **Step 1: Write the matrix**

```ts
/**
 * PRD 5.3 — every (reader × permission × collection × operation) cell.
 *
 * `rules.test.ts` is the attacks somebody would actually try, written one at a
 * time as each feature landed. This is the complement: generated rather than
 * remembered, so a collection nobody wrote a test for shows as a failing cell
 * instead of as silence.
 *
 * A cell asserts only the *access* answer. Shape rules — a date matching its
 * document id, a source being present — stay in `rules.test.ts`, because the
 * matrix would need a valid fixture per collection to test them and that is
 * how a generated suite turns into a second implementation of the app.
 */
const READERS = ['self', 'granted', 'notGranted', 'revoked', 'stranger', 'unauthenticated'] as const;

const COLLECTIONS = [
  { path: 'checkins', doc: '2026-08-05', permission: 'checkins' },
  { path: 'weekly', doc: '2026-W32', permission: 'checkins' },
  { path: 'medications', doc: 'med-1', permission: 'medication' },
  { path: 'doses', doc: '2026-08-05_med-1_0800', permission: 'doses' },
  { path: 'health', doc: '2026-08-05', permission: 'health' },
  { path: 'activities', doc: 'act-1', permission: 'calendar' },
  { path: 'completions', doc: 'act-1_2026-08-05', permission: 'calendar' },
  { path: 'posts', doc: 'post-1', permission: 'feed' },
  { path: 'plan', doc: 'plan-1', permission: 'plan' },
  { path: 'consents', doc: 'v1', permission: null },
  { path: 'permissionLog', doc: 'entry-1', permission: null },
  { path: 'circle', doc: 'uid-someone-else', permission: null },
] as const;
```

For each `(reader, collection)` the expected read answer is:

| reader | permission is null | permission granted | permission off |
|---|---|---|---|
| self | allow | allow | allow |
| granted | deny | **allow** | deny |
| notGranted | deny | deny | deny |
| revoked | deny | deny | deny |
| stranger | deny | deny | deny |
| unauthenticated | deny | deny | deny |

**Writes are self-only everywhere in this matrix.** The three deliberate
exceptions — a verified clinician writing medication, a circle member creating
a suggested activity, a member reacting or commenting on a post — are tested
by name in `rules.test.ts` and are explicitly excluded here with a comment
saying so, because a generated suite that quietly encodes an exception stops
being a check on the exceptions.

- [ ] **Step 2: Run it and record what it finds**

Run: `pnpm test:rules`
Expected: some cells fail. **Do not fix them by relaxing the matrix.** For
each failure, decide whether the rule or the expectation is wrong, and write
the reasoning into the test.

- [ ] **Step 3: Fix whatever it found, one commit per finding**

Each gets its own commit with the reasoning in the message, in the style of
the D29 and erasure commits.

- [ ] **Step 4: Commit the matrix**

```bash
git add firestore/matrix.test.ts vitest.rules.config.ts
git commit -m "test(rules): every cell of the access matrix, generated"
```

---

## Phase 5 — P8.4, the error-handling sweep

`genericError` and `offline` exist and are used in **three places across the
whole app**. Every other failure path is `.catch(() => [])` — which is right
for the windline, where the data is decoration and nothing depends on it, and
wrong for a write, where somebody believes their medication was recorded.

### Task 5.1: One place that decides what a failure says

**Files:**
- Create: `apps/web/src/errors.ts`
- Create: `apps/web/src/errors.test.ts`

**Interfaces:**
- Produces: `messageKeyFor(error: unknown): CopyKey`, `reportError(where: string, error: unknown): void`.

- [ ] **Step 1: Write the failing test**

```ts
describe('what a failure says to somebody', () => {
  it('names being offline, because that one is worth waiting out', () => {
    expect(messageKeyFor({ code: 'unavailable' })).toBe('offline');
    expect(messageKeyFor({ code: 'failed-precondition' })).toBe('offline');
  });

  it('says a permission was refused without explaining the rules', () => {
    expect(messageKeyFor({ code: 'permission-denied' })).toBe('errorNotAllowed');
  });

  it('falls back to the plain message for anything else', () => {
    expect(messageKeyFor(new Error('boom'))).toBe('genericError');
    expect(messageKeyFor(undefined)).toBe('genericError');
  });
});

describe('what gets logged', () => {
  it('never logs the thing that was being written', () => {
    /*
     * The failure this prevents: a console line containing a diary entry.
     * Article 9 data does not belong in a log, and a browser console is not
     * a private place — it is copied into bug reports.
     */
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    reportError('saveCheckin', { code: 'permission-denied', note: 'ik voelde me rot' });
    const logged = JSON.stringify(spy.mock.calls);
    expect(logged).toContain('saveCheckin');
    expect(logged).toContain('permission-denied');
    expect(logged).not.toContain('ik voelde me rot');
  });
});
```

- [ ] **Step 2: Implement `apps/web/src/errors.ts`**

```ts
import type { CopyKey } from '@luwte/core';

/**
 * What a failure says, decided once.
 *
 * Firestore's offline queue means most write failures are not failures at
 * all — the write is in the local cache and will sync. What reaches here is
 * the genuinely broken case, and it deserves better than silence.
 *
 * **Only the code is ever logged, never the payload.** A console line
 * containing a diary entry is Article 9 data in a place that gets pasted into
 * bug reports.
 */
export function messageKeyFor(error: unknown): CopyKey {
  const code = (error as { code?: string } | undefined)?.code;
  if (code === 'unavailable' || code === 'failed-precondition') return 'offline';
  if (code === 'permission-denied') return 'errorNotAllowed';
  return 'genericError';
}

export function reportError(where: string, error: unknown): void {
  const code = (error as { code?: string } | undefined)?.code ?? 'unknown';
  console.error(`[luwte] ${where} failed: ${code}`);
}
```

- [ ] **Step 3: Add the one new copy key**

`nl.ts`: `errorNotAllowed: 'Dat mag je hier niet. Vraag het aan wie het deelde.',`
`en.ts`: `errorNotAllowed: 'You are not allowed to do that here. Ask whoever shared it.',`

- [ ] **Step 4: Run**

Run: `npx vitest run apps/web/src/errors.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/errors.ts apps/web/src/errors.test.ts packages/core/src/i18n/nl.ts packages/core/src/i18n/en.ts
git commit -m "feat(errors): one place decides what a failure says"
```

### Task 5.2: Sweep the write paths

**Files (one commit per screen):**
- `apps/web/src/routes/CheckIn.tsx`, `TodayCheckin.tsx`, `Medication.tsx`,
  `Calendar.tsx`, `Plan.tsx`, `Circle.tsx`, `CircleMember.tsx`, `Invite.tsx`,
  `FindClinician.tsx`, `Console.tsx`, `ConsolePatient.tsx`, `Settings.tsx`

- [ ] **Step 1: For each screen, every write shows a message on failure**

The pattern, using the `role="status"` region the sign-in screen already
established:

```tsx
const [message, setMessage] = useState<string | null>(null);

const save = () => {
  void addPlanEntry(uid, values)
    .then(reload)
    .catch((error: unknown) => {
      reportError('addPlanEntry', error);
      setMessage(t(messageKeyFor(error)));
    });
};
```

```tsx
<p className={styles.note} role="status" aria-live="polite">
  {message}
</p>
```

- [ ] **Step 2: Leave the decorative reads alone, and say so**

The windline, the history and the insights chart keep `.catch(() => [])` with
a comment. Nothing depends on them and an error message about a decorative
line is noise. **Do not sweep these.**

- [ ] **Step 3: Run the gate after each screen**

Run: `pnpm verify`

- [ ] **Step 4: Commit per screen**

```bash
git commit -m "fix(errors): <screen> says when a write did not land"
```

---

## Self-review

**Spec coverage.** (1) Stanley–Brown → Phase 1. (2) Personalised crisis
contacts → Phase 2, built on Phase 1's `help` and `professional` sections.
(3) Supporter guidance, what to say and what to do daily → Phase 3.
(4) P8.3 → Phase 4, P8.4 → Phase 5.

**Type consistency.** `PlanEntry` is `{ section, label, detail, createdAt }`
throughout; `PlanEntryRecord` adds `id`. `personalContacts` consumes
`PlanEntry[]` and produces `PersonalContact[]`. `supportTipFor` takes a
`DateKey` and returns a `CopyKey`. `messageKeyFor` returns a `CopyKey`.

**Known risk, stated rather than discovered later.** Phase 1 renames
`sign`/`action` to `label`/`detail`. That is safe **only because `luwte-prod`
is live and empty** and the pilot has not started. If any real plan data
exists when this is executed, stop and write a migration instead.

**Ordering.** Phase 2 depends on Phase 1. Phases 3, 4 and 5 are independent of
everything and of each other. Phase 4 is the one most likely to produce extra
work, so it should not be last if the pilot date is close.
