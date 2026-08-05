import {
  doseTimeSchema,
  isPrescribed,
  prescriberGone,
  type Medication as MedicationModel,
} from '@luwte/core';
import { Button, Choice, Field, Hairline, Screen } from '@luwte/ui';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { readCircle, type CircleMemberRecord } from '../firebase/circle';
import {
  createMedication,
  proposeMedicationChange,
  readActiveMedications,
  releasePrescription,
  type MedicationRecord,
} from '../firebase/medication';
import { useAuth } from '../providers/AuthProvider';
import { useLocale } from '../providers/LocaleProvider';
import styles from './Medication.module.css';

/**
 * PRD 6.2 / screens 16-17 — the medication list.
 *
 * Patient-entered for now. When the clinician console arrives in Phase 7 the
 * same documents are edited there instead, and `changeLog` — which is written
 * from the very first entry here — is what lets the chart mark a dose change
 * that happened months before any clinician had an account.
 */
export function Medication() {
  const { t } = useLocale();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [medications, setMedications] = useState<MedicationRecord[]>([]);
  /*
   * Read so the screen can tell whether the clinician who owns a line is still
   * there. A prescription outlives the circle entry that authorised it, and a
   * line whose prescriber is gone would otherwise offer "ask for a change" to
   * somebody who can no longer read the request.
   */
  const [circle, setCircle] = useState<CircleMemberRecord[]>([]);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [dose, setDose] = useState('');
  const [times, setTimes] = useState('08:00');
  const [purpose, setPurpose] = useState('');
  const [busy, setBusy] = useState(false);
  const [proposing, setProposing] = useState<MedicationRecord | null>(null);
  const [proposal, setProposal] = useState({ dose: '', note: '', stopping: false });

  const load = () => {
    if (!user) return;
    void readActiveMedications(user.uid)
      .then(setMedications)
      .catch(() => setMedications([]));
    void readCircle(user.uid)
      .then(setCircle)
      .catch(() => setCircle([]));
  };

  useEffect(load, [user]);

  /*
   * Whether anybody is already looking after this list. Revoked members do
   * not count — a psychiatrist who was removed is exactly the person this
   * screen should offer to replace.
   */
  const hasClinician = circle.some(
    (member) => member.role === 'clinician' && member.revokedAt == null,
  );

  const parsedTimes = times
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  const timesValid =
    parsedTimes.length > 0 && parsedTimes.every((time) => doseTimeSchema.safeParse(time).success);

  const canSave = name.trim().length > 0 && dose.trim().length > 0 && timesValid && !busy;

  const save = async () => {
    if (!user || !canSave) return;
    setBusy(true);
    try {
      await createMedication(user.uid, {
        name: name.trim(),
        dose: dose.trim(),
        times: parsedTimes,
        purpose: purpose.trim(),
      } as Omit<MedicationModel, 'activeFrom' | 'activeTo'>);
      setName('');
      setDose('');
      setTimes('08:00');
      setPurpose('');
      setAdding(false);
      load();
    } finally {
      setBusy(false);
    }
  };

  /*
   * Taking a line back. Nothing about the medication itself changes here — the
   * rules refuse a release that also edits, so this hands ownership over and
   * the person changes what they want afterwards, with both steps in the log.
   */
  const release = async (medication: MedicationRecord) => {
    if (!user || busy) return;
    setBusy(true);
    try {
      await releasePrescription(user.uid, medication);
      load();
    } finally {
      setBusy(false);
    }
  };

  const sendProposal = async () => {
    if (!user || !proposing || busy) return;
    setBusy(true);
    try {
      await proposeMedicationChange(user.uid, proposing.id, {
        ...(proposal.dose.trim() ? { dose: proposal.dose.trim() } : {}),
        ...(proposal.stopping ? { stopping: true } : {}),
        ...(proposal.note.trim() ? { note: proposal.note.trim() } : {}),
      });
      setProposal({ dose: '', note: '', stopping: false });
      setProposing(null);
      load();
    } finally {
      setBusy(false);
    }
  };

  if (proposing) {
    const canSend =
      (proposal.dose.trim().length > 0 || proposal.stopping || proposal.note.trim().length > 0) &&
      !busy;

    return (
      <Screen
        title={proposing.name}
        action={
          <>
            <Button full disabled={!canSend} onClick={() => void sendProposal()}>
              {t('medicationProposeSend')}
            </Button>
            <Button variant="quiet" onClick={() => setProposing(null)}>
              {t('navBack')}
            </Button>
          </>
        }
      >
        <p className={styles.purpose}>{t('medicationProposeIntro')}</p>
        <Field
          label={t('medicationDose')}
          value={proposal.dose}
          onChange={(e) => setProposal({ ...proposal, dose: e.target.value })}
        />
        <Choice
          label={t('medicationStopping')}
          checked={proposal.stopping}
          onChange={(checked) => setProposal({ ...proposal, stopping: checked })}
        />
        <Field
          label={t('medicationProposeNote')}
          message={t('medicationProposeNoteHint')}
          value={proposal.note}
          onChange={(e) => setProposal({ ...proposal, note: e.target.value })}
        />
      </Screen>
    );
  }

  return (
    <Screen
      title={t('medicationSection')}
      action={
        adding ? (
          <Button full disabled={!canSave} onClick={() => void save()}>
            {t('medicationSave')}
          </Button>
        ) : (
          <>
            <Button full onClick={() => setAdding(true)}>
              {t('medicationAdd')}
            </Button>
            {/* Offered where it becomes relevant rather than up front: this
                is the screen a person is looking at when the question "is
                somebody managing these" actually arises. Hidden once there is
                a clinician, so it never reads as a prompt to collect more. */}
            {hasClinician ? null : (
              <Button variant="quiet" onClick={() => navigate('/dokter')}>
                {t('findTitle')}
              </Button>
            )}
            <Button variant="quiet" onClick={() => navigate('/')}>
              {t('navToday')}
            </Button>
          </>
        )
      }
    >
      {adding ? (
        <>
          <Field
            label={t('medicationName')}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Field
            label={t('medicationDose')}
            value={dose}
            onChange={(e) => setDose(e.target.value)}
          />
          <Field
            label={t('medicationTimes')}
            value={times}
            invalid={times.length > 0 && !timesValid}
            onChange={(e) => setTimes(e.target.value)}
          />
          <Field
            label={t('medicationPurpose')}
            message={t('medicationPurposeHint')}
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
          />
        </>
      ) : medications.length === 0 ? (
        <p className={styles.empty}>{t('medicationEmpty')}</p>
      ) : (
        <ul className={styles.list}>
          {medications.map((medication) => (
            <li key={medication.id} className={styles.item}>
              <span className={styles.name}>
                {medication.name} {medication.dose}
              </span>
              <span className={styles.times}>{medication.times.join(' · ')}</span>
              {medication.purpose ? (
                <span className={styles.purpose}>{medication.purpose}</span>
              ) : null}
              {/* Since the console landed, this list can hold lines the person
                  cannot change. Saying who set them is the difference between
                  a rule that reads as care and one that reads as being
                  locked out of your own record.

                  And when that clinician is gone, saying so matters more: the
                  line would otherwise sit there owned by nobody, offering to
                  send a request that nobody can read. */}
              {isPrescribed(medication) ? (
                prescriberGone(medication, circle) ? (
                  <>
                    <span className={styles.purpose}>{t('medicationPrescriberGone')}</span>
                    <Button
                      variant="quiet"
                      disabled={busy}
                      onClick={() => void release(medication)}
                    >
                      {t('medicationRelease')}
                    </Button>
                  </>
                ) : (
                  <>
                    <span className={styles.purpose}>{t('medicationByClinician')}</span>
                    {/* A clinician owns this one, so the person can ask but not
                        change it. Asking is always available — being unable to
                        edit is not the same as having no say. */}
                    {medication.pendingChange ? (
                      <span className={styles.purpose}>{t('medicationProposePending')}</span>
                    ) : (
                      <Button variant="quiet" onClick={() => setProposing(medication)}>
                        {t('medicationPropose')}
                      </Button>
                    )}
                  </>
                )
              ) : null}
              <Hairline />
            </li>
          ))}
        </ul>
      )}
    </Screen>
  );
}
