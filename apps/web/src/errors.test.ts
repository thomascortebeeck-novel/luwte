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
