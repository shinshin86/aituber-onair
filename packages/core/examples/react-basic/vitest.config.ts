import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: {
    alias: [
      {
        find: /^@aituber-onair\/core$/,
        replacement: fileURLToPath(
          new URL('../../src/index.ts', import.meta.url),
        ),
      },
      {
        find: /^@aituber-onair\/chat$/,
        replacement: fileURLToPath(
          new URL('../../../chat/src/index.ts', import.meta.url),
        ),
      },
    ],
  },
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.{test,spec}.{ts,tsx}'],
    poolOptions: { threads: { singleThread: true } },
  },
});
