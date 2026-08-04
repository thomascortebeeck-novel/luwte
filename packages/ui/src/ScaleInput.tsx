import { useRef } from 'react';
import styles from './ScaleInput.module.css';

export type ScaleValue = 1 | 2 | 3 | 4 | 5 | 6 | 7;

const VALUES = [1, 2, 3, 4, 5, 6, 7] as const;

export type ScaleInputProps = {
  /** Distinguishes one scale from another on a screen holding several. */
  name: string;
  /** The question itself, e.g. 'Hoe voelde je je?'. Labels the radiogroup. */
  legend: string;
  value: ScaleValue | null;
  onChange: (value: ScaleValue) => void;
  /** Words, never numbers. Shown at the ends of the scale. */
  lowLabel: string;
  highLabel: string;
  /** Seven accessible labels, low to high. Falls back to the two anchors. */
  stepLabels?: readonly string[];
};

/**
 * PRD 6.1 — faces or a slider, never a visible number.
 *
 * Implemented as a radiogroup with roving focus rather than a range input:
 * a slider reports a number to screen readers and is hard to hit accurately,
 * and both of those matter more here than in most products.
 */
export function ScaleInput({
  name,
  legend,
  value,
  onChange,
  lowLabel,
  highLabel,
  stepLabels,
}: ScaleInputProps) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const labelFor = (v: ScaleValue) => stepLabels?.[v - 1] ?? `${lowLabel} – ${highLabel}`;

  // Unanswered, the middle option carries the tab stop so the keyboard user
  // lands in a neutral place rather than at one extreme.
  const focusValue: ScaleValue = value ?? 4;

  const move = (from: ScaleValue, delta: number) => {
    const next = from + delta;
    if (next < 1 || next > 7) return;
    onChange(next as ScaleValue);
    refs.current[next - 1]?.focus();
  };

  return (
    <div className={styles.wrap}>
      <div role="radiogroup" aria-label={legend} className={styles.group} data-scale={name}>
        {VALUES.map((v, i) => (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={value === v}
            aria-label={labelFor(v)}
            tabIndex={v === focusValue ? 0 : -1}
            ref={(el) => {
              refs.current[i] = el;
            }}
            className={styles.option}
            data-selected={value === v || undefined}
            onClick={() => onChange(v)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                e.preventDefault();
                move(v, 1);
              }
              if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                e.preventDefault();
                move(v, -1);
              }
            }}
          >
            <span className={styles.dot} aria-hidden="true" />
          </button>
        ))}
      </div>
      <div className={styles.anchors} aria-hidden="true">
        <span>{lowLabel}</span>
        <span>{highLabel}</span>
      </div>
    </div>
  );
}
