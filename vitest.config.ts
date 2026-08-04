import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: false,
    css: true,
    setupFiles: ['./vitest.setup.ts'],
    include: ['{apps,packages}/*/src/**/*.test.{ts,tsx}'],
  },
});
