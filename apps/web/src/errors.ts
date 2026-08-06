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
