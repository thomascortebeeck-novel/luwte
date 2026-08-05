import styles from './ReactionIcon.module.css';

export type ReactionIconName = 'heart' | 'clap' | 'proud';

export type ReactionIconProps = {
  name: ReactionIconName;
};

/*
 * The three warm reactions, drawn.
 *
 * **Icons, and the word is still the accessible name.** The button keeps its
 * `aria-label`, so nothing is lost for somebody using a screen reader — a
 * picture that only means something if you can see it would make the feed
 * warm for some people and empty for others.
 *
 * Stroked rather than filled, at the same 1.25–1.5 weight as the windline and
 * the chart, so they read as the same hand drew them.
 *
 * **"Trots" is a four-pointed sparkle and deliberately not a star.** A star is
 * the rating glyph — five of them in a row is how the whole internet scores
 * things — and this product rates nothing and awards nothing. A medal or a
 * trophy would be worse still: BRAND forbids badges and achievements, and an
 * icon can smuggle one in where the copy never would.
 */
export function ReactionIcon({ name }: ReactionIconProps) {
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
      {name === 'heart' ? (
        <path d="M12 20s-7-4.4-7-9.2A3.8 3.8 0 0 1 12 8a3.8 3.8 0 0 1 7 2.8C19 15.6 12 20 12 20Z" />
      ) : null}

      {/*
        Two hands apart mid-clap, with the three short rays that make it
        applause rather than prayer.

        The first attempt drew one hand overlapping the other with wrist
        detail, and at 24px it was an unreadable smudge — looked at on a real
        screen rather than reasoned about. Two mirrored shapes and a gap
        survive the size; anatomy does not.
      */}
      {name === 'clap' ? (
        <>
          <path d="M8.6 20 10.7 13.1" strokeWidth="3.4" />
          <path d="M15.4 20 13.3 13.1" strokeWidth="3.4" />
          <path d="M12 9.6V7.2M8.9 10.3 7.5 8.2M15.1 10.3l1.4-2.1" />
        </>
      ) : null}

      {name === 'proud' ? (
        <>
          <path d="M12 4.5c.9 3.6 1.5 4.2 5.1 5.1-3.6.9-4.2 1.5-5.1 5.1-.9-3.6-1.5-4.2-5.1-5.1 3.6-.9 4.2-1.5 5.1-5.1Z" />
          <path d="M17.6 15.2c.45 1.8.75 2.1 2.55 2.55-1.8.45-2.1.75-2.55 2.55-.45-1.8-.75-2.1-2.55-2.55 1.8-.45 2.1-.75 2.55-2.55Z" />
        </>
      ) : null}
    </svg>
  );
}
