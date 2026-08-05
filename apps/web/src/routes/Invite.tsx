import {
  DEFAULT_CLINICIAN_PERMISSIONS,
  DEFAULT_PERMISSIONS,
  inviteLink,
  permissionsForRole,
  type CircleRole,
  type PermissionKey,
  type Permissions,
} from '@luwte/core';
import { Button, Choice, Field, Hairline, Screen } from '@luwte/ui';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { createInvite } from '../firebase/circle';
import { useAccount } from '../providers/AccountProvider';
import { useAuth } from '../providers/AuthProvider';
import { useLocale } from '../providers/LocaleProvider';
import styles from './Circle.module.css';

/**
 * PRD 6.4 — the patient decides what an invite carries before it exists.
 *
 * The defaults are narrow on purpose: a supporter starts on feed and calendar
 * only. Widening it later is two taps on the member screen; unsending a link
 * that already handed over a clinical record is not possible at all.
 */
export function Invite() {
  const { t } = useLocale();
  const { user } = useAuth();
  const { patient } = useAccount();
  const navigate = useNavigate();

  const [role, setRole] = useState<CircleRole>('supporter');
  const [relation, setRelation] = useState('');
  const [permissions, setPermissions] = useState<Permissions>({ ...DEFAULT_PERMISSIONS });
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  const chooseRole = (next: CircleRole) => {
    setRole(next);
    setPermissions({
      ...(next === 'clinician' ? DEFAULT_CLINICIAN_PERMISSIONS : DEFAULT_PERMISSIONS),
    });
  };

  const toggle = (key: PermissionKey, checked: boolean) =>
    setPermissions((prev) => ({ ...prev, [key]: checked }));

  const create = async () => {
    if (!user) return;
    setBusy(true);
    try {
      const invite = await createInvite(user.uid, {
        role,
        permissions,
        relation: relation.trim(),
        // Carried so the circle entry can name the patient. A member cannot
        // read `patients/{pid}`, and widening that to show one name would
        // also hand over reminder hours and notification settings.
        patientName: patient?.displayName ?? '',
      });
      setLink(inviteLink(window.location.origin, invite.code));
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    if (!link) return;
    await navigator.clipboard.writeText(link);
    setCopied(true);
  };

  if (link) {
    return (
      <Screen
        title={t('inviteTitle')}
        action={
          <Button variant="quiet" onClick={() => navigate('/circle')}>
            {t('navBack')}
          </Button>
        }
      >
        <p className={styles.intro}>{t('inviteReady')}</p>
        <p className={styles.code}>{link}</p>
        <Button onClick={() => void copy()}>{t('inviteCopy')}</Button>
        {copied ? <p className={styles.quiet}>{t('inviteCopied')}</p> : null}
      </Screen>
    );
  }

  return (
    <Screen
      title={t('inviteTitle')}
      action={
        <>
          <Button full disabled={busy} onClick={() => void create()}>
            {t('inviteCreate')}
          </Button>
          <Button variant="quiet" onClick={() => navigate('/circle')}>
            {t('navBack')}
          </Button>
        </>
      }
    >
      <h2 className={styles.sectionTitle}>{t('inviteWho')}</h2>
      <div className={styles.roles} role="radiogroup" aria-label={t('inviteWho')}>
        {(['supporter', 'clinician'] as const).map((option) => (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={role === option}
            className={styles.role}
            onClick={() => chooseRole(option)}
          >
            {t(option === 'clinician' ? 'circleRoleClinician' : 'circleRoleSupporter')}
          </button>
        ))}
      </div>

      <Field
        label={t('circleRelation')}
        message={t('circleRelationHint')}
        value={relation}
        onChange={(e) => setRelation(e.target.value)}
      />

      <Hairline />

      <h2 className={styles.sectionTitle}>{t('inviteWhatTheySee')}</h2>
      {/* Medication is not on this list for family and friends. Not hidden —
          never offered, and refused by the rules besides. A permission that
          cannot be granted to the wrong person cannot be granted to them on
          a bad day. */}
      <div className={styles.items}>
        {permissionsForRole(role).map((entry) => (
          <Choice
            key={entry.key}
            label={t(entry.sentenceKey)}
            checked={permissions[entry.key]}
            onChange={(checked) => toggle(entry.key, checked)}
          />
        ))}
      </div>
    </Screen>
  );
}
