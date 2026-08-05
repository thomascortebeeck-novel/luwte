import type { CopyKey } from '@luwte/core';
import { Button, Field, Screen } from '@luwte/ui';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import {
  connectClinician,
  readClinicianByCode,
  type DirectoryRecord,
} from '../firebase/clinician';
import { useAuth } from '../providers/AuthProvider';
import { useLocale } from '../providers/LocaleProvider';
import styles from './Circle.module.css';

const DISCIPLINE_COPY: Record<string, CopyKey> = {
  psychiater: 'disciplinePsychiater',
  huisarts: 'disciplineHuisarts',
  psycholoog: 'disciplinePsycholoog',
  verpleegkundige: 'disciplineVerpleegkundige',
  andere: 'disciplineAndere',
};

/**
 * The patient adding their doctor from a code.
 *
 * This is the flow Thomas described as the normal one in future — the doctor
 * hands over a card or a link — and it needed **no new access path at all**,
 * because the patient always writes their own circle. The code names the
 * clinician; the patient's write is what grants.
 *
 * There is deliberately no lookup by anything but the code here. Searching by
 * name can only ever cover clinicians who already use luwte — RIZIV publishes
 * a web form, not an API — and a search that quietly returns nothing reads as
 * a broken app. A code either resolves or plainly does not.
 */
export function FindClinician() {
  const { t } = useLocale();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [code, setCode] = useState('');
  const [found, setFound] = useState<DirectoryRecord | null>(null);
  const [missing, setMissing] = useState(false);
  const [relation, setRelation] = useState('');
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const look = async () => {
    if (busy || code.trim().length === 0) return;
    setBusy(true);
    setMissing(false);
    try {
      const entry = await readClinicianByCode(code);
      setFound(entry);
      setMissing(entry === null);
    } finally {
      setBusy(false);
    }
  };

  const add = async () => {
    if (!user || !found || busy) return;
    setBusy(true);
    try {
      await connectClinician(user.uid, found, relation.trim());
      setDone(true);
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <Screen
        title={t('findTitle')}
        action={
          <Button full onClick={() => navigate('/circle')}>
            {t('navBack')}
          </Button>
        }
      >
        <p className={styles.intro}>{t('findDone')}</p>
      </Screen>
    );
  }

  /*
   * Confirming before writing. The person sees the name, the discipline and
   * where they work, and says whether that is who they meant — the app never
   * decides that for them.
   */
  if (found) {
    return (
      <Screen
        title={t('findConfirm')}
        action={
          <>
            <Button full disabled={busy} onClick={() => void add()}>
              {t('findAdd')}
            </Button>
            <Button variant="quiet" onClick={() => setFound(null)}>
              {t('navBack')}
            </Button>
          </>
        }
      >
        <p className={styles.name}>{found.displayName}</p>
        <p className={styles.intro}>{t(DISCIPLINE_COPY[found.discipline]!)}</p>
        {found.practice ? <p className={styles.intro}>{found.practice}</p> : null}
        <p className={styles.intro}>{t('findWhatTheySee')}</p>
        <Field
          label={t('findRelation')}
          value={relation}
          onChange={(e) => setRelation(e.target.value)}
        />
      </Screen>
    );
  }

  return (
    <Screen
      title={t('findTitle')}
      action={
        <>
          <Button full disabled={busy || code.trim().length === 0} onClick={() => void look()}>
            {t('findLook')}
          </Button>
          <Button variant="quiet" onClick={() => navigate('/circle')}>
            {t('navBack')}
          </Button>
        </>
      }
    >
      <p className={styles.intro}>{t('findIntro')}</p>
      <Field
        label={t('findCode')}
        value={code}
        invalid={missing}
        message={missing ? t('findUnknown') : undefined}
        onChange={(e) => {
          setCode(e.target.value);
          setMissing(false);
        }}
      />
    </Screen>
  );
}
