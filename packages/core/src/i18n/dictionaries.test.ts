import { describe, expect, it } from 'vitest';
import { lintCopy } from '../copy-lint';
import { dictionaries, resolveLocale, type Locale } from './index';

const locales = Object.keys(dictionaries) as Locale[];

describe('dictionaries', () => {
  it('has identical keys in every locale', () => {
    const [first, ...rest] = locales;
    const reference = Object.keys(dictionaries[first!]).sort();
    for (const locale of rest) {
      expect(Object.keys(dictionaries[locale]).sort()).toEqual(reference);
    }
  });

  it.each(locales)('has no empty values in %s', (locale) => {
    for (const [key, value] of Object.entries(dictionaries[locale])) {
      expect(value.trim(), `${locale}.${key} is empty`).not.toBe('');
    }
  });

  it.each(locales)('passes copy-lint on every value in %s', (locale) => {
    const failures = Object.entries(dictionaries[locale]).flatMap(([key, value]) =>
      lintCopy(value, locale).map((v) => `${locale}.${key}: ${v.detail} in "${value}"`),
    );
    expect(failures).toEqual([]);
  });
});

describe('resolveLocale', () => {
  it('defaults to Dutch', () => {
    expect(resolveLocale(undefined)).toBe('nl');
    expect(resolveLocale(null)).toBe('nl');
    expect(resolveLocale('fr-BE')).toBe('nl');
  });

  it('recognises English', () => {
    expect(resolveLocale('en')).toBe('en');
    expect(resolveLocale('en-GB')).toBe('en');
    expect(resolveLocale('EN-US')).toBe('en');
  });

  it('recognises Dutch explicitly', () => {
    expect(resolveLocale('nl-BE')).toBe('nl');
  });
});
