import type { PlanEntry } from './plan';

/**
 * The person's own people, on the crisis screen.
 *
 * These are steps 4 and 5 of the safety plan rather than a separate list —
 * one thing to fill in, one thing to keep current. The national services in
 * `crisis.ts` are unchanged and still render first in the markup; these sit
 * above them on screen because Stanley and Brown put somebody who knows you
 * before a service, and because a familiar voice is often what is needed.
 */
export type PersonalContact = {
  name: string;
  /** What was typed, kept as-is: people recognise their own spacing. */
  display: string;
  /** Stripped so every dialer accepts it. */
  dial: string;
};

/**
 * Belgian numbers are written with spaces, slashes and dots, and every one of
 * those breaks a `tel:` link on some dialer. A leading `+` survives because
 * international numbers need it.
 *
 * Returns null for anything that is not plausibly a number. A row that looks
 * tappable and does nothing is worse than no row, and this is the one screen
 * where that matters most.
 */
export function toDial(raw: string): string | null {
  const trimmed = raw.trim();
  if (trimmed === '') return null;
  const plus = trimmed.startsWith('+') ? '+' : '';
  const digits = trimmed.replace(/\D/g, '');
  // Floor is three, not four: 112 is the European emergency number and must
  // dial. Two digits or fewer is not a plausible phone number anywhere.
  if (digits.length < 3) return null;
  // Anything with letters in it was a note, not a number.
  if (/[a-z]/i.test(trimmed)) return null;
  return `tel:${plus}${digits}`;
}

const CONTACT_SECTIONS = ['help', 'professional'] as const;

export function personalContacts(entries: readonly PlanEntry[]): PersonalContact[] {
  return CONTACT_SECTIONS.flatMap((section) =>
    entries
      .filter((entry) => entry.section === section)
      .flatMap((entry) => {
        const dial = toDial(entry.detail);
        if (dial === null || entry.label.trim() === '') return [];
        return [{ name: entry.label.trim(), display: entry.detail.trim(), dial }];
      }),
  );
}
