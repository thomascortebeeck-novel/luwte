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
 * nothing from Firestore — it is rendered completely unconditionally: no
 * conditional, no early return, no dependency on `contacts`, `user` or any
 * loading state sits above it. That guarantee was never about where the list
 * sits in the DOM (see the comment on the personal section below for why it
 * now renders first). `contacts` starts at `[]`; the effect that fills it
 * also clears it on sign-out and otherwise only replaces it wholesale on
 * success, so a slow, refused or absent read leaves the national list exactly
 * as it is today — which is why the failure is caught and silenced rather
 * than surfaced. An error message on the crisis screen would help nobody.
 */
export function Crisis() {
  const { t } = useLocale();
  const { user } = useAuth();
  const [contacts, setContacts] = useState<PersonalContact[]>([]);

  useEffect(() => {
    // Firebase Auth broadcasts sign-out across every tab of the same origin
    // (AuthProvider), and /crisis is deliberately outside <Gate> (App.tsx) —
    // reachable with nobody signed in, and nothing redirects it or unmounts
    // it when a session ends. So an already-mounted Crisis has to clear
    // `contacts` itself; leaving it would show the previous person's crisis
    // contacts to whoever is holding the phone next.
    if (!user) {
      setContacts([]);
      return;
    }
    // Guards against a slower read for a *previous* user resolving after a
    // newer one already has — without it, a quick user switch could let a
    // stale result land last and overwrite the current person's contacts
    // with someone else's. Set on cleanup, checked before either branch
    // below is allowed to write state.
    let ignore = false;
    void readPlan(user.uid)
      .then((entries) => {
        if (!ignore) setContacts(personalContacts(entries));
      })
      .catch(() => {
        if (!ignore) setContacts([]);
      });
    return () => {
      ignore = true;
    };
  }, [user]);

  return (
    <Screen title={t('crisisTitle')}>
      {contacts.length > 0 ? (
        // Stanley and Brown put somebody who knows you before a service, so
        // this section now renders first in the DOM too, matching what it
        // has always looked like on screen. CSS `order` moves nothing for a
        // keyboard or a screen reader — both follow the DOM — so the old
        // `order: -1` left a sighted keyboard user's first Tab landing
        // somewhere a sighted mouse user never looked first (WCAG 2.4.3).
        // The national `<ul>` below stays completely unconditional
        // regardless of this reorder — that guarantee was always about
        // nothing gating it, never about its position in the source.
        //
        // Accepted trade-off, not solved here: because this section now
        // comes first, contacts appearing after a successful read push the
        // already-visible, already-tappable national numbers downward,
        // under the thumb of someone reaching for them. No skeleton, no
        // reserved gap, no spinner — every alternative is worse. A permanent
        // empty gap fights "immediate" on the one screen that must be, and
        // putting personal contacts below the national ones would
        // contradict the protocol order this feature exists to honour. In
        // the case that matters — the app has been opened before —
        // Firestore's offline cache serves this read in milliseconds; on a
        // genuinely cold start there are no contacts yet to insert, so
        // nothing shifts at all.
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
