import { DEFAULT_TIMEZONE, centredWeek, dateKey, onDay } from '@luwte/core';
import { Button, Field, Hairline, Screen } from '@luwte/ui';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { createActivity, readSharedActivities, type ActivityRecord } from '../firebase/activities';
import { readMemberships, type Membership } from '../firebase/circle';
import { useAuth } from '../providers/AuthProvider';
import { useLocale } from '../providers/LocaleProvider';
import styles from './Calendar.module.css';

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
          recurrence: null,
        },
        user.uid,
        // The only status the rules will accept from a supporter. An offer,
        // never an entry.
        'suggested',
      );
      setDraft({ title: '', startTime: '', date: today });
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

      {sent ? <p className={styles.quiet}>{t('followingSuggestSent')}</p> : null}
    </Screen>
  );
}
