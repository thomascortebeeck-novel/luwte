import {
  OPTIONAL_PRACTICES,
  doseId,
  type DoseAnnotation,
  type DoseStatus,
} from '@luwte/core';
import type { ActivityRecord } from '../firebase/activities';
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
  annotations,
  dateKey,
  onToggle,
  onAnnotate,
}: {
  medications: MedicationRecord[];
  statuses: Record<string, DoseStatus>;
  annotations: Record<string, DoseAnnotation>;
  dateKey: string;
  onToggle: (medId: string, time: string, next: DoseStatus) => void;
  onAnnotate: (doseKey: string, label: string) => void;
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
            const said = annotations[id];
            return (
              <div key={id}>
                <button
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

                {/*
                 * Only once it is ticked, and never in the way of the tick.
                 * Taking a dose has to stay one tap — this is the answer to a
                 * question the app could not ask before ("what did you
                 * actually take"), not a second thing to get through.
                 */}
                {taken ? (
                  <button
                    type="button"
                    className={styles.doseNote}
                    onClick={() => onAnnotate(id, `${medication.name} ${medication.dose}`)}
                  >
                    {said?.actualDose
                      ? said.actualDose
                      : said?.note
                        ? t('doseNoteSaid')
                        : t('doseNoteAsk')}
                  </button>
                ) : null}
              </div>
            );
          }),
        )
      )}
    </section>
  );
}

/**
 * PRD 6.2 — what was planned for today, by start time.
 *
 * A completed item greys and **stays where it is**. It does not disappear and
 * it does not move, because motion on completion reads as reward mechanics,
 * and this is not a to-do app.
 *
 * Nothing here counts anything. There is no "2 of 3", no bar, and a day with
 * nothing ticked says only that nothing is ticked.
 */
export function ActivitiesSection({
  activities,
  completed,
  onToggle,
}: {
  activities: ActivityRecord[];
  completed: Record<string, boolean>;
  onToggle: (activity: ActivityRecord, done: boolean) => void;
}) {
  const { t } = useLocale();

  if (activities.length === 0) return null;

  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>{t('calendarTitle')}</h2>
      {activities.map((activity) => {
        const done = completed[activity.id] === true;
        return (
          <button
            key={activity.id}
            type="button"
            className={styles.dose}
            data-taken={done || undefined}
            aria-pressed={done}
            onClick={() => onToggle(activity, !done)}
          >
            <span className={styles.time}>{activity.startTime || '—'}</span>
            <span className={styles.doseText}>
              <span>{activity.title}</span>
              {activity.withPerson ? (
                <span className={styles.purpose}>{activity.withPerson}</span>
              ) : null}
            </span>
            <span className={styles.mark} aria-hidden="true" />
          </button>
        );
      })}
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
