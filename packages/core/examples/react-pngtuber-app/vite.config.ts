import { defineConfig, type ProxyOptions } from 'vite';
import react from '@vitejs/plugin-react';

const fishAudioProxy = {
  target: 'https://api.fish.audio',
  changeOrigin: true,
  rewrite: (path: string) => path.replace(/^\/api\/fish-audio/, ''),
};

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
  plugins: [react()],
});
