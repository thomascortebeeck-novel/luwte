import { PERMISSION_SENTENCE, grantedKeys, isInviteUsable } from '@luwte/core';
import { Button, Screen } from '@luwte/ui';
import { useEffect, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router';
import { readInviteByCode, redeemInvite, type InviteRecord } from '../firebase/circle';
import { clearPendingInvite, rememberInvite } from '../pendingInvite';
import { useAccount } from '../providers/AccountProvider';
import { useAuth } from '../providers/AuthProvider';
import { useLocale } from '../providers/LocaleProvider';
import styles from './Circle.module.css';

/**
 * PRD 6.4 — the other side of an invite link.
 *
 * This route sits outside the gate, because the gate would send someone
 * signed out to sign-in and lose the code on the way. Instead the code is
 * remembered for exactly as long as the detour takes.
 *
 * The screen states what accepting will give access to, before accepting. An
 * invite that grants nothing yet says so rather than pretending otherwise.
 */
export function Join() {
  const { t } = useLocale();
  const { code = '' } = useParams();
  const { user, status: authStatus } = useAuth();
  const { patient, status: accountStatus } = useAccount();
  const navigate = useNavigate();

  const [invite, setInvite] = useState<InviteRecord | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [outcome, setOutcome] = useState<'joined' | 'unusable' | null>(null);
  const [busy, setBusy] = useState(false);

  const ready = authStatus === 'signed-in' && patient?.onboarded === true;

  useEffect(() => {
    if (!code || authStatus === 'loading') return;

    if (!ready) {
      // Sign-in and onboarding both end at Today, so the code has to be held
      // somewhere that survives the trip.
      rememberInvite(code);
      return;
    }

    // The detour is over, so the memory has done its job. Clearing it here
    // rather than on arrival stops the gate bouncing back to this screen.
    clearPendingInvite();
    void readInviteByCode(code)
      .then(setInvite)
      .catch(() => setInvite(null))
      .finally(() => setLoaded(true));
  }, [code, ready, authStatus]);

  if (authStatus === 'loading') return null;

  if (authStatus === 'signed-out') {
    return (
      <Screen title={t('joinTitle')}>
        <p className={styles.intro}>{t('joinSignIn')}</p>
        <Button onClick={() => navigate('/signin')}>{t('signInTitle')}</Button>
      </Screen>
    );
  }

  if (accountStatus === 'loading') return null;

  // Someone arriving without an account of their own still needs one: the
  // circle entry is keyed by their uid, and consent is theirs to give.
  if (!ready) return <Navigate to="/" replace />;

  if (!loaded) return null;

  const usable = invite !== null && isInviteUsable(invite, new Date());

  if (outcome === 'joined') {
    return (
      <Screen
        title={t('joinTitle')}
        action={
          <Button full onClick={() => navigate('/')}>
            {t('navToday')}
          </Button>
        }
      >
        <p className={styles.intro}>{t('joinDone')}</p>
      </Screen>
    );
  }

  if (!usable || outcome === 'unusable') {
    return (
      <Screen
        title={t('joinTitle')}
        action={
          <Button variant="quiet" onClick={() => navigate('/')}>
            {t('navToday')}
          </Button>
        }
      >
        <p className={styles.intro}>{t('joinUnusable')}</p>
      </Screen>
    );
  }

  const keys = grantedKeys(invite.permissions);

  const accept = async () => {
    if (!user) return;
    setBusy(true);
    try {
      setOutcome(await redeemInvite(code, user.uid));
    } catch {
      // A refusal from the rules means the link is not usable by this person
      // — most often because they were once in this circle and removed.
      setOutcome('unusable');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen
      title={t('joinTitle')}
      action={
        <>
          <Button full disabled={busy} onClick={() => void accept()}>
            {t('joinAccept')}
          </Button>
          <Button variant="quiet" onClick={() => navigate('/')}>
            {t('navToday')}
          </Button>
        </>
      }
    >
      {keys.length === 0 ? (
        <p className={styles.intro}>{t('joinNothingYet')}</p>
      ) : (
        <>
          <p className={styles.intro}>{t('joinExplain')}</p>
          <ul className={styles.sentences}>
            {keys.map((key) => (
              <li key={key}>{t(PERMISSION_SENTENCE[key])}</li>
            ))}
          </ul>
        </>
      )}
    </Screen>
  );
}
