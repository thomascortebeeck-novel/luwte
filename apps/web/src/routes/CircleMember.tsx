import {
  CIRCLE_ROLE_COPY,
  PERMISSION_CONFIRM,
  isActive,
  isClinicalKey,
  permissionsForRole,
  type PermissionKey,
  type Permissions,
} from '@luwte/core';
import { Button, Choice, Field, Hairline, Screen } from '@luwte/ui';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import {
  readCircleMember,
  restoreMember,
  revokeMember,
  saveMemberPermissions,
  saveMemberRelation,
  type CircleMemberRecord,
} from '../firebase/circle';
import { useAuth } from '../providers/AuthProvider';
import { useLocale } from '../providers/LocaleProvider';
import styles from './Circle.module.css';

/**
 * PRD 6.4 — what one person may see, changed one sentence at a time.
 *
 * The toggles are the sentences themselves. Nobody meaningfully agrees to
 * "checkins: true"; a person can decide whether their brother may see how
 * they felt.
 *
 * Every change saves as it is made. An explicit save button would leave the
 * screen able to show a permission the database does not actually hold.
 */
export function CircleMember() {
  const { t } = useLocale();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { memberUid = '' } = useParams();

  type ClinicalKey = keyof typeof PERMISSION_CONFIRM;

  const [member, setMember] = useState<CircleMemberRecord | null>(null);
  const [relation, setRelation] = useState('');
  /** A clinical permission waiting to be confirmed in words. */
  const [confirming, setConfirming] = useState<{
    key: ClinicalKey;
    permissions: Permissions;
  } | null>(null);

  useEffect(() => {
    if (!user || !memberUid) return;
    void readCircleMember(user.uid, memberUid)
      .then((found) => {
        setMember(found);
        setRelation(found?.relation ?? '');
      })
      .catch(() => setMember(null));
  }, [user, memberUid]);

  if (!member) return <Screen>{null}</Screen>;

  const live = isActive(member);

  const apply = (permissions: Permissions) => {
    if (!user) return;
    const was = { permissions: member.permissions, relation: member.relation ?? '' };
    setMember({ ...member, permissions });
    void saveMemberPermissions(user.uid, memberUid, permissions, was);
  };

  /*
   * D29 — turning a clinical permission **on** stops to say what it means,
   * in a sentence naming this person. Turning one off does not: somebody
   * taking access away from another person should never be asked whether they
   * are sure.
   *
   * This is the honest answer to "full control on a bad day". You cannot both
   * give somebody real control and protect them from themselves; you can make
   * sure they were told in words rather than in a toggle label, and that they
   * can read back later what they agreed to.
   */
  const toggle = (key: PermissionKey, checked: boolean) => {
    const permissions = { ...member.permissions, [key]: checked };
    if (checked && isClinicalKey(key)) setConfirming({ key: key as ClinicalKey, permissions });
    else apply(permissions);
  };

  const commitRelation = () => {
    if (!user || relation === member.relation) return;
    void saveMemberRelation(user.uid, memberUid, relation.trim());
  };

  const setAccess = async (revoked: boolean) => {
    if (!user) return;
    await (revoked ? revokeMember : restoreMember)(user.uid, memberUid);
    setMember({ ...member, revokedAt: revoked ? new Date() : null });
  };

  const title =
    member.relation?.trim() ||
    t(CIRCLE_ROLE_COPY[member.role]);

  /*
   * A whole screen rather than a dialog. What it says is the thing being
   * agreed to, and it deserves the space — a line of small text under a
   * toggle is how somebody agrees to something without reading it.
   */
  if (confirming) {
    return (
      <Screen
        title={t('confirmTitle')}
        action={
          <>
            <Button
              full
              onClick={() => {
                apply(confirming.permissions);
                setConfirming(null);
              }}
            >
              {t('confirmYes')}
            </Button>
            <Button variant="quiet" onClick={() => setConfirming(null)}>
              {t('confirmNo')}
            </Button>
          </>
        }
      >
        <p className={styles.sectionTitle}>
          {title} {t(PERMISSION_CONFIRM[confirming.key])}
        </p>
        {/* The half of the old ban that is kept, said where it matters: being
            allowed to look is not the same as being told. */}
        <p className={styles.quiet}>{t('confirmNeverPushed')}</p>
      </Screen>
    );
  }

  return (
    <Screen
      title={title}
      action={
        <Button variant="quiet" onClick={() => navigate('/circle')}>
          {t('navBack')}
        </Button>
      }
    >
      <Field
        label={t('circleRelation')}
        message={t('circleRelationHint')}
        value={relation}
        onChange={(e) => setRelation(e.target.value)}
        onBlur={commitRelation}
      />

      <Hairline />

      <h2 className={styles.sectionTitle}>{t('circleWhatTheySee')}</h2>
      {live ? (
        <div className={styles.items}>
          {permissionsForRole(member.role).map((entry) => (
            <Choice
              key={entry.key}
              label={t(entry.sentenceKey)}
              checked={member.permissions[entry.key]}
              onChange={(checked) => toggle(entry.key, checked)}
            />
          ))}
        </div>
      ) : (
        <p className={styles.quiet}>{t('circleRevoked')}</p>
      )}

      <Hairline />

      {/* Stopping access is an ordinary thing to do, so it is an ordinary
          button. Nothing here is coloured as a warning — BRAND 3.3. */}
      <Button variant="quiet" onClick={() => void setAccess(live)}>
        {t(live ? 'circleRevoke' : 'circleRestore')}
      </Button>
    </Screen>
  );
}
