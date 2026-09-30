import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: {
    alias: [
      {
        find: /^@aituber-onair\/chat$/,
        replacement: fileURLToPath(new URL('./src/index.ts', import.meta.url)),
      },
    ],
  },
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: true,
        maxThreads: 1,
        minThreads: 1,
      },
    },
    maxConcurrency: 1,
    fileParallelism: false,
    coverage: {
      include: ['src/**'],
      reporter: ['text', 'lcov'],
      thresholds: {
        statements: 78,
        branches: 82,
        functions: 74,
        lines: 78,
      },
    },
  },
});
