import {
  CHECKIN_STEPS,
  diaryPromptFor,
  type CopyKey,
  type DateKey,
  type Scale,
} from '@luwte/core';
import { Button, ScaleInput, type ScaleValue } from '@luwte/ui';
import { useMemo, useState } from 'react';
import { saveCheckin } from '../firebase/checkins';
import { useLocale } from '../providers/LocaleProvider';
import styles from './TodayCheckin.module.css';

export type TodayCheckinProps = {
  uid: string;
  today: DateKey;
  onSaved: (note: string | null) => void;
};

/**
 * The check-in, on Today, in one view.
 *
 * **The complaint was that it was too long, and the length was the wizard
 * rather than the questions.** Four items and a diary line were asked one per
 * screen — five screens, five taps of "Verder", and the weekly extra made it
 * nine. Put in one place with every scale visible at once it is the same
 * record and about a fifth of the effort.
 *
 * **No item was dropped, and that is deliberate.** `mood` and `arousal` are
 * the two axes of the circumplex and between them they span momentary
 * feeling — take either away and the windline cannot tell elated from
 * agitated. `flatness` is not a point on that circle at all; it is the
 * absence of a response, it is what antipsychotics blunt, and it is the item
 * that changes an appointment. `sleepHours` is the one a watch will answer by
 * itself once Health Connect is wired, at which point this gets shorter for
 * free.
 *
 * The full `/checkin` screen stays for editing a past day and for the weekly
 * items, where one-per-screen is right: those are asked rarely and are worth
 * slowing down for.
 */
export function TodayCheckin({ uid, today, onSaved }: TodayCheckinProps) {
  const { t } = useLocale();
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [note, setNote] = useState('');

  const scaleLabels = useMemo(
    () => [1, 2, 3, 4, 5, 6, 7].map((n) => t(`scaleStep${n}` as CopyKey)),
    [t],
  );

  // Keyed to the day so the wording cannot change while somebody is typing.
  const prompt = useMemo(() => diaryPromptFor(today), [today]);

  const scales = CHECKIN_STEPS.filter((step) => step.kind === 'scale');
  const complete =
    scales.every((step) => answers[step.id] !== undefined) &&
    Number.isFinite(answers.sleepHours);

  const save = () => {
    saveCheckin(uid, today, {
      date: today,
      mood: answers.mood as Scale,
      arousal: answers.arousal as Scale,
      sleepHours: answers.sleepHours ?? 0,
      flatness: answers.flatness as Scale,
      ...(note.trim() ? { note: note.trim() } : {}),
      source: 'manual',
    });
    // Nothing waits on the network: the write goes to the local cache and
    // syncs later, which is the whole point of PRD 5.6.
    onSaved(note.trim() || null);
  };

  return (
    <section className={styles.section} aria-labelledby="today-checkin">
      <h2 className={styles.heading} id="today-checkin">
        {t('checkinEntry')}
      </h2>

      {scales.map((step) => (
        <div className={styles.item} key={step.id}>
          <p className={styles.question}>{t(step.questionKey)}</p>
          <ScaleInput
            name={step.id}
            legend={t(step.questionKey)}
            value={(answers[step.id] as ScaleValue | undefined) ?? null}
            onChange={(value) => setAnswers((prev) => ({ ...prev, [step.id]: value }))}
            lowLabel={t(step.lowKey)}
            highLabel={t(step.highKey)}
            stepLabels={scaleLabels}
          />
        </div>
      ))}

      <div className={styles.item}>
        <p className={styles.question}>{t('checkinSleepHours')}</p>
        <div className={styles.hours}>
          <input
            className={styles.hoursInput}
            type="number"
            inputMode="decimal"
            min={0}
            max={16}
            step={0.5}
            aria-label={t('checkinSleepHours')}
            value={answers.sleepHours ?? ''}
            onChange={(e) =>
              setAnswers((prev) => ({
                ...prev,
                sleepHours: e.target.value === '' ? NaN : Number(e.target.value),
              }))
            }
          />
          <span className={styles.hoursSuffix}>{t('checkinHoursSuffix')}</span>
        </div>
      </div>

      {/* Optional, always. A day with nothing written is a complete check-in. */}
      <div className={styles.item}>
        <label className={styles.question} htmlFor="today-note">
          {t(prompt)}
        </label>
        <textarea
          id="today-note"
          className={styles.note}
          rows={2}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>

      <Button full disabled={!complete} onClick={save}>
        {t('checkinSave')}
      </Button>
    </section>
  );
}
