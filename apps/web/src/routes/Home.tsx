import { HumanText, Screen } from '@luwte/ui';
import { useLocale } from '../providers/LocaleProvider';

/**
 * A holding screen for Phase 0. Today (PRD 6.2) replaces it in Phase 3, with
 * the windline above medication, activities and optional practices.
 */
export function Home() {
  const { t } = useLocale();

  return (
    <Screen>
      <HumanText as="p">{t('appTagline')}</HumanText>
      <p>{t('todayEmpty')}</p>
    </Screen>
  );
}
