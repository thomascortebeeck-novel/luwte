import {
  DEFAULT_TIMEZONE,
  INSIGHTS_METRICS,
  INSIGHTS_WINDOWS,
  dateKey,
  normaliseForChart,
  positionOf,
  windowDateKeys,
  type InsightsMarker,
  type InsightsPoint,
  type InsightsWindow,
} from '@luwte/core';
import { Button, Chart, Hairline, HumanText, Screen, type ChartSeries } from '@luwte/ui';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  readAdherence,
  readDiary,
  readInsights,
  readMedicationMarkers,
} from '../firebase/insights';
import { useAccount } from '../providers/AccountProvider';
import { useAuth } from '../providers/AuthProvider';
import { useLocale } from '../providers/LocaleProvider';
import styles from './Insights.module.css';

const WINDOW_LABEL_KEYS = {
  2: 'insightsWindow2',
  6: 'insightsWindow6',
  12: 'insightsWindow12',
} as const;

/**
 * PRD 6.6 — one chart, plus the person's own words.
 *
 * The caveat above the chart is not decoration: "Dit zijn geen conclusies.
 * Dit is wat je hebt opgeschreven." A chart invites people to read a verdict
 * into it, and this product is a logbook, not a doctor.
 */
export function Insights() {
  const { t } = useLocale();
  const { user } = useAuth();
  const { patient } = useAccount();
  const navigate = useNavigate();

  const timezone = patient?.timezone ?? DEFAULT_TIMEZONE;
  const today = useMemo(() => dateKey(new Date(), timezone), [timezone]);

  const [weeks, setWeeks] = useState<InsightsWindow>(2);
  const [points, setPoints] = useState<InsightsPoint[]>([]);
  const [markers, setMarkers] = useState<InsightsMarker[]>([]);
  const [adherence, setAdherence] = useState({ taken: 0, scheduled: 0 });
  const [diary, setDiary] = useState<{ date: string; note: string }[]>([]);

  const keys = useMemo(() => windowDateKeys(today, weeks), [today, weeks]);

  useEffect(() => {
    if (!user) return;
    void readInsights(user.uid, today, weeks).then(setPoints).catch(() => setPoints([]));
    void readMedicationMarkers(user.uid, keys).then(setMarkers).catch(() => setMarkers([]));
    void readAdherence(user.uid, keys)
      .then(setAdherence)
      .catch(() => setAdherence({ taken: 0, scheduled: 0 }));
    void readDiary(user.uid, keys).then(setDiary).catch(() => setDiary([]));
  }, [user, today, weeks, keys]);

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
    <Screen
      title={t('insightsTitle')}
      action={
        <>
          <Button full onClick={() => navigate('/report')}>
            {t('reportOpen')}
          </Button>
          <Button variant="quiet" onClick={() => navigate('/')}>
            {t('navToday')}
          </Button>
        </>
      }
    >
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
        <p className={styles.empty}>{t('insightsEmpty')}</p>
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
    </Screen>
  );
}
