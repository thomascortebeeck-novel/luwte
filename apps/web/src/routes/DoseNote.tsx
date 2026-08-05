import type { DoseAnnotation } from '@luwte/core';
import { Button, Field } from '@luwte/ui';
import { useState } from 'react';
import { useLocale } from '../providers/LocaleProvider';
import styles from './Calendar.module.css';

export type DoseNoteProps = {
  /** The medication and its prescribed dose, so the person sees what they are amending. */
  title: string;
  initial: DoseAnnotation;
  onSave: (annotation: DoseAnnotation) => void;
  onSkip: () => void;
};

/**
 * What was actually taken, and why.
 *
 * The question a psychiatrist cannot get an answer to from a tick. The app has
 * always recorded *whether* a dose was taken; it never recorded that somebody
 * halved it because it left them too drowsy to work — which is both the more
 * useful fact and the one that changes a prescription.
 *
 * **The tick is saved before this appears**, exactly like the pleasure and
 * mastery questions, so closing it loses nothing. It is offered only on a dose
 * already marked taken, and never stands between a person and taking their
 * medication.
 *
 * The dose field is free text on purpose. "1 in plaats van 2", "150 mg" and
 * "de helft" are all real answers, and a number picker would refuse two of
 * them.
 */
export function DoseNote({ title, initial, onSave, onSkip }: DoseNoteProps) {
  const { t } = useLocale();
  const [actualDose, setActualDose] = useState(initial.actualDose ?? '');
  const [note, setNote] = useState(initial.note ?? '');

  const changed = actualDose !== (initial.actualDose ?? '') || note !== (initial.note ?? '');

  return (
    <section className={styles.rating} aria-label={t('doseNoteTitle')}>
      <h2 className={styles.sectionTitle}>{t('doseNoteTitle')}</h2>
      <p className={styles.quiet}>{title}</p>

      <Field
        label={t('doseNoteActual')}
        message={t('doseNoteActualHint')}
        value={actualDose}
        onChange={(e) => setActualDose(e.target.value)}
      />
      <Field
        label={t('doseNoteWhy')}
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />

      <div className={styles.decide}>
        <Button
          disabled={!changed}
          onClick={() =>
            onSave({
              ...(actualDose.trim() ? { actualDose: actualDose.trim() } : {}),
              ...(note.trim() ? { note: note.trim() } : {}),
            })
          }
        >
          {t('ratingSave')}
        </Button>
        <Button variant="quiet" onClick={onSkip}>
          {t('ratingSkip')}
        </Button>
      </div>
    </section>
  );
}
