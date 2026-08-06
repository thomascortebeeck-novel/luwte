import {
  PLAN_SECTIONS,
  PLAN_SECTION_COPY,
  entriesInSection,
  type PlanSection,
} from '@luwte/core';
import { Button, Field, Hairline, Screen } from '@luwte/ui';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import {
  addPlanEntry,
  readPlan,
  removePlanEntry,
  updatePlanEntry,
  type PlanEntryRecord,
} from '../firebase/plan';
import { useAuth } from '../providers/AuthProvider';
import { useLocale } from '../providers/LocaleProvider';
import styles from './Plan.module.css';

/**
 * An accessible name that still contains the visible word, so six sections
 * asking near-identical questions — two of them literally both "Wie" — stay
 * tellable apart for somebody who cannot see which heading a field sits
 * under. WCAG 2.5.3 wants the visible label kept rather than replaced, so
 * the section is added after it, never instead of it.
 */
const nameFor = (visible: string, sectionTitle: string) => `${visible} – ${sectionTitle}`;

type PlanRowProps = {
  entry: PlanEntryRecord;
  sectionTitle: string;
  labelLabel: string;
  detailLabel: string;
  onSave: (values: { label: string; detail: string }) => void;
  onRemove: () => void;
};

/** One entry already on the plan: read by default, editable in place. */
function PlanRow({ entry, sectionTitle, labelLabel, detailLabel, onSave, onRemove }: PlanRowProps) {
  const { t } = useLocale();
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(entry.label);
  const [detail, setDetail] = useState(entry.detail);

  /*
   * A section can hold more than one entry, and one of its fields can read
   * the same as the section title itself (`planWarningLabel` and
   * `planWarningTitle` are both "Wat je merkt") — so `sectionTitle` alone
   * does not tell two controls apart, either from each other or from this
   * same section's always-open add form. What the person already wrote is
   * unique to this row and never changes while it is being edited, so it is
   * what names every control on it.
   */
  const rowName = (visible: string) => `${visible} – ${entry.label} – ${sectionTitle}`;

  if (!editing) {
    return (
      <>
        {/* What the person wrote, in their own words — the serif, same as
            the diary. BRAND 3.4: sans is the app talking, serif is a person. */}
        <span className={styles.sign}>{entry.label}</span>
        {entry.detail ? <span className={styles.action}>{entry.detail}</span> : null}
        <Button variant="quiet" aria-label={rowName(t('circleChange'))} onClick={() => setEditing(true)}>
          {t('circleChange')}
        </Button>
      </>
    );
  }

  return (
    <>
      <Field
        label={labelLabel}
        aria-label={rowName(labelLabel)}
        value={label}
        onChange={(e) => setLabel(e.target.value)}
      />
      <Field
        label={detailLabel}
        aria-label={rowName(detailLabel)}
        value={detail}
        onChange={(e) => setDetail(e.target.value)}
      />
      <div className={styles.rowActions}>
        <Button
          disabled={label.trim().length === 0}
          aria-label={rowName(t('planSave'))}
          onClick={() => {
            onSave({ label: label.trim(), detail: detail.trim() });
            setEditing(false);
          }}
        >
          {t('planSave')}
        </Button>
        <Button variant="quiet" aria-label={rowName(t('planRemove'))} onClick={onRemove}>
          {t('planRemove')}
        </Button>
        <Button
          variant="quiet"
          aria-label={rowName(t('navBack'))}
          onClick={() => {
            setLabel(entry.label);
            setDetail(entry.detail);
            setEditing(false);
          }}
        >
          {t('navBack')}
        </Button>
      </div>
    </>
  );
}

type PlanAddProps = {
  sectionTitle: string;
  labelLabel: string;
  detailLabel: string;
  onAdd: (values: { label: string; detail: string }) => void;
};

/** One small, always-open form per section — nothing to navigate to first. */
function PlanAdd({ sectionTitle, labelLabel, detailLabel, onAdd }: PlanAddProps) {
  const { t } = useLocale();
  const [label, setLabel] = useState('');
  const [detail, setDetail] = useState('');

  const add = () => {
    if (label.trim().length === 0) return;
    onAdd({ label: label.trim(), detail: detail.trim() });
    setLabel('');
    setDetail('');
  };

  return (
    <div className={styles.add}>
      <Field
        label={labelLabel}
        aria-label={nameFor(labelLabel, sectionTitle)}
        value={label}
        onChange={(e) => setLabel(e.target.value)}
      />
      <Field
        label={detailLabel}
        aria-label={nameFor(detailLabel, sectionTitle)}
        value={detail}
        onChange={(e) => setDetail(e.target.value)}
      />
      <Button
        disabled={label.trim().length === 0}
        aria-label={nameFor(t('planAdd'), sectionTitle)}
        onClick={add}
      >
        {t('planAdd')}
      </Button>
    </div>
  );
}

