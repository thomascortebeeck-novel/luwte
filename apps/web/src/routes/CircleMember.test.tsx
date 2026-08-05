import { DEFAULT_PERMISSIONS } from '@luwte/core';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LocaleProvider } from '../providers/LocaleProvider';
import { CircleMember } from './CircleMember';
import { PermissionLog } from './PermissionLog';
import type { CircleMemberRecord, PermissionChangeRecord } from '../firebase/circle';

const readCircleMember = vi.fn<() => Promise<CircleMemberRecord | null>>();
const saveMemberPermissions = vi.fn<(...args: unknown[]) => Promise<void>>();
const readPermissionLog = vi.fn<() => Promise<PermissionChangeRecord[]>>();

vi.mock('../firebase/circle', () => ({
  readCircleMember: () => readCircleMember(),
  saveMemberPermissions: (...args: unknown[]) => saveMemberPermissions(...args),
  saveMemberRelation: vi.fn(),
  revokeMember: vi.fn(),
  restoreMember: vi.fn(),
  readPermissionLog: () => readPermissionLog(),
}));

vi.mock('../providers/AuthProvider', () => ({
  useAuth: () => ({ user: { uid: 'uid-jonas' }, status: 'signed-in' }),
}));

vi.mock('../providers/AccountProvider', () => ({
  useAccount: () => ({ patient: { timezone: 'Europe/Brussels' } }),
}));

const brother = (overrides: Partial<CircleMemberRecord> = {}): CircleMemberRecord => ({
  uid: 'uid-wout',
  role: 'supporter',
  relation: 'broer',
  permissions: { ...DEFAULT_PERMISSIONS },
  grantedAt: new Date('2026-08-01T10:00:00Z'),
  revokedAt: null,
  ...overrides,
});

const renderMember = () =>
  render(
    <LocaleProvider initialLocale="nl">
      <MemoryRouter initialEntries={['/circle/uid-wout']}>
        <Routes>
          <Route path="/circle/:memberUid" element={<CircleMember />} />
        </Routes>
      </MemoryRouter>
    </LocaleProvider>,
  );

const tick = async (label: string) => {
  await userEvent.click(screen.getByRole('checkbox', { name: label }));
};

beforeEach(() => {
  readCircleMember.mockResolvedValue(brother());
  saveMemberPermissions.mockResolvedValue();
  readPermissionLog.mockResolvedValue([]);
});

describe('what one person may see', () => {
  /*
   * D29 — a supporter is offered every sentence, including the two clinical
   * ones. This is the reversal Thomas decided: the person is in full control,
   * and a blanket ban is the app deciding for them.
   */
  it('offers family both medication sentences, separately', async () => {
    renderMember();
    expect(
      await screen.findByRole('checkbox', { name: 'Kan zien welke medicatie je neemt.' }),
    ).not.toBeChecked();
    expect(
      screen.getByRole('checkbox', { name: 'Kan zien of je je medicatie nam.' }),
    ).not.toBeChecked();
  });

  it('stops to say what turning one on means, naming the person', async () => {
    renderMember();
    await screen.findByRole('checkbox', { name: 'Kan zien of je je medicatie nam.' });
    await tick('Kan zien of je je medicatie nam.');

    expect(screen.getByText(/broer ziet dan elke dag of je je medicatie nam/)).toBeInTheDocument();
    // The half of the old ban that is kept, said where it matters.
    expect(screen.getByText(/Er wordt niemand iets gestuurd/)).toBeInTheDocument();
  });

  it('changes nothing until it is confirmed', async () => {
    renderMember();
    await screen.findByRole('checkbox', { name: 'Kan zien of je je medicatie nam.' });
    await tick('Kan zien of je je medicatie nam.');
    await userEvent.click(screen.getByRole('button', { name: 'Toch niet' }));

    expect(saveMemberPermissions).not.toHaveBeenCalled();
    expect(screen.getByRole('checkbox', { name: 'Kan zien of je je medicatie nam.' })).not.toBeChecked();
  });

  it('saves it, and what it was before, once confirmed', async () => {
    renderMember();
    await screen.findByRole('checkbox', { name: 'Kan zien of je je medicatie nam.' });
    await tick('Kan zien of je je medicatie nam.');
    await userEvent.click(screen.getByRole('button', { name: 'Ja, dat mag' }));

    expect(saveMemberPermissions).toHaveBeenCalledWith(
      'uid-jonas',
      'uid-wout',
      expect.objectContaining({ doses: true, medication: false }),
      // The previous state rides along so the log can say what changed.
      expect.objectContaining({ permissions: expect.objectContaining({ doses: false }) }),
    );
  });

  it('never stops to confirm turning one off', async () => {
    /*
     * Narrowing is instant and silent. Asking somebody whether they are sure
     * they want to stop sharing their medication is the app arguing with them
     * about their own decision.
     */
    readCircleMember.mockResolvedValue(
      brother({ permissions: { ...DEFAULT_PERMISSIONS, doses: true } }),
    );
    renderMember();
    await screen.findByRole('checkbox', { name: 'Kan zien of je je medicatie nam.' });
    await tick('Kan zien of je je medicatie nam.');

    expect(screen.queryByText('Wat dit betekent')).not.toBeInTheDocument();
    expect(saveMemberPermissions).toHaveBeenCalledWith(
      'uid-jonas',
      'uid-wout',
      expect.objectContaining({ doses: false }),
      expect.anything(),
    );
  });

  it('never stops to confirm something that is not clinical', async () => {
    renderMember();
    await screen.findByRole('checkbox', { name: 'Kan zien hoe je je voelde.' });
    await tick('Kan zien hoe je je voelde.');

    expect(screen.queryByText('Wat dit betekent')).not.toBeInTheDocument();
    expect(saveMemberPermissions).toHaveBeenCalled();
  });
});

describe('the record of what was given', () => {
  const renderLog = () =>
    render(
      <LocaleProvider initialLocale="nl">
        <MemoryRouter initialEntries={['/circle/log']}>
          <PermissionLog />
        </MemoryRouter>
      </LocaleProvider>,
    );

  it('says plainly that nobody else sees it', async () => {
    renderLog();
    expect(await screen.findByText(/Alleen jij ziet dit/)).toBeInTheDocument();
  });

  it('says nothing has changed rather than showing an empty frame', async () => {
    renderLog();
    expect(await screen.findByText('Je hebt nog niets veranderd.')).toBeInTheDocument();
  });

  it('names who, what and when, in both directions', async () => {
    readPermissionLog.mockResolvedValue([
      {
        id: 'e1',
        memberUid: 'uid-wout',
        relation: 'broer',
        granted: ['doses'],
        withdrawn: ['feed'],
        at: new Date('2026-08-05T09:00:00Z'),
      },
    ]);
    renderLog();

    expect(await screen.findByText('broer')).toBeInTheDocument();
    expect(screen.getByText(/woensdag 5 augustus/)).toBeInTheDocument();
    expect(screen.getByText(/Gegeven: Of de medicatie genomen is/)).toBeInTheDocument();
    // A history that only recorded widening would answer "what did I agree
    // to" and never "when did I stop".
    expect(screen.getByText(/Ingetrokken:/)).toBeInTheDocument();
  });
});
