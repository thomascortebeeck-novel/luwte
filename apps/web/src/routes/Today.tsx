import { DEFAULT_TIMEZONE, dateKey, windlineSeries, type WindlineDay } from '@luwte/core';
import { Button, HumanText, Screen, Windline } from '@luwte/ui';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { readCheckin } from '../firebase/checkins';
import { readWindlineDays } from '../firebase/history';
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
  const [history, setHistory] = useState<(WindlineDay | null)[]>([]);

  useEffect(() => {
    if (!user) return;
    void readCheckin(user.uid, today)
      .then((checkin) => {
        setDone(checkin !== null);
        setNote(checkin?.note ?? null);
      })
      .catch(() => setDone(false));
    // A failed history read leaves the line flat rather than showing an error.
    // It is decoration in the strictest sense: nothing depends on it.
    void readWindlineDays(user.uid, today)
      .then(setHistory)
      .catch(() => setHistory([]));
  }, [user, today]);

  const series = useMemo(() => windlineSeries(history), [history]);

  // Nothing is claimed until it is known, so there is no flash of the wrong state.
  if (done === null) return <Screen title={patient?.displayName || undefined}>{null}</Screen>;

  return (
    <Screen
      title={patient?.displayName || undefined}
      action={
        <>
          <Button full onClick={() => navigate('/checkin')}>
            {done ? t('checkinEdit') : t('checkinStart')}
          </Button>
          <Button variant="quiet" onClick={() => navigate('/settings')}>
            {t('settingsTitle')}
          </Button>
        </>
      }
    >
      {/* BRAND 3.7 — the windline sits above everything else on the home
          screen. Above medication and activities when those arrive. */}
      <Windline series={series} label={t('windlineLabel')} />

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
