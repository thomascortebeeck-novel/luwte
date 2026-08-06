import {
  DEFAULT_CHECKIN_HOUR,
  DEFAULT_TIMEZONE,
  dateKey,
  isCheckinTime,
  windlineSeries,
  type WindlineDay,
} from '@luwte/core';
import { Button, HumanText, Screen, Windline } from '@luwte/ui';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { readCheckin } from '../firebase/checkins';
import { readWindlineDays } from '../firebase/history';
import {
  annotateDose,
  readActiveMedications,
  readDoseAnnotations,
  readDoseStatuses,
  setDose,
  type MedicationRecord,
} from '../firebase/medication';
import { ActivitiesSection, MedicationSection, PracticesSection } from './TodaySections';
import { ActivityRating } from './ActivityRating';
import { TodayCheckin } from './TodayCheckin';
import { DoseNote } from './DoseNote';
import {
  completeActivity,
  countCompletionsBefore,
  rateCompletion,
  readActivities,
  readCompletions,
  uncompleteActivity,
  type ActivityRecord,
} from '../firebase/activities';
import { onDay, shouldAskRating } from '@luwte/core';
import { postCompletion } from '../firebase/feed';
import { hasAnnotation, type DoseAnnotation, type DoseStatus } from '@luwte/core';
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
  /*
   * Asking in the morning how the day went asks somebody to invent an answer,
   * so the form appears from the hour they chose in Settings. Recomputed on
   * render rather than on a timer: the screen is revisited constantly and a
   * ticking clock to reveal a form is machinery nobody needs.
   */
  const timeToAsk = isCheckinTime(
    new Date(),
    patient?.checkinHour ?? DEFAULT_CHECKIN_HOUR,
    timezone,
  );
  const [done, setDone] = useState<boolean | null>(null);
  const [history, setHistory] = useState<(WindlineDay | null)[]>([]);
  const [medications, setMedications] = useState<MedicationRecord[]>([]);
  const [statuses, setStatuses] = useState<Record<string, DoseStatus>>({});
  const [annotations, setAnnotations] = useState<Record<string, DoseAnnotation>>({});
  const [annotating, setAnnotating] = useState<{ key: string; title: string } | null>(null);
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
    void readDoseAnnotations(user.uid, today)
      .then(setAnnotations)
      .catch(() => setAnnotations({}));
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

  /*
   * Recording that what was taken is not what was prescribed. Opened from a
   * dose already ticked, so nothing here is in the way of taking medication —
   * the same shape as the pleasure and mastery questions.
   */
  const saveDoseNote = (annotation: DoseAnnotation) => {
    if (!user || !annotating) return;
    const key = annotating.key;
    void annotateDose(user.uid, key, annotation);
    setAnnotations((prev) => {
      const next = { ...prev };
      if (hasAnnotation(annotation)) next[key] = annotation;
      else delete next[key];
      return next;
    });
    setAnnotating(null);
  };

  const plannedToday = useMemo(() => onDay(activities, today), [activities, today]);

  /*
   * The tick is recorded first and the question comes after, so dismissing it
   * loses nothing. PRD 6.2 calls the two-tap rating optional; that is only
   * true if the completion does not depend on answering it.
   *
   * Whether to ask at all is `shouldAskRating` — the first time, then every
   * fifth. Asked after the count returns rather than before, so the screen
   * never shows the question and then takes it away; if the count fails, the
   * offer simply does not appear, which is the harmless direction.
   */
  const toggleActivity = (activity: ActivityRecord, done: boolean) => {
    if (!user) return;
    setCompleted((prev) => ({ ...prev, [activity.id]: done }));

    if (done) {
      const key = completeActivity(user.uid, activity.id, today);
      // Auto-shared, because a circle exists to be told things. Doses never
      // reach here — `postCompletion` refuses anything without an activity.
      postCompletion(user.uid, {
        sharingEnabled: patient?.share.shareCompletions !== false,
        activityId: activity.id,
        title: activity.title,
      });
      void countCompletionsBefore(user.uid, activity.id, today)
        .then((completedBefore) => {
          if (shouldAskRating({ completedBefore })) setRating({ activity, key });
        })
        .catch(() => undefined);
    } else {
      uncompleteActivity(user.uid, activity.id, today);
      setRating((prev) => (prev?.activity.id === activity.id ? null : prev));
    }
  };

  const series = useMemo(() => windlineSeries(history), [history]);

  // Nothing is claimed until it is known, so there is no flash of the wrong state.
  if (done === null) return <Screen title={patient?.displayName || undefined}>{null}</Screen>;

  /*
   * One action in the footer, not six.
   *
   * It used to carry the check-in **and** a stack of four quiet buttons to
   * the calendar, the feed, the overview and settings — a wall of five
   * full-width controls in which the one thing this screen is for had to
   * compete with navigation. Those four are the tab bar now, present on every
   * screen rather than only this one, so getting from the calendar to the
   * feed no longer means going home first.
   */
  return (
    <Screen
      title={patient?.displayName || undefined}
      action={
        /*
         * Nothing in the footer while the check-in is on the screen — the
         * form has its own save, and a second full-width button under it
         * asking for the same thing is how a screen starts feeling long.
         */
        done ? (
          <Button full variant="quiet" onClick={() => navigate('/checkin')}>
            {t('checkinEdit')}
          </Button>
        ) : timeToAsk ? undefined : (
          // Before the chosen hour, still reachable: somebody who goes to bed
          // at six should not be told to come back later.
          <Button full onClick={() => navigate('/checkin')}>
            {t('checkinStart')}
          </Button>
        )
      }
    >
      {/* BRAND 3.7 — the windline sits above everything else on the home
          screen. Above medication and activities when those arrive. */}
      <Windline series={series} label={t('windlineLabel')} />

      {/*
        The check-in itself, here rather than behind a tap.
        `isCheckinTime` uses the hour already chosen in Settings, so there is
        one setting rather than two that can disagree, and nobody is asked at
        nine in the morning how their day was.
      */}
      {done ? (
        <>
          <p className={styles.line}>{t('checkinDoneToday')}</p>
          {note ? <HumanText>{note}</HumanText> : null}
        </>
      ) : timeToAsk && user ? (
        <TodayCheckin
          uid={user.uid}
          today={today}
          onSaved={(saved) => {
            setDone(true);
            setNote(saved);
          }}
        />
      ) : (
        <p className={styles.prompt}>{t('checkinLater')}</p>
      )}

      {/* PRD 6.2 ordering: medication first because it is time-critical,
          activities by start time when Phase 5 lands, then the practices. */}
      <MedicationSection
        medications={medications}
        statuses={statuses}
        annotations={annotations}
        dateKey={today}
        onToggle={toggleDose}
        onAnnotate={(key, title) => setAnnotating({ key, title })}
      />

      {annotating ? (
        <DoseNote
          title={annotating.title}
          initial={annotations[annotating.key] ?? {}}
          onSave={saveDoseNote}
          onSkip={() => setAnnotating(null)}
        />
      ) : null}

      <ActivitiesSection
        activities={plannedToday}
        completed={completed}
        onToggle={toggleActivity}
      />

      {rating ? (
        <ActivityRating
          title={rating.activity.title}
          expectedPleasure={rating.activity.expectedPleasure}
          expectedMastery={rating.activity.expectedMastery}
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
