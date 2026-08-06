import { describe, expect, it } from 'vitest';
import {
  MIN_PASSWORD_LENGTH,
  PASSWORD_PROBLEM_COPY,
  authErrorKey,
  isSilentAuthError,
  passwordProblem,
} from './auth';
import { dictionaries } from '../i18n/index';

describe('what counts as a password', () => {
  it('asks for eight, which is what current guidance says', () => {
    // NIST SP 800-63B. Firebase's own default of six is below anything
    // current guidance supports.
    expect(MIN_PASSWORD_LENGTH).toBe(8);
  });

  it.each([
    ['short', 'zeven12', 'tooShort'],
    ['exactly eight', 'achttien', null],
    ['long', 'een heel lang wachtwoord', null],
    ['empty', '', 'tooShort'],
  ] as const)('%s', (_label, password, expected) => {
    expect(passwordProblem(password)).toBe(expected);
  });

  it('refuses the address as the password', () => {
    // Not a composition rule — the one string an attacker already has.
    expect(passwordProblem('jonas@example.com', 'jonas@example.com')).toBe('sameAsEmail');
    expect(passwordProblem('JONAS@example.com ', 'jonas@example.com')).toBe('sameAsEmail');
  });

  it('imposes no rule about symbols, digits or capitals', () => {
    /*
     * Deliberate. Composition rules push people towards `Passw0rd!` and a
     * note beside the bed, and this is an app used by somebody whose memory
     * and concentration are affected.
     */
    expect(passwordProblem('allemaal kleine letters')).toBeNull();
  });

  it('has copy for every problem it can report', () => {
    for (const key of Object.values(PASSWORD_PROBLEM_COPY)) {
      expect(dictionaries.nl[key]).toBeTruthy();
      expect(dictionaries.en[key]).toBeTruthy();
    }
  });
});

/**
 * The property that matters most on this screen.
 *
 * luwte is a logbook for psychosis and depression. Confirming that an address
 * has an account tells whoever asked that this named person keeps one — and
 * anyone can ask, from a sign-up form, with no password. So the messages have
 * to be the same whether the account exists or not.
 */
describe('nothing reveals whether an address has an account', () => {
  it('answers an unknown address and a wrong password identically', () => {
    const unknown = authErrorKey('auth/user-not-found', 'signIn');
    const wrong = authErrorKey('auth/wrong-password', 'signIn');
    const modern = authErrorKey('auth/invalid-credential', 'signIn');

    expect(unknown).toBe('authWrongCredentials');
    expect(wrong).toBe(unknown);
    // What Firebase actually returns for both once enumeration protection is
    // on, which is the default. Mapped the same way so the behaviour does not
    // depend on that setting.
    expect(modern).toBe(unknown);
  });

  it('does not confirm an existing address when registering', () => {
    const key = authErrorKey('auth/email-already-in-use', 'register');
    // Not a message saying the account exists. It points at signing in, which
    // is true and useful for somebody who has an account, and reads as an
    // ordinary failure to somebody who does not.
    expect(key).toBe('authRegisterFailed');
    expect(dictionaries.nl[key!]).not.toMatch(/bestaat|al in gebruik/i);
    expect(dictionaries.en[key!]).not.toMatch(/already (exists|in use)/i);
  });

  it('says the same thing for a reset whoever asked', () => {
    // `resetPassword` swallows user-not-found, so the screen shows the one
    // fixed message. Asserted on the copy, which is where it could regress.
    expect(dictionaries.nl.authResetSent).toMatch(/^Is er een account/);
    expect(dictionaries.en.authResetSent).toMatch(/^If there is an account/);
  });
});

describe('errors a person can act on', () => {
  it.each([
    ['auth/weak-password', 'register', 'authPasswordTooShort'],
    ['auth/invalid-email', 'signIn', 'signInInvalidEmail'],
    ['auth/too-many-requests', 'signIn', 'authTooManyAttempts'],
    ['auth/network-request-failed', 'signIn', 'authOffline'],
  ] as const)('%s in %s mode reads as %s', (code, mode, expected) => {
    expect(authErrorKey(code, mode)).toBe(expected);
  });

  it('falls back differently depending on what was being attempted', () => {
    expect(authErrorKey('auth/internal-error', 'signIn')).toBe('signInFailed');
    expect(authErrorKey('auth/internal-error', 'register')).toBe('authRegisterFailed');
  });

  it('says nothing when somebody closes the Google popup', () => {
    /*
     * Changing your mind is not a failure. Reporting it back as one tells
     * somebody something went wrong when nothing did — and on this screen,
     * for this person, that matters more than it would elsewhere.
     */
    expect(isSilentAuthError('auth/popup-closed-by-user')).toBe(true);
    expect(authErrorKey('auth/popup-closed-by-user', 'signIn')).toBeNull();
    expect(authErrorKey('auth/cancelled-popup-request', 'register')).toBeNull();
  });

  it('has copy for every key it can return', () => {
    const codes = [
      'auth/weak-password',
      'auth/invalid-email',
      'auth/too-many-requests',
      'auth/network-request-failed',
      'auth/email-already-in-use',
      'auth/invalid-credential',
      'auth/internal-error',
      undefined,
    ];
    for (const mode of ['signIn', 'register'] as const) {
      for (const code of codes) {
        const key = authErrorKey(code, mode);
        if (key === null) continue;
        expect(dictionaries.nl[key], `nl is missing ${key}`).toBeTruthy();
        expect(dictionaries.en[key], `en is missing ${key}`).toBeTruthy();
      }
    }
  });
});
