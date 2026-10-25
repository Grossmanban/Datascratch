import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['bench/**/*.test.ts'],
    globalSetup: ['test/global-setup.ts'],
    testTimeout: 300_000,
    hookTimeout: 120_000,
  },
});
