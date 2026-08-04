import type { ElementType, ReactNode } from 'react';
import styles from './Card.module.css';

export type CardProps = {
  as?: ElementType;
  className?: string;
  children: ReactNode;
};

export function Card({ as: Tag = 'section', className = '', children }: CardProps) {
  return <Tag className={`${styles.card} ${className}`.trim()}>{children}</Tag>;
}
