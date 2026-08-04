import { describe, expect, it } from 'vitest';
import { checkinReminderCalendarLink, googleCalendarLink } from './calendar';

const parse = (url: string) => new URL(url);

describe('googleCalendarLink', () => {
  const base = {
    title: 'even stilstaan bij je dag',
    start: '2026-08-04T21:00',
    end: '2026-08-04T22:00',
    timeZone: 'Europe/Brussels',
  };

  it('builds a template link, not an API call', () => {
    // The whole point: no OAuth, no scopes, no token, no new processor.
    const url = parse(googleCalendarLink(base));
    expect(url.origin + url.pathname).toBe('https://calendar.google.com/calendar/render');
    expect(url.searchParams.get('action')).toBe('TEMPLATE');
  });

  it('formats the times the way Google expects', () => {
    const url = parse(googleCalendarLink(base));
    expect(url.searchParams.get('dates')).toBe('20260804T210000/20260804T220000');
  });

  it('names the timezone so the event lands right from anywhere', () => {
    const url = parse(googleCalendarLink(base));
    expect(url.searchParams.get('ctz')).toBe('Europe/Brussels');
  });

  it('escapes a title rather than breaking the query string', () => {
    const url = parse(googleCalendarLink({ ...base, title: 'wandelen & rusten' }));
    expect(url.searchParams.get('text')).toBe('wandelen & rusten');
  });

  it('omits details and recurrence when there are none', () => {
    const url = parse(googleCalendarLink(base));
    expect(url.searchParams.has('details')).toBe(false);
    expect(url.searchParams.has('recur')).toBe(false);
  });

  it('prefixes a recurrence rule', () => {
    const url = parse(googleCalendarLink({ ...base, recurrence: 'FREQ=WEEKLY' }));
    expect(url.searchParams.get('recur')).toBe('RRULE:FREQ=WEEKLY');
  });
});

describe('checkinReminderCalendarLink', () => {
  const options = {
    title: 'luwte',
    details: 'even stilstaan bij je dag',
    fromDate: '2026-08-04',
    timeZone: 'Europe/Brussels',
  };

  it('repeats daily at the hour the person chose', () => {
    const url = parse(checkinReminderCalendarLink({ ...options, hour: 21 }));
    expect(url.searchParams.get('dates')).toBe('20260804T210000/20260804T220000');
    expect(url.searchParams.get('recur')).toBe('RRULE:FREQ=DAILY');
  });

  it('pads a single-digit hour', () => {
    const url = parse(checkinReminderCalendarLink({ ...options, hour: 9 }));
    expect(url.searchParams.get('dates')).toBe('20260804T090000/20260804T100000');
  });

  it('does not spill past midnight at 23:00', () => {
    const url = parse(checkinReminderCalendarLink({ ...options, hour: 23 }));
    expect(url.searchParams.get('dates')).toBe('20260804T230000/20260804T235900');
  });

  it('handles midnight', () => {
    const url = parse(checkinReminderCalendarLink({ ...options, hour: 0 }));
    expect(url.searchParams.get('dates')).toBe('20260804T000000/20260804T010000');
  });
});
