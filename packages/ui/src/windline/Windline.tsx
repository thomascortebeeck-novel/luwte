import { useEffect, useRef, useState } from 'react';
import styles from './Windline.module.css';
import { windlinePath } from './path';

const WIDTH = 320;
const HEIGHT = 56;

/**
 * BRAND 3.7 — the one memorable element. The boldness is spent here and
 * everything else stays quiet.
 *
 * It drifts at about 0.2 Hz, slower than breathing, and should be noticeable
 * only if you look for it. It carries no number, no label, no scale and no
 * judgement: it is a horizon line, not a score.
 */
export function Windline({ series, label }: { series: readonly number[]; label: string }) {
  const [phase, setPhase] = useState(0);
  const frame = useRef<number | undefined>(undefined);

  useEffect(() => {
    // BRAND 3.6 / 5 — prefers-reduced-motion disables the windline animation
    // entirely, not merely shortens it. The line still renders; it just holds
    // still.
    // Optional chaining because matchMedia is absent in some embedded
    // webviews. Missing means "no stated preference", so the line drifts.
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

    const started = performance.now();
    const tick = (now: number) => {
      // 0.2 Hz — one slow cycle every five seconds.
      setPhase(((now - started) / 1000) * 0.2 * Math.PI * 2);
      frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);

    return () => {
      if (frame.current !== undefined) cancelAnimationFrame(frame.current);
    };
  }, []);

  const d = windlinePath({ series, width: WIDTH, height: HEIGHT, phase });

  return (
    <div className={styles.wrap}>
      <svg
        className={styles.svg}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        preserveAspectRatio="none"
        role="img"
        /* BRAND 5 — described as text, because a line nobody can see still
           has to say what it is. */
        aria-label={label}
      >
        <path className={styles.stroke} d={d} />
      </svg>
    </div>
  );
}