/**
 * The safety plan — Stanley & Brown's six steps, on one page.
 *
 * Step 1 (warning signs) was built first; the other five are what the
 * evidence is actually about. **luwte never matches anything against any of
 * it.** No check-in is compared to a sign, no count is kept, nothing is
 * flagged — that would be generating a conclusion about somebody's mental
 * state, clinical monitoring, Class IIa under EU MDR, the line this product
 * does not cross. The plan is held and handed back, like the diary.
 *
 * **The screen stays one page.** Somebody re-reads this on a bad day, and
 * scrolling past five other steps beats navigating to them one at a time.
 * Each section carries its own intro, its own entries and its own small add
 * form, so nothing needs a second screen.
 *
 * With a `patientId` in the path it is somebody else's plan, read-only, and
 * reachable only if they granted it — the rules refuse the write regardless,
 * this just never offers the controls that would ask for one.
 */
export function Plan() {
  const { t } = useLocale();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { patientId } = useParams();

  const uid = patientId ?? user?.uid ?? '';
  const mine = !patientId;

  const [entries, setEntries] = useState<PlanEntryRecord[] | null>(null);

  const load = () => {
    if (!uid) return;
    void readPlan(uid)
      .then(setEntries)
      .catch(() => setEntries([]));
  };

  useEffect(load, [uid]);

  return (
    <Screen
      title={t('planTitle')}
      action={
        <Button variant="quiet" onClick={() => navigate(mine ? '/settings' : '/following')}>
          {t('navBack')}
        </Button>
      }
    >
      {/* The MDR line, once, near the top — the sentence that makes this
          visible to the person rather than only to a reviewer. */}
      <p className={styles.intro}>{t(mine ? 'planIntro' : 'planShared')}</p>

      {entries === null
        ? null
        : PLAN_SECTIONS.map((section: PlanSection) => {
            const copy = PLAN_SECTION_COPY[section];
            /*
             * `entriesInSection` is typed against the model's `PlanEntry`
             * and knows nothing of the `id` this module adds — but it is a
             * plain filter (see plan.ts in core), so every element handed
             * back is still one of the original `PlanEntryRecord` objects,
             * unchanged. The cast restores what filtering only lost at the
             * type level, never at runtime — unlike the cast this task
             * removed from `readPlan`, nothing here is unvalidated input.
             */
            const rows = entriesInSection(entries, section) as PlanEntryRecord[];
            const sectionTitle = t(copy.titleKey);
            const titleId = `plan-section-${section}`;
            const labelLabel = t(copy.labelKey);
            const detailLabel = t(copy.detailKey);

            return (
              <section className={styles.section} key={section} aria-labelledby={titleId}>
                <h2 className={styles.sectionTitle} id={titleId}>
                  {sectionTitle}
                </h2>
                <p className={styles.intro}>{t(copy.introKey)}</p>

                {rows.length > 0 ? (
                  <ul className={styles.list}>
                    {rows.map((row) => (
                      <li key={row.id} className={styles.item}>
                        {mine ? (
                          <PlanRow
                            entry={row}
                            sectionTitle={sectionTitle}
                            labelLabel={labelLabel}
                            detailLabel={detailLabel}
                            onSave={(values) => void updatePlanEntry(uid, row.id, values).then(load)}
                            onRemove={() => void removePlanEntry(uid, row.id).then(load)}
                          />
                        ) : (
                          <>
                            <span className={styles.sign}>{row.label}</span>
                            {row.detail ? <span className={styles.action}>{row.detail}</span> : null}
                          </>
                        )}
                        <Hairline />
                      </li>
                    ))}
                  </ul>
                ) : null}

                {mine ? (
                  <PlanAdd
                    sectionTitle={sectionTitle}
                    labelLabel={labelLabel}
                    detailLabel={detailLabel}
                    onAdd={(values) => void addPlanEntry(uid, { section, ...values }).then(load)}
                  />
                ) : null}
              </section>
            );
          })}
    </Screen>
  );
}
