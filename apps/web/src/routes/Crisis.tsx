import { CRISIS_SERVICES, personalContacts, type PersonalContact } from '@luwte/core';
import { Screen } from '@luwte/ui';
import { useEffect, useState } from 'react';
import { readPlan } from '../firebase/plan';
import { useAuth } from '../providers/AuthProvider';
import { useLocale } from '../providers/LocaleProvider';
import styles from './Crisis.module.css';

/**
 * PRD 6.8 — reachable from settings, from the check-in flow, and shown once
 * automatically on a top-of-scale hopelessness answer. Never behind more than
 * one tap. Works offline.
 *
 * The national list below holds no state, makes no network call and reads
 * nothing from Firestore — it is rendered unconditionally, first in this
 * component's body, so there is no failure mode in which it is unavailable.
 * `contacts` starts at `[]` and the effect that fills it is additive only: a
 * slow, refused or absent read leaves the screen exactly as it is today,
 * which is why the failure is caught and silenced rather than surfaced. An
 * error message on the crisis screen would help nobody.
 */
export function Crisis() {
  const { t } = useLocale();
  const { user } = useAuth();
  const [contacts, setContacts] = useState<PersonalContact[]>([]);

  useEffect(() => {
    if (!user) return;
    void readPlan(user.uid)
      .then((entries) => setContacts(personalContacts(entries)))
      .catch(() => setContacts([]));
  }, [user]);

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

      {contacts.length > 0 ? (
        // Stanley and Brown put somebody who knows you before a service —
        // `order: -1` (Crisis.module.css) places this section above the
        // national list visually, without moving it earlier in the DOM. The
        // national list's unconditional lead in the source above is what the
        // "must not regress" requirement actually depends on; this is only
        // ever additive on top of it.
        <section className={styles.personal} aria-labelledby="crisis-personal-title">
          <h2 className={styles.personalTitle} id="crisis-personal-title">
            {t('crisisYourPeople')}
          </h2>
          <ul className={styles.list}>
            {contacts.map((contact) => (
              <li key={`${contact.name}-${contact.dial}`}>
                <a className={styles.row} href={contact.dial}>
                  <span className={styles.name}>{contact.name}</span>
                  <span className={styles.number}>{contact.display}</span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </Screen>
  );
}
