import { DEFAULT_CLINICIAN_PERMISSIONS, DEFAULT_PERMISSIONS } from '@luwte/core';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LocaleProvider } from '../providers/LocaleProvider';
import { Console } from './Console';
import type { Membership } from '../firebase/circle';

const readMemberships = vi.fn<() => Promise<Membership[]>>();
const isVerifiedClinician = vi.fn<() => Promise<boolean>>();
const readMyRequest = vi.fn<() => Promise<unknown>>();
const applyForVerification = vi.fn<() => Promise<void>>();

vi.mock('../firebase/circle', () => ({
  readMemberships: () => readMemberships(),
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

beforeEach(() => {
  readMemberships.mockResolvedValue([]);
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
});
