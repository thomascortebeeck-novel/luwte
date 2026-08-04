import { Button, Hairline, Screen } from '@luwte/ui';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  readActivities,
  setActivityStatus,
  type ActivityRecord,
} from '../firebase/activities';
import { useAuth } from '../providers/AuthProvider';
import { useLocale } from '../providers/LocaleProvider';
import styles from './Calendar.module.css';

/**
 * PRD 6.3 — the suggestions tray.
 *
 * Its own screen, deliberately: what somebody else thinks you should do never
 * appears on your calendar until you say so. That separation is the design.
 * Family wanting to help and a person needing to control their own day is the
 * central tension of this product, and this is where it is resolved.
 *
 * **Declining is silent.** Nothing is sent, nobody is told, and the person
 * who suggested it cannot read a declined activity at all — the rules refuse
 * it, so there is nothing to poll for and nothing to infer.
 */
export function Suggestions() {
  const { t } = useLocale();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [suggestions, setSuggestions] = useState<ActivityRecord[]>([]);

  const load = () => {
    if (!user) return;
    void readActivities(user.uid)
      .then((all) => setSuggestions(all.filter((activity) => activity.status === 'suggested')))
      .catch(() => setSuggestions([]));
  };

  useEffect(load, [user]);

  const decide = async (activityId: string, accepted: boolean) => {
    if (!user) return;
    await setActivityStatus(user.uid, activityId, accepted ? 'accepted' : 'declined');
    load();
  };

  return (
    <Screen
      title={t('suggestionsTitle')}
      action={
        <Button variant="quiet" onClick={() => navigate('/calendar')}>
          {t('navBack')}
        </Button>
      }
    >
      <p className={styles.intro}>{t('suggestionsIntro')}</p>

      {suggestions.length === 0 ? (
        <p className={styles.quiet}>{t('suggestionsEmpty')}</p>
      ) : (
        <ul className={styles.items}>
          {suggestions.map((activity) => (
            <li key={activity.id} className={styles.suggestion}>
              <span className={styles.title}>{activity.title}</span>
              <span className={styles.quiet}>
                {activity.date}
                {activity.startTime ? ` · ${activity.startTime}` : ''}
                {activity.withPerson ? ` · ${activity.withPerson}` : ''}
              </span>
              <div className={styles.decide}>
                <Button variant="quiet" onClick={() => void decide(activity.id, true)}>
                  {t('suggestionsAccept')}
                </Button>
                <Button variant="quiet" onClick={() => void decide(activity.id, false)}>
                  {t('suggestionsDecline')}
                </Button>
              </div>
              <Hairline />
            </li>
          ))}
        </ul>
      )}
    </Screen>
  );
}
