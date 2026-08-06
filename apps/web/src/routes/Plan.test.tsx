import { PLAN_SECTIONS, PLAN_SECTION_COPY, dictionaries } from '@luwte/core';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LocaleProvider } from '../providers/LocaleProvider';
import { Plan } from './Plan';
import type { PlanEntryRecord } from '../firebase/plan';

const readPlan = vi.fn<() => Promise<PlanEntryRecord[]>>();
const addPlanEntry = vi.fn<(...args: unknown[]) => Promise<void>>();
const updatePlanEntry = vi.fn<(...args: unknown[]) => Promise<void>>();
const removePlanEntry = vi.fn<(...args: unknown[]) => Promise<void>>();

vi.mock('../firebase/plan', () => ({
  readPlan: () => readPlan(),
  addPlanEntry: (...args: unknown[]) => addPlanEntry(...args),
  updatePlanEntry: (...args: unknown[]) => updatePlanEntry(...args),
  removePlanEntry: (...args: unknown[]) => removePlanEntry(...args),
}));

vi.mock('../providers/AuthProvider', () => ({
  useAuth: () => ({ user: { uid: 'uid-jonas' }, status: 'signed-in' }),
}));

const nl = dictionaries.nl;

const entry = (overrides: Partial<PlanEntryRecord> = {}): PlanEntryRecord => ({
  id: 'p1',
  section: 'warning',
  label: 'Ik slaap minder dan vijf uur.',
  detail: 'Ik bel mijn zus.',
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

/** The `<section>` for one step, found by the heading text it is named after. */
const sectionFor = async (titleKey: (typeof PLAN_SECTION_COPY)[keyof typeof PLAN_SECTION_COPY]['titleKey']) =>
  within(await screen.findByRole('region', { name: nl[titleKey] }));

beforeEach(() => {
  readPlan.mockResolvedValue([]);
  addPlanEntry.mockResolvedValue();
  updatePlanEntry.mockResolvedValue();
  removePlanEntry.mockResolvedValue();
});

describe('the safety plan', () => {
  it('says plainly that luwte checks nothing against it', async () => {
    /*
     * The regulatory line, stated to the person rather than only in a
     * comment: matching a check-in against somebody's own plan would be
     * clinical monitoring, Class IIa, and the one thing this product may
     * never do. Somebody writing this list deserves to know that.
     */
    renderPlan();
    expect(await screen.findByText(/luwte kijkt hier niets mee na/)).toBeInTheDocument();
  });

  it('shows all six steps of the safety plan', async () => {
    renderPlan();
    for (const section of PLAN_SECTIONS) {
      const copy = PLAN_SECTION_COPY[section];
      // A heading, not just text: in the `warning` section the title and
      // the label field share the exact same copy ("Wat je merkt"), so a
      // plain findByText would find both and fail on "multiple elements".
      expect(await screen.findByRole('heading', { name: nl[copy.titleKey], level: 2 })).toBeTruthy();
      expect(screen.getByText(nl[copy.introKey])).toBeTruthy();
    }
  });

  it('shows a sign and what the person does about it, under its own step', async () => {
    readPlan.mockResolvedValue([entry()]);
    renderPlan();
    const warning = await sectionFor('planWarningTitle');
    expect(warning.getByText('Ik slaap minder dan vijf uur.')).toBeInTheDocument();
    expect(warning.getByText('Ik bel mijn zus.')).toBeInTheDocument();
  });

  it('keeps an entry inside the section it was written for, not another one', async () => {
    readPlan.mockResolvedValue([entry({ id: 'c1', section: 'coping', label: 'Douchen', detail: '' })]);
    renderPlan();
    const coping = await sectionFor('planCopingTitle');
    expect(coping.getByText('Douchen')).toBeInTheDocument();

    const warning = await sectionFor('planWarningTitle');
    expect(warning.queryByText('Douchen')).not.toBeInTheDocument();
  });

  it('never renders a checkbox — this is freeform, never a checklist', async () => {
    readPlan.mockResolvedValue([entry()]);
    renderPlan();
    await screen.findByText('Ik slaap minder dan vijf uur.');
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0);
  });

  describe('the worked examples', () => {
    /*
     * Only `warning` is open-ended enough to need them — the other five are
     * already scoped by their own field structure (a name plus a number, an
     * arrangement plus who).
     */
    it('shows the examples under the warning section and nowhere else', async () => {
      renderPlan();
      const warning = await sectionFor('planWarningTitle');
      expect(warning.getByText(nl.planExamples)).toBeInTheDocument();
      expect(warning.getByText(nl.planExampleSleep)).toBeInTheDocument();

      const coping = await sectionFor('planCopingTitle');
      expect(coping.queryByText(nl.planExamples)).not.toBeInTheDocument();
    });

    it('hides the examples from a read-only viewer', async () => {
      // They exist to help someone write their own — not useful, and not
      // theirs to see, on somebody else's plan.
      readPlan.mockResolvedValue([entry()]);
      renderPlan('/plan/uid-someone');
      const warning = await sectionFor('planWarningTitle');
      expect(warning.queryByText(nl.planExamples)).not.toBeInTheDocument();
    });
  });

  it('tells the person the detail field is optional', async () => {
    renderPlan();
    const warning = await sectionFor('planWarningTitle');
    expect(warning.getByText(nl.planActionHint)).toBeInTheDocument();
  });

  describe('telling six identical-looking controls apart', () => {
    /*
     * `help` and `professional` both ask "Wie" and both ask for a "Nummer" —
     * the same visible word, in two different sections. Six "Iets toevoegen"
     * buttons collide the same way. A screen reader user tabbing through
     * fields hears only the accessible name, not the heading two sections
     * back, so each control's name has to carry the section itself.
     */
    it('gives the two "Wie" fields distinct accessible names', async () => {
      renderPlan();
      const help = nl.planHelpTitle;
      const professional = nl.planProfessionalTitle;

      const helpWho = await screen.findByRole('textbox', { name: `${nl.planHelpLabel} – ${help}` });
      const professionalWho = screen.getByRole('textbox', {
        name: `${nl.planProfessionalLabel} – ${professional}`,
      });
      expect(helpWho).not.toBe(professionalWho);
    });

    it('gives the two "Nummer" fields distinct accessible names', async () => {
      renderPlan();
      const help = nl.planHelpTitle;
      const professional = nl.planProfessionalTitle;

      const helpNumber = await screen.findByRole('textbox', {
        name: `${nl.planHelpDetail} – ${help}`,
      });
      const professionalNumber = screen.getByRole('textbox', {
        name: `${nl.planProfessionalDetail} – ${professional}`,
      });
      expect(helpNumber).not.toBe(professionalNumber);
    });

    it('gives every "Iets toevoegen" button its own accessible name', async () => {
      renderPlan();
      const buttons = await screen.findAllByRole('button', { name: new RegExp(`^${nl.planAdd} – `) });
      expect(buttons).toHaveLength(PLAN_SECTIONS.length);
      const names = buttons.map((button) => button.getAttribute('aria-label'));
      expect(new Set(names).size).toBe(PLAN_SECTIONS.length);
    });

    it('still shows the plain word visibly, for the sighted reader in the room', async () => {
      // The fix must not make the visible field say anything different —
      // only the accessible name gains the section.
      renderPlan();
      const help = await sectionFor('planHelpTitle');
      expect(help.getByText(nl.planHelpLabel)).toBeInTheDocument();
    });

    it('gives two entries with the same label in one section distinct accessible names', async () => {
      /*
       * The case `sectionTitle` and `entry.label` together still miss: two
       * `help` contacts both named "mijn zus", with different numbers —
       * exactly the shape a later phase expects, keying contacts on
       * name-plus-number rather than name alone. Before the row's position
       * was folded into `rowName`, both rows' Aanpassen buttons carried
       * byte-identical accessible names, and once both were open for
       * editing, so did their Wie fields and their Bewaren buttons. Each
       * query below resolves on the exact expected name — as the existing
       * add-form-versus-row test above does — so a collision would fail the
       * query itself ("multiple elements found") rather than need counting.
       */
      const user = userEvent.setup();
      readPlan.mockResolvedValue([
        entry({ id: 'h1', section: 'help', label: 'mijn zus', detail: '0470 12 34 56' }),
        entry({ id: 'h2', section: 'help', label: 'mijn zus', detail: '0471 98 76 54' }),
      ]);
      renderPlan();
      const help = await sectionFor('planHelpTitle');

      const firstRow = `mijn zus (1) – ${nl.planHelpTitle}`;
      const secondRow = `mijn zus (2) – ${nl.planHelpTitle}`;

      const firstEdit = await help.findByRole('button', { name: `${nl.circleChange} – ${firstRow}` });
      const secondEdit = help.getByRole('button', { name: `${nl.circleChange} – ${secondRow}` });
      expect(firstEdit).not.toBe(secondEdit);

      // Open both rows at once — the collision this guards against only
      // shows up on Bewaren and the fields once both are mid-edit together.
      await user.click(firstEdit);
      await user.click(secondEdit);

      const firstWho = help.getByLabelText(`${nl.planHelpLabel} – ${firstRow}`);
      const secondWho = help.getByLabelText(`${nl.planHelpLabel} – ${secondRow}`);
      expect(firstWho).not.toBe(secondWho);

      const firstSave = help.getByRole('button', { name: `${nl.planSave} – ${firstRow}` });
      const secondSave = help.getByRole('button', { name: `${nl.planSave} – ${secondRow}` });
      expect(firstSave).not.toBe(secondSave);
    });
  });

  describe('adding something', () => {
    it('adds an entry to the section it was typed into', async () => {
      const user = userEvent.setup();
      renderPlan();
      const warning = await sectionFor('planWarningTitle');

      await user.type(warning.getByLabelText(`${nl.planWarningLabel} – ${nl.planWarningTitle}`), 'Ik ga niet meer buiten');
      await user.click(warning.getByRole('button', { name: `${nl.planAdd} – ${nl.planWarningTitle}` }));

      expect(addPlanEntry).toHaveBeenCalledWith('uid-jonas', {
        section: 'warning',
        label: 'Ik ga niet meer buiten',
        detail: '',
      });
    });

    it('adds to a different section without touching the first', async () => {
      const user = userEvent.setup();
      renderPlan();
      const help = await sectionFor('planHelpTitle');

      await user.type(help.getByLabelText(`${nl.planHelpLabel} – ${nl.planHelpTitle}`), 'mijn zus');
      await user.type(help.getByLabelText(`${nl.planHelpDetail} – ${nl.planHelpTitle}`), '0470 12 34 56');
      await user.click(help.getByRole('button', { name: `${nl.planAdd} – ${nl.planHelpTitle}` }));

      expect(addPlanEntry).toHaveBeenCalledWith('uid-jonas', {
        section: 'help',
        label: 'mijn zus',
        detail: '0470 12 34 56',
      });
    });

    it('refuses to add an entry with nothing written', async () => {
      renderPlan();
      const warning = await sectionFor('planWarningTitle');
      expect(
        warning.getByRole('button', { name: `${nl.planAdd} – ${nl.planWarningTitle}` }),
      ).toBeDisabled();
    });

    it('keeps what was typed on screen when the write fails, instead of wiping it', async () => {
      // Regression: the add form used to clear its fields the moment `add()`
      // ran, before `addPlanEntry` had even resolved — so a failed write
      // wiped a just-typed crisis contact with nothing to show for it.
      const user = userEvent.setup();
      addPlanEntry.mockRejectedValueOnce(new Error('offline'));
      renderPlan();
      const warning = await sectionFor('planWarningTitle');

      const field = warning.getByLabelText(`${nl.planWarningLabel} – ${nl.planWarningTitle}`);
      await user.type(field, 'Ik ga niet meer buiten');
      await user.click(warning.getByRole('button', { name: `${nl.planAdd} – ${nl.planWarningTitle}` }));

      expect(addPlanEntry).toHaveBeenCalled();
      expect(await warning.findByDisplayValue('Ik ga niet meer buiten')).toBeInTheDocument();
    });
  });

  describe('changing or removing an existing entry', () => {
    it('saves an edited entry back through updatePlanEntry', async () => {
      const user = userEvent.setup();
      readPlan.mockResolvedValue([entry()]);
      renderPlan();
      const warning = await sectionFor('planWarningTitle');

      // The row's own text, not the section title, is what names its
      // controls — see the comment on `rowName` in Plan.tsx.
      const rowContext = `${entry().label} (1) – ${nl.planWarningTitle}`;

      await user.click(warning.getByRole('button', { name: `${nl.circleChange} – ${rowContext}` }));
      const labelField = warning.getByLabelText(`${nl.planWarningLabel} – ${rowContext}`);
      await user.clear(labelField);
      await user.type(labelField, 'Ik slaap minder dan vier uur.');
      await user.click(warning.getByRole('button', { name: `${nl.planSave} – ${rowContext}` }));

      expect(updatePlanEntry).toHaveBeenCalledWith('uid-jonas', 'p1', {
        label: 'Ik slaap minder dan vier uur.',
        detail: 'Ik bel mijn zus.',
      });
    });

    it('removes an entry through removePlanEntry', async () => {
      const user = userEvent.setup();
      readPlan.mockResolvedValue([entry()]);
      renderPlan();
      const warning = await sectionFor('planWarningTitle');
      const rowContext = `${entry().label} (1) – ${nl.planWarningTitle}`;

      await user.click(warning.getByRole('button', { name: `${nl.circleChange} – ${rowContext}` }));
      await user.click(warning.getByRole('button', { name: `${nl.planRemove} – ${rowContext}` }));

      expect(removePlanEntry).toHaveBeenCalledWith('uid-jonas', 'p1');
    });

    it('keeps the add form and an editing row addressable as two different controls', async () => {
      /*
       * The regression this guards: in the `warning` section the field label
       * ("Wat je merkt") and the section title ("Wat je merkt") are the same
       * string, so naming every control only `${visible} – ${sectionTitle}`
       * made the add form's label field and an editing row's label field
       * collide exactly. Caught by this test before it ever reached a screen
       * reader user.
       */
      const user = userEvent.setup();
      readPlan.mockResolvedValue([entry()]);
      renderPlan();
      const warning = await sectionFor('planWarningTitle');

      await user.click(
        warning.getByRole('button', {
          name: `${nl.circleChange} – ${entry().label} (1) – ${nl.planWarningTitle}`,
        }),
      );

      // Each resolves on its own — if the two collided, either query would
      // throw "multiple elements found" instead of returning one.
      const addField = warning.getByLabelText(`${nl.planWarningLabel} – ${nl.planWarningTitle}`);
      const editField = warning.getByLabelText(
        `${nl.planWarningLabel} – ${entry().label} (1) – ${nl.planWarningTitle}`,
      );
      expect(addField).not.toBe(editField);
    });

    it('stays in edit mode with the typed value when the write fails, instead of reverting', async () => {
      // Regression: `PlanRow`'s save used to call `setEditing(false)`
      // immediately, before `updatePlanEntry` had even resolved — so a
      // failed save silently reverted the row to its stale value with
      // nothing to show anything had gone wrong.
      const user = userEvent.setup();
      updatePlanEntry.mockRejectedValueOnce(new Error('offline'));
      readPlan.mockResolvedValue([entry()]);
      renderPlan();
      const warning = await sectionFor('planWarningTitle');
      const rowContext = `${entry().label} (1) – ${nl.planWarningTitle}`;

      await user.click(warning.getByRole('button', { name: `${nl.circleChange} – ${rowContext}` }));
      const labelField = warning.getByLabelText(`${nl.planWarningLabel} – ${rowContext}`);
      await user.clear(labelField);
      await user.type(labelField, 'Ik slaap minder dan vier uur.');
      await user.click(warning.getByRole('button', { name: `${nl.planSave} – ${rowContext}` }));

      expect(updatePlanEntry).toHaveBeenCalled();
      // Still mid-edit, holding the typed value — not reverted to the stale
      // "Ik slaap minder dan vijf uur." and not silently closed.
      expect(await warning.findByDisplayValue('Ik slaap minder dan vier uur.')).toBeInTheDocument();
      expect(warning.queryByText('Ik slaap minder dan vijf uur.')).not.toBeInTheDocument();
    });
  });

  it('is read-only when it is somebody else’s', async () => {
    /*
     * It is the person's own words about their own patterns. A supporter
     * adding a sign would be telling them what to watch for in themselves —
     * and the rules refuse the write regardless.
     */
    readPlan.mockResolvedValue([entry()]);
    renderPlan('/plan/uid-someone');

    const warning = await sectionFor('planWarningTitle');
    expect(warning.getByText('Ik slaap minder dan vijf uur.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: new RegExp(`^${nl.planAdd} –`) })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: new RegExp(`^${nl.circleChange} –`) })).not.toBeInTheDocument();
  });
});
