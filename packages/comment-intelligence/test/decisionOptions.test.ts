import { expectTypeOf, it } from 'vitest';
import type {
  createDecisionsCommentAnalysisProvider,
  createJevCommentAnalysisProvider,
  CloudflareDecisionsBinding,
  DecisionsCommentAnalysisOptions,
  JevCommentAnalysisOptions,
} from '../src/index.js';

// These calls only test assignability; no providers or network calls are made.
function acceptsOptions(_options: DecisionsCommentAnalysisOptions): void {}

it('requires each transport connection shape at compile time', () => {
  const binding: CloudflareDecisionsBinding = { run: async () => ({}) };
  for (const transport of [
    'typesafe',
    'openrouter',
    'liquid',
    'google',
    'openai',
  ] as const) {
    acceptsOptions({ transport, apiKey: 'key', responsePlan: true });
    // @ts-expect-error Every API-key transport requires apiKey.
    acceptsOptions({ transport });
    // @ts-expect-error A bearer token does not replace an API key here.
    acceptsOptions({ transport, bearerToken: 'token' });
  }

  const microsoft = {
    transport: 'microsoft' as const,
    endpoint: 'https://example.com',
    model: 'deployment',
  };
  acceptsOptions({ ...microsoft, apiKey: 'key' });
  acceptsOptions({ ...microsoft, bearerToken: 'token', maxComments: 20 });
  // @ts-expect-error Microsoft requires endpoint.
  acceptsOptions({
    transport: 'microsoft',
    model: 'deployment',
    apiKey: 'key',
  });
  // @ts-expect-error Microsoft requires a deployment name.
  acceptsOptions({
    transport: 'microsoft',
    endpoint: 'https://example.com',
    apiKey: 'key',
  });
  // @ts-expect-error Microsoft requires one authentication method.
  acceptsOptions(microsoft);
  const mixedMicrosoft = { ...microsoft, apiKey: 'key', bearerToken: 'token' };
  // @ts-expect-error Exclusions reject mixed auth even through a variable.
  acceptsOptions(mixedMicrosoft);

  acceptsOptions({
    transport: 'cloudflare',
    apiKey: 'key',
    accountId: 'account',
  });
  acceptsOptions({
    transport: 'cloudflare',
    binding,
    model: 'clef',
    timeoutMs: 100,
  });
  // @ts-expect-error Cloudflare requires REST auth or a binding.
  acceptsOptions({ transport: 'cloudflare' });
  // @ts-expect-error Cloudflare REST requires accountId.
  acceptsOptions({ transport: 'cloudflare', apiKey: 'key' });
  // @ts-expect-error Cloudflare REST requires apiKey.
  acceptsOptions({ transport: 'cloudflare', accountId: 'account' });
  const mixedCloudflare = {
    transport: 'cloudflare' as const,
    apiKey: 'key',
    accountId: 'account',
    binding,
  };
  // @ts-expect-error REST credentials and binding are mutually exclusive.
  acceptsOptions(mixedCloudflare);
  // @ts-expect-error Even an accountId alone is excluded with binding.
  acceptsOptions({ transport: 'cloudflare', accountId: 'account', binding });
  // @ts-expect-error Even an API key alone is excluded with binding.
  acceptsOptions({ transport: 'cloudflare', apiKey: 'key', binding });
});

it('preserves the original Jev options shape and both factory inputs', () => {
  const legacyOptions = (
    transport: 'openrouter' | 'typesafe'
  ): JevCommentAnalysisOptions => ({
    transport,
    apiKey: 'key',
    model: 'jev-latest',
    responsePlan: { signalThreshold: 0.5 },
  });
  acceptsOptions(legacyOptions('typesafe'));
  acceptsOptions(legacyOptions('openrouter'));
  expectTypeOf<JevCommentAnalysisOptions>().toMatchTypeOf<
    Parameters<typeof createJevCommentAnalysisProvider>[0]
  >();
  expectTypeOf<JevCommentAnalysisOptions>().toMatchTypeOf<
    Parameters<typeof createDecisionsCommentAnalysisProvider>[0]
  >();
  // @ts-expect-error Legacy Jev options still require an API key.
  const missingKey: JevCommentAnalysisOptions = { transport: 'typesafe' };
  void missingKey;
});
