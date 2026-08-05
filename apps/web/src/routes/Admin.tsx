import { competencyCode, type CopyKey } from '@luwte/core';
import { Button, Hairline, Screen } from '@luwte/ui';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { decideRequest, isAdmin, readRequests, type RequestRecord } from '../firebase/clinician';
import { useAuth } from '../providers/AuthProvider';
import { useLocale } from '../providers/LocaleProvider';
import styles from './Console.module.css';

const DISCIPLINE_COPY: Record<string, CopyKey> = {
  psychiater: 'disciplinePsychiater',
  huisarts: 'disciplineHuisarts',
  psycholoog: 'disciplinePsycholoog',
  verpleegkundige: 'disciplineVerpleegkundige',
  andere: 'disciplineAndere',
};

/**
 * PRD 6.7 — the manual check, made in the app rather than by running a script
 * (D27, Thomas 2026-08-05).
 *
 * This is the only screen that writes `clinicians/`, and it is the one place
 * in luwte where a person is granted the ability to write something clinical
 * about somebody else. The panel deliberately shows the RIZIV number and says
 * to check it: approving is a judgement, not a button.
 *
 * Being able to open this screen grants nothing. `admins/{uid}` is written
 * only with the Admin SDK, and the rules refuse every write here to anyone
 * else — so a tampered client sees a list it cannot act on.
 */
export function Admin() {
  const { t } = useLocale();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [requests, setRequests] = useState<RequestRecord[]>([]);
  const [busy, setBusy] = useState(false);

  const load = () => {
    void readRequests()
      .then(setRequests)
      .catch(() => setRequests([]));
  };

  useEffect(() => {
    if (!user) return;
    void isAdmin(user.uid).then((yes) => {
      setAllowed(yes);
      if (yes) load();
    });
  }, [user]);

  const decide = async (request: RequestRecord, approve: boolean) => {
    if (!user || busy) return;
    setBusy(true);
    try {
      await decideRequest(request, user.uid, approve);
      load();
    } finally {
      setBusy(false);
    }
  };

  if (allowed === null) return <Screen title={t('adminTitle')}>{null}</Screen>;
  if (!allowed) return <Screen title={t('adminTitle')}>{null}</Screen>;

  const waiting = requests.filter((request) => request.outcome === null);

  return (
    <Screen
      title={t('adminTitle')}
      action={
        <Button variant="quiet" onClick={() => navigate('/')}>
          {t('navToday')}
        </Button>
      }
    >
      {waiting.length === 0 ? (
        <p className={styles.empty}>{t('adminEmpty')}</p>
      ) : (
        <>
          <p className={styles.empty}>{t('adminCheckFirst')}</p>
          <ul className={styles.list}>
            {waiting.map((request) => (
              <li key={request.uid} className={styles.item}>
                <span className={styles.name}>{request.displayName}</span>
                <span className={styles.empty}>{t(DISCIPLINE_COPY[request.discipline]!)}</span>
                {/* Shown in full, with the competency code called out: the
                    last three digits are what say psychiatrist rather than
                    doctor, and that is the thing being checked. */}
                <span className={styles.empty}>
                  {request.rizivNumber} · {competencyCode(request.rizivNumber) ?? '—'}
                </span>
                {request.practice ? <span className={styles.empty}>{request.practice}</span> : null}
                <Button variant="quiet" disabled={busy} onClick={() => void decide(request, true)}>
                  {t('adminApprove')}
                </Button>
                <Button variant="quiet" disabled={busy} onClick={() => void decide(request, false)}>
                  {t('adminDecline')}
                </Button>
                <Hairline />
              </li>
            ))}
          </ul>
        </>
      )}
    </Screen>
  );
}
