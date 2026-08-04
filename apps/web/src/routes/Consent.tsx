import { CONSENT_ITEMS, hasRequiredConsent, type ConsentGrants } from '@luwte/core';
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
  const { reload } = useAccount();
  const navigate = useNavigate();

  const [grants, setGrants] = useState<ConsentGrants>({
    essential: false,
    healthData: false,
    reminders: false,
  });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const complete = hasRequiredConsent(grants);

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
      <p className={styles.intro}>{t('consentIntro')}</p>

      <div className={styles.items}>
        {CONSENT_ITEMS.map((item) => (
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
