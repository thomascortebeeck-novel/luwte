import styles from './GoogleButton.module.css';

export type GoogleButtonProps = {
  label: string;
  disabled?: boolean;
  onClick: () => void;
};

/**
 * Google's own sign-in button, because a Google button that does not look like
 * one is worse than useless.
 *
 * People do not read this control, they recognise it. The four-colour "G" is
 * the whole point: it says *this is the account you already have* faster than
 * any wording, and a plain text button saying "Verder met Google" asks
 * somebody to work that out. On a screen reached by a person who is unwell,
 * recognition beats reading.
 *
 * **The mark is Google's and is reproduced unaltered**, which is what their
 * branding guidelines require — never recoloured, never flattened to one
 * colour, never redrawn to match a palette. It is the one place in luwte where
 * a colour outside the palette appears, and it appears because it is not ours.
 *
 * The container is luwte's: `--surface` and `--edge` land within a shade of
 * Google's own light and dark variants in both themes, and both pairings are
 * already covered by `contrast.test.ts`. So the button reads as Google's
 * without shouting over the primary action beside it, which is what a
 * full-white button on a dark screen would do.
 */
export function GoogleButton({ label, disabled = false, onClick }: GoogleButtonProps) {
  return (
    <button type="button" className={styles.button} disabled={disabled} onClick={onClick}>
      <svg
        className={styles.mark}
        viewBox="0 0 48 48"
        aria-hidden="true"
        focusable="false"
        width="18"
        height="18"
      >
        <path
          fill="#EA4335"
          d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
        />
        <path
          fill="#4285F4"
          d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
        />
        <path
          fill="#FBBC05"
          d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
        />
        <path
          fill="#34A853"
          d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
        />
      </svg>
      <span>{label}</span>
    </button>
  );
}
