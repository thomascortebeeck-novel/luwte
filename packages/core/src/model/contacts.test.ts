import { describe, expect, it } from 'vitest';
import { personalContacts, toDial } from './contacts';

const at = new Date();

describe('turning what somebody typed into something a phone can dial', () => {
  it.each([
    ['0470 12 34 56', 'tel:0470123456'],
    ['+32 470 12 34 56', 'tel:+32470123456'],
    ['02/512.34.56', 'tel:025123456'],
    ['1813', 'tel:1813'],
  ])('%s dials as %s', (raw, expected) => {
    expect(toDial(raw)).toBe(expected);
  });

  it('refuses anything that is not a number', () => {
    // A name in the number field must not become a broken tel: link that
    // silently does nothing when somebody taps it in a crisis.
    expect(toDial('bel mijn zus')).toBeNull();
    expect(toDial('')).toBeNull();
    expect(toDial('12')).toBeNull();
  });
});

describe('which of the plan becomes a crisis contact', () => {
  it('takes the people and the professionals, in that order', () => {
    // Stanley and Brown's order: somebody who knows you before a service.
    const contacts = personalContacts([
      { section: 'professional', label: 'dokter Peeters', detail: '02 512 34 56', createdAt: at },
      { section: 'help', label: 'mijn zus', detail: '0470 12 34 56', createdAt: at },
      { section: 'coping', label: 'douche', detail: '', createdAt: at },
    ]);
    expect(contacts.map((c) => c.name)).toEqual(['mijn zus', 'dokter Peeters']);
  });

  it('leaves out anybody without a usable number', () => {
    // Shown, it would be a row that does nothing when tapped.
    const contacts = personalContacts([
      { section: 'help', label: 'mijn zus', detail: '', createdAt: at },
      { section: 'help', label: 'mijn broer', detail: 'weet ik niet', createdAt: at },
    ]);
    expect(contacts).toEqual([]);
  });

  it('keeps what was typed as the thing on screen', () => {
    // The dial string is stripped for the dialer; the display keeps the
    // spacing somebody recognises.
    const contacts = personalContacts([
      { section: 'help', label: 'mijn zus', detail: '0470 12 34 56', createdAt: at },
    ]);
    expect(contacts[0]).toEqual({
      name: 'mijn zus',
      display: '0470 12 34 56',
      dial: 'tel:0470123456',
    });
  });
});
