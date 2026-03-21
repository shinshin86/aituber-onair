import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OpenAiCompatibleEngine } from '../src/engines/OpenAiCompatibleEngine';

describe('OpenAiCompatibleEngine', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should send requests to a custom OpenAI-compatible endpoint', async () => {
    const engine = new OpenAiCompatibleEngine();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      blob: async () => ({
        arrayBuffer: async () => new ArrayBuffer(8),
      }),
    });
    globalThis.fetch = fetchMock as any;

    try {
      engine.setApiEndpoint('http://localhost:8880/v1/audio/speech');
      engine.setModel('example-model');
      engine.setSpeed(1.25);

      await engine.fetchAudio(
        { message: 'Hello from compatible endpoint', style: 'happy' } as any,
        'af_bella',
      );

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe('http://localhost:8880/v1/audio/speech');
      expect(init.headers).toEqual({
        'Content-Type': 'application/json',
      });
      expect(JSON.parse(init.body)).toEqual({
        model: 'example-model',
        voice: 'af_bella',
        input: 'Hello from compatible endpoint',
        speed: 1.25,
      });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('should require a model before fetching audio', async () => {
    const engine = new OpenAiCompatibleEngine();

    await expect(
      engine.fetchAudio({ message: 'Hello', style: 'neutral' } as any, ''),
    ).rejects.toThrow('OpenAI-compatible TTS model is required');
  });

  it('should omit voice when speaker is not provided', async () => {
    const engine = new OpenAiCompatibleEngine();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      blob: async () => ({
        arrayBuffer: async () => new ArrayBuffer(8),
      }),
    });
    globalThis.fetch = fetchMock as any;

    try {
      engine.setModel('example-model');

      await engine.fetchAudio(
        { message: 'Hello without voice', style: 'neutral' } as any,
        '',
      );

      const [, init] = fetchMock.mock.calls[0];
      expect(JSON.parse(init.body)).toEqual({
        model: 'example-model',
        input: 'Hello without voice',
        speed: 1,
      });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('should include Authorization when apiKey is provided', async () => {
    const engine = new OpenAiCompatibleEngine();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      blob: async () => ({
        arrayBuffer: async () => new ArrayBuffer(8),
      }),
    });
    globalThis.fetch = fetchMock as any;

    try {
      engine.setModel('example-model');

      await engine.fetchAudio(
        { message: 'Secured request', style: 'neutral' } as any,
        'af_bella',
        'test-api-key',
      );

      const [, init] = fetchMock.mock.calls[0];
      expect(init.headers).toEqual({
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-api-key',
      });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('should return a provider-specific test message', () => {
    const engine = new OpenAiCompatibleEngine();
    expect(engine.getTestMessage()).toBe('OpenAI互換TTSを使用します');
  });
});
