import {
  DEFAULT_TIMEZONE,
  RECURRENCES,
  SCALE_STEP_KEYS,
  centredWeek,
  dateKey,
  formatDay,
  formatWeekday,
  onDay,
  shiftDateKey,
  type Activity,
  type CopyKey,
  type RecurrenceId,
} from '@luwte/core';
import { Button, Field, Hairline, Screen, ScaleInput, type ScaleValue } from '@luwte/ui';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { messageKeyFor, reportError } from '../errors';
import { createActivity, readActivities, type ActivityRecord } from '../firebase/activities';
import { useAccount } from '../providers/AccountProvider';
import { useAuth } from '../providers/AuthProvider';
import { useLocale } from '../providers/LocaleProvider';
import styles from './Calendar.module.css';

/*
 * The presets offered, in the order somebody is likely to want them: the
 * everyday ones first, the calendar-appointment ones after. A fortnightly or
 * monthly rule is what a depot injection and a standing appointment need, and
 * before this they could not be written down at all.
 */
const REPEAT_OPTIONS: { id: RecurrenceId | 'never'; labelKey: CopyKey }[] = [
  { id: 'never', labelKey: 'calendarRepeatNever' },
  { id: 'daily', labelKey: 'calendarRepeatDaily' },
  { id: 'weekdays', labelKey: 'calendarRepeatWeekdays' },
  { id: 'weekly', labelKey: 'calendarRepeatWeekly' },
  { id: 'fortnightly', labelKey: 'calendarRepeatFortnightly' },
  { id: 'monthly', labelKey: 'calendarRepeatMonthly' },
  { id: 'yearly', labelKey: 'calendarRepeatYearly' },
];

type View = 'day' | 'week';

const VIEW_OPTIONS: { id: View; labelKey: CopyKey }[] = [
  { id: 'day', labelKey: 'calendarViewDay' },
  { id: 'week', labelKey: 'calendarViewWeek' },
];

/** How many things a week cell shows before it stops listing them. */
const WEEK_CELL_ITEMS = 3;

/**
 * PRD 6.3 — the calendar, in two views of the same day.
 *
 * **One anchor, two ways of looking at it.** The day view is the default and
 * shows the anchor; the week view shows seven days with the anchor in the
 * middle. Switching never loses your place, and moving in either view moves
 * the same date — so "which day am I looking at" has one answer rather than
 * two that can disagree.
 *
 * Centred rather than Monday-first, because the question is "what is around
 * now", not "what does this week look like". On a Saturday a Monday-first
 * week is almost entirely behind you.
 *
 * **Deliberately not a Google-Calendar time grid.** A grid of labelled empty
 * hours is a visual reproach on a bad day, and most things here have no time
 * at all. What is worth taking from a calendar app is the *navigation* — a
 * persistent day/week switch and today always one tap away — not the grid.
 *
 * Only accepted things appear here. What somebody else offered lives in the
 * suggestions tray and never on the calendar until the person says so.
 */
