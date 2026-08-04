import { DEFAULT_TIMEZONE, dateKey, windlineSeries, type WindlineDay } from '@luwte/core';
import { Button, HumanText, Screen, Windline } from '@luwte/ui';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { readCheckin } from '../firebase/checkins';
import { readWindlineDays } from '../firebase/history';
import {
  readActiveMedications,
  readDoseStatuses,
  setDose,
  type MedicationRecord,
} from '../firebase/medication';
import { ActivitiesSection, MedicationSection, PracticesSection } from './TodaySections';
import { ActivityRating } from './ActivityRating';
import {
  completeActivity,
  rateCompletion,
  readActivities,
  readCompletions,
  uncompleteActivity,
  type ActivityRecord,
} from '../firebase/activities';
import { onDay } from '@luwte/core';
import type { DoseStatus } from '@luwte/core';
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
  const [medications, setMedications] = useState<MedicationRecord[]>([]);
  const [statuses, setStatuses] = useState<Record<string, DoseStatus>>({});
  const [activities, setActivities] = useState<ActivityRecord[]>([]);
  const [completed, setCompleted] = useState<Record<string, boolean>>({});
  /** The activity just ticked, waiting to be asked about. Never blocks. */
  const [rating, setRating] = useState<{ activity: ActivityRecord; key: string } | null>(null);

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
    void readActiveMedications(user.uid)
      .then(setMedications)
      .catch(() => setMedications([]));
    void readDoseStatuses(user.uid, today)
      .then(setStatuses)
      .catch(() => setStatuses({}));
    void readActivities(user.uid)
      .then(setActivities)
      .catch(() => setActivities([]));
    void readCompletions(user.uid, today)
      .then((byActivity) =>
        setCompleted(
          Object.fromEntries(
            Object.entries(byActivity).map(([id, entry]) => [id, entry.completedAt !== null]),
          ),
        ),
      )
      .catch(() => setCompleted({}));
  }, [user, today]);

  const toggleDose = (medId: string, time: string, next: DoseStatus) => {
    if (!user) return;
    const id = setDose(user.uid, today, medId, time, next);
    // Optimistic, because the write is queued locally and may not reach the
    // server for hours. Waiting would make a tap feel broken.
    setStatuses((prev) => ({ ...prev, [id]: next }));
  };

  const plannedToday = useMemo(() => onDay(activities, today), [activities, today]);

  /*
   * The tick is recorded first and the question comes after, so dismissing it
   * loses nothing. PRD 6.2 calls the two-tap rating optional; that is only
   * true if the completion does not depend on answering it.
   */
  const toggleActivity = (activity: ActivityRecord, done: boolean) => {
    if (!user) return;
    setCompleted((prev) => ({ ...prev, [activity.id]: done }));

    if (done) {
      const key = completeActivity(user.uid, activity.id, today);
      setRating({ activity, key });
    } else {
      uncompleteActivity(user.uid, activity.id, today);
      setRating((prev) => (prev?.activity.id === activity.id ? null : prev));
    }
  };

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
          <Button variant="quiet" onClick={() => navigate('/calendar')}>
            {t('calendarTitle')}
          </Button>
          <Button variant="quiet" onClick={() => navigate('/insights')}>
            {t('insightsTitle')}
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
        <p className={styles.prompt}>{t('checkinEntry')}</p>
      )}

      {/* PRD 6.2 ordering: medication first because it is time-critical,
          activities by start time when Phase 5 lands, then the practices. */}
      <MedicationSection
        medications={medications}
        statuses={statuses}
        dateKey={today}
        onToggle={toggleDose}
      />

      <ActivitiesSection
        activities={plannedToday}
        completed={completed}
        onToggle={toggleActivity}
      />

      {rating ? (
        <ActivityRating
          title={rating.activity.title}
          onSave={(ratings) => {
            if (user) rateCompletion(user.uid, rating.key, ratings);
            setRating(null);
          }}
          onSkip={() => setRating(null)}
        />
      ) : null}

      <PracticesSection />
    </Screen>
  );
}
