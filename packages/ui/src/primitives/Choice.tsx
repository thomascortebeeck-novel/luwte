import { useId } from 'react';
import styles from './Choice.module.css';

export type ChoiceProps = {
  label: string;
  explanation?: string;
  /** A short word such as "Nodig" or "Mag je weigeren". Never a warning. */
  note?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
};

export function Choice({
  label,
  explanation,
  note,
  checked,
  onChange,
  disabled = false,
}: ChoiceProps) {
  const id = useId();
  const describedBy = explanation ? `${id}-explanation` : undefined;

  return (
    <label className={styles.choice} htmlFor={id}>
      <input
        id={id}
        type="checkbox"
        className={styles.box}
        checked={checked}
        disabled={disabled}
        aria-describedby={describedBy}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className={styles.text}>
        <span className={styles.label}>{label}</span>
        {explanation ? (
          <span className={styles.explanation} id={describedBy}>
            {explanation}
          </span>
        ) : null}
        {note ? <span className={styles.note}>{note}</span> : null}
      </span>
    </label>
  );
}
