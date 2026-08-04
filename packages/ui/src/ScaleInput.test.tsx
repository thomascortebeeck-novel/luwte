import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ScaleInput, type ScaleValue } from './ScaleInput';

const STEPS = [
  'heel weinig',
  'weinig',
  'eerder weinig',
  'ertussenin',
  'eerder veel',
  'veel',
  'heel veel',
] as const;

const setup = (value: ScaleValue | null = null) => {
  const onChange = vi.fn();
  render(
    <ScaleInput
      name="mood"
      legend="Hoe voelde je je?"
      value={value}
      onChange={onChange}
      lowLabel="weinig"
      highLabel="veel"
      stepLabels={STEPS}
    />,
  );
  return { onChange, options: screen.getAllByRole('radio') };
};

describe('ScaleInput', () => {
  it('exposes seven options in a radiogroup labelled by the question', () => {
    const { options } = setup();
    expect(screen.getByRole('radiogroup', { name: 'Hoe voelde je je?' })).toBeInTheDocument();
    expect(options).toHaveLength(7);
  });

  it('never renders a digit', () => {
    // BRAND 3.4 / PRD 6.1 — faces or a slider, never a visible number.
    setup(4);
    const group = screen.getByRole('radiogroup');
    expect(group.textContent ?? '').not.toMatch(/\d/);
    for (const radio of screen.getAllByRole('radio')) {
      expect(radio.getAttribute('aria-label') ?? '').not.toMatch(/\d/);
    }
  });

  it('names each option in words for a screen reader', () => {
    setup();
    expect(screen.getByRole('radio', { name: 'ertussenin' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'heel veel' })).toBeInTheDocument();
  });

  it('reports the chosen value', async () => {
    const { onChange, options } = setup();
    await userEvent.click(options[2]!);
    expect(onChange).toHaveBeenCalledWith(3);
  });

  it('marks only the chosen option as checked', () => {
    const { options } = setup(5);
    expect(options.map((o) => o.getAttribute('aria-checked'))).toEqual([
      'false',
      'false',
      'false',
      'false',
      'true',
      'false',
      'false',
    ]);
  });

  it('moves with the arrow keys', async () => {
    const { onChange, options } = setup(3);
    options[2]!.focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(onChange).toHaveBeenCalledWith(4);
  });

  it('moves backwards too', async () => {
    const { onChange, options } = setup(3);
    options[2]!.focus();
    await userEvent.keyboard('{ArrowLeft}');
    expect(onChange).toHaveBeenCalledWith(2);
  });

  it('does not move past either end', async () => {
    const high = setup(7);
    high.options[6]!.focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(high.onChange).not.toHaveBeenCalled();
  });

  it('keeps exactly one option in the tab order once answered', () => {
    const { options } = setup(5);
    const tabbable = options.filter((o) => o.tabIndex === 0);
    expect(tabbable).toHaveLength(1);
    expect(tabbable[0]!.getAttribute('aria-checked')).toBe('true');
  });

  it('keeps exactly one option in the tab order while unanswered', () => {
    const { options } = setup(null);
    expect(options.filter((o) => o.tabIndex === 0)).toHaveLength(1);
  });

  it('shows the anchors as words, hidden from screen readers as decoration', () => {
    setup();
    const anchors = screen.getByText('weinig', { selector: 'span' });
    expect(anchors).toBeInTheDocument();
    expect(anchors.closest('[aria-hidden="true"]')).not.toBeNull();
  });
});
