import { PLAN_EXAMPLE_KEYS } from '@luwte/core';
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
 * The early-warning-signs plan — the person's own list of what they notice
 * first and what they do about it.
 *
 * Standard psychosis relapse prevention, and the item on the whole feature
 * list that suits this product best, because it is entirely their own words
 * and luwte's job is to hold it and hand it back.
 *
 * **Nothing is ever matched against it.** No check-in is compared to a sign,
 * no count is kept, nothing is flagged. Doing that would be generating a
 * conclusion about somebody's mental state — clinical monitoring, Class IIa
 * under EU MDR, and the line this product does not cross. luwte may carry a
 * conclusion somebody else is licensed to draw, and may never draw one.
 *
 * The examples are examples, not a checklist. A ready-made list would have
 * people agreeing to symptoms they do not have, and a plan only works in the
 * person's own words: "ik begin mijn kamer op te ruimen om vier uur 's
 * nachts" is a real early sign no instrument would ever have printed.
 *
 * With a `patientId` in the path it is somebody else's plan, read-only, and
 * reachable only if they granted it — the rules refuse the read otherwise, so
 * that route is navigation rather than access.
 */
export function Plan() {
  const { t } = useLocale();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { patientId } = useParams();

  const uid = patientId ?? user?.uid ?? '';
  const mine = !patientId;

  const [entries, setEntries] = useState<PlanEntryRecord[] | null>(null);
  const [draft, setDraft] = useState<{ id: string | null; sign: string; action: string } | null>(
    null,
  );
  const [busy, setBusy] = useState(false);

  const load = () => {
    if (!uid) return;
    void readPlan(uid)
      .then(setEntries)
      .catch(() => setEntries([]));
  };

  useEffect(load, [uid]);

  const save = async () => {
    if (!user || !draft || draft.sign.trim().length === 0 || busy) return;
    setBusy(true);
    try {
      const values = { sign: draft.sign.trim(), action: draft.action.trim() };
      await (draft.id ? updatePlanEntry(user.uid, draft.id, values) : addPlanEntry(user.uid, values));
      setDraft(null);
      load();
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    if (!user) return;
    await removePlanEntry(user.uid, id);
    setDraft(null);
    load();
  };

  if (draft) {
    return (
      <Screen
        title={t('planTitle')}
        action={
          <>
            <Button full disabled={draft.sign.trim().length === 0 || busy} onClick={() => void save()}>
              {t('planSave')}
            </Button>
            {draft.id ? (
              <Button variant="quiet" onClick={() => void remove(draft.id!)}>
                {t('planRemove')}
              </Button>
            ) : null}
            <Button variant="quiet" onClick={() => setDraft(null)}>
              {t('navBack')}
            </Button>
          </>
        }
      >
        <Field
          label={t('planSign')}
          value={draft.sign}
          onChange={(e) => setDraft({ ...draft, sign: e.target.value })}
        />
        <Field
          label={t('planAction')}
          message={t('planActionHint')}
          value={draft.action}
          onChange={(e) => setDraft({ ...draft, action: e.target.value })}
        />

        <Hairline />

        {/* Offered as sentences to read, never as boxes to tick. */}
        <h2 className={styles.sectionTitle}>{t('planExamples')}</h2>
        <ul className={styles.examples}>
          {PLAN_EXAMPLE_KEYS.map((key) => (
            <li key={key}>{t(key)}</li>
          ))}
        </ul>
      </Screen>
    );
  }

  return (
    <Screen
      title={t('planTitle')}
      action={
        <>
          {mine ? (
            <Button full onClick={() => setDraft({ id: null, sign: '', action: '' })}>
              {t('planAdd')}
            </Button>
          ) : null}
          <Button variant="quiet" onClick={() => navigate(mine ? '/settings' : '/following')}>
            {t('navBack')}
          </Button>
        </>
      }
    >
      <p className={styles.intro}>{t(mine ? 'planIntro' : 'planShared')}</p>

      {entries === null ? null : entries.length === 0 ? (
        <p className={styles.quiet}>{t('planEmpty')}</p>
      ) : (
        <ul className={styles.list}>
          {entries.map((entry) => (
            <li key={entry.id} className={styles.item}>
              <span className={styles.sign}>{entry.sign}</span>
              {entry.action ? <span className={styles.action}>{entry.action}</span> : null}
              {mine ? (
                <Button
                  variant="quiet"
                  onClick={() => setDraft({ id: entry.id, sign: entry.sign, action: entry.action })}
                >
                  {t('circleChange')}
                </Button>
              ) : null}
              <Hairline />
            </li>
          ))}
        </ul>
      )}
    </Screen>
  );
}
