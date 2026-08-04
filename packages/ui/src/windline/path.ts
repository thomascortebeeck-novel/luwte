/**
 * The geometry of the windline (BRAND 3.7).
 *
 * Given one unrest value per day, produce a single continuous stroke:
 * unsettled stretches oscillate finely and closely, settled stretches run
 * long and near-flat.
 *
 * Both amplitude *and* frequency follow unrest. Amplitude alone would read as
 * a chart with a y-axis — bigger meaning more — which is exactly the reading
 * BRAND forbids. Adding frequency makes an unsettled stretch look agitated
 * rather than high, and that is the difference between a horizon and a score.
 */

export type WindlineGeometry = {
  /** Unrest per day, 0..1, oldest first. */
  series: readonly number[];
  width: number;
  height: number;
  /** Radians, advanced over time to make the line drift. */
  phase?: number;
  /** Samples per day. More is smoother and costs more path data. */
  resolution?: number;
};

/** Linear interpolation between the two days a sample falls between. */
function unrestAt(series: readonly number[], position: number): number {
  if (series.length === 0) return 0;
  if (series.length === 1) return series[0]!;

  const scaled = position * (series.length - 1);
  const index = Math.min(series.length - 2, Math.floor(scaled));
  const t = scaled - index;
  return series[index]! * (1 - t) + series[index + 1]! * t;
}

/**
 * A settled line is not perfectly straight — a dead-flat line reads as no
 * data rather than as calm — so there is always a slow, shallow swell
 * underneath. Unrest adds a faster, finer oscillation on top of it.
 */
export function windlinePath({
  series,
  width,
  height,
  phase = 0,
  resolution = 8,
}: WindlineGeometry): string {
  const samples = Math.max(2, Math.round((series.length || 1) * resolution));
  const midline = height / 2;
  // Leave a little room so the stroke never clips at the extremes.
  const maxAmplitude = height / 2 - 1;

  const points: string[] = [];

  for (let i = 0; i <= samples; i += 1) {
    const position = i / samples;
    const unrest = unrestAt(series, position);
    const x = position * width;

    // The swell that is always there: slow and shallow.
    const calm = Math.sin(position * Math.PI * 2 + phase) * maxAmplitude * 0.12;

    // The agitation: finer and closer the more unsettled the stretch is.
    const frequency = 6 + unrest * 26;
    const amplitude = unrest * maxAmplitude * 0.85;
    const agitation = Math.sin(position * frequency * Math.PI * 2 + phase * 2) * amplitude;

    const y = midline - (calm + agitation);
    points.push(`${x.toFixed(2)},${y.toFixed(2)}`);
  }

  return `M ${points.join(' L ')}`;
}
