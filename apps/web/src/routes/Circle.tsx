import {
  CIRCLE_ROLE_COPY,
  PERMISSION_SENTENCE,
  grantedKeys,
  inviteLink,
  isActive,
} from '@luwte/core';
import { Button, Hairline, Screen } from '@luwte/ui';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { messageKeyFor, reportError } from '../errors';
import {
  readCircle,
  readOpenInvites,
  withdrawInvite,
  type CircleMemberRecord,
  type InviteRecord,
} from '../firebase/circle';
import { useAuth } from '../providers/AuthProvider';
import { useLocale } from '../providers/LocaleProvider';
import styles from './Circle.module.css';

/**
 * PRD 6.4 — who sees anything, and exactly what.
 *
 * Every card lists the sentences that are **on**. Listing what someone cannot
 * see would turn the screen into an account of what is being withheld from
 * them, which is not what the person is deciding here.
 */
export function Circle() {
  const { t } = useLocale();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [members, setMembers] = useState<CircleMemberRecord[]>([]);
  const [invites, setInvites] = useState<InviteRecord[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  const load = () => {
    if (!user) return;
    void readCircle(user.uid)
      .then(setMembers)
      .catch(() => setMembers([]));
    void readOpenInvites(user.uid)
      .then(setInvites)
      .catch(() => setInvites([]));
  };

  useEffect(load, [user]);

  const withdraw = async (code: string) => {
    setMessage(null);
    try {
      await withdrawInvite(code);
      load();
    } catch (error: unknown) {
      reportError('withdrawInvite', error);
      setMessage(t(messageKeyFor(error)));
    }
  };

  const nameOf = (member: CircleMemberRecord) =>
    member.relation?.trim() ||
    t(CIRCLE_ROLE_COPY[member.role]);

  return (
    <Screen
      title={t('circleTitle')}
      action={
        <>
          <Button full onClick={() => navigate('/circle/invite')}>
            {t('circleAdd')}
          </Button>
          {/* A doctor is added by their code rather than invited by link:
              they already have an account, and the code is what they hand
              over. Offered here so it is findable at any time, not only
              during onboarding. */}
          <Button variant="quiet" onClick={() => navigate('/dokter')}>
            {t('findTitle')}
          </Button>
          {/* D29 — control you cannot look back at is memory, not control. */}
          <Button variant="quiet" onClick={() => navigate('/circle/log')}>
            {t('permLogLink')}
          </Button>
          <Button variant="quiet" onClick={() => navigate('/')}>
            {t('navToday')}
          </Button>
        </>
      }
    >
      <p className={styles.intro}>{t('circleIntro')}</p>

      {members.length === 0 ? (
        <p className={styles.empty}>{t('circleEmpty')}</p>
      ) : (
        <ul className={styles.list}>
          {members.map((member) => {
            const keys = grantedKeys(member.permissions);
            const live = isActive(member);
            return (
              <li key={member.uid} className={styles.item}>
                <span className={styles.name}>{nameOf(member)}</span>
                {!live ? (
                  <span className={styles.quiet}>{t('circleRevoked')}</span>
                ) : keys.length === 0 ? (
                  <span className={styles.quiet}>{t('circleSeesNothing')}</span>
                ) : (
                  <ul className={styles.sentences}>
                    {keys.map((key) => (
                      <li key={key}>{t(PERMISSION_SENTENCE[key])}</li>
                    ))}
                  </ul>
                )}
                <Button variant="quiet" onClick={() => navigate(`/circle/${member.uid}`)}>
                  {t('circleChange')}
                </Button>
                <Hairline />
              </li>
            );
          })}
        </ul>
      )}

      {invites.length > 0 ? (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>{t('circleOpenInvites')}</h2>
          <ul className={styles.list}>
            {invites.map((invite) => (
              <li key={invite.code} className={styles.item}>
                <span className={styles.code}>{inviteLink(window.location.origin, invite.code)}</span>
                <span className={styles.quiet}>{t('circleInviteWaiting')}</span>
                <Button variant="quiet" onClick={() => void withdraw(invite.code)}>
                  {t('circleInviteWithdraw')}
                </Button>
                <Hairline />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* Present even when empty, so a screen reader has the region before
          a message ever lands in it. */}
      <p className={styles.note} role="status" aria-live="polite">
        {message}
      </p>
    </Screen>
  );
}
