import { Button, Hairline, Screen } from '@luwte/ui';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { readMemberships, type Membership } from '../firebase/circle';
import { useAuth } from '../providers/AuthProvider';
import { useLocale } from '../providers/LocaleProvider';
import styles from './Console.module.css';

/**
 * PRD 6.7 — the patients who granted this clinician access, and nobody else.
 *
 * The list is not a search: there is no way to look someone up. A person
 * appears here because they decided so, and disappears the moment they
 * change their mind.
 */
export function Console() {
  const { t } = useLocale();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [patients, setPatients] = useState<Membership[] | null>(null);

  useEffect(() => {
    if (!user) return;
    void readMemberships(user.uid)
      .then((all) => setPatients(all.filter((m) => m.role === 'clinician')))
      .catch(() => setPatients([]));
  }, [user]);

  if (patients === null) return <Screen title={t('consoleTitle')}>{null}</Screen>;

  return (
    <Screen
      title={t('consoleTitle')}
      action={
        <Button variant="quiet" onClick={() => navigate('/')}>
          {t('consoleBackToOwn')}
        </Button>
      }
    >
      {patients.length === 0 ? (
        <p className={styles.empty}>{t('consoleEmpty')}</p>
      ) : (
        <ul className={styles.list}>
          {patients.map((patient) => (
            <li key={patient.patientId} className={styles.item}>
              <span className={styles.name}>{patient.patientName || t('consoleNoName')}</span>
              <Button variant="quiet" onClick={() => navigate(`/console/${patient.patientId}`)}>
                {t('consoleOpen')}
              </Button>
              <Hairline />
            </li>
          ))}
        </ul>
      )}
    </Screen>
  );
}
