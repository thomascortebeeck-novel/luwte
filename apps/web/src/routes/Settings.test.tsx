import { DEFAULT_NOTIFICATION_SETTINGS, DEFAULT_SHARE_SETTINGS, dictionaries } from '@luwte/core';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LocaleProvider } from '../providers/LocaleProvider';
import { ThemeProvider } from '../providers/ThemeProvider';
import { Settings } from './Settings';

const saveShareSettings = vi.fn<(...args: unknown[]) => Promise<void>>();
const reload = vi.fn<() => Promise<void>>();

vi.mock('../firebase/accounts', () => ({
  saveNotificationSettings: vi.fn(),
  saveReminderHour: vi.fn(),
  saveShareSettings: (...args: unknown[]) => saveShareSettings(...args),
}));

vi.mock('../firebase/circle', () => ({
  readMemberships: () => Promise.resolve([]),
}));

vi.mock('../firebase/clinician', () => ({
  isVerifiedClinician: () => Promise.resolve(false),
}));

vi.mock('../firebase/gdpr', () => ({
  eraseEverything: vi.fn(),
  exportEverything: vi.fn(),
}));

vi.mock('../providers/AuthProvider', () => ({
  useAuth: () => ({ user: { uid: 'uid-jonas' }, status: 'signed-in' }),
}));

const PATIENT = {
  timezone: 'Europe/Brussels',
  checkinHour: 20,
  displayName: 'Jonas',
  notifications: DEFAULT_NOTIFICATION_SETTINGS,
  share: DEFAULT_SHARE_SETTINGS,
};

vi.mock('../providers/AccountProvider', () => ({
  useAccount: () => ({ patient: PATIENT, reload: () => reload() }),
}));

const nl = dictionaries.nl;

const renderSettings = () =>
  render(
    <LocaleProvider initialLocale="nl">
      <ThemeProvider>
        <MemoryRouter>
          <Settings />
        </MemoryRouter>
      </ThemeProvider>
    </LocaleProvider>,
  );

beforeEach(() => {
  saveShareSettings.mockResolvedValue();
  reload.mockResolvedValue();
});

describe('the sharing toggle', () => {
  /*
   * Regression: the toggle set optimistic state and never reverted on
   * failure. Today.tsx reads the server's `patient.share`, not this screen's
   * state, so a refused write left the checkbox reading OFF while
   * completions kept posting to the circle exactly as before — the same
   * defect CircleMember's `apply` was fixed for one screen over.
   */
  // The Choice label wraps both the label and explanation text, so the
  // accessible name is their concatenation — a partial match on the label
  // alone, same as Today.test.tsx does for a dose button carrying a purpose
  // line too.
  const shareToggle = () => screen.findByRole('checkbox', { name: new RegExp(nl.shareCompletionsLabel) });

  it('reverts a refused change instead of leaving the toggle reading the wrong value', async () => {
    saveShareSettings.mockRejectedValueOnce({ code: 'permission-denied' });
    const user = userEvent.setup();
    renderSettings();

    const toggle = await shareToggle();
    expect(toggle).toBeChecked();

    await user.click(toggle);

    expect(await screen.findByText(nl.errorNotAllowed)).toBeInTheDocument();
    expect(await shareToggle()).toBeChecked();
  });

  it('saves a successful change without reverting it', async () => {
    const user = userEvent.setup();
    renderSettings();

    await user.click(await shareToggle());

    expect(saveShareSettings).toHaveBeenCalledWith('uid-jonas', { shareCompletions: false });
    expect(await shareToggle()).not.toBeChecked();
  });
});
