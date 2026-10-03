import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const model = (
  id = 'vendor/model',
  pricing: unknown = { prompt: '0', completion: '0' },
  extra = {},
) => ({
  id,
  name: id,
  architecture: {
    input_modalities: ['text', 'image'],
    output_modalities: ['text'],
  },
  pricing,
  reasoning: { supported_efforts: ['low', 'high'] },
  supported_parameters: ['tools', 'tool_choice', 'reasoning'],
  ...extra,
});
function storage() {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
    removeItem: (key: string) => data.delete(key),
    clear: () => data.clear(),
  };
}
beforeEach(() => {
  vi.resetModules();
  vi.stubGlobal('localStorage', storage());
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
describe('strict catalog metadata', () => {
  it('classifies every pricing field without rounding or suffix assumptions', async () => {
    const { classifyPricing, parseCatalog } = await import(
      '../../src/openrouterCatalog/catalog'
    );
    expect(
      classifyPricing({
        prompt: '0',
        completion: '0',
        request: '0.00000000001',
      }),
    ).toBe('paid');
    for (const pricing of [
      null,
      {},
      { prompt: null, completion: '0' },
      { prompt: '', completion: '0' },
      { prompt: ' ', completion: '0' },
      { prompt: '-1', completion: '0' },
      { prompt: 'Infinity', completion: '0' },
      { prompt: '0', completion: '0', image: null },
      { prompt: '0', completion: '0', discount: '-0.1' },
    ])
      expect(classifyPricing(pricing)).toBe('unknown');
    expect(
      parseCatalog({
        data: [model('vendor/model:free', { prompt: '1', completion: '0' })],
      })[0].priceClass,
    ).toBe('paid');
    expect(
      parseCatalog({
        data: [
          model('vendor/model', { prompt: '0', completion: '0', request: '0' }),
        ],
      })[0].priceClass,
    ).toBe('zero');
  });
  it('accepts text-input text-only output and rejects malformed and image-output records', async () => {
    const { parseCatalog } = await import(
      '../../src/openrouterCatalog/catalog'
    );
    expect(
      parseCatalog({
        data: [
          model(),
          model(
            'image',
            {},
            {
              architecture: {
                input_modalities: ['text'],
                output_modalities: ['text', 'image'],
              },
            },
          ),
          model('bad', {}, { architecture: null }),
          null,
        ],
      }),
    ).toHaveLength(1);
    expect(() => parseCatalog({ error: 'no' })).toThrow();
    expect(() => parseCatalog({ data: [model(), model()] })).toThrow();
  });
});
describe('metadata store and cost safety', () => {
  it('uses only anonymous official GET, deduplicates and caches for five minutes', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ data: [model()] }) });
    vi.stubGlobal('fetch', fetcher);
    const c = await import('../../src/openrouterCatalog/catalog');
    await Promise.all([
      c.refreshCatalog(),
      c.refreshCatalog(),
      c.refreshCatalog(),
    ]);
    await c.refreshCatalog();
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher.mock.calls[0][0]).toBe(c.CATALOG_URL);
    expect(fetcher.mock.calls[0][1]).toMatchObject({
      method: 'GET',
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
    });
    expect(fetcher.mock.calls[0][1]).not.toHaveProperty('headers');
    expect(c.getCatalogSnapshot().status).toBe('ready');
  });
  it('requires acknowledgement after raw price changes and persists it across reload', async () => {
    let pricing = { prompt: '0', completion: '0' };
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ data: [model('vendor/model', pricing)] }),
      })),
    );
    let c = await import('../../src/openrouterCatalog/catalog');
    await c.refreshCatalog();
    expect(c.getOpenRouterRequestBlockReason('vendor/model')).toBeNull();
    pricing = { prompt: '0.000000000001', completion: '0' };
    await c.refreshCatalog(true);
    expect(c.getOpenRouterRequestBlockReason('vendor/model')).toContain(
      'Pricing',
    );
    vi.resetModules();
    c = await import('../../src/openrouterCatalog/catalog');
    expect(c.getOpenRouterRequestBlockReason('vendor/model')).toContain(
      'Pricing',
    );
    c.acknowledgeOpenRouterModel('vendor/model');
    expect(c.getOpenRouterRequestBlockReason('vendor/model')).toBeNull();
    vi.resetModules();
    c = await import('../../src/openrouterCatalog/catalog');
    expect(c.getOpenRouterRequestBlockReason('vendor/model')).toBeNull();
  });
  it('replaces snapshots without stale unions and cannot acknowledge a missing ID', async () => {
    let data = [model()];
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: true, json: async () => ({ data }) })),
    );
    const c = await import('../../src/openrouterCatalog/catalog');
    await c.refreshCatalog();
    data = [];
    await c.refreshCatalog(true);
    expect(c.getCatalogSnapshot().models).toEqual([]);
    c.acknowledgeOpenRouterModel('vendor/model');
    expect(c.getOpenRouterRequestBlockReason('vendor/model')).toContain(
      'absent',
    );
    expect(c.catalogSupportsVision('vendor/model', true)).toBe(false);
  });
  it('retains last good snapshot on failures and times out even an uncooperative fetch', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: [model()] }),
        })
        .mockImplementation(() => new Promise(() => {})),
    );
    const c = await import('../../src/openrouterCatalog/catalog');
    await c.refreshCatalog();
    vi.useFakeTimers();
    const pending = c.refreshCatalog(true);
    await vi.advanceTimersByTimeAsync(c.TIMEOUT_MS);
    await pending;
    expect(c.getCatalogSnapshot().status).toBe('error');
    expect(c.getCatalogSnapshot().models).toHaveLength(1);
  });
  it('intersects capabilities with SDK knowledge and blocks an initially paid free-suffix ID', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          data: [model('vendor/model:free', { prompt: '1', completion: '0' })],
        }),
      })),
    );
    const c = await import('../../src/openrouterCatalog/catalog');
    await c.refreshCatalog();
    expect(c.getOpenRouterRequestBlockReason('vendor/model:free')).toContain(
      'Pricing',
    );
    expect(c.catalogSupportsVision('vendor/model:free', false)).toBe(false);
    expect(c.catalogSupportsVision('vendor/model:free', true)).toBe(true);
    expect(c.catalogSupportsTools('vendor/model:free', false)).toBe(false);
    expect(c.catalogSupportsReasoning('vendor/model:free', true)).toBe(true);
  });
  it('ignores corrupt cache and storage failures and migrates only legacy IDs', async () => {
    localStorage.setItem('aituber-openrouter-catalog-v1', '{broken');
    localStorage.setItem(
      'aituber-onair.openrouter.dynamicFreeModels',
      JSON.stringify({
        models: ['old:free', 'old:free'],
        fetchedAt: Date.now(),
      }),
    );
    const c = await import('../../src/openrouterCatalog/catalog');
    expect(c.getCatalogSnapshot().updatedAt).toBeNull();
    expect(c.getLegacyOpenRouterModels()).toEqual([
      { id: 'old:free', name: 'old:free' },
    ]);
    vi.stubGlobal('localStorage', {
      getItem() {
        throw new Error('denied');
      },
      setItem() {
        throw new Error('denied');
      },
    });
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ data: [model()] }),
      })),
    );
    await c.refreshCatalog();
    expect(c.getCatalogSnapshot().status).toBe('ready');
  });
});

