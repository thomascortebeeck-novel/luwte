import type { ReactNode } from 'react';
import styles from './HumanText.module.css';

export type HumanTextProps = {
  as?: 'p' | 'span' | 'blockquote' | 'div';
  className?: string;
  children: ReactNode;
};

/** The only serif in the product. If the app is speaking, this is the wrong component. */
export function HumanText({ as: Tag = 'p', className = '', children }: HumanTextProps) {
  return <Tag className={`${styles.human} ${className}`.trim()}>{children}</Tag>;
}
