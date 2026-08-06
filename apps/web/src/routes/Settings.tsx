import {
  DEFAULT_NOTIFICATION_SETTINGS,
  DEFAULT_TIMEZONE,
  NOTIFICATION_CATEGORIES,
  checkinReminderCalendarLink,
  dateKey,
  DEFAULT_SHARE_SETTINGS,
  exportFilename,
  type NotificationSettings,
  type ShareSettings,
} from '@luwte/core';
import { Button, Choice, Hairline, Screen } from '@luwte/ui';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { messageKeyFor, reportError } from '../errors';
import {
  saveNotificationSettings,
  saveReminderHour,
  saveShareSettings,
} from '../firebase/accounts';
import { readMemberships } from '../firebase/circle';
import { isVerifiedClinician } from '../firebase/clinician';
import { eraseEverything, exportEverything } from '../firebase/gdpr';
import { useAccount } from '../providers/AccountProvider';
import { useAuth } from '../providers/AuthProvider';
import { useLocale } from '../providers/LocaleProvider';
import { useTheme } from '../providers/ThemeProvider';
import styles from './Settings.module.css';

const HOURS = Array.from({ length: 24 }, (_, hour) => hour);

/**
 * PRD 8 — every notification category can be turned off on its own, and an
 * app with all of them off is still a fully working app. Nothing here nags
 * about a category being off, and there is no "turn these back on" prompt.
 */
