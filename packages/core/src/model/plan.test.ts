import { describe, expect, it } from 'vitest';
import { dictionaries, LOCALES } from '../i18n/index';
import {
  PLAN_EXAMPLE_KEYS,
  PLAN_SECTIONS,
  PLAN_SECTION_COPY,
  entriesInSection,
  hasPlan,
  planEntrySchema,
} from './plan';

const entry = (overrides: Record<string, unknown> = {}) => ({
  section: 'warning' as const,
  label: 'Ik slaap minder dan vijf uur.',
  detail: 'Ik bel mijn zus.',
  createdAt: new Date('2026-08-05T10:00:00Z'),
  ...overrides,
});

describe('an entry in the plan', () => {
  it('needs something noticed, because a plan of blanks helps nobody', () => {
    expect(planEntrySchema.safeParse(entry()).success).toBe(true);
    expect(planEntrySchema.safeParse(entry({ label: '' })).success).toBe(false);
  });

  it('lets the response be empty while somebody is still thinking', () => {
    // Naming a sign and not yet knowing what to do about it is a real state,
    // and refusing to store it would lose the half they do have.
    const parsed = planEntrySchema.safeParse({ label: 'Ik ga niet meer buiten.', createdAt: new Date() });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.detail).toBe('');
  });

  it('keeps entries short enough to scan on a bad day', () => {
    expect(planEntrySchema.safeParse(entry({ label: 'x'.repeat(201) })).success).toBe(false);
    expect(planEntrySchema.safeParse(entry({ detail: 'x'.repeat(301) })).success).toBe(false);
  });
});

describe('hasPlan', () => {
  it('is false for nothing and for whitespace', () => {
    expect(hasPlan([])).toBe(false);
    expect(
      hasPlan([{ section: 'warning', label: '   ', detail: '', createdAt: new Date() }]),
    ).toBe(false);
  });

  it('is true as soon as one sign is written down', () => {
    expect(hasPlan([entry()])).toBe(true);
  });
});

describe('the examples', () => {
  it('are examples and not an instrument', () => {
    /*
     * A ready-made list of warning signs would have people agreeing to
     * symptoms they do not have, and a plan only works in somebody's own
     * words. Four sentences to read, no ids to tick, no scores.
     */
    expect(PLAN_EXAMPLE_KEYS).toHaveLength(4);
  });

  it.each(LOCALES)('has copy in %s', (locale) => {
    for (const key of PLAN_EXAMPLE_KEYS) {
      expect(dictionaries[locale][key], key).toBeTruthy();
    }
  });
});

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
