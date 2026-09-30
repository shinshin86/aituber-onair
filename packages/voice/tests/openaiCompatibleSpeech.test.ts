import { describe, expect, it, vi } from 'vitest';
import {
  OpenAICompatibleSpeechEndpointError,
  getOpenAICompatibleSpeechServerInfo,
  listOpenAICompatibleSpeechModels,
  listOpenAICompatibleSpeechVoices,
  resolveOpenAICompatibleSpeechEndpoint,
  testOpenAICompatibleSpeech,
} from '../src/utils/openaiCompatibleSpeech';

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

describe('resolveOpenAICompatibleSpeechEndpoint', () => {
  it.each([
    ['http://localhost:8880', 'http://localhost:8880/v1'],
    ['http://localhost:8880/', 'http://localhost:8880/v1'],
    ['http://localhost:8880/v1', 'http://localhost:8880/v1'],
    ['http://localhost:8880/v1/', 'http://localhost:8880/v1'],
    ['http://localhost:8880/v1/audio/speech', 'http://localhost:8880/v1'],
    [
      ' https://example.trycloudflare.com/v1 ',
      'https://example.trycloudflare.com/v1',
    ],
    [
      'https://example.com/proxy/v1/audio/speech',
      'https://example.com/proxy/v1',
    ],
  ])('resolves %s to base %s', (input, baseUrl) => {
    // Arrange / Act
    const resolved = resolveOpenAICompatibleSpeechEndpoint(input);

    // Assert
    expect(resolved.baseUrl).toBe(baseUrl);
    expect(resolved.speechUrl).toBe(`${baseUrl}/audio/speech`);
    expect(resolved.modelsUrl).toBe(`${baseUrl}/models`);
    expect(resolved.voicesUrls).toEqual([
      `${baseUrl}/audio/voices`,
      `${baseUrl}/voices`,
    ]);
  });

  it('derives the server root from the base URL', () => {
    expect(
      resolveOpenAICompatibleSpeechEndpoint('http://localhost:8000/v1')
        .serverInfoUrl,
    ).toBe('http://localhost:8000/');
    expect(
      resolveOpenAICompatibleSpeechEndpoint('https://example.com/proxy/v1')
        .serverInfoUrl,
    ).toBe('https://example.com/proxy/');
  });

  it.each([
    'not a url',
    'ftp://localhost/v1',
    'http://localhost:8880/v1?x=1',
    'http://localhost:8880/v1#frag',
    'http://user:pass@localhost:8880/v1',
  ])('rejects %s', (input) => {
    expect(() => resolveOpenAICompatibleSpeechEndpoint(input)).toThrow(
      OpenAICompatibleSpeechEndpointError,
    );
  });
});

describe('listOpenAICompatibleSpeechModels', () => {
  it('lists unique model IDs with Authorization when an API key is set', async () => {
    // Arrange
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        object: 'list',
        data: [{ id: 'kokoro' }, { id: 'tts-1' }, { id: 'kokoro' }],
      }),
    );

    // Act
    const models = await listOpenAICompatibleSpeechModels({
      endpoint: 'http://localhost:8880/v1/audio/speech',
      apiKey: ' secret ',
      fetch: fetchMock,
    });

    // Assert
    expect(models).toEqual(['kokoro', 'tts-1']);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://localhost:8880/v1/models');
    expect(init.headers).toEqual({ Authorization: 'Bearer secret' });
  });

  it('maps HTTP failures to typed errors', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response('', { status: 404 }));

    await expect(
      listOpenAICompatibleSpeechModels({
        endpoint: 'http://localhost:8880',
        fetch: fetchMock,
      }),
    ).rejects.toMatchObject({ code: 'http', status: 404 });
  });

  it('rejects responses without model IDs', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ models: [] }));

    await expect(
      listOpenAICompatibleSpeechModels({
        endpoint: 'http://localhost:8880',
        fetch: fetchMock,
      }),
    ).rejects.toMatchObject({ code: 'invalid-response' });
  });

  it('maps fetch failures to a network error', async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(
      listOpenAICompatibleSpeechModels({
        endpoint: 'http://localhost:8880',
        fetch: fetchMock,
      }),
    ).rejects.toMatchObject({ code: 'network' });
  });

  it('reports caller aborts', async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(
      listOpenAICompatibleSpeechModels({
        endpoint: 'http://localhost:8880',
        fetch: vi.fn(),
        signal: controller.signal,
      }),
    ).rejects.toMatchObject({ code: 'aborted' });
  });

  it('times out slow servers', async () => {
    vi.useFakeTimers();
    try {
      const fetchMock = vi.fn(
        (_url: string, init: RequestInit) =>
          new Promise<Response>((_resolve, reject) => {
            init.signal?.addEventListener('abort', () =>
              reject(new Error('aborted')),
            );
          }),
      );
      const request = listOpenAICompatibleSpeechModels({
        endpoint: 'http://localhost:8880',
        fetch: fetchMock as unknown as typeof fetch,
        timeoutMs: 1000,
      });
      const rejected = expect(request).rejects.toMatchObject({
        code: 'timeout',
      });

      await vi.advanceTimersByTimeAsync(1001);
      await rejected;
    } finally {
      vi.useRealTimers();
    }
  });

  it('rejects invalid timeouts', async () => {
    await expect(
      listOpenAICompatibleSpeechModels({
        endpoint: 'http://localhost:8880',
        timeoutMs: 0,
      }),
    ).rejects.toThrow(RangeError);
  });
});

