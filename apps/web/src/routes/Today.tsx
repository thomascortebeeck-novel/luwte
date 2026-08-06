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
import { messageKeyFor, reportError } from '../errors';
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
import { TodayCheckin, type CheckinDraft } from './TodayCheckin';
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
import { completionId, doseId, hasAnnotation, type DoseAnnotation, type DoseStatus } from '@luwte/core';
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
  /*
   * What was on the check-in form when a save was refused, and what to say
   * about it. Both clear the moment a save actually lands.
   *
   * Firestore queues offline writes, so a rejection here is a real refusal,
   * not a network blip — and by the time it arrives, the `TodayCheckin`
   * instance that held the answers is already unmounted: `onSaved` below
   * flips `done` to `true` optimistically, in the same tick, before any
   * rejection could ever land. Handing the draft back in through props is
   * what lets the next mount reopen exactly where the person left off,
   * instead of an empty form or a false "Je hebt vandaag ingevuld".
   */
  const [checkinDraft, setCheckinDraft] = useState<CheckinDraft | undefined>(undefined);
  const [checkinMessage, setCheckinMessage] = useState<string | null>(null);
  const [history, setHistory] = useState<(WindlineDay | null)[]>([]);
  const [medications, setMedications] = useState<MedicationRecord[]>([]);
  const [statuses, setStatuses] = useState<Record<string, DoseStatus>>({});
  const [annotations, setAnnotations] = useState<Record<string, DoseAnnotation>>({});
  const [annotating, setAnnotating] = useState<{ key: string; title: string } | null>(null);
  /**
   * A refused dose tick or dose note. Both are optimistic and both revert
   * on failure — `statuses` is the adherence count a psychiatrist reads at
   * an appointment, and a tick that silently did not land makes that count
   * wrong, which is the one number this product exists to get right.
   */
  const [doseMessage, setDoseMessage] = useState<string | null>(null);
  const [activities, setActivities] = useState<ActivityRecord[]>([]);
  const [completed, setCompleted] = useState<Record<string, boolean>>({});
  /**
   * A refused activity tick or untick, reverted the same way `doseMessage`
   * above reverts a refused dose — its own state rather than sharing that
   * one, because `doseMessage`'s comment is specifically about the adherence
   * count and would be misleading here.
   */
  const [activityMessage, setActivityMessage] = useState<string | null>(null);
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
    const id = doseId(today, medId, time);
    const previous = statuses[id];
    // Optimistic, because the write is queued locally and may not reach the
    // server for hours. Waiting would make a tap feel broken.
    setStatuses((prev) => ({ ...prev, [id]: next }));
    setDoseMessage(null);
    void setDose(user.uid, today, medId, time, next).catch((error: unknown) => {
      reportError('setDose', error);
      // Reverted, not left standing: this is the adherence count a
      // psychiatrist reads at an appointment, and a tick that silently did
      // not land makes that count wrong.
      setStatuses((prev) => {
        const reverted = { ...prev };
        if (previous === undefined) delete reverted[id];
        else reverted[id] = previous;
        return reverted;
      });
      setDoseMessage(t(messageKeyFor(error)));
    });
  };

  /*
   * Recording that what was taken is not what was prescribed. Opened from a
   * dose already ticked, so nothing here is in the way of taking medication —
   * the same shape as the pleasure and mastery questions.
   */
  const saveDoseNote = (annotation: DoseAnnotation) => {
    if (!user || !annotating) return;
    const key = annotating.key;
    const previous = annotations[key];
    setAnnotations((prev) => {
      const next = { ...prev };
      if (hasAnnotation(annotation)) next[key] = annotation;
      else delete next[key];
      return next;
    });
    setAnnotating(null);
    setDoseMessage(null);
    void annotateDose(user.uid, key, annotation).catch((error: unknown) => {
      reportError('annotateDose', error);
      setAnnotations((prev) => {
        const next = { ...prev };
        if (previous) next[key] = previous;
        else delete next[key];
        return next;
      });
      setDoseMessage(t(messageKeyFor(error)));
    });
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
    const previous = completed[activity.id];
    // Optimistic, same reasoning as toggleDose above: the write may not
    // reach the server for hours, and waiting would make a tap feel broken.
    setCompleted((prev) => ({ ...prev, [activity.id]: done }));
    setActivityMessage(null);

    const revert = () => {
      setCompleted((prev) => {
        const reverted = { ...prev };
        if (previous === undefined) delete reverted[activity.id];
        else reverted[activity.id] = previous;
        return reverted;
      });
    };

    if (done) {
      // Pure function of its inputs, so this does not need to wait for
      // `completeActivity` to settle — nor even for it to succeed — to know
      // which completion a rating would belong to.
      const key = completionId(activity.id, today);

      /*
       * A feed post is a courtesy, not a record: the completion below is
       * what this product keeps, and a post that never reached the circle
       * costs nobody their data. Doses never reach here — `postCompletion`
       * refuses anything without an activity id. Reported so a failure is
       * not invisible in the console, but never put on screen — a message
       * about somebody else's notification not arriving is the app chasing
       * the person about somebody else's alert, which "never chase" already
       * forbids.
       */
      void postCompletion(user.uid, {
        sharingEnabled: patient?.share.shareCompletions !== false,
        activityId: activity.id,
        title: activity.title,
      }).catch((error: unknown) => reportError('postCompletion', error));

      void completeActivity(user.uid, activity.id, today).catch((error: unknown) => {
        reportError('completeActivity', error);
        // Reverted, not left standing — same reasoning as toggleDose above:
        // a tick that silently did not land is a record of a day that did
        // not happen.
        revert();
        setActivityMessage(t(messageKeyFor(error)));
      });

      void countCompletionsBefore(user.uid, activity.id, today)
        .then((completedBefore) => {
          if (shouldAskRating({ completedBefore })) setRating({ activity, key });
        })
        .catch(() => undefined);
    } else {
      void uncompleteActivity(user.uid, activity.id, today).catch((error: unknown) => {
        reportError('uncompleteActivity', error);
        revert();
        setActivityMessage(t(messageKeyFor(error)));
      });
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
          draft={checkinDraft}
          message={checkinMessage}
          onSaved={(saved) => {
            setCheckinDraft(undefined);
            setCheckinMessage(null);
            setDone(true);
            setNote(saved);
          }}
          onFailed={(message, draft) => {
            setCheckinDraft(draft);
            setCheckinMessage(message);
            setDone(false);
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

      {/* Present even when empty, so a screen reader has the region before
          a message from a refused dose tick or dose note lands in it. */}
      <p className={styles.note} role="status" aria-live="polite">
        {doseMessage}
      </p>

      <ActivitiesSection
        activities={plannedToday}
        completed={completed}
        onToggle={toggleActivity}
      />

      {/* Present even when empty, so a screen reader has the region before
          a message from a refused activity tick lands in it. */}
      <p className={styles.note} role="status" aria-live="polite">
        {activityMessage}
      </p>

      {rating ? (
        <ActivityRating
          title={rating.activity.title}
          expectedPleasure={rating.activity.expectedPleasure}
          expectedMastery={rating.activity.expectedMastery}
          onSave={(ratings) => {
            /*
             * Left fire-and-forget, unlike the tick above. `rateCompletion`
             * writes onto a completion that is already saved, and there is
             * no visible state on this screen to revert if it fails: the
             * widget closes in this same tick regardless (`setRating(null)`,
             * right below), and by the time any promise could settle, the
             * pleasure and mastery it carried are already gone from memory
             * — reopening it would mean holding that answer in new state
             * just to undo a dismissal, a bigger change than the refusal it
             * would guard against. The rating is optional by design (BRAND,
             * PRD 6.2), and a lost one reads, from the person's side,
             * exactly like one they chose to skip.
             */
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
