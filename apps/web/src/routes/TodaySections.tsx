import { OPTIONAL_PRACTICES, doseId, type DoseStatus } from '@luwte/core';
import type { MedicationRecord } from '../firebase/medication';
import { useLocale } from '../providers/LocaleProvider';
import styles from './TodaySections.module.css';

/**
 * PRD 6.2 — Today's sections, in order: medication first because it is
 * time-critical, then activities by start time (Phase 5), then optional
 * practices.
 */

export function MedicationSection({
  medications,
  statuses,
  dateKey,
  onToggle,
}: {
  medications: MedicationRecord[];
  statuses: Record<string, DoseStatus>;
  dateKey: string;
  onToggle: (medId: string, time: string, next: DoseStatus) => void;
}) {
  const { t } = useLocale();

  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>{t('medicationSection')}</h2>

      {medications.length === 0 ? (
        <a className={styles.addLink} href="/medication">
          {t('medicationEmpty')}
        </a>
      ) : (
        medications.flatMap((medication) =>
          medication.times.map((time) => {
            const id = doseId(dateKey, medication.id, time);
            const taken = statuses[id] === 'taken';
            return (
              <button
                key={id}
                type="button"
                className={styles.dose}
                data-taken={taken || undefined}
                aria-pressed={taken}
                onClick={() => onToggle(medication.id, time, taken ? 'pending' : 'taken')}
              >
                <span className={styles.time}>{time}</span>
                <span className={styles.doseText}>
                  <span>
                    {medication.name} {medication.dose}
                  </span>
                  {/* PRD 6.2 — a plain-language line on what each is for. */}
                  {medication.purpose ? (
                    <span className={styles.purpose}>{medication.purpose}</span>
                  ) : null}
                </span>
                <span className={styles.mark} aria-hidden="true" />
              </button>
            );
          }),
        )
      )}
    </section>
  );
}

/**
 * PRD 6.2 — offered, and ignoring them costs nothing and is never recorded.
 * They are plain text rather than anything tappable: a checkbox would turn an
 * invitation into a task, and there would then be a state in which the person
 * had failed to do one.
 */
export function PracticesSection() {
  const { t } = useLocale();

  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>{t('practicesTitle')}</h2>
      {OPTIONAL_PRACTICES.map((practice) => (
        <p key={practice.id} className={styles.practice}>
          {t(practice.labelKey)}
        </p>
      ))}
    </section>
  );
}
