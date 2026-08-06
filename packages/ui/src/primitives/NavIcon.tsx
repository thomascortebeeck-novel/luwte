import styles from './NavIcon.module.css';

export type NavIconName = 'today' | 'calendar' | 'circle' | 'insights' | 'settings';

export type NavIconProps = {
  name: NavIconName;
};

/**
 * The five destinations, drawn.
 *
 * Same hand as `ReactionIcon`: 24px box, stroked at 1.5, round caps, nothing
 * filled except where a shape needs to read as solid. Consistency is most of
 * what makes a set of icons legible — a mixed set reads as clip art.
 *
 * **Every one of these is paired with its word**, in the tab bar and in the
 * top navigation both. An icon-only bar asks somebody to decode five glyphs,
 * and this app is used by people whose concentration is affected. The icon is
 * there to be recognised at a glance and the word is there when it is not.
 *
 * `today` is the windline — luwte's own mark, and the thing at the top of the
 * screen it leads to. Not a house: this is not a dashboard, it is a day.
 */
export function NavIcon({ name }: NavIconProps) {
  return (
    <svg
      className={styles.icon}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {name === 'today' ? <path d="M3 14c3-5.5 6-5.5 9 0s6 5.5 9 0" /> : null}

      {name === 'calendar' ? (
        <>
          <rect x="3" y="5" width="18" height="16" rx="3" />
          <path d="M8 3v4M16 3v4M3 10.5h18" />
        </>
      ) : null}

      {/* De kring — three together, not a crowd and not a single person. */}
      {name === 'circle' ? (
        <>
          <circle cx="12" cy="6.2" r="2.6" />
          <circle cx="5.8" cy="16.4" r="2.6" />
          <circle cx="18.2" cy="16.4" r="2.6" />
        </>
      ) : null}

      {name === 'insights' ? (
        <>
          <path d="M3.5 20h17" />
          <path d="M5.5 16.5 10 12l3.5 2.5L20 7" />
        </>
      ) : null}

      {/* Sliders rather than a cog. A cog is machinery; this is your choices,
          and two rails with a handle each say that at 24px. */}
      {name === 'settings' ? (
        <>
          <path d="M4 9h16M4 16h16" />
          <circle cx="9.5" cy="9" r="2.3" fill="currentColor" stroke="none" />
          <circle cx="15.5" cy="16" r="2.3" fill="currentColor" stroke="none" />
        </>
      ) : null}
    </svg>
  );
}
