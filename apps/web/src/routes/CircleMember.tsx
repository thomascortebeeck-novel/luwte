import { isActive, permissionsForRole, type PermissionKey } from '@luwte/core';
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

  const [member, setMember] = useState<CircleMemberRecord | null>(null);
  const [relation, setRelation] = useState('');

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

  const toggle = (key: PermissionKey, checked: boolean) => {
    if (!user) return;
    const permissions = { ...member.permissions, [key]: checked };
    setMember({ ...member, permissions });
    void saveMemberPermissions(user.uid, memberUid, permissions);
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
    t(member.role === 'clinician' ? 'circleRoleClinician' : 'circleRoleSupporter');

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
