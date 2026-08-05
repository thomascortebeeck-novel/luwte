import { DEFAULT_PERMISSIONS } from '@luwte/core';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LocaleProvider } from '../providers/LocaleProvider';
import { Circle } from './Circle';
import type { CircleMemberRecord, InviteRecord } from '../firebase/circle';

const readCircle = vi.fn<() => Promise<CircleMemberRecord[]>>();
const readOpenInvites = vi.fn<() => Promise<InviteRecord[]>>();
const withdrawInvite = vi.fn<() => Promise<void>>();

vi.mock('../firebase/circle', () => ({
  readCircle: () => readCircle(),
  readOpenInvites: () => readOpenInvites(),
  withdrawInvite: () => withdrawInvite(),
}));

vi.mock('../providers/AuthProvider', () => ({
  useAuth: () => ({ user: { uid: 'uid-jonas' }, status: 'signed-in' }),
}));

const member = (overrides: Partial<CircleMemberRecord> = {}): CircleMemberRecord => ({
  uid: 'uid-broer',
  role: 'supporter',
  relation: 'broer',
  permissions: { ...DEFAULT_PERMISSIONS },
  grantedAt: new Date('2026-08-01T10:00:00Z'),
  revokedAt: null,
  ...overrides,
});

const renderCircle = () =>
  render(
    <LocaleProvider initialLocale="nl">
      <MemoryRouter initialEntries={['/circle']}>
        <Circle />
      </MemoryRouter>
    </LocaleProvider>,
  );

beforeEach(() => {
  readCircle.mockResolvedValue([]);
  readOpenInvites.mockResolvedValue([]);
  withdrawInvite.mockResolvedValue();
});

describe('Circle', () => {
  it('says nothing is shared rather than leaving the screen blank', async () => {
    renderCircle();
    expect(await screen.findByText('Nog niemand ziet iets. Dat mag.')).toBeInTheDocument();
  });

  it('lists what a person can see, and never what they cannot', async () => {
    readCircle.mockResolvedValue([member()]);
    renderCircle();

    expect(await screen.findByText('Kan zien wat je deelt en kan reageren.')).toBeInTheDocument();
    expect(screen.getByText('Kan je agenda zien en iets voorstellen.')).toBeInTheDocument();
    // Feed and calendar are the defaults; the three that are off must not
    // appear at all, as a list of what is being withheld.
    expect(screen.queryByText('Kan zien hoe je je voelde.')).not.toBeInTheDocument();
    expect(screen.queryByText('Kan zien wat je neemt en of je het nam.')).not.toBeInTheDocument();
    expect(screen.queryByText('Kan zien wat je horloge doorgaf.')).not.toBeInTheDocument();
  });

  it('states plainly when someone was granted nothing', async () => {
    readCircle.mockResolvedValue([
      member({ permissions: { ...DEFAULT_PERMISSIONS, feed: false, calendar: false } }),
    ]);
    renderCircle();
    expect(await screen.findByText('Ziet nog niets van wat je invult.')).toBeInTheDocument();
  });

  it('shows a revoked person as seeing nothing, without listing old permissions', async () => {
    readCircle.mockResolvedValue([member({ revokedAt: new Date('2026-08-03T09:00:00Z') })]);
    renderCircle();

    expect(await screen.findByText('Ziet niets meer.')).toBeInTheDocument();
    expect(screen.queryByText('Kan zien wat je deelt en kan reageren.')).not.toBeInTheDocument();
  });

  it('calls a person by the name the patient gave them', async () => {
    readCircle.mockResolvedValue([member({ relation: 'mama' })]);
    renderCircle();
    expect(await screen.findByText('mama')).toBeInTheDocument();
  });

  it('falls back to the role when no relation has been written yet', async () => {
    readCircle.mockResolvedValue([member({ relation: '', role: 'clinician' })]);
    renderCircle();
    expect(await screen.findByText('Arts')).toBeInTheDocument();
  });

  it('shows an open invite as a link that can be sent, and withdrawn', async () => {
    readOpenInvites.mockResolvedValue([
      {
        code: 'abcdefghjkmn',
        patientId: 'uid-jonas',
        role: 'supporter',
        permissions: { ...DEFAULT_PERMISSIONS },
        createdAt: new Date('2026-08-04T10:00:00Z'),
        expiresAt: new Date('2026-08-11T10:00:00Z'),
        usedBy: null,
        // A link anyone holding it can use — the ordinary kind.
        forUid: null,
      },
    ]);
    renderCircle();

    expect(await screen.findByText(/\/join\/abcdefghjkmn$/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Intrekken' }));
    expect(withdrawInvite).toHaveBeenCalled();
  });
});
