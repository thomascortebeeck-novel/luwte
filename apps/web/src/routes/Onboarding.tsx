import { DEFAULT_CHECKIN_HOUR, keepsOwnLogbook, type OnboardingRole } from '@luwte/core';
import { Button, Field, Screen } from '@luwte/ui';
import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { saveOnboarding } from '../firebase/accounts';
import { readInviteByCode } from '../firebase/circle';
import { peekPendingInvite } from '../pendingInvite';
import { useAccount } from '../providers/AccountProvider';
import { useAuth } from '../providers/AuthProvider';
import { useLocale } from '../providers/LocaleProvider';
import styles from './Onboarding.module.css';

const HOURS = Array.from({ length: 24 }, (_, hour) => hour);

/**
 * PRD 7, screens 2 to 4. One screen, one job (BRAND 3.5), so what luwte is,
 * who sees it, what to call the person, and when to remind them are separate
 * screens rather than one form.
 *
 * Three people arrive here and they need different things said to them. The
 * brother following an invite link is not keeping a logbook, and telling him
 * "dit is een schriftje dat onthoudt wat jij vergeet" before asking what hour
 * to remind him to check in is simply wrong about who he is.
 *
 * Choosing a role here grants nothing. Verification is an admin act against
 * `clinicians/{uid}`, which no client may write, so saying "I am a clinician"
 * changes which screens you see and never what you may read. That is what
 * makes it safe to just ask.
 */
export function Onboarding() {
  const { t } = useLocale();
  const { user } = useAuth();
  const { reload } = useAccount();
  const navigate = useNavigate();

  const [role, setRole] = useState<OnboardingRole | null>(null);
  const [resolving, setResolving] = useState(true);
  const [step, setStep] = useState(0);
  const [displayName, setDisplayName] = useState('');
  const [checkinHour, setCheckinHour] = useState(DEFAULT_CHECKIN_HOUR);
  const [busy, setBusy] = useState(false);

  /*
   * An invite already answers the question, so it is not asked. Someone
   * arriving from their sister's link should not have to classify themselves
   * before they can read what it says — and the invite's own role is a better
   * answer than anything they could tell us, because the patient chose it.
   */
  useEffect(() => {
    const code = peekPendingInvite();
    if (!code) {
      setResolving(false);
      return;
    }
    void readInviteByCode(code)
      .then((invite) => {
        if (invite) setRole(invite.role);
      })
      .catch(() => {
        // An unreadable invite just means the question gets asked normally.
      })
      .finally(() => setResolving(false));
  }, []);

  const finish = async () => {
    if (!user || !role) return;
    setBusy(true);
    try {
      await saveOnboarding(user.uid, {
        displayName: displayName.trim(),
        role,
        // Never written for someone who keeps no logbook: an hour they were
        // never asked for is not a default, it is a nudge they did not want.
        ...(keepsOwnLogbook(role) ? { checkinHour } : {}),
      });
      await reload();
      navigate('/consent');
    } finally {
      setBusy(false);
    }
  };

  if (resolving) return null;

  if (!role) {
    return (
      <Screen title={t('onboardingWhoTitle')}>
        <div className={styles.choices}>
          <Button full variant="quiet" onClick={() => setRole('patient')}>
            {t('onboardingWhoPatient')}
          </Button>
          <Button full variant="quiet" onClick={() => setRole('supporter')}>
            {t('onboardingWhoSupporter')}
          </Button>
          <Button full variant="quiet" onClick={() => setRole('clinician')}>
            {t('onboardingWhoClinician')}
          </Button>
        </div>
      </Screen>
    );
  }

  type Step = { title?: string; body: ReactNode; canContinue: boolean; label: string };

  const statement = (key: Parameters<typeof t>[0]): Step => ({
    body: <p className={styles.statement}>{t(key)}</p>,
    canContinue: true,
    label: t('onboardingNext'),
  });

  const nameStep: Step = {
    title: t('onboardingNameTitle'),
    body: (
      <Field
        label={t('onboardingNameLabel')}
        autoComplete="given-name"
        value={displayName}
        onChange={(e) => setDisplayName(e.target.value)}
      />
    ),
    canContinue: displayName.trim().length > 0 && !busy,
    label: keepsOwnLogbook(role) ? t('onboardingNext') : t('onboardingFinish'),
  };

  const hourStep: Step = {
    title: t('onboardingHourTitle'),
    body: (
      <>
        <label className={styles.label} htmlFor="checkin-hour">
          {t('onboardingHourExplanation')}
        </label>
        <select
          id="checkin-hour"
          className={styles.hourSelect}
          value={checkinHour}
          onChange={(e) => setCheckinHour(Number(e.target.value))}
        >
          {HOURS.map((hour) => (
            <option key={hour} value={hour}>
              {String(hour).padStart(2, '0')}:00
            </option>
          ))}
        </select>
      </>
    ),
    canContinue: !busy,
    label: t('onboardingFinish'),
  };

  const steps =
    role === 'patient'
      ? [
          statement('onboardingWhat'),
          statement('onboardingSharing'),
          nameStep,
          hourStep,
        ]
      : role === 'supporter'
        ? [
            statement('onboardingSupporterWhat'),
            statement('onboardingSupporterSeeing'),
            nameStep,
          ]
        : [
            statement('onboardingClinicianWhat'),
            statement('onboardingClinicianVerify'),
            nameStep,
          ];

  const current = steps[step]!;
  const last = step === steps.length - 1;

  return (
    <Screen
      title={current.title}
      action={
        <Button
          full
          disabled={!current.canContinue}
          onClick={last ? () => void finish() : () => setStep(step + 1)}
        >
          {current.label}
        </Button>
      }
    >
      <div className={styles.progress} aria-hidden="true">
        {steps.map((_, index) => (
          <span key={index} className={styles.pip} data-current={index === step || undefined} />
        ))}
      </div>
      {current.body}
    </Screen>
  );
}
