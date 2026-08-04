import { DEFAULT_LOCALE, dictionaries, resolveLocale, type CopyKey, type Locale } from '@luwte/core';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

const STORAGE_KEY = 'luwte.locale';

type LocaleContextValue = {
  locale: Locale;
  t: (key: CopyKey) => string;
  setLocale: (locale: Locale) => void;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

/**
 * Dutch opens, and the browser's language deliberately does not override it —
 * the same shape as the dark-theme rule.
 *
 * The asymmetry is the reason: a Dutch speaker who is unwell and gets an
 * English interface is genuinely stuck, while an English-speaking supporter
 * who gets Dutch switches in one tap. Only an explicit choice, made in the
 * app and remembered, moves it.
 */
function readStoredLocale(): Locale {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return resolveLocale(stored);
  } catch {
    // Private browsing. Dutch it is.
  }
  return DEFAULT_LOCALE;
}

export function LocaleProvider({
  children,
  initialLocale,
}: {
  children: ReactNode;
  initialLocale?: Locale;
}) {
  const [locale, setLocaleState] = useState<Locale>(() => initialLocale ?? readStoredLocale());

  useEffect(() => {
    document.documentElement.lang = locale === 'nl' ? 'nl-BE' : 'en';
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // The choice simply does not persist. Nothing else breaks.
    }
  }, []);

  const value = useMemo<LocaleContextValue>(
    () => ({ locale, setLocale, t: (key) => dictionaries[locale][key] }),
    [locale, setLocale],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error('useLocale must be used inside a LocaleProvider');
  return ctx;
}
