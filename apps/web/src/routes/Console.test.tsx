import { DEFAULT_CLINICIAN_PERMISSIONS, DEFAULT_PERMISSIONS } from '@luwte/core';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LocaleProvider } from '../providers/LocaleProvider';
import { Console } from './Console';
import type { AddressedInvite, Membership } from '../firebase/circle';

const readMemberships = vi.fn<() => Promise<Membership[]>>();
const readAddressedInvites = vi.fn<() => Promise<AddressedInvite[]>>();
const redeemInvite = vi.fn<(code: string, uid: string) => Promise<'joined' | 'unusable'>>();
const isVerifiedClinician = vi.fn<() => Promise<boolean>>();
const readMyRequest = vi.fn<() => Promise<unknown>>();
const applyForVerification = vi.fn<() => Promise<void>>();

vi.mock('../firebase/circle', () => ({
  readMemberships: () => readMemberships(),
  readAddressedInvites: () => readAddressedInvites(),
  redeemInvite: (code: string, uid: string) => redeemInvite(code, uid),
}));

const readMyDirectoryEntry = vi.fn<() => Promise<unknown>>();

vi.mock('../firebase/clinician', () => ({
  isVerifiedClinician: () => isVerifiedClinician(),
  readMyRequest: () => readMyRequest(),
  readMyDirectoryEntry: () => readMyDirectoryEntry(),
  applyForVerification: () => applyForVerification(),
}));

vi.mock('../providers/AuthProvider', () => ({
  useAuth: () => ({ user: { uid: 'uid-doctor' }, status: 'signed-in' }),
}));

const membership = (overrides: Partial<Membership> = {}): Membership => ({
  patientId: 'uid-jonas',
  patientName: 'Jonas',
  role: 'clinician',
  permissions: { ...DEFAULT_CLINICIAN_PERMISSIONS },
  ...overrides,
});

const renderConsole = () =>
  render(
    <LocaleProvider initialLocale="nl">
      <MemoryRouter initialEntries={['/console']}>
        <Console />
      </MemoryRouter>
    </LocaleProvider>,
  );

const asked = (overrides: Partial<AddressedInvite> = {}): AddressedInvite => ({
  code: 'abcdefghjkmn',
  patientId: 'uid-jonas',
  patientName: 'Jonas',
  role: 'clinician',
  permissions: { ...DEFAULT_CLINICIAN_PERMISSIONS },
  createdAt: new Date('2026-08-05T10:00:00Z'),
  expiresAt: new Date('2099-01-01T00:00:00Z'),
  usedBy: null,
  forUid: 'uid-doctor',
  ...overrides,
});

beforeEach(() => {
  readMemberships.mockResolvedValue([]);
  readAddressedInvites.mockResolvedValue([]);
  redeemInvite.mockResolvedValue('joined');
  isVerifiedClinician.mockResolvedValue(true);
  readMyRequest.mockResolvedValue(null);
  readMyDirectoryEntry.mockResolvedValue(null);
});

