import {
  DEFAULT_TIMEZONE,
  RECURRENCES,
  SUPPORT_DAILY,
  centredWeek,
  dateKey,
  onDay,
  supportTipFor,
  type Activity,
  type CopyKey,
  type RecurrenceId,
} from '@luwte/core';
import { Button, Field, Hairline, Screen } from '@luwte/ui';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { createActivity, readSharedActivities, type ActivityRecord } from '../firebase/activities';
import { readMemberships, type Membership } from '../firebase/circle';
import { useAuth } from '../providers/AuthProvider';
import { useLocale } from '../providers/LocaleProvider';
import styles from './Calendar.module.css';
import supportStyles from './Following.module.css';

/*
 * The everyday shapes an offer takes. Deliberately shorter than the patient's
 * own list: somebody offering to help does not need a yearly rule, and the
 * point of this control is "a week at a time" rather than every rule the
 * parser understands.
 */
const SUGGEST_REPEATS: { id: RecurrenceId | 'never'; labelKey: CopyKey }[] = [
  { id: 'never', labelKey: 'calendarRepeatNever' },
  { id: 'weekdays', labelKey: 'calendarRepeatWeekdays' },
  { id: 'weekly', labelKey: 'calendarRepeatWeekly' },
  { id: 'daily', labelKey: 'calendarRepeatDaily' },
];

/**
 * The supporter's side: who shares with you, and what you can do about it.
 *
 * Only people who invited you as a supporter appear. Someone who invited you
 * as their clinician belongs in the console, which is a different job.
 */
export function Following() {
  const { t } = useLocale();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [people, setPeople] = useState<Membership[] | null>(null);
  // No patient record of their own, so no personal timezone to read it from.
  const today = useMemo(() => dateKey(new Date(), DEFAULT_TIMEZONE), []);

  useEffect(() => {
    if (!user) return;
    void readMemberships(user.uid)
      .then((all) => setPeople(all.filter((m) => m.role === 'supporter')))
      .catch(() => setPeople([]));
  }, [user]);

  if (people === null) return <Screen title={t('followingTitle')}>{null}</Screen>;

  return (
    <Screen
      title={t('followingTitle')}
      action={
        <Button variant="quiet" onClick={() => navigate('/')}>
          {t('navToday')}
        </Button>
      }
    >
      {people.length === 0 ? (
        <p className={styles.quiet}>{t('followingEmpty')}</p>
      ) : (
        <ul className={styles.items}>
          {people.map((person) => (
            <li key={person.patientId} className={styles.suggestion}>
              <span className={styles.title}>{person.patientName || t('consoleNoName')}</span>
              <div className={styles.decide}>
                {person.permissions.feed ? (
                  <Button variant="quiet" onClick={() => navigate(`/feed/${person.patientId}`)}>
                    {t('feedTitle')}
                  </Button>
                ) : null}
                {person.permissions.calendar ? (
                  <Button variant="quiet" onClick={() => navigate(`/following/${person.patientId}`)}>
                    {t('followingCalendar')}
                  </Button>
                ) : null}
                {/* What they wrote for when it goes downhill — the reason a
                    relapse-prevention plan is worth writing is that the people
                    around you have read it. */}
                {person.permissions.plan ? (
                  <Button variant="quiet" onClick={() => navigate(`/plan/${person.patientId}`)}>
                    {t('planLink')}
                  </Button>
                ) : null}
              </div>
              <Hairline />
            </li>
          ))}
        </ul>
      )}

      <Hairline />

      {/*
       * General education for the supporter, never advice about the person
       * they follow — the same guidance for everybody, every day. It reads
       * no check-in, no mood, no medication, and it is not conditional on
       * anything a patient's data says: a conclusion drawn about a named
       * person from their health data is clinical monitoring, the line this
       * product does not cross. See packages/core/src/model/supporting.ts.
       */}
      <section className={supportStyles.support}>
        <h2 className={supportStyles.supportTitle}>{t('supportTitle')}</h2>
        {/* One a day, rotating, so it does not become furniture. */}
        <p className={supportStyles.tip}>{t(supportTipFor(today))}</p>
        <ul className={supportStyles.daily}>
          {SUPPORT_DAILY.map((key) => (
            <li key={key} className={supportStyles.dailyItem}>
              {t(key)}
            </li>
          ))}
        </ul>
      </section>
    </Screen>
  );
}

/**
 * PRD 6.3 — what a supporter may do with someone else's calendar.
 *
 * They can see what is planned, and they can **offer** something. They cannot
 * place it: what they write is created as a suggestion and waits in that
 * person's tray. The screen says so plainly rather than letting them think
 * they added it to a day.
 *
 * A declined suggestion is not listed here and cannot be fetched — the rules
 * refuse it — so there is nothing to notice and nothing to infer.
 */
