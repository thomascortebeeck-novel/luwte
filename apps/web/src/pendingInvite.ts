const KEY = 'luwte.pendingInvite';

/**
 * An invite link opened by someone who is not signed in yet sends them
 * through sign-in and possibly onboarding first. The code has to survive that
 * detour, or the link only works for people who already have an account —
 * which is the opposite of what an invite is for.
 *
 * sessionStorage rather than localStorage: it belongs to this tab and this
 * visit, and a code left lying around after the browser closes would drag
 * someone back to a join screen they already dealt with.
 *
 * Reading never consumes. The code is cleared once the join screen has
 * actually reached a conclusion, so a double render cannot swallow it.
 */
export function rememberInvite(code: string): void {
  try {
    sessionStorage.setItem(KEY, code);
  } catch {
    // Private browsing with storage refused. The link still works for anyone
    // already signed in, which is the common case.
  }
}

export function peekPendingInvite(): string | null {
  try {
    return sessionStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function clearPendingInvite(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // Nothing was stored, so nothing to clear.
  }
}
