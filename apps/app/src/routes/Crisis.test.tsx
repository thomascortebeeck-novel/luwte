import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { LocaleProvider } from '../providers/LocaleProvider';
import { Crisis } from './Crisis';

const renderCrisis = (locale: 'nl' | 'en' = 'nl') =>
  render(
    <LocaleProvider initialLocale={locale}>
      <Crisis />
    </LocaleProvider>,
  );

describe('Crisis', () => {
  it('offers the three Belgian services as dialable links', () => {
    renderCrisis();
    const hrefs = screen.getAllByRole('link').map((a) => a.getAttribute('href'));
    expect(hrefs).toEqual(['tel:1813', 'tel:080032123', 'tel:112']);
  });

  it('states the direct instruction and nothing softer', () => {
    renderCrisis();
    expect(
      screen.getByRole('heading', { name: 'Als het nu te zwaar is, bel iemand.' }),
    ).toBeInTheDocument();
  });

  it('names each service beside its number', () => {
    renderCrisis();
    expect(screen.getByRole('link', { name: /Zelfmoordlijn/ })).toHaveTextContent('1813');
    expect(screen.getByRole('link', { name: /Suicide/ })).toHaveTextContent('0800 32 123');
    expect(screen.getByRole('link', { name: /Noodgeval/ })).toHaveTextContent('112');
  });

  it('keeps the same numbers in English', () => {
    renderCrisis('en');
    expect(screen.getByRole('heading', { name: "If it's too much right now, call someone." }));
    const hrefs = screen.getAllByRole('link').map((a) => a.getAttribute('href'));
    expect(hrefs).toEqual(['tel:1813', 'tel:080032123', 'tel:112']);
  });
});