describe('listOpenAICompatibleSpeechVoices', () => {
  it('reads Kokoro-FastAPI style /audio/voices responses', async () => {
    // Arrange
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        voices: [
          { id: 'af_bella', name: 'af_bella', overall_grade: 'A' },
          { id: 'jf_alpha', name: 'jf_alpha' },
        ],
        default_voice: 'af_heart',
      }),
    );

    // Act
    const result = await listOpenAICompatibleSpeechVoices({
      endpoint: 'http://localhost:8880/v1',
      fetch: fetchMock,
    });

    // Assert
    expect(result).toEqual({
      voices: [
        { id: 'af_bella', label: 'af_bella' },
        { id: 'jf_alpha', label: 'jf_alpha' },
      ],
      defaultVoice: 'af_heart',
      url: 'http://localhost:8880/v1/audio/voices',
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('accepts legacy string voice lists', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ voices: ['af_bella', 'am_adam'] }));

    const result = await listOpenAICompatibleSpeechVoices({
      endpoint: 'http://localhost:8880/v1',
      fetch: fetchMock,
    });

    expect(result?.voices).toEqual([
      { id: 'af_bella', label: 'af_bella' },
      { id: 'am_adam', label: 'am_adam' },
    ]);
  });

  it('falls back to /voices with OpenAI list shape and descriptions', async () => {
    // Arrange
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response('Not Found', { status: 404 }))
      .mockResolvedValueOnce(
        jsonResponse({
          object: 'list',
          data: [
            { id: 'default', object: 'voice', description: 'Plain TTS' },
            { id: 'clone', object: 'voice' },
          ],
        }),
      );

    // Act
    const result = await listOpenAICompatibleSpeechVoices({
      endpoint: 'https://example.trycloudflare.com/v1/audio/speech',
      fetch: fetchMock,
    });

    // Assert
    expect(result).toEqual({
      voices: [
        {
          id: 'default',
          label: 'default',
          metadata: { description: 'Plain TTS' },
        },
        { id: 'clone', label: 'clone' },
      ],
      url: 'https://example.trycloudflare.com/v1/voices',
    });
    expect(fetchMock.mock.calls[1][0]).toBe(
      'https://example.trycloudflare.com/v1/voices',
    );
  });

  it('returns an empty list when the server reports no voices', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response('', { status: 404 }))
      .mockResolvedValueOnce(jsonResponse({ object: 'list', data: [] }));

    const result = await listOpenAICompatibleSpeechVoices({
      endpoint: 'http://localhost:8000/v1',
      fetch: fetchMock,
    });

    expect(result?.voices).toEqual([]);
  });

  it('returns null when no voice endpoint is available', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response('', { status: 404 }))
      .mockRejectedValueOnce(new TypeError('Failed to fetch'));

    const result = await listOpenAICompatibleSpeechVoices({
      endpoint: 'http://localhost:8000/v1',
      fetch: fetchMock,
    });

    expect(result).toBeNull();
  });

  it('returns null for unrecognized voice payloads', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ voices: [{ name: 'no id' }] }));

    const result = await listOpenAICompatibleSpeechVoices({
      endpoint: 'http://localhost:8000/v1',
      fetch: fetchMock,
    });

    expect(result).toBeNull();
  });

  it('still reports caller aborts', async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(
      listOpenAICompatibleSpeechVoices({
        endpoint: 'http://localhost:8000/v1',
        fetch: vi.fn(),
        signal: controller.signal,
      }),
    ).rejects.toMatchObject({ code: 'aborted' });
  });
});

