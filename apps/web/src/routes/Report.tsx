import {
  DEFAULT_TIMEZONE,
  INSIGHTS_METRICS,
  dateKey,
  normaliseForChart,
  positionOf,
  windowDateKeys,
  type InsightsMarker,
  type InsightsPoint,
} from '@luwte/core';
import { Button, Chart, Hairline, HumanText, Screen, type ChartSeries } from '@luwte/ui';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  readAdherence,
  readDoseNotes,
  readDiary,
  readInsights,
  readMedicationMarkers,
} from '../firebase/insights';
import { useAccount } from '../providers/AccountProvider';
import { useAuth } from '../providers/AuthProvider';
import { useLocale } from '../providers/LocaleProvider';
import styles from './Report.module.css';

/**
 * PRD 6.6 — the export that changes an appointment.
 *
 * A psychiatrist sees twenty minutes every six weeks and relies on recall,
 * which depression and medication distort (PRD 1). This sheet replaces recall
 * with a record: the chart with medication changes marked, how many doses
 * were taken, and the person's own diary lines in the serif.
 *
 * **Deliberate deviation from PRD 5.4.** The PRD specifies a `generateReport`
 * Cloud Function rendering to Cloud Storage behind a signed URL. This does it
 * in the browser instead, with a print stylesheet.
 *
 * Why: the health data never leaves the device. No upload, no server-side
 * render, no PDF sitting in a bucket, no signed URL to leak. For GDPR
 * Article 9 data that is a materially better position, and it removes the
 * only remaining reason the dev project would need billing.
 *
 * The cost: the person passes through the browser's print dialog and chooses
 * "Save as PDF", and the clinician console cannot generate this server-side
 * later. Neither matters for a family pilot, and the PRD's own framing —
 * "shareable by the patient to anyone" — is exactly this flow.
 */
export function Report() {
  const { t, locale } = useLocale();
  const { user } = useAuth();
  const { patient } = useAccount();
  const navigate = useNavigate();

  const timezone = patient?.timezone ?? DEFAULT_TIMEZONE;
  const today = useMemo(() => dateKey(new Date(), timezone), [timezone]);
  // Six weeks: the interval the PRD names between appointments.
  const keys = useMemo(() => windowDateKeys(today, 6), [today]);

  const [points, setPoints] = useState<InsightsPoint[]>([]);
  const [markers, setMarkers] = useState<InsightsMarker[]>([]);
  const [adherence, setAdherence] = useState({ taken: 0, scheduled: 0 });
  const [doseNotes, setDoseNotes] = useState<
    { date: string; actualDose: string; note: string }[]
  >([]);
  const [diary, setDiary] = useState<{ date: string; note: string }[]>([]);

  useEffect(() => {
    if (!user) return;
    void readInsights(user.uid, today, 6).then(setPoints).catch(() => setPoints([]));
    void readMedicationMarkers(user.uid, keys).then(setMarkers).catch(() => setMarkers([]));
    void readAdherence(user.uid, keys)
      .then(setAdherence)
      .catch(() => setAdherence({ taken: 0, scheduled: 0 }));
    void readDoseNotes(user.uid, keys)
      .then(setDoseNotes)
      .catch(() => setDoseNotes([]));
    void readDiary(user.uid, keys).then(setDiary).catch(() => setDiary([]));
  }, [user, today, keys]);

  const series: ChartSeries[] = INSIGHTS_METRICS.map((metric) => ({
    id: metric.id,
    label: t(metric.labelKey),
    values: points.map((point) => {
      const value = point[metric.id];
      return value === null ? null : normaliseForChart(value, metric.scale);
    }),
  }));

  const chartMarkers = markers
    .map((marker) => ({ position: positionOf(marker.date, keys), label: marker.label }))
    .filter((marker): marker is { position: number; label: string } => marker.position !== null);

  return (
    <Screen
      title={t('reportTitle')}
      action={
        <div className={styles.noPrint}>
          <Button full onClick={() => window.print()}>
            {t('reportPrint')}
          </Button>
          <Button variant="quiet" onClick={() => navigate('/insights')}>
            {t('navBack')}
          </Button>
        </div>
      }
    >
      <p className={`${styles.explanation} ${styles.noPrint}`}>{t('reportExplanation')}</p>

      <div className={styles.sheet}>
        <p className={styles.meta}>
          {patient?.displayName} · {t('reportPeriod')}: {keys[0]} — {today} · {locale}
        </p>

        <Chart series={series} markers={chartMarkers} label={t('insightsChartLabel')} />

        {/* BRAND 4.1 forbids percentages of progress, so this is a count. */}
        <p className={styles.meta}>
          {t('adherenceLabel')}: {adherence.taken} / {adherence.scheduled}
        </p>

        {/* The count says whether. This says what — the days somebody took
            something other than what was prescribed, in their own words.
            Nothing prints when there is nothing to say. */}
        {doseNotes.length > 0 ? (
          <>
            <p className={styles.meta}>{t('reportDoseNotes')}</p>
            <ul className={styles.diary}>
              {doseNotes.map((entry, index) => (
                <li key={`${entry.date}-${index}`}>
                  <span className={styles.diaryDate}>{entry.date}</span>
                  {entry.actualDose ? <span> {entry.actualDose}</span> : null}
                  {entry.note ? <HumanText>{entry.note}</HumanText> : null}
                </li>
              ))}
            </ul>
          </>
        ) : null}

        {/* BRAND 4.2 — the caveat travels with the chart, onto the paper. */}
        <p className={styles.meta}>{t('insightsCaveat')}</p>

        <Hairline />

        <h2 className={styles.heading}>{t('diaryTitle')}</h2>
        {diary.length === 0 ? (
          <p className={styles.meta}>{t('diaryEmpty')}</p>
        ) : (
          <ul className={styles.diary}>
            {diary.map((entry) => (
              <li key={entry.date}>
                <span className={styles.diaryDate}>{entry.date}</span>
                <HumanText>{entry.note}</HumanText>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Screen>
  );
}
