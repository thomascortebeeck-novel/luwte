import { BREATHING_CYCLES, breathingAt } from '@luwte/core';
import { Button, Screen } from '@luwte/ui';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { useLocale } from '../providers/LocaleProvider';
import styles from './Practice.module.css';

/**
 * A minute of slow breathing, guided, with the eyes open.
 *
 * **Nothing here is recorded.** No count of sessions, no last-done date, no
 * trace in the feed or the report. PRD 6.2 says an optional practice is
 * offered and that ignoring it costs nothing — which is only true while there
 * is nothing to ignore *against*.
 *
 * Driven by elapsed time through `breathingAt` rather than a chain of
 * timeouts, and advanced by `requestAnimationFrame`, so a tab that goes to the
 * background stops rather than drifts: the guide somebody comes back to is
 * where they left it, not four phases ahead of the circle.
 */
export function Breathing() {
  const { t } = useLocale();
  const navigate = useNavigate();

  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const startedAt = useRef(0);

  useEffect(() => {
    if (!running) return;
    startedAt.current = performance.now() - elapsed * 1000;

    let frame = 0;
    const tick = (now: number) => {
      const seconds = (now - startedAt.current) / 1000;
      setElapsed(seconds);
      if (!breathingAt(seconds).done) frame = requestAnimationFrame(tick);
      else setRunning(false);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
    // `elapsed` is read once to resume from where it stopped; depending on it
    // would restart the loop on every frame.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  const { phase, cycle, done } = breathingAt(elapsed);
  const started = elapsed > 0;

  const stop = () => {
    setRunning(false);
    setElapsed(0);
  };

  return (
    <Screen
      title={t('breathingTitle')}
      action={
        <>
          {running ? (
            <Button full variant="quiet" onClick={stop}>
              {t('breathingStop')}
            </Button>
          ) : (
            <Button
              full
              onClick={() => {
                setElapsed(0);
                setRunning(true);
              }}
            >
              {t('breathingStart')}
            </Button>
          )}
          <Button variant="quiet" onClick={() => navigate('/')}>
            {t('navToday')}
          </Button>
        </>
      }
    >
      <p className={styles.intro}>{t('breathingIntro')}</p>

      <div className={styles.stage}>
        {done && started ? (
          <p className={styles.done}>{t('breathingDone')}</p>
        ) : (
          <>
            <p className={styles.phase} aria-live="polite">
              {running ? t(phase.labelKey) : ''}
            </p>
            <div
              className={styles.circle}
              aria-hidden="true"
              style={{
                // The movement is the timing: the circle takes exactly as long
                // to grow as the in-breath lasts.
                ['--breath-scale' as string]: running && phase.scale === 1 ? 1 : 0.45,
                transitionDuration: running ? `${phase.seconds}s` : '0s',
              }}
            />
            <div className={styles.breaths} role="img" aria-label={t('breathingProgress')}>
              {Array.from({ length: BREATHING_CYCLES }, (_, index) => (
                <span
                  key={index}
                  className={styles.breath}
                  data-done={index < cycle || undefined}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </Screen>
  );
}
