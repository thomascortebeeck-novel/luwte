import styles from './Chart.module.css';
import { smoothPath, toPoints } from './path';

const WIDTH = 640;
const HEIGHT = 200;

export type ChartSeries = {
  id: string;
  label: string;
  /** Normalised 0..1, one per day, null where there was no check-in. */
  values: readonly (number | null)[];
};

export type ChartMarker = {
  /** 0..1 along the window. */
  position: number;
  label: string;
};

/**
 * PRD 6.6 — one chart, and the vertical rules are the point of it.
 *
 * No trend arrows, no percentages, no "better than last week", no red and no
 * green. There is no bad score in this product, and a chart is the easiest
 * place in an app to accidentally invent one.
 */
export function Chart({
  series,
  markers = [],
  label,
}: {
  series: readonly ChartSeries[];
  markers?: readonly ChartMarker[];
  label: string;
}) {
  return (
    <div className={styles.wrap}>
      <svg
        className={styles.svg}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        preserveAspectRatio="none"
        role="img"
        aria-label={label}
      >
        {/* Faint gridlines. Three, not ten: enough to read a level against. */}
        {[0.25, 0.5, 0.75].map((fraction) => (
          <line
            key={fraction}
            className={styles.grid}
            x1={0}
            x2={WIDTH}
            y1={HEIGHT * fraction}
            y2={HEIGHT * fraction}
          />
        ))}

        {/* Medication changes, behind the data rather than over it. */}
        {markers.map((marker, index) => (
          <line
            key={`${marker.position}-${index}`}
            className={styles.marker}
            x1={marker.position * WIDTH}
            x2={marker.position * WIDTH}
            y1={0}
            y2={HEIGHT}
          />
        ))}

        {series.map((line) => (
          <path
            key={line.id}
            className={styles.series}
            data-metric={line.id}
            d={smoothPath(toPoints(line.values, WIDTH, HEIGHT))}
          />
        ))}
      </svg>

      <ul className={styles.legend}>
        {series.map((line) => (
          <li key={line.id} className={styles.legendItem}>
            <span
              className={styles.swatch}
              data-metric={line.id}
              aria-hidden="true"
              style={{ opacity: line.id === 'mood' ? 1 : line.id === 'flatness' ? 0.75 : 0.5 }}
            />
            {line.label}
          </li>
        ))}
      </ul>

      {markers.length > 0 ? (
        <ul className={styles.markerNotes}>
          {markers.map((marker, index) => (
            <li key={`${marker.label}-${index}`}>{marker.label}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
