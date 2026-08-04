import { DEFAULT_CHECKIN_HOUR } from '@luwte/core';
import { Button, Field, Screen } from '@luwte/ui';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { saveOnboarding } from '../firebase/accounts';
import { useAccount } from '../providers/AccountProvider';
import { useAuth } from '../providers/AuthProvider';
import { useLocale } from '../providers/LocaleProvider';
import styles from './Onboarding.module.css';

const HOURS = Array.from({ length: 24 }, (_, hour) => hour);

/**
 * PRD 7, screens 2 to 4. One screen, one job (BRAND 3.5), so what luwte is,
 * who sees it, what to call the person, and when to remind them are four
 * screens rather than one form.
 */
export function Onboarding() {
  const { t } = useLocale();
  const { user } = useAuth();
  const { reload } = useAccount();
  const navigate = useNavigate();

  const [step, setStep] = useState(0);
  const [displayName, setDisplayName] = useState('');
  const [checkinHour, setCheckinHour] = useState(DEFAULT_CHECKIN_HOUR);
  const [busy, setBusy] = useState(false);

  const finish = async () => {
    if (!user) return;
    setBusy(true);
    try {
      await saveOnboarding(user.uid, { displayName: displayName.trim(), checkinHour });
      await reload();
      navigate('/consent');
    } finally {
      setBusy(false);
    }
  };

  const steps = [
    {
      body: <p className={styles.statement}>{t('onboardingWhat')}</p>,
      canContinue: true,
      onNext: () => setStep(1),
      label: t('onboardingNext'),
    },
    {
      body: <p className={styles.statement}>{t('onboardingSharing')}</p>,
      canContinue: true,
      onNext: () => setStep(2),
      label: t('onboardingNext'),
    },
    {
      title: t('onboardingNameTitle'),
      body: (
        <Field
          label={t('onboardingNameLabel')}
          autoComplete="given-name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
        />
      ),
      canContinue: displayName.trim().length > 0,
      onNext: () => setStep(3),
      label: t('onboardingNext'),
    },
    {
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
      onNext: () => void finish(),
      label: t('onboardingFinish'),
    },
  ];

  const current = steps[step]!;

  return (
    <Screen
      title={current.title}
      action={
        <Button full disabled={!current.canContinue} onClick={current.onNext}>
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
