import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['./tests/e2e/**/*.test.ts'],
    testTimeout: 180_000,
    hookTimeout: 60_000,
  },
});
