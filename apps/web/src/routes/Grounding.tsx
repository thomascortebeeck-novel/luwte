import { GROUNDING_STEPS } from '@luwte/core';
import { Button, Screen } from '@luwte/ui';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useLocale } from '../providers/LocaleProvider';
import styles from './Practice.module.css';

/**
 * 5-4-3-2-1, the grounding exercise with the best claim to being safe here:
 * every step points outwards, at the room, with the eyes open. That is the
 * distinction that matters — see `practices.ts` for why an open-ended
 * meditation is not offered anywhere in this product.
 *
 * **There is nothing to fill in and nothing is recorded.** A form here would
 * collect data about somebody's worst ten minutes and turn the exercise into a
 * record instead of a thing you do. It is counted in your head, the way it is
 * done.
 */
export function Grounding() {
  const { t } = useLocale();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);

  const current = GROUNDING_STEPS[step];

  return (
    <Screen
      title={t('groundingTitle')}
      action={
        <>
          {current ? (
            <Button full onClick={() => setStep(step + 1)}>
              {t('groundingNext')}
            </Button>
          ) : null}
          <Button variant="quiet" onClick={() => navigate('/')}>
            {t('navToday')}
          </Button>
        </>
      }
    >
      <p className={styles.intro}>{t('groundingIntro')}</p>

      <div className={styles.stage}>
        {current ? (
          <>
            <p className={styles.count}>{current.count}</p>
            <p className={styles.what}>{t(current.labelKey)}</p>
          </>
        ) : (
          <p className={styles.done}>{t('groundingDone')}</p>
        )}
      </div>
    </Screen>
  );
}
