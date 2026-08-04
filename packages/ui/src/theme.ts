export type Theme = 'dark' | 'light';

const KEY = 'luwte.theme';

const isTheme = (v: unknown): v is Theme => v === 'dark' || v === 'light';

/**
 * BRAND 3.2 — dark is what opens on first launch, and `prefers-color-scheme`
 * deliberately does not override it. The app is used at 03:00 by someone
 * whose sleep is disrupted; a luminous screen then is a physical intrusion.
 * Light is a choice the person makes, and once made it is remembered.
 */
export function readStoredTheme(storage: Storage = localStorage): Theme {
  try {
    const stored = storage.getItem(KEY);
    return isTheme(stored) ? stored : 'dark';
  } catch {
    return 'dark';
  }
}

export function storeTheme(theme: Theme, storage: Storage = localStorage): void {
  try {
    storage.setItem(KEY, theme);
  } catch {
    // Private browsing. The theme simply does not persist; nothing else breaks.
  }
}

export function applyTheme(theme: Theme, root: HTMLElement = document.documentElement): void {
  root.setAttribute('data-theme', theme);
}