describe('cache boundaries', () => {
  it('reuses endpoint-scoped last-good cache and refreshes after TTL', async () => {
    const now = Date.now();
    vi.useFakeTimers();
    vi.setSystemTime(now);
    localStorage.setItem(
      'aituber-openrouter-catalog-v1',
      JSON.stringify({
        version: 1,
        endpoint: 'https://openrouter.ai/api/v1/models',
        updatedAt: now,
        payload: { data: [model()] },
      }),
    );
    const fetcher = vi.fn(async () => ({
      ok: true,
      json: async () => ({ data: [model('new/model')] }),
    }));
    vi.stubGlobal('fetch', fetcher);
    const c = await import('../../src/openrouterCatalog/catalog');
    await c.refreshCatalog();
    expect(fetcher).not.toHaveBeenCalled();
    vi.setSystemTime(now + c.TTL_MS);
    await c.refreshCatalog();
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(c.getCatalogSnapshot().models[0].id).toBe('new/model');
  });
  it('does not trust another endpoint cache or enable advanced fallback capabilities', async () => {
    localStorage.setItem(
      'aituber-openrouter-catalog-v1',
      JSON.stringify({
        version: 1,
        endpoint: 'https://example.com',
        updatedAt: Date.now(),
        payload: { data: [model()] },
      }),
    );
    const c = await import('../../src/openrouterCatalog/catalog');
    expect(c.getCatalogSnapshot().updatedAt).toBeNull();
    expect(c.catalogSupportsVision('vendor/model', true)).toBe(false);
    expect(c.catalogSupportsTools('vendor/model', true)).toBe(false);
    expect(c.catalogSupportsReasoning('vendor/model', true)).toBe(false);
  });
  it('requires both tool metadata fields and intersects explicit reasoning efforts', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          data: [
            model('vendor/model', undefined, {
              supported_parameters: ['tools', 'reasoning'],
              reasoning: { supported_efforts: ['low'] },
            }),
          ],
        }),
      })),
    );
    const c = await import('../../src/openrouterCatalog/catalog');
    await c.refreshCatalog();
    expect(c.catalogSupportsTools('vendor/model', true)).toBe(false);
    expect(
      c.catalogSupportedReasoningEfforts('vendor/model', ['low', 'high']),
    ).toEqual(['low']);
    expect(c.catalogSupportedReasoningEfforts('unknown', ['low'])).toEqual([]);
  });
});

