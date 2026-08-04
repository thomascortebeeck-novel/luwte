import { defineConfig } from 'vitest/config';

/**
 * Rules tests are separate from the unit suite: they need the Firestore
 * emulator running, and a node environment rather than jsdom. Run them with
 * `pnpm test:rules`, which starts the emulator around them.
 */
export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
    include: ['firestore/**/*.test.ts'],
    testTimeout: 15000,
    hookTimeout: 30000,
    fileParallelism: false,
  },
});
