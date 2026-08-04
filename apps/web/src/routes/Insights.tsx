import { DEFAULT_TIMEZONE, dateKey } from '@luwte/core';
import { Button, Screen } from '@luwte/ui';
import { useMemo } from 'react';
import { useNavigate } from 'react-router';
import { PatientOverview } from './PatientOverview';
import { useAccount } from '../providers/AccountProvider';
import { useAuth } from '../providers/AuthProvider';
import { useLocale } from '../providers/LocaleProvider';

/**
 * PRD 6.6 — the person's own overview. The body is shared with the clinician
 * console, because at an appointment both are looking at the same picture.
 */
export function Insights() {
  const { t } = useLocale();
  const { user } = useAuth();
  const { patient } = useAccount();
  const navigate = useNavigate();

  const timezone = patient?.timezone ?? DEFAULT_TIMEZONE;
  const today = useMemo(() => dateKey(new Date(), timezone), [timezone]);

  return (
    <Screen
      title={t('insightsTitle')}
      action={
        <>
          <Button full onClick={() => navigate('/report')}>
            {t('reportOpen')}
          </Button>
          <Button variant="quiet" onClick={() => navigate('/')}>
            {t('navToday')}
          </Button>
        </>
      }
    >
      <PatientOverview uid={user?.uid ?? ''} today={today} />
    </Screen>
  );
}
