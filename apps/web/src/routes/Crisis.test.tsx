import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LocaleProvider } from '../providers/LocaleProvider';
import { Crisis } from './Crisis';
import type { PlanEntryRecord } from '../firebase/plan';

const readPlan = vi.fn<() => Promise<PlanEntryRecord[]>>();
const useAuth = vi.fn<() => { user: { uid: string } | null; status: 'signed-in' | 'signed-out' }>();

vi.mock('../firebase/plan', () => ({
  readPlan: () => readPlan(),
}));

vi.mock('../providers/AuthProvider', () => ({
  useAuth: () => useAuth(),
}));

const renderCrisis = (locale: 'nl' | 'en' = 'nl') =>
  render(
    <LocaleProvider initialLocale={locale}>
      <Crisis />
    </LocaleProvider>,
  );

const planEntry = (overrides: Partial<PlanEntryRecord> = {}): PlanEntryRecord => ({
  id: 'p1',
  section: 'help',
  label: 'mijn zus',
  detail: '0470 12 34 56',
  createdAt: new Date('2026-08-01T10:00:00Z'),
  ...overrides,
});

beforeEach(() => {
  readPlan.mockReset();
  readPlan.mockResolvedValue([]);
  useAuth.mockReset();
  useAuth.mockReturnValue({ user: { uid: 'uid-jonas' }, status: 'signed-in' });
});

describe('Crisis', () => {
  it('offers the three Belgian services as dialable links', () => {
    renderCrisis();
    const hrefs = screen.getAllByRole('link').map((a) => a.getAttribute('href'));
    expect(hrefs).toEqual(['tel:1813', 'tel:080032123', 'tel:112']);
  });

  it('states the direct instruction and nothing softer', () => {
    renderCrisis();
    expect(
      screen.getByRole('heading', { name: 'Als het nu te zwaar is, bel iemand.' }),
    ).toBeInTheDocument();
  });

  it('names each service beside its number', () => {
    renderCrisis();
    expect(screen.getByRole('link', { name: /Zelfmoordlijn/ })).toHaveTextContent('1813');
    expect(screen.getByRole('link', { name: /Suicide/ })).toHaveTextContent('0800 32 123');
    expect(screen.getByRole('link', { name: /Noodgeval/ })).toHaveTextContent('112');
  });

  it('keeps the same numbers in English', () => {
    renderCrisis('en');
    expect(screen.getByRole('heading', { name: "If it's too much right now, call someone." }));
    const hrefs = screen.getAllByRole('link').map((a) => a.getAttribute('href'));
    expect(hrefs).toEqual(['tel:1813', 'tel:080032123', 'tel:112']);
  });

  describe('the plan’s people, added on top', () => {
    it('shows the national numbers before anything is loaded', () => {
      // PRD 6.8 — signed in or not, online or not. Nothing about the personal
      // contacts may delay or replace these. readPlan is left permanently
      // pending here, so these assertions run before the effect's promise
      // ever gets a turn to resolve — proving the national list needs no
      // await at all.
      readPlan.mockReturnValue(new Promise(() => {}));
      renderCrisis();
      expect(screen.getByText('1813')).toBeTruthy();
      expect(screen.getByText('112')).toBeTruthy();
    });

    it('still shows them when the plan cannot be read', async () => {
      readPlan.mockRejectedValueOnce(new Error('offline'));
      renderCrisis();
      expect(screen.getByText('1813')).toBeTruthy();
      await waitFor(() => expect(screen.getByText('112')).toBeTruthy());
    });

    it('still shows them with nobody signed in, and never attempts a read', () => {
      // A person can open /crisis with no account at all — there is no uid to
      // read a plan for, and the screen must not wait on one.
      useAuth.mockReturnValue({ user: null, status: 'signed-out' });
      renderCrisis();
      expect(screen.getByText('1813')).toBeTruthy();
      expect(screen.getByText('112')).toBeTruthy();
      expect(readPlan).not.toHaveBeenCalled();
    });

    it('adds a name and number for each dialable entry, help before professional', async () => {
      readPlan.mockResolvedValueOnce([
        planEntry({ id: 'p2', section: 'professional', label: 'dokter Peeters', detail: '02 512 34 56' }),
        planEntry(),
      ]);
      renderCrisis();

      expect(
        await screen.findByRole('heading', { name: 'Mensen die je zelf koos' }),
      ).toBeInTheDocument();

      const sister = screen.getByRole('link', { name: /mijn zus/ });
      expect(sister).toHaveTextContent('0470 12 34 56');
      expect(sister).toHaveAttribute('href', 'tel:0470123456');

      const doctor = screen.getByRole('link', { name: /dokter Peeters/ });
      expect(doctor).toHaveTextContent('02 512 34 56');

      // Stanley and Brown's order survives the round trip through the
      // screen: the person who knows you, before the professional — not the
      // storage order the mock resolved in.
      const hrefs = screen.getAllByRole('link').map((a) => a.getAttribute('href'));
      expect(hrefs.slice(-2)).toEqual(['tel:0470123456', 'tel:025123456']);

      // The national numbers stay first in the component body — see the
      // comment on Crisis.tsx. `order: -1` moves the personal section above
      // them visually, which jsdom does not lay out, so that half of the
      // contract is checked by hand in the browser at 320px instead.
      expect(hrefs.slice(0, 3)).toEqual(['tel:1813', 'tel:080032123', 'tel:112']);
    });

    it('adds no section at all when the plan has nobody dialable', async () => {
      readPlan.mockResolvedValueOnce([
        planEntry({ section: 'warning', label: 'Ik slaap minder dan vijf uur.', detail: '' }),
      ]);
      renderCrisis();
      await waitFor(() => expect(readPlan).toHaveBeenCalled());
      expect(
        screen.queryByRole('heading', { name: 'Mensen die je zelf koos' }),
      ).not.toBeInTheDocument();
    });
  });
});
