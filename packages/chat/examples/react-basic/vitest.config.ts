import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: [
      {
        find: /^@aituber-onair\/chat$/,
        replacement: fileURLToPath(
          new URL('../../src/index.ts', import.meta.url),
        ),
      },
    ],
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.{test,spec}.{ts,tsx}'],
    poolOptions: { threads: { singleThread: true } },
  },
});
