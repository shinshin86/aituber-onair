import { defineConfig, type ProxyOptions } from 'vite';

function fixedProxy(
  target: string,
  rewrite: ProxyOptions['rewrite']
): ProxyOptions {
  return {
    target,
    changeOrigin: true,
    rewrite,
    configure(proxy) {
      proxy.on('proxyReq', (request) => request.removeHeader('origin'));
    },
  };
}

// Local demo only. Public apps should own their authenticated backend route.
export default defineConfig({
  server: {
    proxy: {
      '^/api/typesafe/systemone$': fixedProxy(
        'https://api.typesafe.ai',
        () => '/v1/systemone'
      ),
      '^/api/openai/decisions$': fixedProxy(
        'https://api.openai.com',
        () => '/v1/decisions'
      ),
      '^/api/google/decisions$': fixedProxy(
        'https://generativelanguage.googleapis.com',
        () => '/v1beta/decisions'
      ),
      '^/api/liquid/systemone$': fixedProxy(
        'https://api.liquid.ai',
        () => '/decisions/v1/systemone'
      ),
      '^/api/cloudflare/[A-Za-z0-9_-]+/clef(?:-flash|-omni)?$': fixedProxy(
        'https://api.cloudflare.com',
        (path) => {
          const match =
            /^\/api\/cloudflare\/([A-Za-z0-9_-]+)\/(clef(?:-flash|-omni)?)$/.exec(
              path
            );
          if (!match) throw new Error('Invalid Cloudflare Decisions route');
          return `/client/v4/accounts/${match[1]}/ai/run/@cf/cloudflare/${match[2]}`;
        }
      ),
    },
  },
});
