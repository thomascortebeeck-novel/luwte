import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as fbSignOut,
  type UserCredential,
} from 'firebase/auth';
import { auth } from './client';

/**
 * PRD 5.5 — Auth holds an email and nothing else. No display name, no
 * profile, no custom claims carrying anything about a person's health.
 * Everything identifying lives in Firestore under the pseudonymous uid.
 *
 * Two ways in: **a password, or a Google account.** The emailed sign-in link
 * was removed — see `SignIn.tsx` for why one fewer way in is the better
 * answer here.
 */

/** Loose on purpose. The address either works or it does not; that is the real check. */
export function looksLikeEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

/**
 * Signing in, and nothing else.
 *
 * This replaced a `signInOrRegister` that **created an account when sign-in
 * failed**, which was wrong in a way that only showed up on a bad day: modern
 * Firebase answers a wrong password with `auth/invalid-credential`, the same
 * code it uses for an unknown address, so mistyping your own password tried
 * to register you afresh. That then failed as already-in-use and surfaced as
 * "signing in didn't work" — with nothing anywhere saying *your password is
 * wrong*, which was the one fact that would have helped.
 */
export function signIn(email: string, password: string): Promise<UserCredential> {
  return signInWithEmailAndPassword(auth, email.trim(), password);
}

export function register(email: string, password: string): Promise<UserCredential> {
  return createUserWithEmailAndPassword(auth, email.trim(), password);
}

/**
 * A way back in, and the reason removing the emailed link needed care.
 *
 * With a password as the only address-based way in, forgetting it would
 * otherwise mean losing the logbook — months of somebody's own record, gone
 * because of the thing illness and sedating medication make hardest. The
 * request is made by the person, from the screen; luwte sends nothing on
 * anybody's behalf.
 *
 * **Never throws for an unknown address.** The caller shows the same words
 * either way, so this cannot be used to find out who has an account.
 */
export async function resetPassword(email: string): Promise<void> {
  try {
    await sendPasswordResetEmail(auth, email.trim());
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (code === 'auth/user-not-found' || code === 'auth/invalid-email') return;
    throw error;
  }
}

/**
 * Signing in with a Google account.
 *
 * PRD 5.5 chose email deliberately, and this does not undo that: nothing more
 * is stored either way. Firebase hands back a profile with a display name and
 * a photo URL, and **neither is read here** — the name the app uses is the one
 * the person types in onboarding, and there is no photo anywhere in luwte.
 *
 * What it does change is worth saying plainly rather than burying: using it
 * tells Google this person opened luwte. For an app holding Article 9 data
 * that is a real disclosure, so the sign-in screen says so and email stays an
 * equal option rather than a fallback.
 *
 * A popup rather than a redirect: a redirect loses the invite code held in
 * sessionStorage on some mobile browsers, and an invite link that works for
 * everyone except Google users is the sort of bug nobody reports.
 */
export function signInWithGoogle(): Promise<UserCredential> {
  const provider = new GoogleAuthProvider();
  // Ask for nothing beyond the sign-in itself. No contacts, no calendar, no
  // profile scopes — luwte's Google Calendar export is a prefilled link
  // precisely so it never needs a token (D-calendar).
  provider.setCustomParameters({ prompt: 'select_account' });
  return signInWithPopup(auth, provider);
}

export function signOut(): Promise<void> {
  return fbSignOut(auth);
}