describe('getOpenAICompatibleSpeechServerInfo', () => {
  it('reads engine, model, and default voice from the server root', async () => {
    // Arrange
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        ok: true,
        engine: 'irodori-tts-large',
        model: 'example/checkpoint',
        default_voice: 'default',
      }),
    );

    // Act
    const info = await getOpenAICompatibleSpeechServerInfo({
      endpoint: 'https://example.trycloudflare.com/v1/audio/speech',
      fetch: fetchMock,
    });

    // Assert
    expect(info).toEqual({
      engine: 'irodori-tts-large',
      model: 'example/checkpoint',
      defaultVoice: 'default',
    });
    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://example.trycloudflare.com/',
    );
  });

  it.each([
    ['HTML root', new Response('<html></html>', { status: 200 })],
    ['JSON without engine', jsonResponse({ status: 'ok' })],
    ['404', new Response('', { status: 404 })],
  ])('returns null for %s', async (_name, response) => {
    const info = await getOpenAICompatibleSpeechServerInfo({
      endpoint: 'http://localhost:8880/v1',
      fetch: vi.fn().mockResolvedValue(response),
    });

    expect(info).toBeNull();
  });

  it('returns null when the server is unreachable', async () => {
    const info = await getOpenAICompatibleSpeechServerInfo({
      endpoint: 'http://localhost:8880/v1',
      fetch: vi.fn().mockRejectedValue(new TypeError('Failed to fetch')),
    });

    expect(info).toBeNull();
  });
});

describe('testOpenAICompatibleSpeech', () => {
  it('posts a full speech request and returns the audio', async () => {
    // Arrange
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(new Uint8Array([1, 2, 3, 4]), {
        status: 200,
        headers: { 'Content-Type': 'audio/wav' },
      }),
    );

    // Act
    const result = await testOpenAICompatibleSpeech({
      endpoint: 'http://localhost:8000',
      model: ' local-model ',
      voice: 'default',
      instructions: 'calm voice',
      responseFormat: 'wav',
      speed: 1.2,
      text: 'Hello',
      fetch: fetchMock,
    });

    // Assert
    expect(result).toMatchObject({ ok: true, contentType: 'audio/wav' });
    if (result.ok) expect(result.audio.byteLength).toBe(4);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://localhost:8000/v1/audio/speech');
    expect(init.method).toBe('POST');
    expect(init.headers).toEqual({ 'Content-Type': 'application/json' });
    expect(JSON.parse(init.body)).toEqual({
      model: 'local-model',
      input: 'Hello',
      voice: 'default',
      instructions: 'calm voice',
      response_format: 'wav',
      speed: 1.2,
    });
  });

  it('omits optional fields that are empty', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(new Uint8Array([1]), { status: 200 }));

    await testOpenAICompatibleSpeech({
      endpoint: 'http://localhost:8880/v1',
      model: 'kokoro',
      voice: ' ',
      instructions: '',
      fetch: fetchMock,
    });

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(Object.keys(body).sort()).toEqual(['input', 'model']);
  });

  it('returns HTTP status and server detail on failure', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response('{"detail":"voice must be \'default\' or \'clone\'."}', {
        status: 400,
      }),
    );

    const result = await testOpenAICompatibleSpeech({
      endpoint: 'http://localhost:8000/v1',
      model: 'm',
      voice: 'alloy',
      fetch: fetchMock,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatchObject({ code: 'http', status: 400 });
      expect(result.error.detail).toContain("voice must be 'default'");
    }
  });

  it('treats JSON or empty bodies as invalid responses', async () => {
    const jsonResult = await testOpenAICompatibleSpeech({
      endpoint: 'http://localhost:8000/v1',
      model: 'm',
      fetch: vi.fn().mockResolvedValue(jsonResponse({ error: 'oops' })),
    });
    const emptyResult = await testOpenAICompatibleSpeech({
      endpoint: 'http://localhost:8000/v1',
      model: 'm',
      fetch: vi.fn().mockResolvedValue(new Response(new Uint8Array([]))),
    });

    expect(jsonResult).toMatchObject({
      ok: false,
      error: { code: 'invalid-response' },
    });
    expect(emptyResult).toMatchObject({
      ok: false,
      error: { code: 'invalid-response' },
    });
  });

  it('returns invalid URLs as failed results', async () => {
    const result = await testOpenAICompatibleSpeech({
      endpoint: 'localhost:8000',
      model: 'm',
      fetch: vi.fn(),
    });

    expect(result).toMatchObject({ ok: false, error: { code: 'invalid-url' } });
  });
});
