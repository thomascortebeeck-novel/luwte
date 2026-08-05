import { ScaleInput, type ScaleValue } from '@luwte/ui';
import { useState } from 'react';
import { Button } from '@luwte/ui';
import { SCALE_STEP_KEYS, type CopyKey } from '@luwte/core';
import { useLocale } from '../providers/LocaleProvider';
import styles from './Calendar.module.css';

export type ActivityRatingProps = {
  title: string;
  /** What the person said they expected when they planned it, if they did. */
  expectedPleasure?: number | null;
  expectedMastery?: number | null;
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
 *
 * **It does not appear every time** — see `shouldAskRating`. Re-rating
 * Tuesday's walk every Tuesday is bookkeeping, and bookkeeping is what makes
 * somebody stop using a thing.
 */
export function ActivityRating({
  title,
  expectedPleasure = null,
  expectedMastery = null,
  onSave,
  onSkip,
}: ActivityRatingProps) {
  const { t } = useLocale();
  const [pleasure, setPleasure] = useState<ScaleValue | null>(null);
  const [mastery, setMastery] = useState<ScaleValue | null>(null);

  /*
   * A word, never the digit — BRAND's rule against a visible number holds
   * here for the same reason it holds on the scale itself. And it is stated
   * flatly, with no arrow and no "better": that a walk turned out easier than
   * expected is the person's own observation to make, not the app's verdict.
   */
  const said = (value: number | null, label: CopyKey) =>
    value === null ? null : `${t(label)}: ${t(SCALE_STEP_KEYS[value - 1]!)}`;

  const expected = [
    said(expectedPleasure, 'ratingPleasureShort'),
    said(expectedMastery, 'ratingMasteryShort'),
  ].filter((line): line is string => line !== null);

  return (
    <section className={styles.rating} aria-label={t('ratingTitle')}>
      <h2 className={styles.sectionTitle}>{t('ratingTitle')}</h2>
      <p className={styles.quiet}>{title}</p>

      {expected.length > 0 ? (
        <p className={styles.quiet}>
          {t('ratingExpected')}
          {expected.map((line) => (
            <span key={line} className={styles.expectedLine}>
              {line}
            </span>
          ))}
        </p>
      ) : null}

      {/* Written out, not only in the aria-label: two scales one under the
          other are seven identical dots between "weinig" and "veel", twice,
          and nothing on the screen says which one is which. */}
      <p className={styles.question}>{t('ratingPleasure')}</p>
      <ScaleInput
        name="pleasure"
        legend={t('ratingPleasure')}
        value={pleasure}
        onChange={setPleasure}
        lowLabel={t('scaleLow')}
        highLabel={t('scaleHigh')}
        stepLabels={SCALE_STEP_KEYS.map((key) => t(key))}
      />
      <p className={styles.question}>{t('ratingMastery')}</p>
      <ScaleInput
        name="mastery"
        legend={t('ratingMastery')}
        value={mastery}
        onChange={setMastery}
        lowLabel={t('scaleLow')}
        highLabel={t('scaleHigh')}
        stepLabels={SCALE_STEP_KEYS.map((key) => t(key))}
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
