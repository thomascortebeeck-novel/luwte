import {
  DEFAULT_NOTIFICATION_SETTINGS,
  DEFAULT_TIMEZONE,
  NOTIFICATION_CATEGORIES,
  checkinReminderCalendarLink,
  dateKey,
  type NotificationSettings,
} from '@luwte/core';
import { Button, Choice, Hairline, Screen } from '@luwte/ui';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { saveNotificationSettings, saveReminderHour } from '../firebase/accounts';
import { isVerifiedClinician } from '../firebase/clinician';
import { useAccount } from '../providers/AccountProvider';
import { useAuth } from '../providers/AuthProvider';
import { useLocale } from '../providers/LocaleProvider';
import styles from './Settings.module.css';

const HOURS = Array.from({ length: 24 }, (_, hour) => hour);

/**
 * PRD 8 — every notification category can be turned off on its own, and an
 * app with all of them off is still a fully working app. Nothing here nags
 * about a category being off, and there is no "turn these back on" prompt.
 */
export function Settings() {
  const { t, locale, setLocale } = useLocale();
  const { user } = useAuth();
  const { patient, reload } = useAccount();
  const navigate = useNavigate();

  const timezone = patient?.timezone ?? DEFAULT_TIMEZONE;
  const [settings, setSettings] = useState<NotificationSettings>(
    patient?.notifications ?? DEFAULT_NOTIFICATION_SETTINGS,
  );
  const [hour, setHour] = useState(patient?.checkinHour ?? 20);
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>(() =>
    typeof Notification === 'undefined' ? 'unsupported' : Notification.permission,
  );
  const [isClinician, setIsClinician] = useState(false);

  useEffect(() => {
    if (!user) return;
    void isVerifiedClinician(user.uid).then(setIsClinician);
  }, [user]);

  useEffect(() => {
    if (patient?.notifications) setSettings(patient.notifications);
    if (patient?.checkinHour !== undefined) setHour(patient.checkinHour);
  }, [patient?.notifications, patient?.checkinHour]);

  const calendarUrl = useMemo(
    () =>
      checkinReminderCalendarLink({
        title: t('calendarEventTitle'),
        details: t('calendarEventDetails'),
        fromDate: dateKey(new Date(), timezone),
        hour,
        timeZone: timezone,
      }),
    [t, timezone, hour],
  );

  const toggle = (id: keyof NotificationSettings, value: boolean) => {
    const next = { ...settings, [id]: value };
    setSettings(next);
    if (user) void saveNotificationSettings(user.uid, next).then(reload);
  };

  const changeHour = (next: number) => {
    setHour(next);
    if (user) void saveReminderHour(user.uid, next).then(reload);
  };

  return (
    <Screen title={t('settingsTitle')}>
      {/* Above notifications on purpose: who can see what a person wrote
          matters more than which alerts they get, and PRD 6.4 puts the
          decision within easy reach rather than buried. */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>{t('circleTitle')}</h2>
        <p className={styles.note}>{t('circleIntro')}</p>
        <div className={styles.row}>
          <Button variant="quiet" onClick={() => navigate('/circle')}>
            {t('circleChange')}
          </Button>
        </div>
      </section>

      {/* PRD 6.7 — only offered to someone the admin verified. Not a security
          boundary: the rules are. This is about not showing a psychiatrist's
          menu to a person who is not one. */}
      {isClinician ? (
        <>
          <Hairline />
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>{t('consoleTitle')}</h2>
            <div className={styles.row}>
              <Button variant="quiet" onClick={() => navigate('/console')}>
                {t('consoleOpen')}
              </Button>
            </div>
          </section>
        </>
      ) : null}

      <Hairline />

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>{t('settingsReminderHour')}</h2>
        <div className={styles.row}>
          <select
            className={styles.hourSelect}
            aria-label={t('settingsReminderHour')}
            value={hour}
            onChange={(e) => changeHour(Number(e.target.value))}
          >
            {HOURS.map((h) => (
              <option key={h} value={h}>
                {String(h).padStart(2, '0')}:00
              </option>
            ))}
          </select>
        </div>

        <a className={styles.calendarLink} href={calendarUrl} target="_blank" rel="noreferrer">
          {t('calendarAddReminder')}
        </a>
        <p className={styles.note}>{t('calendarExplanation')}</p>
      </section>

      <Hairline />

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>{t('settingsNotifications')}</h2>
        <p className={styles.note}>{t('settingsNotificationsIntro')}</p>

        {permission === 'default' ? (
          <Button
            variant="quiet"
            onClick={() => void Notification.requestPermission().then(setPermission)}
          >
            {t('settingsAllowNotifications')}
          </Button>
        ) : null}
        {permission === 'denied' ? (
          <p className={styles.note}>{t('settingsNotificationsBlocked')}</p>
        ) : null}

        <div className={styles.items}>
          {NOTIFICATION_CATEGORIES.map((category) => (
            <Choice
              key={category.id}
              label={t(category.labelKey)}
              explanation={t(category.explanationKey)}
              checked={settings[category.id]}
              onChange={(checked) => toggle(category.id, checked)}
            />
          ))}
        </div>
      </section>

      <Hairline />

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>{t('settingsLocale')}</h2>
        <div className={styles.row}>
          <Button variant="quiet" onClick={() => setLocale(locale === 'nl' ? 'en' : 'nl')}>
            {locale === 'nl' ? 'English' : 'Nederlands'}
          </Button>
        </div>
      </section>
    </Screen>
  );
}
