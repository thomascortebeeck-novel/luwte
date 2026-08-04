import { DEFAULT_TIMEZONE, dateKey } from '@luwte/core';
import { Button, HumanText, Screen } from '@luwte/ui';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { readCheckin } from '../firebase/checkins';
import { useAccount } from '../providers/AccountProvider';
import { useAuth } from '../providers/AuthProvider';
import { useLocale } from '../providers/LocaleProvider';
import styles from './Today.module.css';

/**
 * The home screen. Phase 3 adds the windline, medication and activities
 * above this (PRD 6.2). For now it is the way into the check-in and, once
 * that is done, a quiet acknowledgement and the person's own words.
 */
export function Today() {
  const { t } = useLocale();
  const { user } = useAuth();
  const { patient } = useAccount();
  const navigate = useNavigate();

  const timezone = patient?.timezone ?? DEFAULT_TIMEZONE;
  const today = useMemo(() => dateKey(new Date(), timezone), [timezone]);
  const [note, setNote] = useState<string | null>(null);
  const [done, setDone] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user) return;
    void readCheckin(user.uid, today)
      .then((checkin) => {
        setDone(checkin !== null);
        setNote(checkin?.note ?? null);
      })
      .catch(() => setDone(false));
  }, [user, today]);

  // Nothing is claimed until it is known, so there is no flash of the wrong state.
  if (done === null) return <Screen title={patient?.displayName || undefined}>{null}</Screen>;

  return (
    <Screen
      title={patient?.displayName || undefined}
      action={
        <Button full onClick={() => navigate('/checkin')}>
          {done ? t('checkinEdit') : t('checkinStart')}
        </Button>
      }
    >
      {done ? (
        <>
          <p className={styles.line}>{t('checkinDoneToday')}</p>
          {note ? <HumanText>{note}</HumanText> : null}
        </>
      ) : (
        <>
          <p className={styles.prompt}>{t('checkinEntry')}</p>
          <p className={styles.line}>{t('todayEmpty')}</p>
        </>
      )}
    </Screen>
  );
}
