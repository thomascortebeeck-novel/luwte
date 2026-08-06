import { PLAN_SECTIONS } from '@luwte/core';
import { describe, expect, it, vi } from 'vitest';
import { toPlanSection } from './plan';

/*
 * `./client` throws at module-load time when the real Firebase env vars are
 * absent (see client.ts) — correct for the app, fatal for a plain `vitest
 * run` with no project configured. No `apps/web/src/firebase/*.test.ts` file
 * has ever imported the real module for exactly this reason; every other
 * test mocks the whole of `../firebase/plan` instead. `toPlanSection` makes
 * no Firestore call at all, so stubbing this one boundary is enough to run
 * the real function under test.
 */
vi.mock('./client', () => ({ db: {} }));

/**
 * `readPlan` used to cast `data.section` straight to `PlanSection` with no
 * check. That was unreachable while nothing wrote a `section`, but this
 * module is what starts writing one on every new entry, and `/plan/{entryId}`
 * has no shape validation in the rules — so a stray value now has a real path
 * onto a document. Left uncaught, it would type as valid and then silently
 * vanish from every `entriesInSection` grouping: no crash, no error, just an
 * entry that never appears again. On a safety plan that is the wrong failure
 * mode, so `toPlanSection` is what stands in front of the cast.
 */
describe('guarding the section read back from a document nothing validates', () => {
  it('keeps every real section value as itself', () => {
    for (const section of PLAN_SECTIONS) {
      expect(toPlanSection(section)).toBe(section);
    }
  });

  it('defaults an absent section the same way the schema does', () => {
    expect(toPlanSection(undefined)).toBe('warning');
  });

  it('defaults a value that is not one of the six, rather than trusting it', () => {
    expect(toPlanSection('sabotage')).toBe('warning');
    expect(toPlanSection('')).toBe('warning');
    expect(toPlanSection('Warning')).toBe('warning'); // case must match exactly
  });

  it('defaults anything that is not even a string', () => {
    expect(toPlanSection(42)).toBe('warning');
    expect(toPlanSection(null)).toBe('warning');
    expect(toPlanSection({ nested: true })).toBe('warning');
    expect(toPlanSection(['warning'])).toBe('warning');
  });
});
