import { dateKey, dictionaries, doseId } from '@luwte/core';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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
const completeActivity = vi.fn<(...args: unknown[]) => Promise<void>>();
const countCompletionsBefore = vi.fn<() => Promise<number>>();
const uncompleteActivity = vi.fn<(...args: unknown[]) => Promise<void>>();
const rateCompletion = vi.fn();
const postCompletion = vi.fn<(...args: unknown[]) => Promise<void>>();

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

/** Fixed so a computed doseId in a fixture matches what Today.tsx computes. */
const TODAY = new Date('2026-08-05T09:00:00Z');
const TODAY_KEY = dateKey(TODAY, PATIENT.timezone);

const medication = {
  id: 'med1',
  name: 'Abilify',
  dose: '10mg',
  times: ['08:00'],
  purpose: '',
  activeFrom: new Date('2026-08-01T00:00:00Z'),
  activeTo: null,
  prescribedBy: null,
  pendingChange: null,
};

const activity = {
  id: 'act1',
  title: 'wandelen',
  date: TODAY_KEY,
  startTime: '',
  withPerson: '',
  createdBy: 'uid-jonas',
  status: 'accepted',
  recurrence: null,
  expectedPleasure: null,
  expectedMastery: null,
};

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
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.setSystemTime(TODAY);
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
  completeActivity.mockResolvedValue();
  uncompleteActivity.mockResolvedValue();
  postCompletion.mockResolvedValue();
  countCompletionsBefore.mockResolvedValue(0);
});

afterEach(() => {
  vi.useRealTimers();
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

describe('a refused dose tick or dose note', () => {
  /*
   * Gap: these two writes were never covered by the error-handling sweep.
   * Ticking a dose is optimistic and, before this fix, was never rolled
   * back — and the tally it produces is the adherence count a psychiatrist
   * reads at an appointment. A tick that silently did not land makes that
   * count wrong, which is the one number this product exists to get right.
   */
  it('reverts a refused dose tick instead of leaving the mark standing, and says so', async () => {
    readActiveMedications.mockResolvedValue([medication]);
    setDose.mockRejectedValueOnce({ code: 'permission-denied' });
    const user = userEvent.setup();
    renderToday();

    const dose = await screen.findByRole('button', { name: /Abilify/ });
    expect(dose).toHaveAttribute('aria-pressed', 'false');

    await user.click(dose);

    expect(setDose).toHaveBeenCalledWith('uid-jonas', TODAY_KEY, 'med1', '08:00', 'taken');
    expect(await screen.findByText(nl.errorNotAllowed)).toBeInTheDocument();
    // Reverted rather than left marked taken.
    expect(screen.getByRole('button', { name: /Abilify/ })).toHaveAttribute('aria-pressed', 'false');
  });

  it('reverts a refused dose note back to what it said before, not to a false success', async () => {
    readActiveMedications.mockResolvedValue([medication]);
    readDoseStatuses.mockResolvedValue({ [doseId(TODAY_KEY, 'med1', '08:00')]: 'taken' });
    annotateDose.mockRejectedValueOnce({ code: 'permission-denied' });
    const user = userEvent.setup();
    renderToday();

    await user.click(await screen.findByRole('button', { name: nl.doseNoteAsk }));
    const note = within(await screen.findByRole('region', { name: nl.doseNoteTitle }));
    await user.type(note.getByLabelText(nl.doseNoteActual), 'de helft');
    await user.click(note.getByRole('button', { name: nl.ratingSave }));

    expect(annotateDose).toHaveBeenCalled();
    expect(await screen.findByText(nl.errorNotAllowed)).toBeInTheDocument();
    // Back to "iets anders genomen?" — not still showing "de helft" as saved.
    expect(await screen.findByRole('button', { name: nl.doseNoteAsk })).toBeInTheDocument();
  });
});

describe('a refused activity tick', () => {
  /*
   * Gap: `completeActivity` and `uncompleteActivity` used to discard their
   * promise internally (`void setDoc(...)`), so there was nothing for
   * Today.tsx to catch — the same defect the dose tick above was fixed for
   * one write earlier in this file.
   */
  it('reverts a refused tick instead of leaving the mark standing, and says so', async () => {
    readActivities.mockResolvedValue([activity]);
    completeActivity.mockRejectedValueOnce({ code: 'permission-denied' });
    const user = userEvent.setup();
    renderToday();

    const item = await screen.findByRole('button', { name: /wandelen/ });
    expect(item).toHaveAttribute('aria-pressed', 'false');

    await user.click(item);

    expect(completeActivity).toHaveBeenCalledWith('uid-jonas', 'act1', TODAY_KEY);
    expect(await screen.findByText(nl.errorNotAllowed)).toBeInTheDocument();
    // Reverted rather than left marked done.
    expect(screen.getByRole('button', { name: /wandelen/ })).toHaveAttribute('aria-pressed', 'false');
  });

  it('reverts a refused untick the same way', async () => {
    readActivities.mockResolvedValue([activity]);
    readCompletions.mockResolvedValue({ act1: { completedAt: new Date() } });
    uncompleteActivity.mockRejectedValueOnce({ code: 'permission-denied' });
    const user = userEvent.setup();
    renderToday();

    const item = await screen.findByRole('button', { name: /wandelen/ });
    expect(item).toHaveAttribute('aria-pressed', 'true');

    await user.click(item);

    expect(uncompleteActivity).toHaveBeenCalledWith('uid-jonas', 'act1', TODAY_KEY);
    expect(await screen.findByText(nl.errorNotAllowed)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /wandelen/ })).toHaveAttribute('aria-pressed', 'true');
  });

  /*
   * `postCompletion` gets different treatment on purpose: a feed post is a
   * courtesy, not a record, so a failure is reported to the console and
   * never put on screen — a message about somebody else's notification not
   * arriving would be the app chasing the person about somebody else's
   * alert.
   */
  it('reports a refused feed post to the console without ever putting a message on screen', async () => {
    readActivities.mockResolvedValue([activity]);
    postCompletion.mockRejectedValueOnce({ code: 'permission-denied' });
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const user = userEvent.setup();
    renderToday();

    await user.click(await screen.findByRole('button', { name: /wandelen/ }));

    await waitFor(() =>
      expect(consoleError).toHaveBeenCalledWith(expect.stringContaining('postCompletion')),
    );
    expect(screen.queryByText(nl.errorNotAllowed)).not.toBeInTheDocument();
    expect(screen.queryByText(nl.genericError)).not.toBeInTheDocument();
    // The tick itself is unaffected — only the courtesy post failed.
    expect(screen.getByRole('button', { name: /wandelen/ })).toHaveAttribute('aria-pressed', 'true');

    consoleError.mockRestore();
  });
});
