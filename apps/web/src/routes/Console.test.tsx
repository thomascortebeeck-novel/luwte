import { DEFAULT_CLINICIAN_PERMISSIONS, DEFAULT_PERMISSIONS } from '@luwte/core';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LocaleProvider } from '../providers/LocaleProvider';
import { Console } from './Console';
import type { Membership } from '../firebase/circle';

const readMemberships = vi.fn<() => Promise<Membership[]>>();

vi.mock('../firebase/circle', () => ({
  readMemberships: () => readMemberships(),
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
});
