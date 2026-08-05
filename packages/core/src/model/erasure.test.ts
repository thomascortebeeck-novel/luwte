import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  buildExport,
  erasureStillPermitted,
  exportEnvelopeSchema,
  exportFilename,
  EXPORT_SECTIONS,
  EXPORT_VERSION,
  PATIENT_SUBCOLLECTIONS,
  POST_SUBCOLLECTIONS,
} from './erasure';

const sections = () =>
  Object.fromEntries(EXPORT_SECTIONS.map((s) => [s, []])) as Record<string, unknown>;

describe('an export is complete or it is an error', () => {
  it('carries every section, the version and the date', () => {
    const env = buildExport('pat-1', new Date('2026-08-05T10:00:00Z'), sections());
    expect(exportEnvelopeSchema.parse(env)).toBeTruthy();
    expect(env.version).toBe(EXPORT_VERSION);
    expect(env.exportedAt).toBe('2026-08-05T10:00:00.000Z');
    expect(Object.keys(env.data).sort()).toEqual([...EXPORT_SECTIONS].sort());
  });

  it('refuses to build rather than quietly omitting a collection', () => {
    /*
     * The failure this prevents: an export missing `doses` looks exactly like
     * the export of somebody who never ticked one off. Article 15 would be
     * answered wrongly and nothing would look wrong.
     */
    const partial = sections();
    delete partial.doses;
    expect(() => buildExport('pat-1', new Date(), partial)).toThrow(/doses/);
  });

  it('names the file after the person and the day', () => {
    expect(exportFilename('Jonas', new Date('2026-08-05T22:30:00Z'))).toBe(
      'luwte-jonas-2026-08-05.json',
    );
  });

  it('survives a name that is not filesystem-safe', () => {
    expect(exportFilename('Anaïs  De Smet/../etc', new Date('2026-01-02T00:00:00Z'))).toBe(
      'luwte-anais-de-smet-etc-2026-01-02.json',
    );
    // Never an empty or dot-leading filename, whatever was typed.
    expect(exportFilename('***', new Date('2026-01-02T00:00:00Z'))).toBe(
      'luwte-export-2026-01-02.json',
    );
  });
});

describe('erasure stays permitted until it is finished', () => {
  it('is refused before the person has started', () => {
    expect(erasureStillPermitted({ erasureStartedAt: null })).toBe(false);
  });

  it('is permitted once the marker is down', () => {
    expect(erasureStillPermitted({ erasureStartedAt: new Date() })).toBe(true);
  });

  it('is refused when there is no patient document at all', () => {
    /*
     * This answered `true` for one draft, on the theory that a missing patient
     * document proves erasure was already under way — the marker lives on it,
     * after all.
     *
     * Ten rules tests failed on that and every one was right. **No patient
     * document is the ordinary state before onboarding finishes**, so the
     * permissive answer switched off delete-protection for anybody who had not
     * got that far — precisely the refusals the rest of the database depends
     * on. Nothing is lost by saying no: the patient document is removed after
     * everything it heads, so there is never anything left to strand.
     */
    expect(erasureStillPermitted(null)).toBe(false);
  });
});

/**
 * The guard, and the reason this file does not depend on anybody remembering.
 *
 * `contrast.test.ts` learned this the expensive way: a list of "the things
 * that exist today" is followed for the cases somebody thought about and
 * silently wrong for the ones nobody did. There it cost an unreadable label.
 * Here it would cost health data outliving a person's request to erase it,
 * with nothing on either side to indicate it had happened.
 *
 * So read `paths.ts` and assert every collection under a patient is accounted
 * for. A new collection fails this the moment its path is written.
 */
describe('every collection under a patient is covered by erasure', () => {
  const source = readFileSync(join(import.meta.dirname, 'paths.ts'), 'utf8');

  const found = new Set<string>();
  for (const [, name] of source.matchAll(/patients\/\$\{patientId\}\/([a-zA-Z]+)/g)) {
    if (name) found.add(name);
  }

  const postSubs = new Set<string>();
  for (const [, name] of source.matchAll(/posts\/\$\{postId\}\/([a-zA-Z]+)/g)) {
    if (name) postSubs.add(name);
  }

  it('finds the collections at all, so a broken scan cannot pass silently', () => {
    expect(found.size).toBeGreaterThan(8);
    expect(found).toContain('checkins');
    expect(postSubs).toContain('comments');
  });

  it.each([...found].sort())('patients/{id}/%s is erased', (name) => {
    expect(PATIENT_SUBCOLLECTIONS as readonly string[]).toContain(name);
  });

  it.each([...postSubs].sort())('posts/{id}/%s is erased with its post', (name) => {
    expect(POST_SUBCOLLECTIONS as readonly string[]).toContain(name);
  });

  it('exports everything it erases', () => {
    // Erasing something the export omits means the person loses data they
    // were never given a copy of. The two lists move together or not at all.
    for (const name of PATIENT_SUBCOLLECTIONS) {
      expect(EXPORT_SECTIONS as readonly string[]).toContain(name);
    }
  });

  it('does not claim to erase a collection that no longer exists', () => {
    // The other direction: a stale entry here would send the client deleting
    // a path nothing writes, which reads as covered and is dead code.
    for (const name of PATIENT_SUBCOLLECTIONS) {
      expect(found).toContain(name);
    }
  });
});
