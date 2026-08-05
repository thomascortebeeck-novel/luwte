import { describe, expect, it } from 'vitest';
import { isDueForReminder, localHour, selectDue, type ReminderCandidate } from './reminders';

const base: ReminderCandidate = {
  patientId: 'jonas',
  checkinHour: 21,
  timezone: 'Europe/Brussels',
  remindersEnabled: true,
  lastCheckinDate: null,
  alreadyRemindedOn: null,
  fcmTokens: ['token-1'],
};

// 19:00 UTC in August is 21:00 in Brussels.
const atTheHour = new Date('2026-08-04T19:00:00Z');
const anHourLater = new Date('2026-08-04T20:00:00Z');

describe('localHour', () => {
  it('reads the hour in the given zone, not UTC', () => {
    expect(localHour(atTheHour, 'Europe/Brussels')).toBe(21);
    expect(localHour(atTheHour, 'UTC')).toBe(19);
  });

  it('reports midnight as 0', () => {
    expect(localHour(new Date('2026-08-04T22:00:00Z'), 'Europe/Brussels')).toBe(0);
  });

  it('follows the winter offset too', () => {
    // In January Brussels is UTC+1.
    expect(localHour(new Date('2026-01-15T20:00:00Z'), 'Europe/Brussels')).toBe(21);
  });
});

describe('isDueForReminder', () => {
  /*
   * A supporter is never asked what hour suits them, so they have none. The
   * refusal lives here rather than in the caller: defaulting an hour would
   * enrol the brother in a daily nudge to fill in a check-in he does not keep.
   */
  it('never disturbs somebody who was never asked for an hour', () => {
    expect(isDueForReminder({ ...base, checkinHour: null }, atTheHour)).toBe(false);
    const { checkinHour: _omitted, ...withoutHour } = base;
    expect(isDueForReminder(withoutHour, atTheHour)).toBe(false);
  });

  it('fires at the chosen hour', () => {
    expect(isDueForReminder(base, atTheHour)).toBe(true);
  });

  it('stays silent at any other hour', () => {
    expect(isDueForReminder(base, anHourLater)).toBe(false);
  });

  it('stays silent once the person has checked in today', () => {
    expect(isDueForReminder({ ...base, lastCheckinDate: '2026-08-04' }, atTheHour)).toBe(false);
  });

  it('still fires when the last check-in was yesterday', () => {
    // PRD 6.1 — a missed day is invisible. It is not a reason to say more,
    // and it is not a reason to say less either.
    expect(isDueForReminder({ ...base, lastCheckinDate: '2026-08-03' }, atTheHour)).toBe(true);
  });

  it('never fires twice on the same day', () => {
    // The rule that makes "never chase" true rather than aspirational.
    expect(isDueForReminder({ ...base, alreadyRemindedOn: '2026-08-04' }, atTheHour)).toBe(false);
  });

  it('fires again the next day after yesterday reminder', () => {
    expect(isDueForReminder({ ...base, alreadyRemindedOn: '2026-08-03' }, atTheHour)).toBe(true);
  });

  it('respects the person turning reminders off', () => {
    expect(isDueForReminder({ ...base, remindersEnabled: false }, atTheHour)).toBe(false);
  });

  it('stays silent when there is nowhere to send it', () => {
    expect(isDueForReminder({ ...base, fcmTokens: [] }, atTheHour)).toBe(false);
    expect(isDueForReminder({ ...base, fcmTokens: undefined }, atTheHour)).toBe(false);
  });

  it('uses the patient timezone rather than the server one', () => {
    const inLisbon = { ...base, timezone: 'Europe/Lisbon' };
    // 19:00 UTC is 20:00 in Lisbon, so a 21:00 reminder is not due yet.
    expect(isDueForReminder(inLisbon, atTheHour)).toBe(false);
    expect(isDueForReminder(inLisbon, anHourLater)).toBe(true);
  });
});

describe('selectDue', () => {
  it('picks only the people who should be disturbed', () => {
    const due = selectDue(
      [
        base,
        { ...base, patientId: 'already-did-it', lastCheckinDate: '2026-08-04' },
        { ...base, patientId: 'opted-out', remindersEnabled: false },
        { ...base, patientId: 'other-hour', checkinHour: 8 },
        { ...base, patientId: 'also-due' },
      ],
      atTheHour,
    );
    expect(due.map((c) => c.patientId)).toEqual(['jonas', 'also-due']);
  });

  it('returns nobody when nobody is due', () => {
    expect(selectDue([base], anHourLater)).toEqual([]);
  });
});
