import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { LocaleProvider, useLocale } from './LocaleProvider';
import { ThemeProvider, useTheme } from './ThemeProvider';

function LocaleProbe() {
  const { t, locale, setLocale } = useLocale();
  return (
    <>
      <p>{t('checkinEntry')}</p>
      <p data-testid="locale">{locale}</p>
      <button onClick={() => setLocale('en')}>english</button>
      <button onClick={() => setLocale('nl')}>nederlands</button>
    </>
  );
}

function ThemeProbe() {
  const { theme, toggleTheme } = useTheme();
  return (
    <>
      <p data-testid="theme">{theme}</p>
      <button onClick={toggleTheme}>toggle</button>
    </>
  );
}

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
});

describe('LocaleProvider', () => {
  it('starts in Dutch', () => {
    render(
      <LocaleProvider initialLocale="nl">
        <LocaleProbe />
      </LocaleProvider>,
    );
    expect(screen.getByText('Hoe was vandaag?')).toBeInTheDocument();
  });

  it('opens in Dutch even though this browser prefers English', () => {
    // jsdom reports en-US. Dutch opens anyway: a Dutch speaker who is unwell
    // and lands in English is stuck, an English speaker taps once.
    render(
      <LocaleProvider>
        <LocaleProbe />
      </LocaleProvider>,
    );
    expect(screen.getByTestId('locale')).toHaveTextContent('nl');
  });

  it('reopens in the language the person chose last time', () => {
    localStorage.setItem('luwte.locale', 'en');
    render(
      <LocaleProvider>
        <LocaleProbe />
      </LocaleProvider>,
    );
    expect(screen.getByTestId('locale')).toHaveTextContent('en');
  });

  it('switches to English and back', async () => {
    render(
      <LocaleProvider initialLocale="nl">
        <LocaleProbe />
      </LocaleProvider>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'english' }));
    expect(screen.getByText('How was today?')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'nederlands' }));
    expect(screen.getByText('Hoe was vandaag?')).toBeInTheDocument();
  });

  it('remembers the chosen language', async () => {
    render(
      <LocaleProvider initialLocale="nl">
        <LocaleProbe />
      </LocaleProvider>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'english' }));
    expect(localStorage.getItem('luwte.locale')).toBe('en');
  });

  it('sets the document language so screen readers pronounce it correctly', async () => {
    render(
      <LocaleProvider initialLocale="nl">
        <LocaleProbe />
      </LocaleProvider>,
    );
    expect(document.documentElement.lang).toBe('nl-BE');
    await userEvent.click(screen.getByRole('button', { name: 'english' }));
    expect(document.documentElement.lang).toBe('en');
  });
});

describe('ThemeProvider', () => {
  it('opens dark and applies it to the document', () => {
    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>,
    );
    expect(screen.getByTestId('theme')).toHaveTextContent('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('toggles to light and remembers it', async () => {
    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'toggle' }));
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    expect(localStorage.getItem('luwte.theme')).toBe('light');
  });
});
