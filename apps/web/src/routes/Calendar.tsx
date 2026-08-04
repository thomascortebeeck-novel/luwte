import {
  DEFAULT_TIMEZONE,
  RECURRENCES,
  centredWeek,
  dateKey,
  onDay,
  type Activity,
  type RecurrenceId,
} from '@luwte/core';
import { Button, Field, Hairline, Screen } from '@luwte/ui';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { createActivity, readActivities, type ActivityRecord } from '../firebase/activities';
import { useAccount } from '../providers/AccountProvider';
import { useAuth } from '../providers/AuthProvider';
import { useLocale } from '../providers/LocaleProvider';
import styles from './Calendar.module.css';

const REPEAT_OPTIONS: { id: RecurrenceId | 'never'; labelKey: 'calendarRepeatNever' | 'calendarRepeatDaily' | 'calendarRepeatWeekly' | 'calendarRepeatWeekdays' }[] = [
  { id: 'never', labelKey: 'calendarRepeatNever' },
  { id: 'daily', labelKey: 'calendarRepeatDaily' },
  { id: 'weekly', labelKey: 'calendarRepeatWeekly' },
  { id: 'weekdays', labelKey: 'calendarRepeatWeekdays' },
];

const WEEKDAY_LABELS = ['ma', 'di', 'wo', 'do', 'vr', 'za', 'zo'];

/**
 * PRD 6.3 — seven days with today in the middle.
 *
 * Centred rather than Monday-first, because the question is "what is around
 * now", not "what does this week look like". On a Saturday a Monday-first
 * week is almost entirely behind you.
 *
 * Only accepted things appear here. What somebody else offered lives in the
 * suggestions tray and never on the calendar until the person says so.
 */
export function Calendar() {
  const { t } = useLocale();
  const { user } = useAuth();
  const { patient } = useAccount();
  const navigate = useNavigate();

  const timezone = patient?.timezone ?? DEFAULT_TIMEZONE;
  const today = useMemo(() => dateKey(new Date(), timezone), [timezone]);
  const week = useMemo(() => centredWeek(today), [today]);

  const [activities, setActivities] = useState<ActivityRecord[]>([]);
  const [adding, setAdding] = useState<string | null>(null);
  const [draft, setDraft] = useState({ title: '', startTime: '', withPerson: '' });
  const [repeat, setRepeat] = useState<RecurrenceId | 'never'>('never');
  const [busy, setBusy] = useState(false);

  const load = () => {
    if (!user) return;
    void readActivities(user.uid)
      .then(setActivities)
      .catch(() => setActivities([]));
  };

  useEffect(load, [user]);

  const suggestions = activities.filter((activity) => activity.status === 'suggested');

  const save = async () => {
    if (!user || !adding || draft.title.trim().length === 0 || busy) return;
    setBusy(true);
    try {
      await createActivity(
        user.uid,
        {
          title: draft.title.trim(),
          date: adding,
          startTime: draft.startTime,
          withPerson: draft.withPerson.trim(),
          recurrence: repeat === 'never' ? null : (RECURRENCES[repeat] as Activity['recurrence']),
        },
        user.uid,
      );
      setDraft({ title: '', startTime: '', withPerson: '' });
      setRepeat('never');
      setAdding(null);
      load();
    } finally {
      setBusy(false);
    }
  };

  if (adding) {
    return (
      <Screen
        title={t('calendarAdd')}
        action={
          <>
            <Button full disabled={draft.title.trim().length === 0 || busy} onClick={() => void save()}>
              {t('calendarSave')}
            </Button>
            <Button variant="quiet" onClick={() => setAdding(null)}>
              {t('navBack')}
            </Button>
          </>
        }
      >
        <p className={styles.dayLabel}>{adding}</p>
        <Field
          label={t('calendarWhat')}
          value={draft.title}
          onChange={(e) => setDraft({ ...draft, title: e.target.value })}
        />
        <Field
          label={t('calendarWhen')}
          message={t('calendarWhenHint')}
          type="time"
          value={draft.startTime}
          onChange={(e) => setDraft({ ...draft, startTime: e.target.value })}
        />
        <Field
          label={t('calendarWithPerson')}
          value={draft.withPerson}
          onChange={(e) => setDraft({ ...draft, withPerson: e.target.value })}
        />

        <Hairline />

        <h2 className={styles.sectionTitle}>{t('calendarRepeat')}</h2>
        <div className={styles.repeats} role="radiogroup" aria-label={t('calendarRepeat')}>
          {REPEAT_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={repeat === option.id}
              className={styles.repeat}
              onClick={() => setRepeat(option.id)}
            >
              {t(option.labelKey)}
            </button>
          ))}
        </div>
      </Screen>
    );
  }

  return (
    <Screen
      title={t('calendarTitle')}
      action={
        <Button variant="quiet" onClick={() => navigate('/')}>
          {t('navToday')}
        </Button>
      }
    >
      {/* PRD 6.3 — suggestions are separate and quiet, never on the calendar.
          A count and a way in; the tray itself is its own screen. */}
      {suggestions.length > 0 ? (
        <Button variant="quiet" onClick={() => navigate('/suggestions')}>
          {t('suggestionsTitle')} ({suggestions.length})
        </Button>
      ) : null}

      <ul className={styles.week}>
        {week.map((day) => {
          const planned = onDay(activities, day);
          return (
            <li key={day} className={day === today ? styles.dayToday : styles.day}>
              <span className={styles.dayLabel}>
                {WEEKDAY_LABELS[(new Date(`${day}T00:00:00Z`).getUTCDay() + 6) % 7]} {day.slice(8)}
                {day === today ? ` · ${t('calendarToday')}` : ''}
              </span>

              {planned.length === 0 ? (
                <span className={styles.quiet}>{t('calendarEmptyDay')}</span>
              ) : (
                <ul className={styles.items}>
                  {planned.map((activity) => (
                    <li key={activity.id} className={styles.item}>
                      <span className={styles.time}>{activity.startTime || '—'}</span>
                      <span className={styles.title}>{activity.title}</span>
                      {activity.withPerson ? (
                        <span className={styles.quiet}>{activity.withPerson}</span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}

              <Button variant="quiet" onClick={() => setAdding(day)}>
                {t('calendarAdd')}
              </Button>
              <Hairline />
            </li>
          );
        })}
      </ul>
    </Screen>
  );
}
