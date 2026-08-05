import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LocaleProvider } from '../providers/LocaleProvider';
import { Calendar } from './Calendar';
import type { ActivityRecord } from '../firebase/activities';

const readActivities = vi.fn<() => Promise<ActivityRecord[]>>();
const createActivity = vi.fn<(...args: unknown[]) => Promise<void>>();

vi.mock('../firebase/activities', () => ({
  readActivities: () => readActivities(),
  createActivity: (...args: unknown[]) => createActivity(...args),
}));

vi.mock('../providers/AuthProvider', () => ({
  useAuth: () => ({ user: { uid: 'uid-jonas' }, status: 'signed-in' }),
}));

vi.mock('../providers/AccountProvider', () => ({
  useAccount: () => ({ patient: { timezone: 'Europe/Brussels' } }),
}));

/** A Wednesday, so "today" is the same day in every assertion below. */
const TODAY = new Date('2026-08-05T09:00:00Z');

const activity = (overrides: Partial<ActivityRecord> = {}): ActivityRecord => ({
  id: 'act1',
  title: 'Koffie met Sam',
  date: '2026-08-05',
  startTime: '10:00',
  withPerson: '',
  createdBy: 'uid-jonas',
  status: 'accepted',
  recurrence: null,
  expectedPleasure: null,
  expectedMastery: null,
  ...overrides,
});

const renderCalendar = () =>
  render(
    <LocaleProvider initialLocale="nl">
      <MemoryRouter initialEntries={['/calendar']}>
        <Calendar />
      </MemoryRouter>
    </LocaleProvider>,
  );

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.setSystemTime(TODAY);
  readActivities.mockResolvedValue([]);
  createActivity.mockResolvedValue();
});

