/**
 * Adding something to a personal Google Calendar, without asking for calendar
 * access.
 *
 * The obvious implementation is the Google Calendar API: an OAuth consent
 * screen, calendar scopes, a stored refresh token per user, and luwte sending
 * event titles to Google on the person's behalf. For an app holding GDPR
 * Article 9 data that is a real escalation — a new processor, a new token to
 * protect, a new entry in the DPIA, and a permission prompt that reads like
 * the app wants into your life.
 *
 * A prefilled template link does the same job with none of it. The browser
 * opens Google Calendar with the fields already filled; the person presses
 * save, or does not. luwte holds no token, calls no API, and learns nothing.
 * The event reaches Google only because the person put it there.
 *
 * The trade-off, stated plainly: this cannot read their calendar, cannot
 * update an event later, and cannot remove one. For "put this in my diary"
 * that is the whole job. If two-way sync is ever wanted, it needs its own
 * decision and its own DPIA entry.
 */

export type CalendarEvent = {
  title: string;
  /** Local wall-clock start, `yyyy-MM-ddTHH:mm`. */
  start: string;
  /** Local wall-clock end, `yyyy-MM-ddTHH:mm`. */
  end: string;
  /** An IANA zone, so the event lands at the right local time anywhere. */
  timeZone: string;
  details?: string;
  /** An RRULE without the `RRULE:` prefix, e.g. `FREQ=DAILY`. */
  recurrence?: string;
};

/** `2026-08-04T21:00` becomes `20260804T210000`, which is what Google expects. */
function compact(wallClock: string): string {
  const cleaned = wallClock.replace(/[-:]/g, '');
  return cleaned.length === 13 ? `${cleaned}00` : cleaned;
}

export function googleCalendarLink(event: CalendarEvent): string {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${compact(event.start)}/${compact(event.end)}`,
    ctz: event.timeZone,
  });

  if (event.details) params.set('details', event.details);
  if (event.recurrence) params.set('recur', `RRULE:${event.recurrence}`);

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * The daily check-in reminder as a repeating calendar entry.
 *
 * The title says luwte rather than anything about health: a calendar is a
 * surface other people read over your shoulder, and a recurring entry that
 * announces a mental-health routine every evening is not something to create
 * on someone's behalf without thinking about it.
 */
export function checkinReminderCalendarLink(options: {
  title: string;
  details: string;
  /** The first occurrence, `yyyy-MM-dd`. */
  fromDate: string;
  /** 0..23, the hour the person chose. */
  hour: number;
  timeZone: string;
}): string {
  const hh = String(options.hour).padStart(2, '0');
  // An hour-long block reads as an appointment rather than an alarm. At 23:00
  // it would spill into the next day, so it ends at the last minute instead.
  const end =
    options.hour === 23
      ? `${options.fromDate}T23:59`
      : `${options.fromDate}T${String(options.hour + 1).padStart(2, '0')}:00`;

  return googleCalendarLink({
    title: options.title,
    details: options.details,
    start: `${options.fromDate}T${hh}:00`,
    end,
    timeZone: options.timeZone,
    recurrence: 'FREQ=DAILY',
  });
}
