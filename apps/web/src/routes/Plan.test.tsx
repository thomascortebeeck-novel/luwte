import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LocaleProvider } from '../providers/LocaleProvider';
import { Plan } from './Plan';
import type { PlanEntryRecord } from '../firebase/plan';

const readPlan = vi.fn<() => Promise<PlanEntryRecord[]>>();
const addPlanEntry = vi.fn<(...args: unknown[]) => Promise<void>>();
const removePlanEntry = vi.fn<(...args: unknown[]) => Promise<void>>();

vi.mock('../firebase/plan', () => ({
  readPlan: () => readPlan(),
  addPlanEntry: (...args: unknown[]) => addPlanEntry(...args),
  updatePlanEntry: vi.fn(),
  removePlanEntry: (...args: unknown[]) => removePlanEntry(...args),
}));

vi.mock('../providers/AuthProvider', () => ({
  useAuth: () => ({ user: { uid: 'uid-jonas' }, status: 'signed-in' }),
}));

const entry = (overrides: Partial<PlanEntryRecord> = {}): PlanEntryRecord => ({
  id: 'p1',
  sign: 'Ik slaap minder dan vijf uur.',
  action: 'Ik bel mijn zus.',
  createdAt: new Date('2026-08-01T10:00:00Z'),
  ...overrides,
});

const renderPlan = (path = '/plan') =>
  render(
    <LocaleProvider initialLocale="nl">
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/plan" element={<Plan />} />
          <Route path="/plan/:patientId" element={<Plan />} />
        </Routes>
      </MemoryRouter>
    </LocaleProvider>,
  );

beforeEach(() => {
  readPlan.mockResolvedValue([]);
  addPlanEntry.mockResolvedValue();
  removePlanEntry.mockResolvedValue();
});

describe('the early-warning-signs plan', () => {
  it('says plainly that luwte checks nothing against it', async () => {
    /*
     * The regulatory line, stated to the person rather than only in a
     * comment: matching a check-in against somebody's own warning signs would
     * be clinical monitoring, Class IIa, and the one thing this product may
     * never do. Somebody writing this list deserves to know that.
     */
    renderPlan();
    expect(await screen.findByText(/luwte kijkt hier niets mee na/)).toBeInTheDocument();
  });

  it('says nothing is written down yet rather than showing an empty frame', async () => {
    renderPlan();
    expect(await screen.findByText('Je hebt hier nog niets staan.')).toBeInTheDocument();
  });

  it('shows a sign and what the person does about it', async () => {
    readPlan.mockResolvedValue([entry()]);
    renderPlan();
    expect(await screen.findByText('Ik slaap minder dan vijf uur.')).toBeInTheDocument();
    expect(screen.getByText('Ik bel mijn zus.')).toBeInTheDocument();
  });

  it('offers examples to read, never boxes to tick', async () => {
    /*
     * A ready-made list would have somebody agreeing to symptoms they do not
     * have, and the plan only works in their own words.
     */
    const user = userEvent.setup();
    renderPlan();
    await user.click(await screen.findByRole('button', { name: 'Iets toevoegen' }));

    expect(screen.getByText('Ik neem de telefoon niet meer op.')).toBeInTheDocument();
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0);
  });

  it('takes a sign with no response yet', async () => {
    // Naming something and not yet knowing what to do about it is a real
    // state, and refusing it would lose the half they do have.
    const user = userEvent.setup();
    renderPlan();
    await user.click(await screen.findByRole('button', { name: 'Iets toevoegen' }));
    await user.type(screen.getByLabelText('Wat merk je?'), 'Ik ga niet meer buiten');
    await user.click(screen.getByRole('button', { name: 'Bewaren' }));

    expect(addPlanEntry).toHaveBeenCalledWith('uid-jonas', {
      sign: 'Ik ga niet meer buiten',
      action: '',
    });
  });

  it('refuses to save an entry with nothing noticed', async () => {
    const user = userEvent.setup();
    renderPlan();
    await user.click(await screen.findByRole('button', { name: 'Iets toevoegen' }));
    expect(screen.getByRole('button', { name: 'Bewaren' })).toBeDisabled();
  });

  it('is read-only when it is somebody else’s', async () => {
    /*
     * It is the person's own words about their own patterns. A supporter
     * adding a sign would be telling them what to watch for in themselves —
     * and the rules refuse the write regardless.
     */
    readPlan.mockResolvedValue([entry()]);
    renderPlan('/plan/uid-someone');

    expect(await screen.findByText('Ik slaap minder dan vijf uur.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Iets toevoegen' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Aanpassen' })).not.toBeInTheDocument();
  });
});
