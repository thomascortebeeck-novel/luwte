import { beforeEach, describe, expect, it } from 'vitest';
import { applyTheme, readStoredTheme, storeTheme } from './theme';

class MemoryStorage {
  private map = new Map<string, string>();
  getItem = (k: string) => this.map.get(k) ?? null;
  setItem = (k: string, v: string) => void this.map.set(k, v);
  removeItem = (k: string) => void this.map.delete(k);
  clear = () => this.map.clear();
  key = () => null;
  get length() {
    return this.map.size;
  }
}

const makeStorage = () => new MemoryStorage() as unknown as Storage;

describe('theme', () => {
  let storage: Storage;

  beforeEach(() => {
    storage = makeStorage();
    document.documentElement.removeAttribute('data-theme');
  });

  it('opens dark on first launch', () => {
    // BRAND 3.2 — dark is what opens, and it is not a system-preference mirror.
    expect(readStoredTheme(storage)).toBe('dark');
  });

  it('remembers an explicit choice of light', () => {
    storeTheme('light', storage);
    expect(readStoredTheme(storage)).toBe('light');
  });

  it('remembers a return to dark', () => {
    storeTheme('light', storage);
    storeTheme('dark', storage);
    expect(readStoredTheme(storage)).toBe('dark');
  });

  it('ignores a stored value that is not a theme', () => {
    storage.setItem('luwte.theme', 'neon');
    expect(readStoredTheme(storage)).toBe('dark');
  });

  it('survives storage being unavailable', () => {
    const hostile = {
      getItem() {
        throw new Error('private mode');
      },
      setItem() {
        throw new Error('private mode');
      },
    } as unknown as Storage;
    expect(readStoredTheme(hostile)).toBe('dark');
    expect(() => storeTheme('light', hostile)).not.toThrow();
  });

  it('applies the theme to the document root', () => {
    applyTheme('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    applyTheme('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });
});
