import {
  DEFAULT_TIMEZONE,
  PERMISSION_GRANT,
  formatDay,
  dateKey,
  type PermissionKey,
} from '@luwte/core';
import { Button, Hairline, Screen } from '@luwte/ui';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { readPermissionLog, type PermissionChangeRecord } from '../firebase/circle';
import { useAccount } from '../providers/AccountProvider';
import { useAuth } from '../providers/AuthProvider';
import { useLocale } from '../providers/LocaleProvider';
import styles from './Circle.module.css';

/**
 * D29 — what the person gave to whom, and when.
 *
 * The other half of "you are in full control". Control that cannot be looked
 * back at is not control, it is memory — and the decisions most worth being
 * able to check are exactly the ones somebody might make on a bad day.
 *
 * **Only the person sees this**, and it is a list of everyone: a member who
 * could read it would learn what every other member was granted.
 *
 * The entries name the permissions in the *neutral* wording — "welke medicatie
 * er genomen wordt" rather than "kan zien wat jij neemt" — because this is a
 * record of an act, not a description of somebody's access right now. What
 * they can see today is on their own card.
 */
export function PermissionLog() {
  const { t, locale } = useLocale();
  const { user } = useAuth();
  const { patient } = useAccount();
  const navigate = useNavigate();

  const timezone = patient?.timezone ?? DEFAULT_TIMEZONE;
  const [entries, setEntries] = useState<PermissionChangeRecord[] | null>(null);

  useEffect(() => {
    if (!user) return;
    void readPermissionLog(user.uid)
      .then(setEntries)
      .catch(() => setEntries([]));
  }, [user]);

  const named = (keys: PermissionKey[]) => keys.map((key) => t(PERMISSION_GRANT[key])).join(', ');

  return (
    <Screen
      title={t('permLogTitle')}
      action={
        <Button variant="quiet" onClick={() => navigate('/circle')}>
          {t('navBack')}
        </Button>
      }
    >
      <p className={styles.quiet}>{t('permLogIntro')}</p>

      {entries === null ? null : entries.length === 0 ? (
        <p className={styles.quiet}>{t('permLogEmpty')}</p>
      ) : (
        <ul className={styles.items}>
          {entries.map((entry) => (
            <li key={entry.id} className={styles.item}>
              <span className={styles.quiet}>
                {formatDay(dateKey(entry.at, timezone), locale)}
              </span>
              <span className={styles.name}>{entry.relation || t('circleRoleSupporter')}</span>
              {entry.granted.length > 0 ? (
                <span className={styles.quiet}>
                  {t('permLogGave')}: {named(entry.granted)}
                </span>
              ) : null}
              {entry.withdrawn.length > 0 ? (
                <span className={styles.quiet}>
                  {t('permLogTook')}: {named(entry.withdrawn)}
                </span>
              ) : null}
              <Hairline />
            </li>
          ))}
        </ul>
      )}
    </Screen>
  );
}
