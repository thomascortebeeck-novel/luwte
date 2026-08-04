import { Screen } from '@luwte/ui';
import { useAccount } from '../providers/AccountProvider';
import { useLocale } from '../providers/LocaleProvider';

/**
 * The home screen. Phase 3 fills it in — the windline above medication,
 * activities and optional practices (PRD 6.2). For now it says the one true
 * thing: there is nothing here, and that is allowed.
 */
export function Today() {
  const { t } = useLocale();
  const { patient } = useAccount();

  return (
    <Screen title={patient?.displayName || undefined}>
      <p>{t('todayEmpty')}</p>
    </Screen>
  );
}
