import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LocaleProvider } from '../providers/LocaleProvider';
import { Invite } from './Invite';

const createInvite = vi.fn();

vi.mock('../firebase/circle', () => ({
  createInvite: (uid: string, values: unknown) => createInvite(uid, values),
}));

vi.mock('../providers/AuthProvider', () => ({
  useAuth: () => ({ user: { uid: 'uid-jonas' }, status: 'signed-in' }),
}));

const renderInvite = () =>
  render(
    <LocaleProvider initialLocale="nl">
      <MemoryRouter initialEntries={['/circle/invite']}>
        <Invite />
      </MemoryRouter>
    </LocaleProvider>,
  );

const checkbox = (name: string) => screen.getByRole('checkbox', { name });

beforeEach(() => {
  createInvite.mockResolvedValue({ code: 'abcdefghjkmn' });
});

describe('Invite', () => {
  /*
   * PRD 6.4. This is the test that matters on this screen: an invite sent on
   * a bad day must not hand over a clinical record. If a default ever widens
   * by accident, this fails.
   */
  it('starts a supporter on feed and calendar, and nothing clinical', () => {
    renderInvite();
    expect(checkbox('Kan zien wat je deelt, en kan reageren.')).toBeChecked();
    expect(checkbox('Kan je agenda zien en iets voorstellen.')).toBeChecked();
    expect(checkbox('Kan zien hoe je je voelde.')).not.toBeChecked();
    expect(checkbox('Kan zien wat je neemt en of je het nam.')).not.toBeChecked();
    expect(checkbox('Kan zien wat je horloge doorgaf.')).not.toBeChecked();
  });

  it('starts a clinician on the clinical picture and nothing social', async () => {
    renderInvite();
    await userEvent.click(screen.getByRole('radio', { name: 'Zorgverlener' }));

    expect(checkbox('Kan zien hoe je je voelde.')).toBeChecked();
    expect(checkbox('Kan zien wat je neemt en of je het nam.')).toBeChecked();
    expect(checkbox('Kan zien wat je deelt, en kan reageren.')).not.toBeChecked();
  });

  it('sends exactly what was ticked, and no more', async () => {
    renderInvite();
    await userEvent.click(checkbox('Kan zien hoe je je voelde.'));
    await userEvent.click(screen.getByRole('button', { name: 'Maak een link' }));

    expect(createInvite).toHaveBeenCalledWith('uid-jonas', {
      role: 'supporter',
      relation: '',
      permissions: {
        checkins: true,
        medication: false,
        health: false,
        feed: true,
        calendar: true,
      },
    });
  });

  it('shows the link to share once it exists', async () => {
    renderInvite();
    await userEvent.click(screen.getByRole('button', { name: 'Maak een link' }));
    expect(await screen.findByText(/\/join\/abcdefghjkmn$/)).toBeInTheDocument();
  });
});