describe('Console', () => {
  it('says nobody has granted access rather than leaving the screen blank', async () => {
    renderConsole();
    expect(await screen.findByText('Nog niemand heeft je toegang gegeven.')).toBeInTheDocument();
  });

  it('lists the patients who granted access, by name', async () => {
    readMemberships.mockResolvedValue([membership()]);
    renderConsole();
    expect(await screen.findByText('Jonas')).toBeInTheDocument();
  });

  /*
   * A clinician can also be somebody's supporter — a psychiatrist may have a
   * brother too. The console is only for the people who invited them *as* a
   * clinician; the rest belong in the ordinary app.
   */
  it('leaves out people who invited them as a supporter', async () => {
    readMemberships.mockResolvedValue([
      membership({ patientId: 'uid-sister', patientName: 'Els', role: 'supporter', permissions: { ...DEFAULT_PERMISSIONS } }),
    ]);
    renderConsole();
    expect(await screen.findByText('Nog niemand heeft je toegang gegeven.')).toBeInTheDocument();
    expect(screen.queryByText('Els')).not.toBeInTheDocument();
  });

  it('still shows someone who never set a name', async () => {
    readMemberships.mockResolvedValue([membership({ patientName: '' })]);
    renderConsole();
    expect(await screen.findByText('Zonder naam')).toBeInTheDocument();
  });

  /*
   * D27 — a person decides who is a clinician, in the admin panel. Until they
   * have, the console shows nobody. The screen matters less than the rules
   * behind it, which refuse the reads regardless; this is so an unverified
   * clinician is told what is happening rather than shown an empty list they
   * would read as "nobody trusts me".
   */
  describe('before an admin has checked them', () => {
    it('offers the application instead of a patient list', async () => {
      isVerifiedClinician.mockResolvedValue(false);
      renderConsole();
      expect(await screen.findByLabelText('Je RIZIV-nummer')).toBeInTheDocument();
    });

    it('shows no patients, even when the circle says they have some', async () => {
      isVerifiedClinician.mockResolvedValue(false);
      readMemberships.mockResolvedValue([membership()]);
      renderConsole();
      await screen.findByLabelText('Je RIZIV-nummer');
      expect(screen.queryByText('Jonas')).not.toBeInTheDocument();
    });

    it('says the request is waiting rather than asking again', async () => {
      isVerifiedClinician.mockResolvedValue(false);
      readMyRequest.mockResolvedValue({ uid: 'uid-doctor', outcome: null });
      renderConsole();
      expect(
        await screen.findByText('Je aanvraag is verstuurd. Iemand kijkt ernaar.'),
      ).toBeInTheDocument();
    });

    it('lets somebody who was declined apply again, and says so', async () => {
      isVerifiedClinician.mockResolvedValue(false);
      readMyRequest.mockResolvedValue({ uid: 'uid-doctor', outcome: 'declined' });
      renderConsole();
      expect(await screen.findByText(/niet goedgekeurd/)).toBeInTheDocument();
      expect(screen.getByLabelText('Je RIZIV-nummer')).toBeInTheDocument();
    });
  });

  /*
   * The other half of "a person finds their doctor by name and asks". The
   * patient issued an invite addressed to this clinician; nothing exists in
   * their circle until it is accepted here.
   */
  describe('what has been asked of them', () => {
    it('names who is asking and what accepting would show', async () => {
      readAddressedInvites.mockResolvedValue([asked()]);
      renderConsole();
      expect(await screen.findByText(/Jonas/)).toBeInTheDocument();
      // The clinician's own wording, not the sentences written to the patient
      // — "Kan zien hoe je je voelde" would mean the wrong person here.
      expect(screen.getByText('Hoe het gaat, dag per dag')).toBeInTheDocument();
      // Two lines since D29, because they are two permissions.
      expect(screen.getByText('Welke medicatie er genomen wordt')).toBeInTheDocument();
      expect(screen.getByText('Of de medicatie genomen is')).toBeInTheDocument();
    });

    it('says plainly that doing nothing lets it lapse, and tells nobody', async () => {
      readAddressedInvites.mockResolvedValue([asked()]);
      renderConsole();
      expect(
        await screen.findByText(
          'Doe je niets, dan vervalt de vraag na een week. Er wordt niemand iets gezegd.',
        ),
      ).toBeInTheDocument();
    });

    it('accepts by redeeming the invite it was asked with', async () => {
      readAddressedInvites.mockResolvedValue([asked()]);
      renderConsole();
      fireEvent.click(await screen.findByRole('button', { name: 'Aannemen' }));
      await waitFor(() => expect(redeemInvite).toHaveBeenCalledWith('abcdefghjkmn', 'uid-doctor'));
    });

    it('offers no way to decline, because silence is the decline', async () => {
      // Declining is silent by rule everywhere else in this product — a
      // declined activity, a declined medication request. A button reporting
      // a refusal would turn that silence into a message.
      readAddressedInvites.mockResolvedValue([asked()]);
      renderConsole();
      await screen.findByRole('button', { name: 'Aannemen' });
      expect(screen.queryByRole('button', { name: /weiger|afwijzen|decline/i })).toBeNull();
    });

    it('shows nothing at all when nobody has asked', async () => {
      renderConsole();
      await screen.findByText('Nog niemand heeft je toegang gegeven.');
      expect(screen.queryByText('Vragen aan jou')).toBeNull();
    });

    it('shows no requests to somebody the admin has not checked yet', async () => {
      // The rules refuse the circle write regardless, so this is about not
      // offering an action that would fail — and not implying verification
      // is a formality that can be worked around.
      isVerifiedClinician.mockResolvedValue(false);
      readAddressedInvites.mockResolvedValue([asked()]);
      renderConsole();
      await screen.findByLabelText('Je RIZIV-nummer');
      expect(screen.queryByText('Vragen aan jou')).toBeNull();
    });
  });
});
