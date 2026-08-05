import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  isSignInWithEmailLink,
  sendSignInLinkToEmail,
  signInWithEmailAndPassword,
  signInWithEmailLink,
  signInWithPopup,
  signOut as fbSignOut,
  type UserCredential,
} from 'firebase/auth';
import { auth } from './client';

/**
 * PRD 5.5 — Auth holds an email and nothing else. No display name, no
 * profile, no custom claims carrying anything about a person's health.
 * Everything identifying lives in Firestore under the pseudonymous uid.
 */

const EMAIL_KEY = 'luwte.pendingEmail';

/** Loose on purpose. The mail either arrives or it does not; that is the real check. */
export function looksLikeEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export async function sendLink(email: string, continueUrl: string): Promise<void> {
  await sendSignInLinkToEmail(auth, email, {
    url: continueUrl,
    handleCodeInApp: true,
  });
  // Needed to complete sign-in when they come back. Cleared on completion.
  try {
    localStorage.setItem(EMAIL_KEY, email);
  } catch {
    // Private browsing. They will be asked for the address again instead.
  }
}

export function pendingEmail(): string | null {
  try {
    return localStorage.getItem(EMAIL_KEY);
  } catch {
    return null;
  }
}

export function isLinkSignIn(href: string): boolean {
  return isSignInWithEmailLink(auth, href);
}

export async function completeLinkSignIn(href: string, email: string): Promise<UserCredential> {
  const credential = await signInWithEmailLink(auth, email, href);
  try {
    localStorage.removeItem(EMAIL_KEY);
  } catch {
    // Nothing to clean up.
  }
  return credential;
}

/**
 * The password fallback. Tries to sign in first and only creates an account
 * if none exists, so the same screen serves both without asking the person to
 * decide whether they are new — a distinction they should not have to make.
 */
export async function signInOrRegister(email: string, password: string): Promise<UserCredential> {
  try {
    return await signInWithEmailAndPassword(auth, email, password);
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (code === 'auth/user-not-found' || code === 'auth/invalid-credential') {
      return createUserWithEmailAndPassword(auth, email, password);
    }
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
 * that is a real disclosure, so the consent screen says so and email stays an
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
