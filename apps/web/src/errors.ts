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

/**
 * A real Firebase error code's shape: lowercase letters and hyphens, with at
 * most one slash — `permission-denied`, `unavailable`,
 * `auth/invalid-credential`. `error` is typed `unknown`, so `.code` can be
 * anything a caller hands us, including the payload it was supposed to
 * describe — `{ get code() { return 'permission-denied: ' + diaryText } }`
 * is a string too, so `typeof code === 'string'` alone does not catch it.
 * Matching the shape does.
 */
const CODE_SHAPE = /^[a-z]+(-[a-z]+)*(\/[a-z]+(-[a-z]+)*)?$/;

/**
 * Reads `.code` without trusting its shape, or even that reading it
 * succeeds — `error` is `unknown`, so `.code` can be a getter that throws,
 * and the error reporter must never let that become a second crash on top
 * of the first. Anything that is not a string, or does not match a real
 * code's shape, comes back as `'unknown'` rather than being logged.
 */
function safeCode(error: unknown): string {
  let raw: unknown;
  try {
    raw = (error as { code?: unknown } | null | undefined)?.code;
  } catch {
    return 'unknown';
  }
  return typeof raw === 'string' && CODE_SHAPE.test(raw) ? raw : 'unknown';
}

export function messageKeyFor(error: unknown): CopyKey {
  const code = safeCode(error);
  if (code === 'unavailable' || code === 'failed-precondition') return 'offline';
  if (code === 'permission-denied') return 'errorNotAllowed';
  return 'genericError';
}

export function reportError(where: string, error: unknown): void {
  console.error(`[luwte] ${where} failed: ${safeCode(error)}`);
}
