import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// Testing Library only auto-cleans when Vitest globals are on. They are off
// here, so the DOM is torn down explicitly between tests.
afterEach(() => {
  cleanup();
});

// jsdom does not implement matchMedia, which anything honouring
// prefers-reduced-motion has to call. Default to no stated preference.
if (!window.matchMedia) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}
