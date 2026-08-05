import {
  PERMISSION_GRANT,
  disciplines,
  grantedKeys,
  isPlausibleRiziv,
  type CopyKey,
  type Discipline,
} from '@luwte/core';
import { Button, Field, Hairline, Screen } from '@luwte/ui';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  readAddressedInvites,
  readMemberships,
  redeemInvite,
  type AddressedInvite,
  type Membership,
} from '../firebase/circle';
import {
  applyForVerification,
  isVerifiedClinician,
  readMyDirectoryEntry,
  readMyRequest,
  type DirectoryRecord,
  type RequestRecord,
} from '../firebase/clinician';
import { useAuth } from '../providers/AuthProvider';
import { useLocale } from '../providers/LocaleProvider';
import styles from './Console.module.css';

const DISCIPLINE_COPY: Record<Discipline, CopyKey> = {
  psychiater: 'disciplinePsychiater',
  huisarts: 'disciplineHuisarts',
  psycholoog: 'disciplinePsycholoog',
  verpleegkundige: 'disciplineVerpleegkundige',
  andere: 'disciplineAndere',
};

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
  const [asked, setAsked] = useState<AddressedInvite[]>([]);
  const [verified, setVerified] = useState<boolean | null>(null);
  const [request, setRequest] = useState<RequestRecord | null>(null);
  const [entry, setEntry] = useState<DirectoryRecord | null>(null);
  const [form, setForm] = useState({
    displayName: '',
    discipline: 'psychiater' as Discipline,
    rizivNumber: '',
    practice: '',
  });
  const [busy, setBusy] = useState(false);

  const load = () => {
    if (!user) return;
    void readMemberships(user.uid)
      .then((all) => setPatients(all.filter((m) => m.role === 'clinician')))
      .catch(() => setPatients([]));
    void readAddressedInvites(user.uid)
      .then(setAsked)
      .catch(() => setAsked([]));
    void isVerifiedClinician(user.uid).then(setVerified);
    void readMyRequest(user.uid).then(setRequest);
    void readMyDirectoryEntry(user.uid).then(setEntry);
  };

  useEffect(load, [user]);

  /*
   * Accepting is the same redemption a shared link uses, and deliberately so:
   * one mechanism to keep correct rather than two. What makes this one safe is
   * that the invite names them, so the code alone admits nobody.
   *
   * There is no decline. Doing nothing *is* the decline — the invite expires
   * after a week and the person who asked is told nothing either way, like a
   * declined activity and a declined medication request. A button that
   * reported a refusal would make silence into a message.
   */
  const accept = async (invite: AddressedInvite) => {
    if (!user || busy) return;
    setBusy(true);
    try {
      await redeemInvite(invite.code, user.uid);
      load();
    } finally {
      setBusy(false);
    }
  };

  const canSend =
    form.displayName.trim().length > 0 && isPlausibleRiziv(form.rizivNumber) && !busy;

  const send = async () => {
    if (!user || !canSend) return;
    setBusy(true);
    try {
      await applyForVerification(user.uid, {
        displayName: form.displayName.trim(),
        discipline: form.discipline,
        rizivNumber: form.rizivNumber.trim(),
        practice: form.practice.trim(),
      });
      setRequest(await readMyRequest(user.uid));
    } finally {
      setBusy(false);
    }
  };

  if (patients === null || verified === null) {
    return <Screen title={t('consoleTitle')}>{null}</Screen>;
  }

  /*
   * Not verified yet, so there is nobody to show and no point pretending
   * otherwise. Applying lives here rather than in onboarding: it is the moment
   * it becomes relevant, and onboarding is already four screens for a person
   * who may be unwell — the same argument BRAND 5 makes about reading speed.
   */
  if (!verified) {
    if (request && request.outcome !== 'declined') {
      return (
        <Screen title={t('consoleTitle')}>
          <p className={styles.empty}>{t('verifyPending')}</p>
        </Screen>
      );
    }

    return (
      <Screen
        title={t('verifyTitle')}
        action={
          <Button full disabled={!canSend} onClick={() => void send()}>
            {t('verifySend')}
          </Button>
        }
      >
        <p className={styles.empty}>
          {request?.outcome === 'declined' ? t('verifyDeclined') : t('verifyIntro')}
        </p>
        <Field
          label={t('verifyName')}
          value={form.displayName}
          onChange={(e) => setForm({ ...form, displayName: e.target.value })}
        />
        <label className={styles.empty} htmlFor="discipline">
          {t('verifyDiscipline')}
        </label>
        <select
          id="discipline"
          className={styles.select}
          value={form.discipline}
          onChange={(e) => setForm({ ...form, discipline: e.target.value as Discipline })}
        >
          {disciplines.map((discipline) => (
            <option key={discipline} value={discipline}>
              {t(DISCIPLINE_COPY[discipline])}
            </option>
          ))}
        </select>
        <Field
          label={t('verifyRiziv')}
          message={t('verifyRizivHint')}
          invalid={form.rizivNumber.length > 0 && !isPlausibleRiziv(form.rizivNumber)}
          value={form.rizivNumber}
          onChange={(e) => setForm({ ...form, rizivNumber: e.target.value })}
        />
        <Field
          label={t('verifyPractice')}
          value={form.practice}
          onChange={(e) => setForm({ ...form, practice: e.target.value })}
        />
      </Screen>
    );
  }

  return (
    <Screen
      title={t('consoleTitle')}
      action={
        <Button variant="quiet" onClick={() => navigate('/')}>
          {t('consoleBackToOwn')}
        </Button>
      }
    >
      {/* The code they hand to a patient. Shown here rather than buried in
          settings, because handing it over is the thing they came to do the
          first time they open this screen with nobody on it. */}
      {entry ? (
        <>
          <p className={styles.empty}>{t('myCodeIntro')}</p>
          <p className={styles.name}>{entry.code}</p>
        </>
      ) : null}

      {/* What has been asked, before the list of who already said yes. A
          person waiting on an answer is the only thing here that is not
          already settled. */}
      {asked.length > 0 ? (
        <section>
          <h2 className={styles.sectionTitle}>{t('inboxTitle')}</h2>
          <ul className={styles.list}>
            {asked.map((invite) => (
              <li key={invite.code} className={styles.item}>
                {/* Amber, like a pending change: this is the one place in the
                    console where the patient has reached in. */}
                <div className={styles.pending}>
                  <span className={styles.name}>
                    {invite.patientName || t('consoleNoName')} {t('inboxAsks')}
                  </span>
                  <span className={styles.quiet}>{t('inboxSees')}</span>
                  <ul className={styles.sentences}>
                    {grantedKeys(invite.permissions).map((key) => (
                      <li key={key}>{t(PERMISSION_GRANT[key])}</li>
                    ))}
                  </ul>
                  <Button variant="quiet" disabled={busy} onClick={() => void accept(invite)}>
                    {t('inboxAccept')}
                  </Button>
                </div>
                <Hairline />
              </li>
            ))}
          </ul>
          <p className={styles.empty}>{t('inboxLeave')}</p>
        </section>
      ) : null}

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
