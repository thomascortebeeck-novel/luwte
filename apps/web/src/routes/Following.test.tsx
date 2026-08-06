import { DEFAULT_PERMISSIONS, DEFAULT_TIMEZONE, SUPPORT_DAILY, dateKey, dictionaries, supportTipFor } from '@luwte/core';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Membership } from '../firebase/circle';
import { LocaleProvider } from '../providers/LocaleProvider';
import { Following } from './Following';

const readMemberships = vi.fn<() => Promise<Membership[]>>();

vi.mock('../firebase/circle', () => ({
  readMemberships: () => readMemberships(),
}));

// `Following.tsx` also exports `FollowingCalendar`, which pulls in
// `../firebase/activities` at module scope — and that module reaches the
// real Firebase client, which throws with no project configured in tests.
// Not exercised by the `Following` component itself, so a static stub.
vi.mock('../firebase/activities', () => ({
  readSharedActivities: () => Promise.resolve([]),
  createActivity: () => Promise.resolve(),
}));

vi.mock('../providers/AuthProvider', () => ({
  useAuth: () => ({ user: { uid: 'uid-jonas' }, status: 'signed-in' }),
}));

/** A Wednesday, so "today" is the same day in every assertion below. */
const TODAY = new Date('2026-08-05T09:00:00Z');
const TODAY_KEY = dateKey(TODAY, DEFAULT_TIMEZONE);

const membership = (overrides: Partial<Membership> = {}): Membership => ({
  patientId: 'uid-jonas-patient',
  patientName: 'Jonas',
  role: 'supporter',
  permissions: { ...DEFAULT_PERMISSIONS },
  ...overrides,
});

const renderFollowing = () =>
  render(
    <LocaleProvider initialLocale="nl">
      <MemoryRouter initialEntries={['/following']}>
        <Following />
      </MemoryRouter>
    </LocaleProvider>,
  );

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.setSystemTime(TODAY);
  readMemberships.mockResolvedValue([]);
});

describe('Following — what helps', () => {
  it('names the section as its own heading, one level under the screen title', async () => {
    renderFollowing();
    expect(
      await screen.findByRole('heading', { level: 2, name: 'Wat helpt' }),
    ).toBeInTheDocument();
  });

  it("shows today's tip and every daily suggestion, general and never about the person followed", async () => {
    readMemberships.mockResolvedValue([membership()]);
    renderFollowing();

    const heading = await screen.findByRole('heading', { level: 2, name: 'Wat helpt' });
    const section = heading.closest('section');
    expect(section).not.toBeNull();

    expect(within(section!).getByText(dictionaries.nl[supportTipFor(TODAY_KEY)])).toBeInTheDocument();

    const items = within(section!).getAllByRole('listitem');
    expect(items).toHaveLength(SUPPORT_DAILY.length);
    for (const key of SUPPORT_DAILY) {
      expect(within(section!).getByText(dictionaries.nl[key])).toBeInTheDocument();
    }

    // The line this product must not cross: nothing here may name or imply
    // the specific person being followed.
    expect(section!.textContent).not.toMatch(/Jonas/);
  });

  it('still shows what helps when nobody shares anything yet, unconditional on the list', async () => {
    readMemberships.mockResolvedValue([]);
    renderFollowing();

    expect(await screen.findByText('Nog niemand deelt iets met je.')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 2, name: 'Wat helpt' }),
    ).toBeInTheDocument();
  });

  it('places what helps below the list of people, not above it', async () => {
    readMemberships.mockResolvedValue([membership({ patientName: 'Jonas' })]);
    const { container } = renderFollowing();

    await screen.findByRole('heading', { level: 2, name: 'Wat helpt' });

    const peopleIndex = container.innerHTML.indexOf('Jonas');
    const supportIndex = container.innerHTML.indexOf('Wat helpt');
    expect(peopleIndex).toBeGreaterThan(-1);
    expect(supportIndex).toBeGreaterThan(peopleIndex);
  });
});
