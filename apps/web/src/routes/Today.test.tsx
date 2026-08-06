import { dictionaries } from '@luwte/core';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LocaleProvider } from '../providers/LocaleProvider';
import { Today } from './Today';

const readCheckin = vi.fn<() => Promise<{ note: string | null } | null>>();
const saveCheckin = vi.fn<(...args: unknown[]) => Promise<void>>();
const readWindlineDays = vi.fn<() => Promise<unknown[]>>();
const readActiveMedications = vi.fn<() => Promise<unknown[]>>();
const readDoseStatuses = vi.fn<() => Promise<Record<string, unknown>>>();
const readDoseAnnotations = vi.fn<() => Promise<Record<string, unknown>>>();
const setDose = vi.fn<(...args: unknown[]) => Promise<void>>();
const annotateDose = vi.fn<(...args: unknown[]) => Promise<void>>();
const readActivities = vi.fn<() => Promise<unknown[]>>();
const readCompletions = vi.fn<() => Promise<Record<string, unknown>>>();
const completeActivity = vi.fn<(...args: unknown[]) => string>();
const countCompletionsBefore = vi.fn<() => Promise<number>>();
const uncompleteActivity = vi.fn();
const rateCompletion = vi.fn();
const postCompletion = vi.fn();

vi.mock('../firebase/checkins', () => ({
  readCheckin: () => readCheckin(),
  saveCheckin: (...args: unknown[]) => saveCheckin(...args),
}));

vi.mock('../firebase/history', () => ({
  readWindlineDays: () => readWindlineDays(),
}));

vi.mock('../firebase/medication', () => ({
  readActiveMedications: () => readActiveMedications(),
  readDoseStatuses: () => readDoseStatuses(),
  readDoseAnnotations: () => readDoseAnnotations(),
  setDose: (...args: unknown[]) => setDose(...args),
  annotateDose: (...args: unknown[]) => annotateDose(...args),
}));

vi.mock('../firebase/activities', () => ({
  readActivities: () => readActivities(),
  readCompletions: () => readCompletions(),
  completeActivity: (...args: unknown[]) => completeActivity(...args),
  countCompletionsBefore: () => countCompletionsBefore(),
  uncompleteActivity: (...args: unknown[]) => uncompleteActivity(...args),
  rateCompletion: (...args: unknown[]) => rateCompletion(...args),
}));

vi.mock('../firebase/feed', () => ({
  postCompletion: (...args: unknown[]) => postCompletion(...args),
}));

/*
 * Stable references, not object literals inlined in the mock functions below.
 * Today.tsx's effect depends on `[user, today]`; a fresh `{ uid: ... }` on
 * every call to `useAuth()` would give that dependency a new identity on
 * every render, re-running `readCheckin` after each state change and
 * reverting `done` right back to false — reproducing the exact symptom this
 * suite exists to catch, for a reason that has nothing to do with the fix.
 */
const AUTH_USER = { uid: 'uid-jonas' };
const PATIENT = {
  timezone: 'Europe/Brussels',
  // Keeps the form visible regardless of what time the test runs, without
  // needing to fake the system clock.
  checkinHour: 0,
  displayName: 'Jonas',
  share: { shareCompletions: true },
};

vi.mock('../providers/AuthProvider', () => ({
  useAuth: () => ({ user: AUTH_USER, status: 'signed-in' }),
}));

vi.mock('../providers/AccountProvider', () => ({
  useAccount: () => ({ patient: PATIENT }),
}));

const nl = dictionaries.nl;

const renderToday = () =>
  render(
    <LocaleProvider initialLocale="nl">
      <MemoryRouter initialEntries={['/']}>
        <Today />
      </MemoryRouter>
    </LocaleProvider>,
  );

const answerScale = async (user: ReturnType<typeof userEvent.setup>, legend: string, step: string) => {
  // findBy, not getBy: the form only appears once the initial reads (in
  // particular readCheckin, which decides whether today is already done)
  // resolve, which happens after the first render.
  const group = await screen.findByRole('radiogroup', { name: legend });
  await user.click(within(group).getByRole('radio', { name: step }));
};

/** Fills every required field so "Bewaren" is enabled, then saves. */
const fillAndSave = async (user: ReturnType<typeof userEvent.setup>, note: string) => {
  await answerScale(user, nl.checkinMood, nl.scaleStep4);
  await answerScale(user, nl.checkinArousal, nl.scaleStep4);
  await answerScale(user, nl.checkinFlatness, nl.scaleStep4);
  await user.type(screen.getByRole('spinbutton', { name: nl.checkinSleepHours }), '7');
  // The only textbox on the page — the diary line. The number field above is
  // a spinbutton, not a textbox.
  await user.type(screen.getByRole('textbox'), note);
  await user.click(screen.getByRole('button', { name: nl.checkinSave }));
};

beforeEach(() => {
  readCheckin.mockResolvedValue(null);
  saveCheckin.mockResolvedValue();
  readWindlineDays.mockResolvedValue([]);
  readActiveMedications.mockResolvedValue([]);
  readDoseStatuses.mockResolvedValue({});
  readDoseAnnotations.mockResolvedValue({});
  setDose.mockResolvedValue();
  annotateDose.mockResolvedValue();
  readActivities.mockResolvedValue([]);
  readCompletions.mockResolvedValue({});
  countCompletionsBefore.mockResolvedValue(0);
});

describe('the check-in on Today', () => {
  it('shows the acknowledgement, with the note echoed back, once the write succeeds', async () => {
    const user = userEvent.setup();
    renderToday();

    await fillAndSave(user, 'Een rustige dag.');

    expect(await screen.findByText(nl.checkinDoneToday)).toBeInTheDocument();
    expect(screen.getByText('Een rustige dag.')).toBeInTheDocument();
  });

  it('leaves the person on the form with what they typed when the write is refused, instead of the acknowledgement', async () => {
    /*
     * Regression: onSaved used to fire synchronously regardless of what
     * saveCheckin did, so Today.tsx swapped in "Je hebt vandaag ingevuld" —
     * with the note echoed back — before the rejection had even arrived.
     * Firestore queues offline writes, so a rejection here is a genuine
     * refusal, not a network blip; the person must land back on the form
     * with what they typed, not on a false acknowledgement for a check-in
     * that was never written.
     */
    saveCheckin.mockRejectedValueOnce({ code: 'permission-denied' });
    const user = userEvent.setup();
    renderToday();

    await fillAndSave(user, 'Een moeilijke dag.');

    // Never the acknowledgement, and back on a save button.
    expect(await screen.findByRole('button', { name: nl.checkinSave })).toBeInTheDocument();
    expect(screen.queryByText(nl.checkinDoneToday)).not.toBeInTheDocument();

    // What was typed survives the round trip, not just an empty form.
    expect(screen.getByRole('textbox')).toHaveValue('Een moeilijke dag.');
    expect(
      within(screen.getByRole('radiogroup', { name: nl.checkinMood })).getByRole('radio', {
        name: nl.scaleStep4,
      }),
    ).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('spinbutton', { name: nl.checkinSleepHours })).toHaveValue(7);
  });

  it('says a permission was refused, honestly, rather than the generic failure message', async () => {
    saveCheckin.mockRejectedValueOnce({ code: 'permission-denied' });
    const user = userEvent.setup();
    renderToday();

    await fillAndSave(user, 'Een moeilijke dag.');

    expect(await screen.findByText(nl.errorNotAllowed)).toBeInTheDocument();
  });
});
