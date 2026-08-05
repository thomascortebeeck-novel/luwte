import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { LocaleProvider } from '../providers/LocaleProvider';
import { Breathing } from './Breathing';
import { Grounding } from './Grounding';

vi.mock('../providers/AuthProvider', () => ({
  useAuth: () => ({ user: { uid: 'uid-jonas' }, status: 'signed-in' }),
}));

const renderAt = (element: React.ReactElement, path: string) =>
  render(
    <LocaleProvider initialLocale="nl">
      <MemoryRouter initialEntries={[path]}>{element}</MemoryRouter>
    </LocaleProvider>,
  );

describe('Breathing', () => {
  it('waits to be started rather than beginning on arrival', async () => {
    // Landing on a screen that has already started breathing at you is the
    // opposite of an offer.
    renderAt(<Breathing />, '/breathing');
    expect(await screen.findByRole('button', { name: 'Beginnen' })).toBeInTheDocument();
    expect(screen.queryByText('in')).not.toBeInTheDocument();
  });

  it('says it can be stopped, before it starts', async () => {
    renderAt(<Breathing />, '/breathing');
    expect(await screen.findByText(/Je mag altijd stoppen/)).toBeInTheDocument();
  });

  it('guides out loud once running, and offers a way out', async () => {
    const user = userEvent.setup();
    renderAt(<Breathing />, '/breathing');

    await user.click(await screen.findByRole('button', { name: 'Beginnen' }));
    expect(screen.getByText('in')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Stoppen' })).toBeInTheDocument();
  });

  it('shows how far in you are without a number anywhere', async () => {
    // BRAND — the progress is dots, like the check-in's. A countdown turns a
    // minute of breathing into a minute of waiting.
    renderAt(<Breathing />, '/breathing');
    const progress = await screen.findByRole('img', { name: 'Hoeveel ademhalingen je gehad hebt' });
    expect(progress.textContent).toBe('');
  });
});

describe('Grounding', () => {
  it('counts five things down to one, and then stops', async () => {
    const user = userEvent.setup();
    renderAt(<Grounding />, '/grounding');

    for (const [count, what] of [
      ['5', 'dingen die je ziet'],
      ['4', 'dingen die je hoort'],
      ['3', 'dingen die je kan voelen'],
      ['2', 'dingen die je ruikt'],
      ['1', 'ding dat je proeft'],
    ]) {
      expect(screen.getByText(count!)).toBeInTheDocument();
      expect(screen.getByText(what!)).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'Verder' }));
    }

    expect(screen.getByText('Klaar.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Verder' })).not.toBeInTheDocument();
  });

  it('asks for nothing to be filled in', async () => {
    /*
     * A form here would collect data about somebody's worst ten minutes and
     * turn the exercise into a record instead of a thing you do.
     */
    renderAt(<Grounding />, '/grounding');
    expect(await screen.findByText(/Er hoeft niets ingevuld te worden/)).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });
});
