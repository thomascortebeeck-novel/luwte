import { DEFAULT_CLINICIAN_PERMISSIONS, type CopyKey } from '@luwte/core';
import { Button, Field, Hairline, Screen } from '@luwte/ui';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { messageKeyFor, reportError } from '../errors';
import { createInvite } from '../firebase/circle';
import {
  connectClinician,
  readClinicianByCode,
  searchClinicians,
  type DirectoryRecord,
} from '../firebase/clinician';
import { useAccount } from '../providers/AccountProvider';
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
 * The patient adding their doctor. Two ways in, and the difference between
 * them is who consented to what.
 *
 * **A code connects immediately.** The doctor handed it over — that act *is*
 * their agreement — so the patient's write grants and it is done. This needed
 * no new access path at all, because the patient always writes their own
 * circle: the code merely names who.
 *
 * **A name has to be asked.** Nobody handed anything over; the person searched
 * and found a nameplate. So it issues an invite addressed to that clinician,
 * and nothing exists until they accept it in their own console. The patient
 * still authored the grant and still chose what it carries — the doctor
 * accepting is consent, not escalation.
 *
 * Searching can only ever cover clinicians already on luwte: RIZIV publishes a
 * web form, not an API, so there is no national lookup to make. The hint says
 * that outright rather than letting a person conclude the app is broken.
 */
export function FindClinician() {
  const { t } = useLocale();
  const { user } = useAuth();
  const { patient } = useAccount();
  const navigate = useNavigate();

  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [results, setResults] = useState<DirectoryRecord[] | null>(null);
  /** How this person was found, which decides whether we connect or ask. */
  const [found, setFound] = useState<{ entry: DirectoryRecord; byCode: boolean } | null>(null);
  const [missing, setMissing] = useState(false);
  const [relation, setRelation] = useState('');
  const [done, setDone] = useState<'added' | 'asked' | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const look = async () => {
    if (busy || code.trim().length === 0) return;
    setBusy(true);
    setMissing(false);
    setMessage(null);
    try {
      const entry = await readClinicianByCode(code);
      setFound(entry ? { entry, byCode: true } : null);
      setMissing(entry === null);
    } finally {
      setBusy(false);
    }
  };

  const search = async () => {
    if (busy || name.trim().length === 0) return;
    setBusy(true);
    try {
      setResults(await searchClinicians(name));
    } finally {
      setBusy(false);
    }
  };

  const confirm = async () => {
    if (!user || !found || busy) return;
    setBusy(true);
    setMessage(null);
    try {
      if (found.byCode) {
        await connectClinician(user.uid, found.entry, relation.trim());
        setDone('added');
        return;
      }

      /*
       * Addressed to them and to nobody else. The permissions are the same
       * ones a clinician invite always carries, chosen here rather than by the
       * person accepting — which is the whole reason this is an invite and not
       * a request the doctor gets to fill in.
       */
      await createInvite(user.uid, {
        role: 'clinician',
        permissions: { ...DEFAULT_CLINICIAN_PERMISSIONS },
        relation: relation.trim(),
        // Carried so the person being asked sees who is asking. A clinician
        // cannot read `patients/{pid}` before they are in the circle, and
        // widening that to show one name would hand over rather more.
        patientName: patient?.displayName ?? '',
        forUid: found.entry.uid,
      });
      setDone('asked');
    } catch (error: unknown) {
      reportError(found.byCode ? 'connectClinician' : 'createInvite', error);
      setMessage(t(messageKeyFor(error)));
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
        <p className={styles.intro}>{t(done === 'added' ? 'findDone' : 'findAsked')}</p>
      </Screen>
    );
  }

  /*
   * Confirming before anything is written. The person sees the name, the
   * discipline and where they work, and says whether that is who they meant —
   * the app never decides that for them.
   */
  if (found) {
    return (
      <Screen
        title={t('findConfirm')}
        action={
          <>
            <Button full disabled={busy} onClick={() => void confirm()}>
              {t(found.byCode ? 'findAdd' : 'findAsk')}
            </Button>
            <Button variant="quiet" onClick={() => setFound(null)}>
              {t('navBack')}
            </Button>
          </>
        }
      >
        <p className={styles.name}>{found.entry.displayName}</p>
        <p className={styles.intro}>{t(DISCIPLINE_COPY[found.entry.discipline]!)}</p>
        {found.entry.practice ? <p className={styles.intro}>{found.entry.practice}</p> : null}
        <p className={styles.intro}>
          {t(found.byCode ? 'findWhatTheySee' : 'findAskWhatTheySee')}
        </p>
        <Field
          label={t('findRelation')}
          value={relation}
          onChange={(e) => setRelation(e.target.value)}
        />

        {/* Present even when empty, so a screen reader has the region
            before a message ever lands in it. */}
        <p className={styles.note} role="status" aria-live="polite">
          {message}
        </p>
      </Screen>
    );
  }

  return (
    <Screen
      title={t('findTitle')}
      action={
        <Button variant="quiet" onClick={() => navigate('/circle')}>
          {t('navBack')}
        </Button>
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
      <Button full disabled={busy || code.trim().length === 0} onClick={() => void look()}>
        {t('findLook')}
      </Button>

      <Hairline />

      <h2 className={styles.sectionTitle}>{t('findByName')}</h2>
      <Field
        label={t('findName')}
        message={t('findNameHint')}
        value={name}
        onChange={(e) => {
          setName(e.target.value);
          setResults(null);
        }}
      />
      <Button variant="quiet" disabled={busy || name.trim().length === 0} onClick={() => void search()}>
        {t('findSearch')}
      </Button>

      {/* An empty result is a dead end unless it says what to do next, and
          "there is no national register" is the reason it happens. */}
      {results !== null && results.length === 0 ? (
        <p className={styles.quiet}>{t('findNobody')}</p>
      ) : null}

      {results !== null && results.length > 0 ? (
        <ul className={styles.list}>
          {results.map((entry) => (
            <li key={entry.code} className={styles.item}>
              <span className={styles.name}>{entry.displayName}</span>
              <span className={styles.quiet}>{t(DISCIPLINE_COPY[entry.discipline]!)}</span>
              {entry.practice ? <span className={styles.quiet}>{entry.practice}</span> : null}
              <Button
                variant="quiet"
                onClick={() => {
                  setMessage(null);
                  setFound({ entry, byCode: false });
                }}
              >
                {t('findAsk')}
              </Button>
              <Hairline />
            </li>
          ))}
        </ul>
      ) : null}
    </Screen>
  );
}