export function Calendar() {
  const { t, locale } = useLocale();
  const { user } = useAuth();
  const { patient } = useAccount();
  const navigate = useNavigate();

  const timezone = patient?.timezone ?? DEFAULT_TIMEZONE;
  const today = useMemo(() => dateKey(new Date(), timezone), [timezone]);

  const [view, setView] = useState<View>('day');
  const [anchor, setAnchor] = useState(today);
  const week = useMemo(() => centredWeek(anchor), [anchor]);

  const [activities, setActivities] = useState<ActivityRecord[]>([]);
  const [adding, setAdding] = useState<string | null>(null);
  const [draft, setDraft] = useState({ title: '', startTime: '', withPerson: '' });
  const [repeat, setRepeat] = useState<RecurrenceId | 'never'>('never');
  const [expectedPleasure, setExpectedPleasure] = useState<ScaleValue | null>(null);
  const [expectedMastery, setExpectedMastery] = useState<ScaleValue | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const stepLabels = useMemo(() => SCALE_STEP_KEYS.map((key) => t(key)), [t]);

  const load = () => {
    if (!user) return;
    void readActivities(user.uid)
      .then(setActivities)
      .catch(() => setActivities([]));
  };

  useEffect(load, [user]);

  const suggestions = activities.filter((activity) => activity.status === 'suggested');

  /** A day at a time, or a week at a time — whichever is on screen. */
  const step = (direction: 1 | -1) =>
    setAnchor((current) => shiftDateKey(current, direction * (view === 'week' ? 7 : 1)));

  const save = async () => {
    if (!user || !adding || draft.title.trim().length === 0 || busy) return;
    setBusy(true);
    setMessage(null);
    try {
      await createActivity(
        user.uid,
        {
          title: draft.title.trim(),
          date: adding,
          startTime: draft.startTime,
          withPerson: draft.withPerson.trim(),
          recurrence: repeat === 'never' ? null : (RECURRENCES[repeat] as Activity['recurrence']),
          expectedPleasure,
          expectedMastery,
        },
        user.uid,
      );
      setDraft({ title: '', startTime: '', withPerson: '' });
      setRepeat('never');
      setExpectedPleasure(null);
      setExpectedMastery(null);
      setAdding(null);
      load();
    } catch (error: unknown) {
      reportError('createActivity', error);
      setMessage(t(messageKeyFor(error)));
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
        <p className={styles.dayLabel}>{formatDay(adding, locale)}</p>
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

        <Hairline />

        {/*
          Behavioural activation: what somebody *expected* contributes more
          than what they got, which is the mechanism this product already
          claims for itself — noticing that a thing you dreaded turned out
          fine is what changes what you do next. Recorded here, at planning
          time, because that is the only moment it exists.

          Last on the screen and skippable, so planning stays a title and a
          tap for anyone who does not want to be asked.
        */}
        <h2 className={styles.sectionTitle}>{t('calendarExpect')}</h2>
        <p className={styles.quiet}>{t('calendarExpectHint')}</p>
        <p className={styles.question}>{t('calendarExpectPleasure')}</p>
        <ScaleInput
          name="expectedPleasure"
          legend={t('calendarExpectPleasure')}
          value={expectedPleasure}
          onChange={setExpectedPleasure}
          lowLabel={t('scaleLow')}
          highLabel={t('scaleHigh')}
          stepLabels={stepLabels}
        />
        <p className={styles.question}>{t('calendarExpectMastery')}</p>
        <ScaleInput
          name="expectedMastery"
          legend={t('calendarExpectMastery')}
          value={expectedMastery}
          onChange={setExpectedMastery}
          lowLabel={t('scaleLow')}
          highLabel={t('scaleHigh')}
          stepLabels={stepLabels}
        />

        {/* Present even when empty, so a screen reader has the region
            before a message ever lands in it. */}
        <p className={styles.note} role="status" aria-live="polite">
          {message}
        </p>
      </Screen>
    );
  }

  const planned = onDay(activities, anchor);
  const timed = planned.filter((activity) => activity.startTime !== '');
  const untimed = planned.filter((activity) => activity.startTime === '');

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

      <div className={styles.views} role="radiogroup" aria-label={t('calendarViewLabel')}>
        {VIEW_OPTIONS.map((option) => (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={view === option.id}
            className={styles.repeat}
            onClick={() => setView(option.id)}
          >
            {t(option.labelKey)}
          </button>
        ))}
      </div>

      {/*
        Today is always one tap away, in both views — and the way back only
        exists once you have gone somewhere, so it is not a control that does
        nothing most of the time. It says "terug naar vandaag" rather than
        "vandaag" because the screen's own footer button already says that and
        goes somewhere else entirely; two buttons with one word between them
        is the kind of ambiguity a screen reader has no way to resolve.
      */}
      <div className={styles.navigate}>
        <Button variant="quiet" onClick={() => step(-1)}>
          {t('calendarPrevious')}
        </Button>
        <Button variant="quiet" onClick={() => step(1)}>
          {t('calendarNext')}
        </Button>
        {anchor === today ? null : (
          <Button variant="quiet" onClick={() => setAnchor(today)}>
            {t('calendarBackToToday')}
          </Button>
        )}
      </div>

      {view === 'day' ? (
        <section aria-label={formatDay(anchor, locale)}>
          <h2 className={anchor === today ? styles.headingToday : styles.heading}>
            {formatDay(anchor, locale)}
            {anchor === today ? ` · ${t('calendarToday')}` : ''}
          </h2>

          {planned.length === 0 ? (
            <p className={styles.quiet}>{t('calendarEmptyDay')}</p>
          ) : (
            <>
              <ul className={styles.items}>
                {timed.map((activity) => (
                  <li key={activity.id} className={styles.agendaItem}>
                    <span className={styles.time}>{activity.startTime}</span>
                    <span className={styles.agendaText}>
                      <span className={styles.title}>{activity.title}</span>
                      {activity.withPerson ? (
                        <span className={styles.quiet}>{activity.withPerson}</span>
                      ) : null}
                    </span>
                  </li>
                ))}
              </ul>

              {/* Things with no time are not late, they are just untimed —
                  so they sit under their own quiet label rather than under a
                  dash that reads like a missing value. */}
              {untimed.length > 0 ? (
                <>
                  <p className={styles.dayLabel}>{t('calendarUntimed')}</p>
                  <ul className={styles.items}>
                    {untimed.map((activity) => (
                      <li key={activity.id} className={styles.item}>
                        <span className={styles.title}>{activity.title}</span>
                        {activity.withPerson ? (
                          <span className={styles.quiet}>{activity.withPerson}</span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}
            </>
          )}

          <Hairline />
          <Button
            variant="quiet"
            onClick={() => {
              setMessage(null);
              setAdding(anchor);
            }}
          >
            {t('calendarAdd')}
          </Button>
        </section>
      ) : (
        /*
         * Seven days as an overview, and tapping one opens it. The week is
         * for finding the day; the day is where anything is actually done.
         * That keeps one add button in the product instead of seven.
         *
         * Stacked rather than in columns — see the note in the stylesheet.
         * Seven columns inside a 640px reading measure is 83px each, and a
         * truncated activity title is not an overview of anything.
         */
        <ul className={styles.week}>
          {week.map((day) => {
            const items = onDay(activities, day);
            return (
              <li key={day}>
                <button
                  type="button"
                  className={day === today ? styles.dayCellToday : styles.dayCell}
                  onClick={() => {
                    setAnchor(day);
                    setView('day');
                  }}
                >
                  <span className={styles.dayLabel}>
                    {formatWeekday(day, locale)} {Number(day.slice(8))}
                  </span>
                  {items.length === 0 ? (
                    <span className={styles.quiet}>{t('calendarEmptyDay')}</span>
                  ) : (
                    <>
                      {items.slice(0, WEEK_CELL_ITEMS).map((activity) => (
                        <span key={activity.id} className={styles.chip}>
                          {activity.startTime ? `${activity.startTime} ` : ''}
                          {activity.title}
                        </span>
                      ))}
                      {items.length > WEEK_CELL_ITEMS ? (
                        <span className={styles.quiet}>
                          {`+ ${items.length - WEEK_CELL_ITEMS}`}
                        </span>
                      ) : null}
                    </>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Screen>
  );
}
