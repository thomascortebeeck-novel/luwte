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

vi.mock('../providers/AccountProvider', () => ({
  useAccount: () => ({ patient: { displayName: 'Jonas', onboarded: true }, status: 'ready' }),
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
    expect(checkbox('Kan zien wat je deelt en kan reageren.')).toBeChecked();
    expect(checkbox('Kan je agenda zien en iets voorstellen.')).toBeChecked();
    expect(checkbox('Kan zien hoe je je voelde.')).not.toBeChecked();
    expect(checkbox('Kan zien wat je horloge doorgaf.')).not.toBeChecked();
  });

  /*
   * D29 — this used to assert that family are never *offered* medication.
   * Thomas decided the other way: the person is in full control, and a
   * blanket ban is the app deciding for them. So the toggles are offered to
   * everybody, off by default, and confirmed in words on the member screen
   * before they take effect.
   */
  it('offers medication and doses to family and friends, both off', () => {
    renderInvite();
    expect(checkbox('Kan zien welke medicatie je neemt.')).not.toBeChecked();
    expect(checkbox('Kan zien of je je medicatie nam.')).not.toBeChecked();
  });

  it('starts a clinician on the clinical picture and nothing social', async () => {
    renderInvite();
    await userEvent.click(screen.getByRole('radio', { name: 'Arts' }));

    expect(checkbox('Kan zien hoe je je voelde.')).toBeChecked();
    expect(checkbox('Kan zien welke medicatie je neemt.')).toBeChecked();
    // Adherence is the fact a clinician came for. They read it and, by the
    // rules, can never write it.
    expect(checkbox('Kan zien of je je medicatie nam.')).toBeChecked();
    expect(checkbox('Kan zien wat je deelt en kan reageren.')).not.toBeChecked();
  });

  it('sends exactly what was ticked, and no more', async () => {
    renderInvite();
    await userEvent.click(checkbox('Kan zien hoe je je voelde.'));
    await userEvent.click(screen.getByRole('button', { name: 'Maak een link' }));

    expect(createInvite).toHaveBeenCalledWith('uid-jonas', {
      role: 'supporter',
      relation: '',
      patientName: 'Jonas',
      permissions: {
        checkins: true,
        medication: false,
        doses: false,
        health: false,
        feed: true,
        calendar: true,
        plan: false,
      },
    });
  });

  /*
   * D30 — a nurse is a third choice, and the screen says at the point of
   * choosing what it means. "Verpleegkundige" does not on its own tell
   * somebody that this person cannot prescribe and cannot put anything on
   * their calendar.
   */
  it('offers a nurse, and says there what a nurse cannot do', async () => {
    renderInvite();
    await userEvent.click(screen.getByRole('radio', { name: 'Verpleegkundige' }));
    expect(screen.getByText(/Kan geen medicatie voorschrijven/)).toBeInTheDocument();
  });

  it('starts a nurse narrow, like anyone else the person invites', async () => {
    // Reading medication is something this person decides to give, not
    // something a job title collects on arrival.
    renderInvite();
    await userEvent.click(screen.getByRole('radio', { name: 'Verpleegkundige' }));
    expect(checkbox('Kan zien welke medicatie je neemt.')).not.toBeChecked();
    expect(checkbox('Kan je agenda zien en iets voorstellen.')).toBeChecked();
  });

  it('shows the link to share once it exists', async () => {
    renderInvite();
    await userEvent.click(screen.getByRole('button', { name: 'Maak een link' }));
    expect(await screen.findByText(/\/join\/abcdefghjkmn$/)).toBeInTheDocument();
  });
});
