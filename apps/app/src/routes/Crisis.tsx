import { CRISIS_SERVICES } from '@luwte/core';
import { Screen } from '@luwte/ui';
import { useLocale } from '../providers/LocaleProvider';
import styles from './Crisis.module.css';

/**
 * PRD 6.8 — reachable from settings, from the check-in flow, and shown once
 * automatically on a top-of-scale hopelessness answer. Never behind more than
 * one tap. Works offline.
 *
 * It holds no state, makes no network call and reads nothing from Firestore,
 * so there is no failure mode in which this screen is unavailable.
 */
export function Crisis() {
  const { t } = useLocale();

  return (
    <Screen title={t('crisisTitle')}>
      <ul className={styles.list}>
        {CRISIS_SERVICES.map((service) => (
          <li key={service.id}>
            <a className={styles.row} href={service.dial}>
              <span className={styles.name}>{t(service.nameKey)}</span>
              <span className={styles.number}>{service.display}</span>
            </a>
          </li>
        ))}
      </ul>
    </Screen>
  );
}
