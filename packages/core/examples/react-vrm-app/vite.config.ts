import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, type ProxyOptions } from 'vite';
import react from '@vitejs/plugin-react';

const fishAudioProxy = {
  target: 'https://api.fish.audio',
  changeOrigin: true,
  rewrite: (path: string) => path.replace(/^\/api\/fish-audio/, ''),
};

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const workspaceThreeRoot = path.resolve(
  __dirname,
  '../../../../node_modules/three',
);

// https://vite.dev/config/
// TypeSafe AI rejects browser origins. Local dev/preview only; production
// apps should call Jev from their own authenticated backend.
const typesafeProxy: ProxyOptions = {
  target: 'https://api.typesafe.ai',
  changeOrigin: true,
  rewrite: () => '/v1/systemone',
  configure(proxy) {
    proxy.on('proxyReq', (request) => {
      request.removeHeader('origin');
    });
  },
};

export default defineConfig({
  server: {
    proxy: {
      '^/api/typesafe/systemone$': typesafeProxy,
      '/api/fish-audio': fishAudioProxy,
    },
  },
  preview: {
    proxy: {
      '^/api/typesafe/systemone$': typesafeProxy,
      '/api/fish-audio': fishAudioProxy,
    },
  },
  resolve: {
    alias: [
      {
        find: /^three$/,
        replacement: path.resolve(workspaceThreeRoot, 'build/three.module.js'),
      },
      {
        find: /^three\/examples\/jsm\/(.*)$/,
        replacement: `${path.resolve(workspaceThreeRoot, 'examples/jsm')}/$1`,
      },
    ],
  },
  plugins: [react()],
});
