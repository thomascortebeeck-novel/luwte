import { DEFAULT_PERMISSIONS } from '@luwte/core';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LocaleProvider } from '../providers/LocaleProvider';
import { Join } from './Join';
import type { InviteRecord } from '../firebase/circle';

const readInviteByCode = vi.fn<() => Promise<InviteRecord | null>>();
const redeemInvite = vi.fn<() => Promise<'joined' | 'unusable'>>();

vi.mock('../firebase/circle', () => ({
  readInviteByCode: () => readInviteByCode(),
  redeemInvite: () => redeemInvite(),
}));

vi.mock('../providers/AuthProvider', () => ({
  useAuth: () => ({ user: { uid: 'uid-broer' }, status: 'signed-in' }),
}));

vi.mock('../providers/AccountProvider', () => ({
  useAccount: () => ({ patient: { onboarded: true }, status: 'ready' }),
}));

const invite = (overrides: Partial<InviteRecord> = {}): InviteRecord => ({
  code: 'abcdefghjkmn',
  patientId: 'uid-jonas',
  role: 'supporter',
  permissions: { ...DEFAULT_PERMISSIONS },
  createdAt: new Date('2026-08-04T10:00:00Z'),
  expiresAt: new Date('2099-01-01T00:00:00Z'),
  usedBy: null,
  // The bearer kind. An invite addressed to one person never reaches /join
  // by a shared link, because there is no link to share.
  forUid: null,
  ...overrides,
});

const renderJoin = () =>
  render(
    <LocaleProvider initialLocale="nl">
      <MemoryRouter initialEntries={['/join/abcdefghjkmn']}>
        <Routes>
          <Route path="/join/:code" element={<Join />} />
          <Route path="/" element={<p>vandaag</p>} />
        </Routes>
      </MemoryRouter>
    </LocaleProvider>,
  );

beforeEach(() => {
  readInviteByCode.mockResolvedValue(invite());
  redeemInvite.mockResolvedValue('joined');
});

describe('Join', () => {
  it('states what accepting gives access to, before accepting', async () => {
    renderJoin();
    expect(await screen.findByText('Als je dit aanneemt, zie je het volgende:')).toBeInTheDocument();
    expect(screen.getByText('Kan zien wat je deelt en kan reageren.')).toBeInTheDocument();
    expect(screen.queryByText('Kan zien hoe je je voelde.')).not.toBeInTheDocument();
  });

  it('is honest when an invite grants nothing yet', async () => {
    readInviteByCode.mockResolvedValue(
      invite({ permissions: { ...DEFAULT_PERMISSIONS, feed: false, calendar: false } }),
    );
    renderJoin();
    expect(
      await screen.findByText('Voorlopig zie je nog niets. Dat kan later veranderen.'),
    ).toBeInTheDocument();
  });

  it('refuses an expired invite without offering to accept it', async () => {
    readInviteByCode.mockResolvedValue(invite({ expiresAt: new Date('2020-01-01T00:00:00Z') }));
    renderJoin();

    expect(await screen.findByText('Deze link werkt niet meer. Vraag er een nieuwe.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Aannemen' })).not.toBeInTheDocument();
  });

  it('refuses an invite somebody else already claimed', async () => {
    readInviteByCode.mockResolvedValue(invite({ usedBy: 'uid-someone-else' }));
    renderJoin();
    expect(await screen.findByText('Deze link werkt niet meer. Vraag er een nieuwe.')).toBeInTheDocument();
  });

  it('refuses a code that names no invite at all', async () => {
    readInviteByCode.mockResolvedValue(null);
    renderJoin();
    expect(await screen.findByText('Deze link werkt niet meer. Vraag er een nieuwe.')).toBeInTheDocument();
  });

  it('confirms once the entry is written', async () => {
    renderJoin();
    await userEvent.click(await screen.findByRole('button', { name: 'Aannemen' }));
    expect(await screen.findByText('Klaar. Je hebt nu toegang.')).toBeInTheDocument();
  });

  it('treats a refusal from the rules as a link that does not work', async () => {
    // Most often someone who was in this circle and was removed: redemption
    // is a create, the document already exists, and the rules say no.
    redeemInvite.mockRejectedValue(new Error('permission-denied'));
    renderJoin();
    await userEvent.click(await screen.findByRole('button', { name: 'Aannemen' }));
    expect(await screen.findByText('Deze link werkt niet meer. Vraag er een nieuwe.')).toBeInTheDocument();
  });
});
