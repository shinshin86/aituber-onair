import { describe, expect, it, vi } from 'vitest';
import {
  listOpenAICompatibleModels,
  OpenAICompatibleEndpointError,
  OPENAI_COMPATIBLE_LOCAL_PRESETS,
  resolveOpenAICompatibleEndpoint,
  testOpenAICompatibleConnection,
} from '../../src/utils/openaiCompatibleEndpoint';

describe('resolveOpenAICompatibleEndpoint', () => {
  it.each([
    [' http://localhost:11434 ', 'http://localhost:11434/v1'],
    ['http://localhost:11434/', 'http://localhost:11434/v1'],
    ['http://localhost:11434/v1///', 'http://localhost:11434/v1'],
    [
      'https://example.com/openai/v1/chat/completions/',
      'https://example.com/openai/v1',
    ],
    ['https://example.com/openai/v1', 'https://example.com/openai/v1'],
    ['https://example.com/chat/completions', 'https://example.com'],
    ['http://localhost:3000/api/chat/completions', 'http://localhost:3000/api'],
  ])('resolves %s', (input, baseUrl) => {
    const result = resolveOpenAICompatibleEndpoint(input);

    expect(result).toEqual({
      baseUrl,
      chatCompletionsUrl: `${baseUrl}/chat/completions`,
      modelsUrl: `${baseUrl}/models`,
    });
  });

  it.each([
    '',
    'localhost:11434',
    'ftp://localhost:11434/v1',
    'http://localhost:11434/v1?key=value',
    'http://localhost:11434/v1#fragment',
    'http://user:secret@localhost:11434/v1',
  ])('rejects invalid URL %s', (input) => {
    expect(() => resolveOpenAICompatibleEndpoint(input)).toThrowError(
      OpenAICompatibleEndpointError,
    );
    try {
      resolveOpenAICompatibleEndpoint(input);
    } catch (error) {
      expect(error).toMatchObject({ code: 'invalid-url' });
    }
  });

  it.each([
    'http://localhost:11434/api/chat',
    'http://localhost:11434/api/generate/',
  ])('rejects Ollama native URL %s', (input) => {
    expect(() => resolveOpenAICompatibleEndpoint(input)).toThrowError(
      OpenAICompatibleEndpointError,
    );
    try {
      resolveOpenAICompatibleEndpoint(input);
    } catch (error) {
      expect(error).toMatchObject({
        code: 'invalid-url',
        message: expect.stringContaining('http://localhost:11434/v1'),
      });
    }
  });

  it('has the four documented local presets', () => {
    expect(OPENAI_COMPATIBLE_LOCAL_PRESETS.map((preset) => preset.id)).toEqual([
      'ollama',
      'lmStudio',
      'llamaCpp',
      'vllm',
    ]);
  });
});

