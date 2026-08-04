export type ChartPoint = { x: number; y: number };

/**
 * BRAND 6.6 — soft curves.
 *
 * A cubic through each pair with control points pulled horizontally to the
 * midpoint. It stays monotonic in x, so the line never doubles back, and it
 * never overshoots vertically the way a naive Catmull-Rom does — an overshoot
 * would draw a mood of 8 on a scale that stops at 7.
 */
export function smoothPath(points: readonly ChartPoint[]): string {
  if (points.length === 0) return '';
  if (points.length === 1) {
    const only = points[0]!;
    return `M ${only.x.toFixed(2)},${only.y.toFixed(2)}`;
  }

  const parts: string[] = [`M ${points[0]!.x.toFixed(2)},${points[0]!.y.toFixed(2)}`];

  for (let i = 1; i < points.length; i += 1) {
    const previous = points[i - 1]!;
    const current = points[i]!;
    const midX = (previous.x + current.x) / 2;
    parts.push(
      `C ${midX.toFixed(2)},${previous.y.toFixed(2)} ${midX.toFixed(2)},${current.y.toFixed(2)} ${current.x.toFixed(2)},${current.y.toFixed(2)}`,
    );
  }

  return parts.join(' ');
}

/**
 * Turns normalised values into chart coordinates, dropping days with no
 * check-in.
 *
 * Missing days are skipped rather than interpolated: the windline bridges
 * gaps because it is a feeling, but this chart is read by a clinician and
 * inventing a data point there would be a different kind of wrong. The line
 * simply runs from the last known day to the next, and the horizontal
 * spacing shows the gap without a hole.
 */
export function toPoints(
  values: readonly (number | null)[],
  width: number,
  height: number,
): ChartPoint[] {
  const lastIndex = Math.max(1, values.length - 1);
  const points: ChartPoint[] = [];

  values.forEach((value, index) => {
    if (value === null) return;
    points.push({
      x: (index / lastIndex) * width,
      // Normalised 0..1 runs bottom to top, SVG y runs top to bottom.
      y: height - value * height,
    });
  });

  return points;
}
