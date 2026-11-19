// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import type { ProxyOptions, UserConfig } from 'vite';

const configModule = '../examples/live-comment-filter-sample/vite.config.ts';
const config: UserConfig = (await import(configModule)).default;
const proxies = config.server?.proxy as Record<string, ProxyOptions>;
function route(path: string) {
  return Object.entries(proxies).find(([pattern]) =>
    new RegExp(pattern).test(path)
  )?.[1];
}

describe('local Decisions proxies', () => {
  it.each([
    ['/api/typesafe/systemone', 'https://api.typesafe.ai', '/v1/systemone'],
    [
      '/api/liquid/systemone',
      'https://api.liquid.ai',
      '/decisions/v1/systemone',
    ],
    [
      '/api/google/decisions',
      'https://generativelanguage.googleapis.com',
      '/v1beta/decisions',
    ],
    ['/api/openai/decisions', 'https://api.openai.com', '/v1/decisions'],
    [
      '/api/cloudflare/account-1/clef',
      'https://api.cloudflare.com',
      '/client/v4/accounts/account-1/ai/run/@cf/cloudflare/clef',
    ],
    [
      '/api/cloudflare/account_2/clef-flash',
      'https://api.cloudflare.com',
      '/client/v4/accounts/account_2/ai/run/@cf/cloudflare/clef-flash',
    ],
    [
      '/api/cloudflare/account3/clef-omni',
      'https://api.cloudflare.com',
      '/client/v4/accounts/account3/ai/run/@cf/cloudflare/clef-omni',
    ],
  ])(
    'fixes host and upstream path for %s and strips Origin',
    (path, host, upstream) => {
      const proxy = route(path);
      if (!proxy) throw new Error('Expected a configured proxy');
      expect(proxy.target).toBe(host);
      expect(proxy.changeOrigin).toBe(true);
      expect(proxy.rewrite?.(path)).toBe(upstream);
      const request = { removeHeader: vi.fn() };
      const on = vi.fn((_event, handler) => handler(request));
      proxy.configure?.({ on } as never, {});
      expect(on).toHaveBeenCalledWith('proxyReq', expect.any(Function));
      expect(request.removeHeader).toHaveBeenCalledWith('origin');
    }
  );

  it.each([
    '/api/openai/decisions?target=https://example.com',
    '/api/google/decisions/extra',
    '/api/liquid/systemone/../other',
    '/api/microsoft/systemone',
    '/api/openrouter/decisions',
    '/api/cloudflare//clef',
    '/api/cloudflare/../clef',
    '/api/cloudflare/account/clairic',
    '/api/cloudflare/account/clef/extra',
    '/api/cloudflare/account/clef?target=https://example.com',
    '/api/cloudflare/account%2Fother/clef',
    '/api/cloudflare/https://example.com/clef',
  ])('does not proxy unsupported or attacker-controlled paths: %s', (path) => {
    expect(route(path)).toBeUndefined();
  });
});
