import {
  MIN_PASSWORD_LENGTH,
  PASSWORD_PROBLEM_COPY,
  authErrorKey,
  passwordProblem,
  type AuthMode,
} from '@luwte/core';
import { Button, Field, GoogleButton, Screen } from '@luwte/ui';
import { useState } from 'react';
import {
  looksLikeEmail,
  register,
  resetPassword,
  signIn,
  signInWithGoogle,
} from '../firebase/auth';
import { useLocale } from '../providers/LocaleProvider';
import styles from './SignIn.module.css';

type Mode = AuthMode | 'reset';

/**
 * Two ways in: a password, or a Google account.
 *
 * **The emailed sign-in link is gone**, and removing a way in was the
 * improvement. It asked somebody to leave the app, find a mail client, and
 * come back — three steps that each fail differently, on a screen reached by
 * a person who is unwell. It also broke in the ways mail links always break:
 * opened on a different device, rewritten by a corporate scanner, expired
 * after an hour.
 *
 * **Signing in and creating an account are separate**, which is the other
 * half of the change. The previous screen guessed: it tried to sign in and
 * created an account if that failed. Since Firebase answers a wrong password
 * and an unknown address with the same code, mistyping your own password
 * tried to register you, failed, and said "signing in didn't work" — never
 * "your password is wrong". Asking which one somebody means costs one tap and
 * removes a whole class of that.
 *
 * What the screen never does is say whether an address has an account. That
 * would disclose that a named person keeps a logbook for psychosis and
 * depression, and anyone could ask from here without a password. See
 * `authErrorKey`.
 */
export function SignIn() {
  const { t } = useLocale();
  const [mode, setMode] = useState<Mode>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [revealed, setRevealed] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const emailValid = looksLikeEmail(email);
  const problem = passwordProblem(password, email);

  const go = (next: Mode) => {
    setMode(next);
    setMessage(null);
    setPassword('');
    setRevealed(false);
  };

  const run = async (action: () => Promise<unknown>, forMode: AuthMode) => {
    setMessage(null);
    setBusy(true);
    try {
      await action();
    } catch (error) {
      const key = authErrorKey((error as { code?: string }).code, forMode);
      // null means say nothing: closing the Google popup is somebody changing
      // their mind, not a failure to report back at them.
      setMessage(key ? t(key) : null);
    } finally {
      setBusy(false);
    }
  };

  const submit = () => {
    if (mode === 'reset') {
      return run(async () => {
        await resetPassword(email);
        setMessage(t('authResetSent'));
      }, 'signIn');
    }
    return run(
      () => (mode === 'register' ? register(email, password) : signIn(email, password)),
      mode,
    );
  };

  const canSubmit =
    !busy && emailValid && (mode === 'reset' || (mode === 'signIn' ? password.length > 0 : problem === null));

  const submitLabel =
    mode === 'register' ? t('registerSubmit') : mode === 'reset' ? t('authResetSubmit') : t('signInSubmit');

  const title =
    mode === 'register' ? t('registerTitle') : mode === 'reset' ? t('authForgotPassword') : t('signInTitle');

  return (
    <Screen
      // Each mode says what it is. "Welkom" over a password-reset form leaves
      // the heading and the form describing different things.
      title={title}
      action={
        <>
          <Button full disabled={!canSubmit} onClick={() => void submit()}>
            {submitLabel}
          </Button>

          {mode === 'reset' ? (
            <Button variant="quiet" disabled={busy} onClick={() => go('signIn')}>
              {t('authSwitchToSignIn')}
            </Button>
          ) : (
            <>
              <Button
                variant="quiet"
                disabled={busy}
                onClick={() => go(mode === 'signIn' ? 'register' : 'signIn')}
              >
                {mode === 'signIn' ? t('authSwitchToRegister') : t('authSwitchToSignIn')}
              </Button>

              {/* An equal option, not a promoted one. Google's own mark,
                  because people recognise this control rather than read it —
                  and it tells Google this person opened luwte, which is a real
                  disclosure for an app holding health data, so the note below
                  says so rather than leaving it to be found. */}
              <GoogleButton
                label={t('signInGoogle')}
                disabled={busy}
                onClick={() => void run(signInWithGoogle, mode)}
              />
            </>
          )}
        </>
      }
    >
      <p className={styles.tagline}>{t('appTagline')}</p>

      {mode === 'reset' ? <p className={styles.note}>{t('authResetIntro')}</p> : null}

      <Field
        label={t('signInEmailLabel')}
        type="email"
        inputMode="email"
        autoComplete="email"
        value={email}
        invalid={email.length > 0 && !emailValid}
        message={email.length > 0 && !emailValid ? t('signInInvalidEmail') : undefined}
        onChange={(e) => setEmail(e.target.value)}
      />

      {mode === 'reset' ? null : (
        <>
          <Field
            label={mode === 'register' ? t('registerPasswordLabel') : t('signInPasswordLabel')}
            type={revealed ? 'text' : 'password'}
            /*
             * `new-password` tells a password manager to offer a generated one
             * and not to fill the existing entry over it. Getting this wrong is
             * why so many sign-up forms silently receive the old password.
             */
            autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
            minLength={mode === 'register' ? MIN_PASSWORD_LENGTH : undefined}
            value={password}
            /*
             * The requirement is shown while typing and only once something
             * has been typed — a rule stated as a rejection after the fact is
             * the thing this avoids. Never marked invalid on the way *to* a
             * valid password, only described.
             */
            message={
              mode === 'register'
                ? password.length > 0 && problem
                  ? t(PASSWORD_PROBLEM_COPY[problem])
                  : t('registerPasswordHint')
                : undefined
            }
            onChange={(e) => setPassword(e.target.value)}
          />

          {/*
            The two things you need *while looking at the password field*,
            beside it rather than at the bottom of the screen.

            Reveal is a word rather than an eye icon: at 24px an eye is the
            same unreadable smudge the applause icon was, and this audience
            includes people whose hands shake.

            "Wachtwoord vergeten" belongs here too. It was a fourth button in
            the footer, below Google, which is nowhere near the moment you
            realise you cannot remember it. Small text, but the padding takes
            each of these past the tap floor — looking quiet and being hard to
            hit are different things.
          */}
          <div className={styles.inlineActions}>
            <button
              type="button"
              className={styles.inlineAction}
              onClick={() => setRevealed(!revealed)}
            >
              {revealed ? t('authHidePassword') : t('authShowPassword')}
            </button>

            {mode === 'signIn' ? (
              <button type="button" className={styles.inlineAction} onClick={() => go('reset')}>
                {t('authForgotPassword')}
              </button>
            ) : null}
          </div>
        </>
      )}

      {/* Only where there is a Google button to explain. On the reset screen
          it described a control that is not there. */}
      {mode === 'reset' ? null : <p className={styles.note}>{t('signInGoogleNote')}</p>}

      {/* Announced when it appears, so it is not something only a sighted
          person notices below the button they just pressed. */}
      <p className={styles.note} role="status" aria-live="polite">
        {message}
      </p>
    </Screen>
  );
}
