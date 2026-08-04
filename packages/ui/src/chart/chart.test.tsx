import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Chart } from './Chart';
import { smoothPath, toPoints } from './path';

describe('toPoints', () => {
  it('maps normalised values into chart coordinates', () => {
    // 0 is the bottom of the box, 1 the top.
    const points = toPoints([0, 1], 100, 50);
    expect(points).toEqual([
      { x: 0, y: 50 },
      { x: 100, y: 0 },
    ]);
  });

  it('skips days with no check-in rather than inventing one', () => {
    // The windline bridges gaps because it is a feeling. This chart is read
    // by a clinician, so a missing day is skipped, not fabricated.
    const points = toPoints([0.5, null, 0.5], 100, 50);
    expect(points).toHaveLength(2);
    expect(points.map((p) => p.x)).toEqual([0, 100]);
  });

  it('returns nothing when nothing was ever filled in', () => {
    expect(toPoints([null, null], 100, 50)).toEqual([]);
  });
});

describe('smoothPath', () => {
  it('is one continuous stroke', () => {
    const d = smoothPath(toPoints([0.2, 0.6, 0.4], 100, 50));
    expect(d.match(/M /g)).toHaveLength(1);
    expect(d).toContain('C ');
  });

  it('never overshoots the box, so a mood of 8 cannot be drawn', () => {
    const d = smoothPath(toPoints([0, 1, 0, 1], 100, 50));
    const ys = [...d.matchAll(/[ ,](-?\d+\.\d+)(?=[ $])/g)].map((m) => Number(m[1]));
    for (const y of ys) {
      expect(y).toBeGreaterThanOrEqual(-0.01);
      expect(y).toBeLessThanOrEqual(50.01);
    }
  });

  it('handles a single day and an empty window without throwing', () => {
    expect(smoothPath(toPoints([0.5], 100, 50))).toContain('M ');
    expect(smoothPath([])).toBe('');
  });
});

describe('Chart', () => {
  const series = [
    { id: 'mood', label: 'Stemming', values: [0.2, 0.5, 0.8] },
    { id: 'flatness', label: 'Vlakheid', values: [0.4, 0.4, 0.3] },
  ];

  it('describes itself to a screen reader', () => {
    render(<Chart series={series} label="De laatste twee weken" />);
    expect(screen.getByRole('img', { name: 'De laatste twee weken' })).toBeInTheDocument();
  });

  it('names each line, since they are told apart by opacity rather than colour', () => {
    render(<Chart series={series} label="chart" />);
    expect(screen.getByText('Stemming')).toBeInTheDocument();
    expect(screen.getByText('Vlakheid')).toBeInTheDocument();
  });

  it('draws medication changes as vertical rules and lists them', () => {
    // PRD 6.6 — this is the entire clinical value of the product.
    const { container } = render(
      <Chart
        series={series}
        markers={[{ position: 0.5, label: 'Quetiapine 200 mg naar 300 mg' }]}
        label="chart"
      />,
    );
    const verticals = [...container.querySelectorAll('line')].filter(
      (line) => line.getAttribute('x1') === line.getAttribute('x2'),
    );
    expect(verticals).toHaveLength(1);
    expect(screen.getByText('Quetiapine 200 mg naar 300 mg')).toBeInTheDocument();
  });

  it('shows no percentage, no trend arrow and no comparison', () => {
    const { container } = render(
      <Chart series={series} markers={[{ position: 0.2, label: 'Dosis gewijzigd' }]} label="c" />,
    );
    expect(container.textContent).not.toMatch(/%|↑|↓|beter|worse|better/i);
  });
});
