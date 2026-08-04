import { en } from './en';
import { nl } from './nl';

export type { CopyKey, Dictionary } from './types';
export type Locale = 'nl' | 'en';

/** Dutch first. Flanders is the market; English exists for the rest of the circle. */
export const DEFAULT_LOCALE: Locale = 'nl';

export const LOCALES: readonly Locale[] = ['nl', 'en'];

export const dictionaries = { nl, en } satisfies Record<Locale, Record<string, string>>;

/** Anything that is not clearly English resolves to Dutch. */
export function resolveLocale(candidate: string | undefined | null): Locale {
  return candidate?.toLowerCase().startsWith('en') ? 'en' : DEFAULT_LOCALE;
}
