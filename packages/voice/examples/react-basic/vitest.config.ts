import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// Keep DOM coverage separate from the package's audio-only window mocks.
export default defineConfig({
  resolve: {
    alias: {
      '@aituber-onair/voice': fileURLToPath(
        new URL('../../src/index.ts', import.meta.url),
      ),
    },
    dedupe: ['react', 'react-dom'],
  },
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.dom.tsx'],
    restoreMocks: true,
    unstubGlobals: true,
  },
});
