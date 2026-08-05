import {
  NO_CONSENT,
  consentItemsFor,
  hasRequiredConsent,
  keepsOwnLogbook,
  type ConsentGrants,
} from '@luwte/core';
import { Button, Choice, Screen } from '@luwte/ui';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { recordConsent } from '../firebase/accounts';
import { useAccount } from '../providers/AccountProvider';
import { useAuth } from '../providers/AuthProvider';
import { useLocale } from '../providers/LocaleProvider';
import styles from './Consent.module.css';

/**
 * GDPR Art. 9 explicit consent.
 *
 * Nothing starts ticked. A pre-ticked box is not consent, and this is the one
 * screen where that distinction is legally load-bearing rather than a matter
 * of taste. The required items are marked as required rather than hidden or
 * forced — saying plainly that the app cannot work without them is more
 * honest than offering a choice that is not one.
 */
export function Consent() {
  const { t, locale } = useLocale();
  const { user } = useAuth();
  const { role, reload } = useAccount();
  const navigate = useNavigate();

  const [grants, setGrants] = useState<ConsentGrants>(NO_CONSENT);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  /*
   * A supporter is not consenting to the processing of their own health data —
   * they have none here. What they take on is an obligation about somebody
   * else's, and asking them to tick the Article 9 box instead would both mean
   * nothing and hide the thing that does.
   */
  const items = consentItemsFor(role);
  const complete = hasRequiredConsent(grants, items);

  const accept = async () => {
    if (!user || !complete) return;
    setBusy(true);
    setMessage(null);
    try {
      await recordConsent(user.uid, grants, locale);
      await reload();
      navigate('/');
    } catch {
      setMessage(t('genericError'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen
      title={t('consentTitle')}
      action={
        <>
          <Button full disabled={!complete || busy} onClick={() => void accept()}>
            {t('consentAccept')}
          </Button>
          {!complete ? <p className={styles.note}>{t('consentMissing')}</p> : null}
          {message ? <p className={styles.note}>{message}</p> : null}
        </>
      }
    >
      <p className={styles.intro}>
        {t(keepsOwnLogbook(role) ? 'consentIntro' : 'consentFollowingIntro')}
      </p>

      <div className={styles.items}>
        {items.map((item) => (
          <Choice
            key={item.id}
            label={t(item.labelKey)}
            explanation={t(item.explanationKey)}
            note={item.required ? t('consentRequired') : t('consentOptional')}
            checked={grants[item.id]}
            onChange={(checked) => setGrants((prev) => ({ ...prev, [item.id]: checked }))}
          />
        ))}
      </div>

      <p className={styles.note}>{t('consentWhereToChange')}</p>
    </Screen>
  );
}
