import { keepsOwnLogbook, type CopyKey } from '@luwte/core';
import { NavIcon, type NavIconName } from '@luwte/ui';
import { NavLink, useLocation } from 'react-router';
import { useAccount } from '../providers/AccountProvider';
import { useAuth } from '../providers/AuthProvider';
import { useLocale } from '../providers/LocaleProvider';
import styles from './AppNav.module.css';

type Destination = { to: string; icon: NavIconName; labelKey: CopyKey };

/**
 * The five places a person actually goes. Five is the ceiling for a tab bar;
 * a sixth turns recognition back into reading.
 */
const PATIENT: Destination[] = [
  { to: '/', icon: 'today', labelKey: 'navToday' },
  { to: '/calendar', icon: 'calendar', labelKey: 'calendarTitle' },
  { to: '/feed', icon: 'circle', labelKey: 'feedTitle' },
  { to: '/insights', icon: 'insights', labelKey: 'insightsTitle' },
  { to: '/settings', icon: 'settings', labelKey: 'settingsTitle' },
];

/**
 * Screens that are a single task, or reached before there is an account.
 * Navigation on any of these is an invitation to abandon what you are doing —
 * and on the crisis screen it is worse than that.
 */
const WITHOUT_NAV = ['/crisis', '/signin', '/onboarding', '/consent', '/report', '/styleguide'];

/**
 * One navigation, placed differently.
 *
 * Until now there was none: Today ended in a stack of five full-width buttons
 * and every other screen carried a single "Vandaag" to get back, so moving
 * between two sections meant going home first. That is a wall rather than a
 * way around.
 *
 * **It lives in the header in the DOM**, which is where a navigation landmark
 * belongs and what a screen reader expects, and CSS puts it where each device
 * wants it: a thumb-reachable bar along the bottom on a phone, a row in the
 * top bar on a desktop. One component, one render, no duplicated markup that
 * could drift apart.
 */
export function AppNav() {
  const { t } = useLocale();
  const { status } = useAuth();
  const { role, patient } = useAccount();
  const { pathname } = useLocation();

  // Nothing to navigate to before there is an account, and nothing worth
  // offering in the middle of onboarding.
  if (status !== 'signed-in') return null;
  if (WITHOUT_NAV.some((path) => pathname === path || pathname.startsWith(`${path}/`))) return null;
  if (patient?.onboarded !== true) return null;
  /*
   * Supporters live at `/following` and clinicians at `/console`, each a
   * single destination. A tab bar with one tab is furniture.
   */
  if (!keepsOwnLogbook(role)) return null;

  return (
    <nav className={styles.nav} aria-label={t('navSections')}>
      <ul className={styles.list}>
        {PATIENT.map((destination) => (
          <li key={destination.to} className={styles.item}>
            <NavLink
              to={destination.to}
              // `end` so "Vandaag" is not marked current on every route.
              end={destination.to === '/'}
              className={({ isActive }) => (isActive ? `${styles.link} ${styles.active}` : styles.link)}
            >
              <NavIcon name={destination.icon} />
              <span className={styles.label}>{t(destination.labelKey)}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