describe('listOpenAICompatibleModels', () => {
  it('sends auth only for a non-empty key and de-duplicates in server order', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockImplementation(
      async () =>
        new Response(
          JSON.stringify({
            data: [{ id: 'b' }, { id: 'a' }, { id: 'b' }],
          }),
        ),
    );

    const models = await listOpenAICompatibleModels({
      endpoint: 'http://localhost:11434/v1',
      apiKey: ' secret ',
      fetch: fetchMock,
    });

    expect(models).toEqual(['b', 'a']);
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:11434/v1/models',
      expect.objectContaining({
        method: 'GET',
        headers: { Authorization: 'Bearer secret' },
      }),
    );

    await listOpenAICompatibleModels({
      endpoint: 'http://localhost:11434/v1',
      apiKey: ' ',
      fetch: fetchMock,
    });
    expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({ headers: {} });
  });

  it('reports HTTP errors with status', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response('not found', { status: 404 }));

    await expect(
      listOpenAICompatibleModels({
        endpoint: 'http://localhost:11434/v1',
        fetch: fetchMock,
      }),
    ).rejects.toMatchObject({ code: 'http', status: 404 });
  });

  it.each([
    'not json',
    JSON.stringify({ models: [] }),
    JSON.stringify({ data: [{}] }),
  ])('reports malformed model responses', async (payload) => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(payload));

    await expect(
      listOpenAICompatibleModels({
        endpoint: 'http://localhost:11434/v1',
        fetch: fetchMock,
      }),
    ).rejects.toMatchObject({ code: 'invalid-response' });
  });

  it('reports network failures with a browser CORS hint', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(
      listOpenAICompatibleModels({
        endpoint: 'http://localhost:11434/v1',
        fetch: fetchMock,
      }),
    ).rejects.toMatchObject({
      code: 'network',
      message: expect.stringContaining('CORS'),
    });
  });

  it('times out a pending request', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockImplementation(
      (_input, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () =>
            reject(new Error('aborted')),
          );
        }),
    );

    await expect(
      listOpenAICompatibleModels({
        endpoint: 'http://localhost:11434/v1',
        timeoutMs: 1,
        fetch: fetchMock,
      }),
    ).rejects.toMatchObject({ code: 'timeout' });
  });

  it('rejects a pre-aborted request without calling fetch', async () => {
    const controller = new AbortController();
    controller.abort();
    const fetchMock = vi.fn<typeof fetch>();

    await expect(
      listOpenAICompatibleModels({
        endpoint: 'http://localhost:11434/v1',
        signal: controller.signal,
        fetch: fetchMock,
      }),
    ).rejects.toMatchObject({ code: 'aborted' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('reports a caller abort during a request', async () => {
    const controller = new AbortController();
    const fetchMock = vi.fn<typeof fetch>().mockImplementation(
      (_input, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () =>
            reject(new Error('aborted')),
          );
        }),
    );

    const pending = listOpenAICompatibleModels({
      endpoint: 'http://localhost:11434/v1',
      signal: controller.signal,
      fetch: fetchMock,
    });
    controller.abort();

    await expect(pending).rejects.toMatchObject({ code: 'aborted' });
  });

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])(
    'rejects invalid timeoutMs %s as a caller error',
    async (timeoutMs) => {
      await expect(
        listOpenAICompatibleModels({
          endpoint: 'http://localhost:11434/v1',
          timeoutMs,
        }),
      ).rejects.toThrow(RangeError);
    },
  );
});

describe('testOpenAICompatibleConnection', () => {
  it.each([
    ['known', true],
    ['unknown', false],
  ])('reports whether %s is listed', async (model, modelFound) => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        new Response(JSON.stringify({ data: [{ id: 'known' }] })),
      );

    const result = await testOpenAICompatibleConnection({
      endpoint: 'http://localhost:11434/v1',
      model,
      fetch: fetchMock,
    });

    expect(result).toMatchObject({
      ok: true,
      models: ['known'],
      modelFound,
      latencyMs: expect.any(Number),
    });
  });

  it('returns a typed error for an expected failure', async () => {
    const result = await testOpenAICompatibleConnection({
      endpoint: 'invalid',
    });

    expect(result).toMatchObject({
      ok: false,
      error: { code: 'invalid-url' },
    });
  });

  it('returns an aborted result for a pre-aborted request', async () => {
    const controller = new AbortController();
    controller.abort();

    const result = await testOpenAICompatibleConnection({
      endpoint: 'http://localhost:11434/v1',
      signal: controller.signal,
    });

    expect(result).toMatchObject({ ok: false, error: { code: 'aborted' } });
  });

  it('returns an aborted result when the caller cancels in flight', async () => {
    const controller = new AbortController();
    const fetchMock = vi.fn<typeof fetch>().mockImplementation(
      (_input, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () =>
            reject(new Error('aborted')),
          );
        }),
    );

    const pending = testOpenAICompatibleConnection({
      endpoint: 'http://localhost:11434/v1',
      signal: controller.signal,
      fetch: fetchMock,
    });
    controller.abort();

    await expect(pending).resolves.toMatchObject({
      ok: false,
      error: { code: 'aborted' },
    });
  });

  it('rejects an invalid timeoutMs rather than reporting a network failure', async () => {
    await expect(
      testOpenAICompatibleConnection({
        endpoint: 'http://localhost:11434/v1',
        timeoutMs: 0,
      }),
    ).rejects.toThrow(RangeError);
  });
});
