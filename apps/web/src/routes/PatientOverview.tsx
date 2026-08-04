import {
  INSIGHTS_METRICS,
  INSIGHTS_WINDOWS,
  normaliseForChart,
  positionOf,
  windowDateKeys,
  type InsightsMarker,
  type InsightsPoint,
  type InsightsWindow,
} from '@luwte/core';
import { Button, Chart, Hairline, HumanText, type ChartSeries } from '@luwte/ui';
import { useEffect, useMemo, useState } from 'react';
import { readAdherence, readDiary, readInsights, readMedicationMarkers } from '../firebase/insights';
import { useLocale } from '../providers/LocaleProvider';
import styles from './Insights.module.css';

const WINDOW_LABEL_KEYS = {
  2: 'insightsWindow2',
  6: 'insightsWindow6',
  12: 'insightsWindow12',
} as const;

export type PatientOverviewProps = {
  uid: string;
  today: string;
  /** Off in the console when the patient did not grant that permission. */
  showCheckins?: boolean;
  showMedication?: boolean;
};

/**
 * PRD 6.6 — the chart, the adherence count, and the person's own words.
 *
 * Shared deliberately between the person's own Overview and the clinician's
 * console: at an appointment the two of them are looking at the same picture,
 * and two implementations would drift until they were not.
 *
 * The caveat above the chart is not decoration. A chart invites a verdict to
 * be read into it, and this product is a logbook, not a doctor.
 */
export function PatientOverview({
  uid,
  today,
  showCheckins = true,
  showMedication = true,
}: PatientOverviewProps) {
  const { t } = useLocale();

  const [weeks, setWeeks] = useState<InsightsWindow>(2);
  const [points, setPoints] = useState<InsightsPoint[]>([]);
  const [markers, setMarkers] = useState<InsightsMarker[]>([]);
  const [adherence, setAdherence] = useState({ taken: 0, scheduled: 0 });
  const [diary, setDiary] = useState<{ date: string; note: string }[]>([]);

  const keys = useMemo(() => windowDateKeys(today, weeks), [today, weeks]);

  useEffect(() => {
    if (!uid) return;

    if (showCheckins) {
      void readInsights(uid, today, weeks)
        .then(setPoints)
        .catch(() => setPoints([]));
      void readDiary(uid, keys)
        .then(setDiary)
        .catch(() => setDiary([]));
    } else {
      setPoints([]);
      setDiary([]);
    }

    if (showMedication) {
      void readMedicationMarkers(uid, keys)
        .then(setMarkers)
        .catch(() => setMarkers([]));
      void readAdherence(uid, keys)
        .then(setAdherence)
        .catch(() => setAdherence({ taken: 0, scheduled: 0 }));
    } else {
      setMarkers([]);
      setAdherence({ taken: 0, scheduled: 0 });
    }
  }, [uid, today, weeks, keys, showCheckins, showMedication]);

  const series: ChartSeries[] = INSIGHTS_METRICS.map((metric) => ({
    id: metric.id,
    label: t(metric.labelKey),
    values: points.map((point) => {
      const value = point[metric.id];
      return value === null ? null : normaliseForChart(value, metric.scale);
    }),
  }));

  const hasAnything = points.some(
    (point) => point.mood !== null || point.energy !== null || point.flatness !== null,
  );

  const chartMarkers = markers
    .map((marker) => ({ position: positionOf(marker.date, keys), label: marker.label }))
    .filter((marker): marker is { position: number; label: string } => marker.position !== null);

  return (
    <>
      <div className={styles.windows}>
        {INSIGHTS_WINDOWS.map((option) => (
          <Button
            key={option}
            variant="quiet"
            aria-pressed={weeks === option}
            onClick={() => setWeeks(option)}
          >
            {t(WINDOW_LABEL_KEYS[option])}
          </Button>
        ))}
      </div>

      {hasAnything ? (
        <>
          <Chart series={series} markers={chartMarkers} label={t('insightsChartLabel')} />
          {/* BRAND 4.2 — the sentence that keeps a chart from becoming a verdict. */}
          <p className={styles.caveat}>{t('insightsCaveat')}</p>
          {adherence.scheduled > 0 ? (
            <p className={styles.adherence}>
              {t('adherenceLabel')}: {adherence.taken} / {adherence.scheduled}
            </p>
          ) : null}
        </>
      ) : (
        <p className={styles.empty}>{t(showCheckins ? 'insightsEmpty' : 'consoleNothingShared')}</p>
      )}

      <Hairline />

      <h2 className={styles.header}>{t('diaryTitle')}</h2>
      {diary.length === 0 ? (
        <p className={styles.empty}>{t('diaryEmpty')}</p>
      ) : (
        <ul className={styles.diary}>
          {diary.map((entry) => (
            <li key={entry.date}>
              <span className={styles.diaryDate}>{entry.date}</span>
              {/* The person's own words, so the serif. Never analysed. */}
              <HumanText>{entry.note}</HumanText>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
