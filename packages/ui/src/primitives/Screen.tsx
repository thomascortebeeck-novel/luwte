import type { ReactNode } from 'react';
import styles from './Screen.module.css';

export type ScreenProps = {
  /** BRAND 3.5 — one screen, one job. Many screens need no title at all. */
  title?: string;
  children: ReactNode;
  /** Rendered in the footer so the primary action sits within thumb reach. */
  action?: ReactNode;
};

export function Screen({ title, children, action }: ScreenProps) {
  return (
    <main className={styles.screen}>
      {title ? <h1 className={styles.title}>{title}</h1> : null}
      <div className={styles.body}>{children}</div>
      {action ? (
        <footer className={styles.action} role="contentinfo">
          {action}
        </footer>
      ) : null}
    </main>
  );
}