describe('Calendar', () => {
  it('opens on the day, not the week', async () => {
    // The day is where anything is actually done, so it is what a person
    // lands on. The week is for finding a day.
    renderCalendar();
    expect(await screen.findByRole('radio', { name: 'Dag' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    expect(screen.getByRole('radio', { name: 'Week' })).toHaveAttribute('aria-checked', 'false');
  });

  it('names the day the way somebody would say it', async () => {
    renderCalendar();
    expect(
      await screen.findByRole('heading', { name: /woensdag 5 augustus/ }),
    ).toBeInTheDocument();
  });

  it('says nothing is planned rather than showing an empty frame', async () => {
    renderCalendar();
    expect(await screen.findByText('Niets gepland.')).toBeInTheDocument();
  });

  it('puts something without a time under its own label, not under a dash', async () => {
    // An untimed thing is not late and not missing a value — it just has no
    // time, and a dash in a time column reads as both.
    readActivities.mockResolvedValue([
      activity({ id: 'act1', title: 'Zwemmen', startTime: '08:00' }),
      activity({ id: 'act2', title: 'Boodschappen', startTime: '' }),
    ]);
    renderCalendar();

    expect(await screen.findByText('Zwemmen')).toBeInTheDocument();
    expect(screen.getByText('Zonder tijdstip')).toBeInTheDocument();
    expect(screen.getByText('Boodschappen')).toBeInTheDocument();
  });

  it('never shows what somebody else only suggested', async () => {
    // PRD 6.3 — an offer is not an entry, and the tray is where it lives.
    readActivities.mockResolvedValue([
      activity({ id: 'act2', title: 'Wandelen met papa', status: 'suggested' }),
    ]);
    renderCalendar();

    expect(await screen.findByText('Niets gepland.')).toBeInTheDocument();
    expect(screen.queryByText('Wandelen met papa')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Voorgesteld/ })).toBeInTheDocument();
  });

  it('moves one day at a time in the day view and a week at a time in the week', async () => {
    const user = userEvent.setup();
    renderCalendar();

    await user.click(await screen.findByRole('button', { name: 'Later' }));
    expect(screen.getByRole('heading', { name: /donderdag 6 augustus/ })).toBeInTheDocument();

    await user.click(screen.getByRole('radio', { name: 'Week' }));
    await user.click(screen.getByRole('button', { name: 'Later' }));
    await user.click(screen.getByRole('radio', { name: 'Dag' }));
    expect(screen.getByRole('heading', { name: /donderdag 13 augustus/ })).toBeInTheDocument();
  });

  it('keeps the day you were looking at when you switch views', async () => {
    /*
     * One anchor, two views of it. If switching reset to today, the week
     * would answer a different question from the day beside it, and "which
     * day am I on" would have two answers that disagree.
     */
    const user = userEvent.setup();
    renderCalendar();

    await user.click(await screen.findByRole('button', { name: 'Later' }));
    await user.click(screen.getByRole('radio', { name: 'Week' }));
    await user.click(screen.getByRole('radio', { name: 'Dag' }));

    expect(screen.getByRole('heading', { name: /donderdag 6 augustus/ })).toBeInTheDocument();
  });

  it('brings today back in one tap, and offers it only once you have left', async () => {
    /*
     * The screen's footer already has a "Vandaag" that goes to the Today
     * screen. A second button with the same word doing something else is
     * ambiguous on the page and unresolvable through a screen reader, so the
     * way back names itself fully — and only exists when there is a way back.
     */
    const user = userEvent.setup();
    renderCalendar();

    const later = await screen.findByRole('button', { name: 'Later' });
    expect(screen.queryByRole('button', { name: 'Terug naar vandaag' })).not.toBeInTheDocument();

    await user.click(later);
    await user.click(later);
    await user.click(later);
    await user.click(screen.getByRole('button', { name: 'Terug naar vandaag' }));

    expect(screen.getByRole('heading', { name: /woensdag 5 augustus/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Terug naar vandaag' })).not.toBeInTheDocument();
  });

  it('opens a day from the week, which is what the week is for', async () => {
    const user = userEvent.setup();
    readActivities.mockResolvedValue([activity({ date: '2026-08-07', title: 'Tandarts' })]);
    renderCalendar();

    await user.click(await screen.findByRole('radio', { name: 'Week' }));
    await user.click(screen.getByRole('button', { name: /vr 7/ }));

    expect(screen.getByRole('radio', { name: 'Dag' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('heading', { name: /vrijdag 7 augustus/ })).toBeInTheDocument();
  });

  it('shows seven days at once in the week, centred on where you are', async () => {
    const user = userEvent.setup();
    renderCalendar();

    await user.click(await screen.findByRole('radio', { name: 'Week' }));
    const days = screen.getAllByRole('button').filter((b) => /^(ma|di|wo|do|vr|za|zo) \d/.test(b.textContent ?? ''));
    expect(days).toHaveLength(7);
    expect(days[3]?.textContent).toMatch(/^wo 5/);
  });

  it('records what the person expected, and plans fine without it', async () => {
    const user = userEvent.setup();
    renderCalendar();

    await user.click(await screen.findByRole('button', { name: 'Iets plannen' }));
    await user.type(screen.getByLabelText('Wat ga je doen?'), 'Zwemmen');
    await user.click(screen.getByRole('button', { name: 'Bewaren' }));

    expect(createActivity).toHaveBeenCalledWith(
      'uid-jonas',
      expect.objectContaining({
        title: 'Zwemmen',
        date: '2026-08-05',
        expectedPleasure: null,
        expectedMastery: null,
      }),
      'uid-jonas',
    );
  });

  it('plans onto the day you are looking at, not onto today', async () => {
    const user = userEvent.setup();
    renderCalendar();

    await user.click(await screen.findByRole('button', { name: 'Eerder' }));
    await user.click(screen.getByRole('button', { name: 'Iets plannen' }));
    await user.type(screen.getByLabelText('Wat ga je doen?'), 'Zwemmen');
    await user.click(screen.getByRole('button', { name: 'Bewaren' }));

    expect(createActivity).toHaveBeenCalledWith(
      'uid-jonas',
      expect.objectContaining({ date: '2026-08-04' }),
      'uid-jonas',
    );
  });

  it('offers a fortnightly and a monthly rule, which a depot injection needs', async () => {
    const user = userEvent.setup();
    renderCalendar();

    await user.click(await screen.findByRole('button', { name: 'Iets plannen' }));
    const repeats = screen.getByRole('radiogroup', { name: 'Herhalen' });
    expect(within(repeats).getByRole('radio', { name: 'Om de twee weken' })).toBeInTheDocument();
    expect(within(repeats).getByRole('radio', { name: 'Elke maand' })).toBeInTheDocument();
  });
});
