import {
  DEFAULT_TIMEZONE,
  dateKey,
  doseTimeSchema,
  isPrescribed,
  type Medication,
} from '@luwte/core';
import { Button, Field, Hairline, Screen } from '@luwte/ui';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { readMemberships, type Membership } from '../firebase/circle';
import {
  createMedication,
  readActiveMedications,
  updateMedication,
  type MedicationRecord,
} from '../firebase/medication';
import { PatientOverview } from './PatientOverview';
import { useAuth } from '../providers/AuthProvider';
import { useLocale } from '../providers/LocaleProvider';
import styles from './Console.module.css';

/**
 * PRD 6.7 — one patient, as their psychiatrist sees them.
 *
 * The overview is the same component the person sees themselves, because the
 * point of the product is that both are looking at one picture.
 *
 * The medication editor is the only place in luwte where one person writes
 * something about another, and it is fenced accordingly: the rules refuse it
 * unless the admin verified this clinician, the patient invited them *as* a
 * clinician, and the patient granted medication. Whether a dose was taken
 * stays the patient's own record and cannot be written here at all.
 */
export function ConsolePatient() {
  const { t } = useLocale();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { patientId = '' } = useParams();

  const [membership, setMembership] = useState<Membership | null | 'missing'>(null);
  const [medications, setMedications] = useState<MedicationRecord[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState({ name: '', dose: '', times: '', purpose: '' });
  const [busy, setBusy] = useState(false);

  const today = useMemo(() => dateKey(new Date(), DEFAULT_TIMEZONE), []);

  useEffect(() => {
    if (!user || !patientId) return;
    void readMemberships(user.uid)
      .then((all) => setMembership(all.find((m) => m.patientId === patientId) ?? 'missing'))
      .catch(() => setMembership('missing'));
  }, [user, patientId]);

  const canPrescribe = membership !== null && membership !== 'missing' && membership.permissions.medication;

  const loadMedications = () => {
    if (!canPrescribe) return;
    void readActiveMedications(patientId)
      .then(setMedications)
      .catch(() => setMedications([]));
  };

  useEffect(loadMedications, [patientId, canPrescribe]);

  if (membership === null) return <Screen>{null}</Screen>;

  // Access ended, or never existed. Nothing to explain and nothing to show.
  if (membership === 'missing') {
    return (
      <Screen title={t('consoleTitle')}>
        <p className={styles.empty}>{t('consoleNothingShared')}</p>
        <Button variant="quiet" onClick={() => navigate('/console')}>
          {t('navBack')}
        </Button>
      </Screen>
    );
  }

  const parsedTimes = draft.times
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  const timesValid =
    parsedTimes.length > 0 && parsedTimes.every((time) => doseTimeSchema.safeParse(time).success);

  const canSave =
    draft.name.trim().length > 0 && draft.dose.trim().length > 0 && timesValid && !busy;

  const startEditing = (medication: MedicationRecord | null) => {
    setEditing(medication?.id ?? 'new');
    setDraft({
      name: medication?.name ?? '',
      dose: medication?.dose ?? '',
      times: (medication?.times ?? ['08:00']).join(', '),
      purpose: medication?.purpose ?? '',
    });
  };

  const save = async () => {
    if (!user || !canSave) return;
    setBusy(true);
    try {
      const values = {
        name: draft.name.trim(),
        dose: draft.dose.trim(),
        times: parsedTimes,
        purpose: draft.purpose.trim(),
      };

      if (editing === 'new') {
        await createMedication(patientId, values as Omit<Medication, 'activeFrom' | 'activeTo' | 'prescribedBy'>, user.uid);
      } else {
        const before = medications.find((m) => m.id === editing);
        if (!before) return;
        // Taking over a line the patient wrote is the same write as editing
        // one already in this clinician's name: the entry becomes theirs and
        // the change is logged either way.
        await updateMedication(patientId, before.id, before, values, user.uid, user.uid);
      }

      setEditing(null);
      loadMedications();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen
      title={membership.patientName || t('consoleNoName')}
      action={
        editing ? (
          <>
            <Button full disabled={!canSave} onClick={() => void save()}>
              {t('consoleSaveChange')}
            </Button>
            <Button variant="quiet" onClick={() => setEditing(null)}>
              {t('navBack')}
            </Button>
          </>
        ) : (
          <Button variant="quiet" onClick={() => navigate('/console')}>
            {t('navBack')}
          </Button>
        )
      }
    >
      {editing ? (
        <>
          <Field
            label={t('medicationName')}
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          />
          <Field
            label={t('medicationDose')}
            value={draft.dose}
            onChange={(e) => setDraft({ ...draft, dose: e.target.value })}
          />
          <Field
            label={t('medicationTimes')}
            value={draft.times}
            invalid={draft.times.length > 0 && !timesValid}
            onChange={(e) => setDraft({ ...draft, times: e.target.value })}
          />
          <Field
            label={t('medicationPurpose')}
            message={t('medicationPurposeHint')}
            value={draft.purpose}
            onChange={(e) => setDraft({ ...draft, purpose: e.target.value })}
          />
        </>
      ) : (
        <>
          <PatientOverview
            uid={patientId}
            today={today}
            showCheckins={membership.permissions.checkins}
            showMedication={membership.permissions.medication}
          />

          {canPrescribe ? (
            <>
              <Hairline />
              <h2 className={styles.sectionTitle}>{t('consoleMedicationTitle')}</h2>

              <ul className={styles.list}>
                {medications.map((medication) => (
                  <li key={medication.id} className={styles.item}>
                    <span className={styles.name}>
                      {medication.name} {medication.dose}
                    </span>
                    <span className={styles.quiet}>{medication.times.join(' · ')}</span>
                    <span className={styles.quiet}>
                      {t(
                        isPrescribed(medication)
                          ? 'consoleMedicationMine'
                          : 'consoleMedicationOwn',
                      )}
                    </span>
                    <Button variant="quiet" onClick={() => startEditing(medication)}>
                      {t(isPrescribed(medication) ? 'circleChange' : 'consoleTakeOver')}
                    </Button>
                    <Hairline />
                  </li>
                ))}
              </ul>

              <Button variant="quiet" onClick={() => startEditing(null)}>
                {t('medicationAdd')}
              </Button>
            </>
          ) : null}
        </>
      )}
    </Screen>
  );
}