export function FollowingCalendar() {
  const { t } = useLocale();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { patientId = '' } = useParams();

  const today = useMemo(() => dateKey(new Date(), DEFAULT_TIMEZONE), []);
  const week = useMemo(() => centredWeek(today), [today]);

  const [person, setPerson] = useState<Membership | null | 'missing'>(null);
  const [activities, setActivities] = useState<ActivityRecord[]>([]);
  const [draft, setDraft] = useState({ title: '', startTime: '', date: today });
  const [repeat, setRepeat] = useState<RecurrenceId | 'never'>('never');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user || !patientId) return;
    void readMemberships(user.uid)
      .then((all) => setPerson(all.find((m) => m.patientId === patientId) ?? 'missing'))
      .catch(() => setPerson('missing'));
    void readSharedActivities(patientId)
      .then(setActivities)
      .catch(() => setActivities([]));
  }, [user, patientId]);

  if (person === null) return <Screen>{null}</Screen>;

  if (person === 'missing' || !person.permissions.calendar) {
    return (
      <Screen title={t('followingTitle')}>
        <p className={styles.quiet}>{t('followingEmpty')}</p>
        <Button variant="quiet" onClick={() => navigate('/following')}>
          {t('navBack')}
        </Button>
      </Screen>
    );
  }

  const suggest = async () => {
    if (!user || draft.title.trim().length === 0 || busy) return;
    setBusy(true);
    try {
      await createActivity(
        patientId,
        {
          title: draft.title.trim(),
          date: draft.date,
          startTime: draft.startTime,
          withPerson: '',
          /*
           * D30's "suggest a week", and it needed no new concept: a
           * suggestion that repeats is one offer the person accepts with one
           * tap, and it then lands on every day it names. A batch of fourteen
           * separate suggestions to accept one at a time is the tedium the
           * decision was about, and this avoids it without touching the
           * invariant — it is still an offer, and still theirs to accept.
           */
          recurrence: repeat === 'never' ? null : (RECURRENCES[repeat] as Activity['recurrence']),
        },
        user.uid,
        // The only status the rules will accept from a supporter or a nurse.
        // An offer, never an entry.
        'suggested',
      );
      setDraft({ title: '', startTime: '', date: today });
      setRepeat('never');
      setSent(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen
      title={person.patientName || t('consoleNoName')}
      action={
        <>
          <Button full disabled={draft.title.trim().length === 0 || busy} onClick={() => void suggest()}>
            {t('followingSuggest')}
          </Button>
          <Button variant="quiet" onClick={() => navigate('/following')}>
            {t('navBack')}
          </Button>
        </>
      }
    >
      <h2 className={styles.sectionTitle}>{t('followingCalendar')}</h2>
      <ul className={styles.week}>
        {week.map((day) => {
          const planned = onDay(activities, day);
          return (
            <li key={day} className={day === today ? styles.dayToday : styles.day}>
              <span className={styles.dayLabel}>{day}</span>
              {planned.length === 0 ? (
                <span className={styles.quiet}>{t('calendarEmptyDay')}</span>
              ) : (
                planned.map((activity) => (
                  <span key={activity.id} className={styles.title}>
                    {activity.startTime ? `${activity.startTime} · ` : ''}
                    {activity.title}
                  </span>
                ))
              )}
            </li>
          );
        })}
      </ul>

      <Hairline />

      <h2 className={styles.sectionTitle}>{t('followingSuggest')}</h2>
      {/* Says what will actually happen, in their direction. They are
          offering, not planning, and the screen should not let them think
          otherwise before they press the button. */}
      <p className={styles.intro}>{t('followingSuggestIntro')}</p>

      <Field
        label={t('calendarWhat')}
        value={draft.title}
        onChange={(e) => {
          setSent(false);
          setDraft({ ...draft, title: e.target.value });
        }}
      />
      <Field
        label={t('calendarWhen')}
        message={t('calendarWhenHint')}
        type="time"
        value={draft.startTime}
        onChange={(e) => setDraft({ ...draft, startTime: e.target.value })}
      />
      <Field
        label={t('calendarToday')}
        type="date"
        value={draft.date}
        onChange={(e) => setDraft({ ...draft, date: e.target.value })}
      />

      <h3 className={styles.sectionTitle}>{t('calendarRepeat')}</h3>
      <div className={styles.repeats} role="radiogroup" aria-label={t('calendarRepeat')}>
        {SUGGEST_REPEATS.map((option) => (
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

      {sent ? <p className={styles.quiet}>{t('followingSuggestSent')}</p> : null}
    </Screen>
  );
}
