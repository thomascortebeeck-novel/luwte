import { dictionaries } from '@luwte/core';
import { describe, expect, it, vi } from 'vitest';
import { messageKeyFor, reportError } from './errors';

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

  it('reads true on a screen showing only your own record, not just a shared one', () => {
    /*
     * Regression: errorNotAllowed used to say "Vraag het aan wie het
     * deelde" / "Ask whoever shared it" — written for Console,
     * ConsolePatient and a supporter's view, then reused unexamined on
     * CheckIn, Medication, Plan, Calendar, Circle, Invite and Settings,
     * where the person is writing their own record and nobody shared
     * anything with them. False there, and it implied they needed someone
     * else's permission for their own data — against "the person is in
     * full control". permission-denied fires the same message everywhere
     * messageKeyFor is used, so the copy itself has to hold regardless of
     * which of those screens it appears on.
     */
    expect(dictionaries.nl.errorNotAllowed).not.toMatch(/wie|deelde|gedeeld/i);
    expect(dictionaries.en.errorNotAllowed).not.toMatch(/whoever|shared/i);
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

  it('refuses a code that only looks like one — the exact bypass this was written against', () => {
    /*
     * `error.code` is `unknown` at the type level. `(error as
     * {code?:string})?.code` is a compile-time cast, not a runtime check, so
     * a getter that returns a crafted string sailed straight through it: a
     * console line ending in "permission-denied: ik voelde me rot" is a
     * diary entry in the log, not a code. A real Firebase code never
     * contains a colon or a space, so matching the shape closes this rather
     * than trying to enumerate every bad string.
     */
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    reportError('saveCheckin', {
      get code() {
        return 'permission-denied: ik voelde me rot';
      },
    });
    const logged = JSON.stringify(spy.mock.calls);
    expect(logged).not.toContain('ik voelde me rot');
    expect(logged).toContain('unknown');
  });

  it('treats the same crafted code as unknown when choosing what to say, not as a real permission refusal', () => {
    expect(messageKeyFor({ code: 'permission-denied: ik voelde me rot' })).toBe('genericError');
    expect(messageKeyFor({ code: 'unavailable and then some' })).toBe('genericError');
  });

  it('does not itself become a second crash when reading the code throws', () => {
    const poison = {
      get code(): string {
        throw new Error('boom');
      },
    };
    expect(() => messageKeyFor(poison)).not.toThrow();
    expect(messageKeyFor(poison)).toBe('genericError');

    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(() => reportError('saveCheckin', poison)).not.toThrow();
    expect(JSON.stringify(spy.mock.calls)).toContain('unknown');
  });

  it('still logs the shapes a real Firebase code actually takes', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    reportError('signIn', { code: 'auth/invalid-credential' });
    expect(JSON.stringify(spy.mock.calls)).toContain('auth/invalid-credential');
  });
});
