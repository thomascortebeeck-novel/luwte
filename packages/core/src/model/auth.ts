import type { CopyKey } from '../i18n/types';

/**
 * What the sign-in screen decides, kept out of the screen.
 *
 * **luwte deliberately does not tell anybody whether an address has an
 * account.** For most products that is a mild security preference; here it is
 * a disclosure about a named person. Confirming "this address already has a
 * luwte account" tells whoever asked that this person keeps a logbook for
 * psychosis and depression — and anyone can ask, from a sign-up form, without
 * a password. So every message below reads the same whether the account
 * exists or not, and the ones that would otherwise leak are mapped to wording
 * that helps without confirming.
 */

/**
 * NIST SP 800-63B: length is what matters, and composition rules ("must
 * contain a symbol") push people towards `Passw0rd!` and a sticky note. Eight
 * is the floor it recommends; Firebase's own default of six is lower than
 * anything current guidance supports.
 */
export const MIN_PASSWORD_LENGTH = 8;

export type PasswordProblem = 'tooShort' | 'sameAsEmail';

/**
 * Checked as the person types, so the requirement is visible **before** they
 * submit rather than arriving as a rejection afterwards. Returns null when the
 * password is acceptable.
 */
export function passwordProblem(password: string, email = ''): PasswordProblem | null {
  if (password.length < MIN_PASSWORD_LENGTH) return 'tooShort';
  // Not a composition rule — a genuine footgun. The address is the one string
  // an attacker already has.
  if (email.length > 0 && password.trim().toLowerCase() === email.trim().toLowerCase()) {
    return 'sameAsEmail';
  }
  return null;
}

export const PASSWORD_PROBLEM_COPY: Record<PasswordProblem, CopyKey> = {
  tooShort: 'authPasswordTooShort',
  sameAsEmail: 'authPasswordSameAsEmail',
};

export type AuthMode = 'signIn' | 'register';

/**
 * Closing the Google popup is not a failure.
 *
 * It is somebody changing their mind, and answering it with "signing in did
 * not work" tells them something went wrong when nothing did. These codes get
 * no message at all — they are back on the sign-in screen with every way in
 * still in front of them.
 */
const SILENT = new Set([
  'auth/popup-closed-by-user',
  'auth/cancelled-popup-request',
  'auth/user-cancelled',
]);

export function isSilentAuthError(code: string | undefined): boolean {
  return code !== undefined && SILENT.has(code);
}

/**
 * A Firebase error code becomes something a person can act on.
 *
 * Returns null when nothing should be said. Note what is *not* here:
 * `auth/user-not-found` and `auth/wrong-password` both collapse into one
 * message, and so does `auth/invalid-credential`, which is what modern
 * Firebase returns for both once email-enumeration protection is on.
 */
export function authErrorKey(code: string | undefined, mode: AuthMode): CopyKey | null {
  if (isSilentAuthError(code)) return null;

  switch (code) {
    case 'auth/invalid-email':
      return 'signInInvalidEmail';

    case 'auth/weak-password':
      return 'authPasswordTooShort';

    case 'auth/too-many-requests':
      return 'authTooManyAttempts';

    /*
     * **Not the general `offline` copy**, which promises that what you filled
     * in is kept and sent later. That is true of a check-in, because Firestore
     * queues writes offline — and flatly untrue here. Nothing about signing in
     * is queued, and telling somebody it was saved when it was not is worse
     * than saying nothing. Found by walking the screen with the emulator down.
     */
    case 'auth/network-request-failed':
      return 'authOffline';

    /*
     * The enumeration case, and the reason this function exists.
     *
     * Saying "that address already has an account" is the helpful answer and
     * the one that leaks. The wording it maps to instead is true either way:
     * it points at signing in, which is what somebody with an account needs
     * to do, and reads as an ordinary failure to somebody without one.
     */
    case 'auth/email-already-in-use':
      return 'authRegisterFailed';

    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
    case 'auth/invalid-login-credentials':
      return 'authWrongCredentials';

    default:
      return mode === 'register' ? 'authRegisterFailed' : 'signInFailed';
  }
}
