import { defineConfig } from 'vite';

// Local demo only. Public apps should own their authenticated backend route.
export default defineConfig({
  server: {
    proxy: {
      '^/api/typesafe/systemone$': {
        target: 'https://api.typesafe.ai',
        changeOrigin: true,
        rewrite: () => '/v1/systemone',
        configure(proxy) {
          proxy.on('proxyReq', (request) => {
            request.removeHeader('origin');
          });
        },
      },
    },
  },
});
