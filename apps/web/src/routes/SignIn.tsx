import { Button, Field, Screen } from '@luwte/ui';
import { useEffect, useState } from 'react';
import {
  completeLinkSignIn,
  isLinkSignIn,
  looksLikeEmail,
  pendingEmail,
  sendLink,
  signInOrRegister,
  signInWithGoogle,
} from '../firebase/auth';
import { useLocale } from '../providers/LocaleProvider';
import styles from './SignIn.module.css';

type Mode = 'link' | 'password';

/**
 * PRD 7 — the email link is preferred, with a password as the fallback for
 * anyone who finds mail links awkward. Both land in the same place.
 */
export function SignIn() {
  const { t } = useLocale();
  const [mode, setMode] = useState<Mode>('link');
  const [email, setEmail] = useState(() => pendingEmail() ?? '');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [linkSent, setLinkSent] = useState(false);
  const [busy, setBusy] = useState(false);

  // Returning from the emailed link: finish the sign-in straight away. If the
  // link was opened on a different device the stored address is missing, and
  // asking for it again is the documented fallback rather than an error.
  useEffect(() => {
    if (!isLinkSignIn(window.location.href)) return;
    const stored = pendingEmail();
    if (!stored) return;
    completeLinkSignIn(window.location.href, stored).catch(() => {
      setMessage(t('signInFailed'));
    });
  }, [t]);

  const emailValid = looksLikeEmail(email);

  const submit = async () => {
    setMessage(null);
    setBusy(true);
    try {
      if (mode === 'link') {
        await sendLink(email, window.location.origin);
        setLinkSent(true);
      } else {
        await signInOrRegister(email, password);
      }
    } catch {
      setMessage(t('signInFailed'));
    } finally {
      setBusy(false);
    }
  };

  const withGoogle = async () => {
    setMessage(null);
    setBusy(true);
    try {
      await signInWithGoogle();
    } catch {
      // Includes the person simply closing the popup, which is not a failure
      // worth a different message — they are still on the sign-in screen with
      // every other way in available.
      setMessage(t('signInFailed'));
    } finally {
      setBusy(false);
    }
  };

  const canSubmit = emailValid && (mode === 'link' || password.length >= 6) && !busy;

  return (
    <Screen
      title={t('signInTitle')}
      action={
        <>
          <Button full disabled={!canSubmit} onClick={() => void submit()}>
            {mode === 'link' ? t('signInSendLink') : t('signInSubmit')}
          </Button>
          <Button
            variant="quiet"
            onClick={() => {
              setMode(mode === 'link' ? 'password' : 'link');
              setMessage(null);
              setLinkSent(false);
            }}
          >
            {mode === 'link' ? t('signInUsePassword') : t('signInUseLink')}
          </Button>
          {/* An equal option, not a promoted one. It is quicker for most
              people and it tells Google this person opened luwte — which is
              a real disclosure for an app holding health data, so the note
              below says so rather than leaving it to be discovered. */}
          <Button variant="quiet" disabled={busy} onClick={() => void withGoogle()}>
            {t('signInGoogle')}
          </Button>
        </>
      }
    >
      <p className={styles.tagline}>{t('appTagline')}</p>

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

      {mode === 'password' ? (
        <Field
          label={t('signInPasswordLabel')}
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      ) : null}

      <p className={styles.note}>{t('signInGoogleNote')}</p>

      {linkSent ? <p className={styles.note}>{t('signInLinkSent')}</p> : null}
      {message ? <p className={styles.note}>{message}</p> : null}
    </Screen>
  );
}
