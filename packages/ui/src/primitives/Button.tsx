import type { ButtonHTMLAttributes } from 'react';
import styles from './Button.module.css';

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'quiet';
  full?: boolean;
};

export function Button({
  variant = 'primary',
  full = false,
  type = 'button',
  className = '',
  ...rest
}: ButtonProps) {
  const classes = [styles.base, styles[variant], full ? styles.full : '', className]
    .filter(Boolean)
    .join(' ');
  return <button type={type} className={classes} {...rest} />;
}
