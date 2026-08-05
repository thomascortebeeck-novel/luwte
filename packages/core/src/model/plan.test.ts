import { describe, expect, it } from 'vitest';
import { dictionaries, LOCALES } from '../i18n/index';
import { PLAN_EXAMPLE_KEYS, hasPlan, planEntrySchema } from './plan';

const entry = (overrides: Record<string, unknown> = {}) => ({
  sign: 'Ik slaap minder dan vijf uur.',
  action: 'Ik bel mijn zus.',
  createdAt: new Date('2026-08-05T10:00:00Z'),
  ...overrides,
});

describe('an entry in the plan', () => {
  it('needs something noticed, because a plan of blanks helps nobody', () => {
    expect(planEntrySchema.safeParse(entry()).success).toBe(true);
    expect(planEntrySchema.safeParse(entry({ sign: '' })).success).toBe(false);
  });

  it('lets the response be empty while somebody is still thinking', () => {
    // Naming a sign and not yet knowing what to do about it is a real state,
    // and refusing to store it would lose the half they do have.
    const parsed = planEntrySchema.safeParse({ sign: 'Ik ga niet meer buiten.', createdAt: new Date() });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.action).toBe('');
  });

  it('keeps entries short enough to scan on a bad day', () => {
    expect(planEntrySchema.safeParse(entry({ sign: 'x'.repeat(201) })).success).toBe(false);
    expect(planEntrySchema.safeParse(entry({ action: 'x'.repeat(301) })).success).toBe(false);
  });
});

describe('hasPlan', () => {
  it('is false for nothing and for whitespace', () => {
    expect(hasPlan([])).toBe(false);
    expect(hasPlan([{ sign: '   ', action: '', createdAt: new Date() }])).toBe(false);
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
