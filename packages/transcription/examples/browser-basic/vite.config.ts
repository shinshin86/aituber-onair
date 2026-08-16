import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const exampleRoot = fileURLToPath(new URL('.', import.meta.url));
const packageEntry = fileURLToPath(
  new URL('../../src/index.ts', import.meta.url)
);

export default defineConfig({
  root: exampleRoot,
  worker: {
    format: 'es',
  },
  resolve: {
    alias: {
      '@aituber-onair/transcription': packageEntry,
    },
  },
  server: {
    host: '127.0.0.1',
    port: 5174,
    strictPort: true,
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