it('preserves plain-array legacy cache IDs as unverified fallback', async () => {
  localStorage.setItem(
    'aituber-onair.openrouter.dynamicFreeModels',
    JSON.stringify(['legacy:free', 'legacy:free', '', null]),
  );
  const c = await import('../../src/openrouterCatalog/catalog');
  expect(c.getLegacyOpenRouterModels()).toEqual([
    { id: 'legacy:free', name: 'legacy:free' },
  ]);
  expect(c.migrateLegacyOpenRouterModels(['legacy:free'])).toEqual([
    { id: 'legacy:free', name: 'legacy:free' },
  ]);
  expect(c.getCatalogSnapshot().updatedAt).toBeNull();
  expect(c.getCatalogSnapshot().models).toEqual([]);
});

it('does not label positive underflow as zero published price', async () => {
  const { classifyPricing } = await import(
    '../../src/openrouterCatalog/catalog'
  );
  expect(classifyPricing({ prompt: '1e-9999', completion: '0' })).toBe(
    'unknown',
  );
  expect(classifyPricing({ prompt: '0.00001e-9999', completion: '0' })).toBe(
    'unknown',
  );
  expect(
    classifyPricing({ prompt: '0e-9999', completion: '0.000e+9999' }),
  ).toBe('zero');
});

it('times out response-body reads, aborts the request, and ignores late data after retry', async () => {
  vi.useFakeTimers();
  let resolveBody: (payload: unknown) => void = () => {};
  const oldBody = new Promise((resolve) => {
    resolveBody = resolve;
  });
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce({ ok: true, json: () => oldBody })
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [model('fresh/model')] }),
    });
  vi.stubGlobal('fetch', fetcher);
  const c = await import('../../src/openrouterCatalog/catalog');
  const pending = c.refreshCatalog();
  await vi.advanceTimersByTimeAsync(c.TIMEOUT_MS);
  await pending;
  expect(fetcher.mock.calls[0][1].signal.aborted).toBe(true);
  expect(c.getCatalogSnapshot()).toMatchObject({
    status: 'error',
    error: 'Catalog request timed out',
    updatedAt: null,
    models: [],
  });
  await c.refreshCatalog(true);
  const current = c.getCatalogSnapshot();
  resolveBody({ data: [model('obsolete/model')] });
  await Promise.resolve();
  await Promise.resolve();
  expect(c.getCatalogSnapshot()).toBe(current);
  expect(current.models.map((entry) => entry.id)).toEqual(['fresh/model']);
});

it('retains the same last-good metadata on HTTP, JSON, and schema failures', async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [model()] }),
    })
    .mockResolvedValueOnce({ ok: false, status: 503 })
    .mockResolvedValueOnce({
      ok: true,
      json: async () => {
        throw new Error('Invalid JSON');
      },
    })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ data: null }) });
  vi.stubGlobal('fetch', fetcher);
  const c = await import('../../src/openrouterCatalog/catalog');
  await c.refreshCatalog();
  const good = c.getCatalogSnapshot();
  const cached = localStorage.getItem(c.CACHE_KEY);
  for (const message of ['503', 'Invalid JSON', 'Invalid model catalog']) {
    await c.refreshCatalog(true);
    const failed = c.getCatalogSnapshot();
    expect(failed.status).toBe('error');
    expect(failed.error).toContain(message);
    expect(failed.models).toBe(good.models);
    expect(failed.updatedAt).toBe(good.updatedAt);
    expect(localStorage.getItem(c.CACHE_KEY)).toBe(cached);
  }
});

