import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Windline } from './Windline';
import { windlinePath } from './path';

/** Pull the y values out of a path so its shape can be measured. */
function ys(d: string): number[] {
  return d
    .replace('M ', '')
    .split(' L ')
    .map((point) => Number(point.split(',')[1]));
}

const spread = (values: number[]) => Math.max(...values) - Math.min(...values);

const flat = (length: number, value: number) => Array.from({ length }, () => value);

describe('windlinePath', () => {
  const size = { width: 320, height: 56 };

  it('draws a single continuous stroke, never several', () => {
    const d = windlinePath({ series: flat(14, 0.5), ...size });
    expect(d.startsWith('M ')).toBe(true);
    expect(d.match(/M /g)).toHaveLength(1);
  });

  it('renders a settled fortnight as a long near-flat curve', () => {
    const d = windlinePath({ series: flat(14, 0), ...size });
    // Not dead flat — a perfectly straight line reads as no data — but quiet.
    expect(spread(ys(d))).toBeLessThan(size.height * 0.25);
  });

  it('renders an unsettled fortnight as agitated oscillation', () => {
    const settled = spread(ys(windlinePath({ series: flat(14, 0), ...size })));
    const unsettled = spread(ys(windlinePath({ series: flat(14, 1), ...size })));
    expect(unsettled).toBeGreaterThan(settled * 2);
  });

  it('oscillates more often when unsettled, not merely further', () => {
    // Amplitude alone would read as a chart with a y-axis, where bigger means
    // more. Frequency is what makes it look agitated rather than high.
    const crossings = (series: number[]) => {
      const values = ys(windlinePath({ series, ...size }));
      const mid = size.height / 2;
      let count = 0;
      for (let i = 1; i < values.length; i += 1) {
        if (values[i - 1]! < mid !== values[i]! < mid) count += 1;
      }
      return count;
    };
    expect(crossings(flat(14, 1))).toBeGreaterThan(crossings(flat(14, 0)));
  });

  it('stays inside its box', () => {
    const values = ys(windlinePath({ series: flat(14, 1), ...size }));
    expect(Math.min(...values)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...values)).toBeLessThanOrEqual(size.height);
  });

  it('moves when the phase advances, so the line drifts', () => {
    const still = windlinePath({ series: flat(14, 0.5), ...size, phase: 0 });
    const later = windlinePath({ series: flat(14, 0.5), ...size, phase: 1.5 });
    expect(still).not.toBe(later);
  });

  it('survives an empty series rather than throwing', () => {
    expect(() => windlinePath({ series: [], ...size })).not.toThrow();
  });
});

describe('Windline', () => {
  it('describes itself to a screen reader', () => {
    render(<Windline series={flat(14, 0.4)} label="Overzicht van de laatste veertien dagen" />);
    expect(
      screen.getByRole('img', { name: 'Overzicht van de laatste veertien dagen' }),
    ).toBeInTheDocument();
  });

  it('shows no number, no label and no scale', () => {
    // BRAND 3.7 — it is a horizon line, not a score.
    const { container } = render(<Windline series={flat(14, 0.4)} label="overzicht" />);
    expect(container.textContent).toBe('');
    expect(container.querySelector('text')).toBeNull();
  });
});
