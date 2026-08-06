import {
  CHECKIN_STEPS,
  DEFAULT_TIMEZONE,
  WEEKLY_STEPS,
  dateKey,
  diaryPromptFor,
  shouldOfferCrisis,
  weekKey,
  weekdayOf,
  type CopyKey,
  type Scale,
} from '@luwte/core';
import { Button, ScaleInput, Screen, type ScaleValue } from '@luwte/ui';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { messageKeyFor, reportError } from '../errors';
import { readWeekly, saveCheckin, saveWeekly } from '../firebase/checkins';
import { useAccount } from '../providers/AccountProvider';
import { useAuth } from '../providers/AuthProvider';
import { useLocale } from '../providers/LocaleProvider';
import styles from './CheckIn.module.css';

type Answers = Record<string, number>;

/**
 * PRD 6.1 — the daily check-in. Three scales and one number, one per screen,
 * then an optional diary line, plus four more once a week.
 *
 * Nothing here blocks on the network. The write goes into Firestore's local
 * cache and syncs later, so the confirmation appears immediately even with no
 * signal — which is common in this population and is the whole point of
 * PRD 5.6.
 */
export function CheckIn() {
  const { t } = useLocale();
  const { user } = useAuth();
  const { patient } = useAccount();
  const navigate = useNavigate();

  const timezone = patient?.timezone ?? DEFAULT_TIMEZONE;
  const today = useMemo(() => dateKey(new Date(), timezone), [timezone]);
  const thisWeek = useMemo(() => weekKey(new Date(), timezone), [timezone]);

  const [answers, setAnswers] = useState<Answers>({});
  const [note, setNote] = useState('');
  const [step, setStep] = useState(0);
  const [weeklyDue, setWeeklyDue] = useState(false);
  const [saved, setSaved] = useState(false);
  /*
   * The write is fired and not awaited (see `saveCheckin`), so the person
   * sees "Bewaard." in the same tick regardless of the network. A message
   * here can only ever describe a failure that arrives after that — the
   * genuinely broken case, not an offline one, since the confirmation screen
   * stays up until the person taps away rather than navigating on its own.
   */
  const [message, setMessage] = useState<string | null>(null);

  /**
   * PRD 6.1 — the weekly extra appears on the same weekday each week. The
   * anchor is the weekday the account was created, so it lands on a day the
   * person has already shown they are around. If it is missed, nothing
   * happens and it returns next week: the app never chases.
   */
  useEffect(() => {
    if (!user || !patient?.createdAt) return;
    const anchor = weekdayOf(dateKey(patient.createdAt, timezone));
    if (weekdayOf(today) !== anchor) return;
    void readWeekly(user.uid, thisWeek).then((existing) => {
      if (!existing) setWeeklyDue(true);
    });
  }, [user, patient?.createdAt, timezone, today, thisWeek]);

  const dailySteps = CHECKIN_STEPS.length;
  const diaryStep = dailySteps; // then the optional line
  const diaryPrompt = useMemo(() => diaryPromptFor(today), [today]);
  const weeklyStart = diaryStep + 1;
  const totalSteps = weeklyStart + (weeklyDue ? WEEKLY_STEPS.length : 0);

  const setAnswer = (id: string, value: number) => setAnswers((prev) => ({ ...prev, [id]: value }));

  const finish = () => {
    if (!user) return;

    void saveCheckin(user.uid, today, {
      date: today,
      mood: answers.mood as Scale,
      arousal: answers.arousal as Scale,
      sleepHours: answers.sleepHours ?? 0,
      flatness: answers.flatness as Scale,
      ...(note.trim() ? { note: note.trim() } : {}),
      source: 'manual',
    }).catch((error: unknown) => {
      reportError('saveCheckin', error);
      setMessage(t(messageKeyFor(error)));
    });

    if (weeklyDue) {
      const weekly = {
        restlessness: answers.restlessness as Scale,
        stiffness: answers.stiffness as Scale,
        sedation: answers.sedation as Scale,
        hopelessness: answers.hopelessness as Scale,
      };
      void saveWeekly(user.uid, thisWeek, weekly).catch((error: unknown) => {
        reportError('saveWeekly', error);
        setMessage(t(messageKeyFor(error)));
      });

      /*
       * PRD 6.1 — a top-of-scale hopelessness answer shows the crisis screen
       * once, calmly. No alarm language, and no notification to anyone.
       * Automatic escalation to family would make people stop answering
       * honestly, which costs more than it gains.
       *
       * Navigating away here is a decision, not an oversight worth revisiting.
       * `saveCheckin` and `saveWeekly` above are not awaited, so this runs
       * before either settles; neither `setSaved(true)` nor the live region
       * that only exists inside `if (saved)` below it ever mounts, so a
       * refusal that lands after this point has nowhere to go but the
       * console. That is deliberately left as is: getting to the crisis
       * screen is what matters at this moment, and both waiting on a write
       * and following the person there with a message about a save would be
       * wrong — Crisis.tsx argues the same for its own read failing quietly.
       * What keeps this honest rather than merely convenient is that nothing
       * claims success either: no acknowledgement is shown, so nothing lies
       * about whether it saved, and if the record genuinely does not exist,
       * Today offers the check-in again rather than hiding that a day was
       * missed. `reportError` above still runs, so a refusal is not
       * invisible — only unmentioned to the person, on this one screen.
       */
      if (shouldOfferCrisis(weekly)) {
        navigate('/crisis');
        return;
      }
    }

    setSaved(true);
  };

  if (saved) {
    return (
      <Screen action={<Button full onClick={() => navigate('/')}>{t('navToday')}</Button>}>
        {/* BRAND 4.2 — "Bewaard." Nothing more. No celebration, no summary. */}
        <p className={styles.done}>{t('checkinDone')}</p>
        {/* Present even when empty, so a screen reader has the region before
            a delayed write failure ever lands in it. */}
        <p className={styles.note} role="status" aria-live="polite">
          {message}
        </p>
      </Screen>
    );
  }

  const scaleLabels = [
    t('scaleStep1'),
    t('scaleStep2'),
    t('scaleStep3'),
    t('scaleStep4'),
    t('scaleStep5'),
    t('scaleStep6'),
    t('scaleStep7'),
  ];

  /*
   * The scale ends come from the step rather than being fixed, because they
   * are not all the same shape: arousal is bipolar, where both ends are a real
   * state, and "weinig / veel" would ask somebody to rate feeling slowed down
   * as a small amount of restlessness.
   */
  const renderScale = (
    id: string,
    questionKey: CopyKey,
    lowKey: CopyKey = 'scaleLow',
    highKey: CopyKey = 'scaleHigh',
  ) => (
    <>
      <p className={styles.question}>{t(questionKey)}</p>
      <div className={styles.answer}>
        <ScaleInput
          name={id}
          legend={t(questionKey)}
          value={(answers[id] as ScaleValue | undefined) ?? null}
          onChange={(value) => setAnswer(id, value)}
          lowLabel={t(lowKey)}
          highLabel={t(highKey)}
          stepLabels={scaleLabels}
        />
      </div>
    </>
  );

  let body: React.ReactNode;
  let canContinue = false;

  if (step < dailySteps) {
    const current = CHECKIN_STEPS[step]!;
    if (current.kind === 'hours') {
      canContinue = answers.sleepHours !== undefined;
      body = (
        <>
          <p className={styles.question}>{t(current.questionKey)}</p>
          <div className={styles.answer}>
            <div className={styles.hours}>
              <input
                className={styles.hoursInput}
                type="number"
                inputMode="decimal"
                min={0}
                max={16}
                step={0.5}
                aria-label={t(current.questionKey)}
                value={answers.sleepHours ?? ''}
                onChange={(e) =>
                  setAnswer('sleepHours', e.target.value === '' ? NaN : Number(e.target.value))
                }
              />
              <span className={styles.hoursSuffix}>{t('checkinHoursSuffix')}</span>
            </div>
          </div>
        </>
      );
      canContinue = Number.isFinite(answers.sleepHours);
    } else {
      canContinue = answers[current.id] !== undefined;
      body = renderScale(current.id, current.questionKey, current.lowKey, current.highKey);
    }
  } else if (step === diaryStep) {
    canContinue = true; // the diary line is optional, always
    /*
     * The same box, asked a different way each day. One free-text question
     * worded identically every evening becomes furniture, and the original
     * wording is still in the rotation so nothing is lost when it comes round.
     * Keyed to the day, so it cannot change while somebody is typing.
     */
    body = (
      <>
        <p className={styles.question}>{t(diaryPrompt)}</p>
        <div className={styles.answer}>
          <textarea
            className={styles.diary}
            aria-label={t(diaryPrompt)}
            placeholder={t('checkinDiaryPlaceholder')}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
      </>
    );
  } else {
    const weeklyIndex = step - weeklyStart;
    const current = WEEKLY_STEPS[weeklyIndex]!;
    canContinue = answers[current.id] !== undefined;
    body = (
      <>
        {weeklyIndex === 0 ? <p className={styles.weeklyIntro}>{t('weeklyIntro')}</p> : null}
        {renderScale(current.id, current.questionKey)}
      </>
    );
  }

  const isLast = step === totalSteps - 1;

  return (
    <Screen
      action={
        <>
          <Button full disabled={!canContinue} onClick={() => (isLast ? finish() : setStep(step + 1))}>
            {isLast ? t('checkinSave') : t('onboardingNext')}
          </Button>
          {step > 0 ? (
            <Button variant="quiet" onClick={() => setStep(step - 1)}>
              {t('checkinBack')}
            </Button>
          ) : null}
        </>
      }
    >
      <div className={styles.progress} aria-hidden="true">
        {Array.from({ length: totalSteps }, (_, i) => (
          <span key={i} className={styles.pip} data-done={i <= step || undefined} />
        ))}
      </div>
      <div className={styles.step} key={step}>
        {body}
      </div>
    </Screen>
  );
}
