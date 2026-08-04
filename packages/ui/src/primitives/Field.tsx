import { useId, type InputHTMLAttributes } from 'react';
import styles from './Field.module.css';

export type FieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> & {
  label: string;
  /** Shown under the field. Never coloured as an error — BRAND 3.3. */
  message?: string;
  invalid?: boolean;
};

export function Field({ label, message, invalid = false, ...rest }: FieldProps) {
  const id = useId();
  const messageId = `${id}-message`;

  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        className={styles.input}
        aria-invalid={invalid || undefined}
        aria-describedby={message ? messageId : undefined}
        {...rest}
      />
      {message ? (
        <p className={styles.message} id={messageId}>
          {message}
        </p>
      ) : null}
    </div>
  );
}
