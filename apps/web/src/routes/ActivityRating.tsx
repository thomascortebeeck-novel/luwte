import { ScaleInput, type ScaleValue } from '@luwte/ui';
import { useState } from 'react';
import { Button } from '@luwte/ui';
import { useLocale } from '../providers/LocaleProvider';
import styles from './Calendar.module.css';

export type ActivityRatingProps = {
  title: string;
  onSave: (ratings: { pleasure?: number; mastery?: number }) => void;
  onSkip: () => void;
};

/**
 * PRD 6.2 — the two-tap question after finishing something planned.
 *
 * *How did it feel* (pleasure) and *how hard was it* (mastery). This is the
 * behavioural-activation mechanism, and it is what makes the calendar a
 * therapeutic tool rather than a to-do list: doing something that felt
 * difficult and turned out fine is the observation that changes behaviour.
 *
 * **It is optional and dismissible, and skipping is never remarked on.** The
 * tick is already recorded before this appears, so closing it loses nothing.
 * Both scales use the ordinary ScaleInput, which never renders a digit — a
 * number invites you to score yourself.
 */
export function ActivityRating({ title, onSave, onSkip }: ActivityRatingProps) {
  const { t } = useLocale();
  const [pleasure, setPleasure] = useState<ScaleValue | null>(null);
  const [mastery, setMastery] = useState<ScaleValue | null>(null);

  return (
    <section className={styles.rating} aria-label={t('ratingTitle')}>
      <h2 className={styles.sectionTitle}>{t('ratingTitle')}</h2>
      <p className={styles.quiet}>{title}</p>

      <ScaleInput
        name="pleasure"
        legend={t('ratingPleasure')}
        value={pleasure}
        onChange={setPleasure}
        lowLabel={t('scaleLow')}
        highLabel={t('scaleHigh')}
      />
      <ScaleInput
        name="mastery"
        legend={t('ratingMastery')}
        value={mastery}
        onChange={setMastery}
        lowLabel={t('scaleLow')}
        highLabel={t('scaleHigh')}
      />

      <div className={styles.decide}>
        <Button
          disabled={pleasure === null && mastery === null}
          onClick={() =>
            onSave({
              ...(pleasure === null ? {} : { pleasure }),
              ...(mastery === null ? {} : { mastery }),
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
