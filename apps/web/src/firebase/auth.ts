import {
  createUserWithEmailAndPassword,
  isSignInWithEmailLink,
  sendSignInLinkToEmail,
  signInWithEmailAndPassword,
  signInWithEmailLink,
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

export function signOut(): Promise<void> {
  return fbSignOut(auth);
}