it('requires acknowledgement for a new charge field or unknown pricing without replacing the ID', async () => {
  let pricing: Record<string, unknown> = { prompt: '0', completion: '0' };
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({
      ok: true,
      json: async () => ({ data: [model('vendor/model:free', pricing)] }),
    })),
  );
  const c = await import('../../src/openrouterCatalog/catalog');
  await c.refreshCatalog();
  pricing = { ...pricing, request: '0.000000000001' };
  await c.refreshCatalog(true);
  expect(c.getCatalogSnapshot().models[0]).toMatchObject({
    id: 'vendor/model:free',
    priceClass: 'paid',
  });
  expect(c.getOpenRouterRequestBlockReason('vendor/model:free')).toContain(
    'Pricing metadata changed',
  );
  c.acknowledgeOpenRouterModel('vendor/model:free');
  pricing = { prompt: null, completion: '0' };
  await c.refreshCatalog(true);
  expect(c.getCatalogSnapshot().models[0].priceClass).toBe('unknown');
  expect(c.getOpenRouterRequestBlockReason('vendor/model:free')).toContain(
    'Pricing metadata changed',
  );
});

it.each([
  { version: 2 },
  { updatedAt: Date.now() + 24 * 60 * 60 * 1000 },
  { updatedAt: 0 },
  { updatedAt: '2026-01-01' },
  { payload: { data: 'invalid' } },
])('rejects an invalid cache boundary: %j', async (override) => {
  localStorage.setItem(
    'aituber-openrouter-catalog-v1',
    JSON.stringify({
      version: 1,
      endpoint: 'https://openrouter.ai/api/v1/models',
      updatedAt: Date.now(),
      payload: { data: [model()] },
      ...override,
    }),
  );
  const c = await import('../../src/openrouterCatalog/catalog');
  expect(c.getCatalogSnapshot()).toMatchObject({
    status: 'idle',
    updatedAt: null,
    models: [],
  });
});

it.each(['openrouter/free', 'vendor/model:free'])(
  'blocks initially paid or unknown free-branded IDs in live and cached data: %s',
  async (id) => {
    const fetcher = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        data: [model(id, { prompt: '1', completion: '0' })],
      }),
    }));
    vi.stubGlobal('fetch', fetcher);
    let c = await import('../../src/openrouterCatalog/catalog');
    await c.refreshCatalog();
    expect(c.getOpenRouterRequestBlockReason(id)).toContain('Pricing');
    localStorage.removeItem(c.APPROVAL_KEY);
    vi.resetModules();
    c = await import('../../src/openrouterCatalog/catalog');
    expect(c.getCatalogSnapshot().models[0].priceClass).toBe('paid');
    expect(c.getOpenRouterRequestBlockReason(id)).toContain('Pricing');
    c.acknowledgeOpenRouterModel(id);
    expect(c.getOpenRouterRequestBlockReason(id)).toBeNull();
    vi.resetModules();
    c = await import('../../src/openrouterCatalog/catalog');
    expect(c.getOpenRouterRequestBlockReason(id)).toBeNull();
    localStorage.clear();
    vi.resetModules();
    fetcher.mockImplementation(async () => ({
      ok: true,
      json: async () => ({ data: [model(id, {})] }),
    }));
    c = await import('../../src/openrouterCatalog/catalog');
    await c.refreshCatalog();
    expect(c.getCatalogSnapshot().models[0].priceClass).toBe('unknown');
    expect(c.getOpenRouterRequestBlockReason(id)).toContain('Pricing');
  },
);

it('distinguishes empty and non-chat catalogs from all-malformed responses', async () => {
  let data: unknown[] = [model()];
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({ ok: true, json: async () => ({ data }) })),
  );
  const c = await import('../../src/openrouterCatalog/catalog');
  await c.refreshCatalog();
  const lastGood = c.getCatalogSnapshot().models;
  data = [null, { id: 'broken' }, model('bad', {}, { architecture: {} })];
  await c.refreshCatalog(true);
  expect(c.getCatalogSnapshot().status).toBe('error');
  expect(c.getCatalogSnapshot().models).toBe(lastGood);
  data = [
    model(
      'image/model',
      {},
      {
        architecture: {
          input_modalities: ['text'],
          output_modalities: ['image'],
        },
      },
    ),
  ];
  await c.refreshCatalog(true);
  expect(c.getCatalogSnapshot()).toMatchObject({ status: 'ready', models: [] });
  data = [];
  await c.refreshCatalog(true);
  expect(c.getCatalogSnapshot()).toMatchObject({ status: 'ready', models: [] });
});