export function Settings() {
  const { t, locale, setLocale } = useLocale();
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();
  const { patient, reload } = useAccount();
  const navigate = useNavigate();

  const timezone = patient?.timezone ?? DEFAULT_TIMEZONE;
  const [settings, setSettings] = useState<NotificationSettings>(
    patient?.notifications ?? DEFAULT_NOTIFICATION_SETTINGS,
  );
  const [hour, setHour] = useState(patient?.checkinHour ?? 20);
  /** Art. 15 / Art. 17. One at a time, so neither can be started twice. */
  const [busy, setBusy] = useState<'export' | 'delete' | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>(() =>
    typeof Notification === 'undefined' ? 'unsupported' : Notification.permission,
  );
  const [isClinician, setIsClinician] = useState(false);
  const [share, setShare] = useState<ShareSettings>(patient?.share ?? DEFAULT_SHARE_SETTINGS);

  const [supports, setSupports] = useState(false);

  useEffect(() => {
    if (!user) return;
    void isVerifiedClinician(user.uid).then(setIsClinician);
    void readMemberships(user.uid)
      .then((all) => setSupports(all.some((m) => m.role === 'supporter')))
      .catch(() => setSupports(false));
  }, [user]);

  useEffect(() => {
    if (patient?.notifications) setSettings(patient.notifications);
    if (patient?.checkinHour !== undefined) setHour(patient.checkinHour);
    if (patient?.share) setShare(patient.share);
  }, [patient?.notifications, patient?.checkinHour, patient?.share]);

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
    setMessage(null);
    if (user) {
      void saveNotificationSettings(user.uid, next)
        .then(reload)
        .catch((error: unknown) => {
          reportError('saveNotificationSettings', error);
          setMessage(t(messageKeyFor(error)));
        });
    }
  };

  const changeHour = (next: number) => {
    setHour(next);
    setMessage(null);
    if (user) {
      void saveReminderHour(user.uid, next)
        .then(reload)
        .catch((error: unknown) => {
          reportError('saveReminderHour', error);
          setMessage(t(messageKeyFor(error)));
        });
    }
  };

  return (
    <Screen title={t('settingsTitle')}>
      {/* One region for every write on this long screen — present even when
          empty, so a screen reader has it before a message from any section
          lands. Near the top rather than beside whichever control was used,
          because this page has too many sections for the message to always
          land near what triggered it. */}
      <p className={styles.note} role="status" aria-live="polite">
        {message}
      </p>

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
          {/* Findable at any time, not only during onboarding. A person who
              had no psychiatrist when they signed up and has one now looks
              here or on the medication screen, which is why it is in both. */}
          <Button variant="quiet" onClick={() => navigate('/dokter')}>
            {t('findTitle')}
          </Button>
        </div>
      </section>

      {/* The early-warning-signs plan. Here rather than on Today, because it
          is a thing written once and re-read, not a daily prompt — and a
          reminder every evening of how relapse starts is not a nudge. */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>{t('planTitle')}</h2>
        <p className={styles.note}>{t('planIntro')}</p>
        <div className={styles.row}>
          <Button variant="quiet" onClick={() => navigate('/plan')}>
            {t('planLink')}
          </Button>
        </div>
      </section>

      {/* Only for someone who actually supports another person, which most
          people using this app do not. */}
      {supports ? (
        <>
          <Hairline />
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>{t('followingTitle')}</h2>
            <div className={styles.row}>
              <Button variant="quiet" onClick={() => navigate('/following')}>
                {t('followingOpen')}
              </Button>
            </div>
          </section>
        </>
      ) : null}

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

      {/* Not a notification setting, but it answers the question the person
          is already asking on this screen: what leaves this app and reaches
          another human. Doses are never shared whatever this says. */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>{t('settingsSharing')}</h2>
        <div className={styles.items}>
          <Choice
            label={t('shareCompletionsLabel')}
            explanation={t('shareCompletionsExplanation')}
            checked={share.shareCompletions}
            onChange={(checked) => {
              const next = { shareCompletions: checked };
              setShare(next);
              setMessage(null);
              if (user) {
                void saveShareSettings(user.uid, next)
                  .then(reload)
                  .catch((error: unknown) => {
                    reportError('saveShareSettings', error);
                    setMessage(t(messageKeyFor(error)));
                  });
              }
            }}
          />
        </div>
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

      <Hairline />

      {/* BRAND 3.2 — dark is what opens, and `prefers-color-scheme` does not
          override it, because the app is used at 03:00 by somebody whose
          sleep is disrupted. Light is a choice a person makes here, and once
          made it is remembered. The palette and its contrast floors have
          existed since Phase 0; this is the switch that was missing. */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>{t('settingsTheme')}</h2>
        <p className={styles.note}>{t('settingsThemeIntro')}</p>
        <div className={styles.row}>
          <Button variant="quiet" onClick={toggleTheme}>
            {t(theme === 'dark' ? 'themeLight' : 'themeDark')}
          </Button>
        </div>
      </section>

      <Hairline />

      {/*
        GDPR Art. 15 and Art. 17, and both run on this device — the report set
        that precedent (D16) and Article 9 data is better off not making the
        trip to a server that would have to exist first.

        Deliberately the last section on the screen and drawn as quietly as
        everything else. Nothing here is styled as a warning: red is not in
        this palette, and a person deciding to take their data and go is
        making an ordinary choice, not a dangerous one. The only friction is
        the confirmation, because the copy already says weg is weg.
      */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>{t('settingsData')}</h2>
        <p className={styles.note}>{t('settingsDataIntro')}</p>

        <div className={styles.items}>
          <div>
            <Button
              variant="quiet"
              disabled={busy !== null}
              onClick={() => {
                if (!user) return;
                setBusy('export');
                setMessage(null);
                void exportEverything(user.uid)
                  .then((payload) => {
                    const url = URL.createObjectURL(
                      new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }),
                    );
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = exportFilename(patient?.displayName ?? 'export', new Date());
                    link.click();
                    URL.revokeObjectURL(url);
                  })
                  .catch((error: unknown) => {
                    reportError('exportEverything', error);
                    setMessage(t('genericError'));
                  })
                  .finally(() => setBusy(null));
              }}
            >
              {busy === 'export' ? t('settingsExporting') : t('settingsExport')}
            </Button>
            <p className={styles.note}>{t('settingsExportExplanation')}</p>
          </div>

          <div>
            {confirmingDelete ? (
              <>
                <p className={styles.note}>{t('settingsDeleteConfirm')}</p>
                <p className={styles.note}>{t('dataDeletion')}</p>
                <div className={styles.row}>
                  <Button
                    variant="quiet"
                    disabled={busy !== null}
                    onClick={() => {
                      if (!user) return;
                      setBusy('delete');
                      setMessage(null);
                      void eraseEverything(user.uid)
                        .then(() => navigate('/'))
                        .catch((error: unknown) => {
                          reportError('eraseEverything', error);
                          /*
                           * The data is already gone by the time this can
                           * fail — only the sign-in itself is left, and
                           * Firebase refuses that when the session is old.
                           * Saying so beats a generic failure that reads as
                           * "nothing happened".
                           */
                          const code = (error as { code?: string })?.code;
                          setMessage(
                            code === 'auth/requires-recent-login'
                              ? t('settingsDeleteSignInAgain')
                              : t('genericError'),
                          );
                        })
                        .finally(() => setBusy(null));
                    }}
                  >
                    {busy === 'delete' ? t('settingsDeleting') : t('settingsDeleteConfirmAction')}
                  </Button>
                  <Button
                    variant="quiet"
                    disabled={busy !== null}
                    onClick={() => setConfirmingDelete(false)}
                  >
                    {t('settingsDeleteCancel')}
                  </Button>
                </div>
              </>
            ) : (
              <>
                <Button
                  variant="quiet"
                  disabled={busy !== null}
                  onClick={() => setConfirmingDelete(true)}
                >
                  {t('settingsDelete')}
                </Button>
                <p className={styles.note}>{t('settingsDeleteExplanation')}</p>
              </>
            )}
          </div>
        </div>
      </section>
    </Screen>
  );
}
