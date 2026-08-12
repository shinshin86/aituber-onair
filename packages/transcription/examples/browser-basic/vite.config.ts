import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import { createClientSecretMiddleware } from './server/clientSecretMiddleware';

const exampleRoot = fileURLToPath(new URL('.', import.meta.url));
const packageEntry = fileURLToPath(
  new URL('../../src/index.ts', import.meta.url)
);

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, exampleRoot, '');
  const clientSecretPlugin: Plugin = {
    name: 'openai-realtime-client-secret',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(
        createClientSecretMiddleware({
          apiKey: env.OPENAI_API_KEY ?? '',
        })
      );
    },
  };

  return {
    root: exampleRoot,
    resolve: {
      alias: {
        '@aituber-onair/transcription': packageEntry,
      },
    },
    plugins: [clientSecretPlugin],
    server: {
      host: '127.0.0.1',
      port: 5174,
      strictPort: true,
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
    },
  };
});
