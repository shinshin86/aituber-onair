import { describe, expect, it, vi } from 'vitest';
import {
  chooseOpenAiCompatibleTtsModel,
  createLatestRequestGuard,
  discoverOpenAiCompatibleModels,
  getOpenAiModelsEndpoint,
  parseOpenAiModelIds,
} from './openAiCompatibleTtsModels';

describe('OpenAI-compatible TTS model discovery', () => {
  it('derives /v1/models from an audio speech endpoint', () => {
    expect(
      getOpenAiModelsEndpoint('http://localhost:8880/v1/audio/speech'),
    ).toBe('http://localhost:8880/v1/models');
  });

  it('loads model ids from the OpenAI models response', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          object: 'list',
          data: [
            { id: 'fish-speech' },
            { id: 'kokoro' },
            { id: 'piper' },
            { id: 'edge' },
          ],
        }),
      ),
    );

    await expect(
      discoverOpenAiCompatibleModels(
        'http://localhost:8880/v1/audio/speech',
        '',
        fetcher,
      ),
    ).resolves.toEqual(['fish-speech', 'kokoro', 'piper', 'edge']);
    expect(fetcher).toHaveBeenCalledWith(
      'http://localhost:8880/v1/models',
      { headers: undefined },
    );
  });

  it('sends a trimmed bearer token when an API key is configured', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ data: ['fish-speech'] })));

    await discoverOpenAiCompatibleModels(
      'http://localhost:8880/v1/audio/speech',
      ' secret-token ',
      fetcher,
    );

    expect(fetcher).toHaveBeenCalledWith('http://localhost:8880/v1/models', {
      headers: { Authorization: 'Bearer secret-token' },
    });
  });

  it('rejects an HTTP error response', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(null, { status: 503 }));

    await expect(
      discoverOpenAiCompatibleModels(
        'http://localhost:8880/v1/audio/speech',
        '',
        fetcher,
      ),
    ).rejects.toThrow('HTTP 503');
  });

  it('rejects a response without model ids', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ data: [] })));

    await expect(
      discoverOpenAiCompatibleModels(
        'http://localhost:8880/v1/audio/speech',
        '',
        fetcher,
      ),
    ).rejects.toThrow('La respuesta no contiene modelos');
  });

  it('normalizes and deduplicates model ids', () => {
    expect(
      parseOpenAiModelIds({
        data: [
          { id: ' fish-speech ' },
          'fish-speech',
          { id: '' },
          { id: 'kokoro' },
          null,
        ],
      }),
    ).toEqual(['fish-speech', 'kokoro']);
  });

  it('replaces the legacy LLM default with the first discovered TTS model', () => {
    expect(
      chooseOpenAiCompatibleTtsModel(
        ['fish-speech', 'kokoro'],
        'ssfdre38/gemma4-turbo:latest',
      ),
    ).toBe('fish-speech');
  });

  it('preserves a manual model that is not in the discovered list', () => {
    expect(
      chooseOpenAiCompatibleTtsModel(
        ['fish-speech', 'kokoro'],
        'my-manual-tts-model',
      ),
    ).toBe('my-manual-tts-model');
  });

  it('accepts state updates only from the latest request', () => {
    const guard = createLatestRequestGuard();
    const olderRequest = guard.begin();
    const latestRequest = guard.begin();

    expect(guard.isLatest(olderRequest)).toBe(false);
    expect(guard.isLatest(latestRequest)).toBe(true);

    guard.invalidate();
    expect(guard.isLatest(latestRequest)).toBe(false);
  });
});
