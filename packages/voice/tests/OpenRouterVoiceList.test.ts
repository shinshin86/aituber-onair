import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  getVoiceEngineVoiceList,
  OPENROUTER_MODELS_API_URL,
  type OpenRouterTtsModel,
} from '../src';

const full = 'microsoft/mai-voice-2.1';
const flash = 'microsoft/mai-voice-2.1-flash';
const fullVoice = 'en-US-Harper:MAI-Voice-2.1';
const flashVoice = 'en-US-Harper:MAI-Voice-2.1-Flash';

function mockModels(data: unknown) {
  return vi
    .spyOn(globalThis, 'fetch')
    .mockResolvedValue({ ok: true, json: async () => data } as Response);
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('OpenRouter model-scoped voice list', () => {
  it.each([
    [full, fullVoice],
    [flash, flashVoice],
  ] as const)(
    'only returns the exact %s model voices',
    async (model, voice) => {
      const fetchMock = mockModels({
        data: [
          {
            id: full,
            supported_voices: [
              fullVoice,
              'fr-FR-Elise:MAI-Voice-2.1',
              flashVoice,
              fullVoice,
              '',
              null,
              7,
              ':MAI-Voice-2.1',
            ],
          },
          { id: flash, supported_voices: [flashVoice, fullVoice] },
          {
            id: 'microsoft/mai-voice-2',
            supported_voices: ['en-US-Harper:MAI-Voice-2'],
          },
        ],
      });
      const voices = await getVoiceEngineVoiceList('openRouter', {
        openRouterModel: model,
        apiKey: ' key ',
      });
      expect(voices[0]).toEqual({
        id: voice,
        label: voice,
        metadata: { model, language: 'en-US' },
      });
      expect(voices).toHaveLength(model === full ? 2 : 1);
      expect(fetchMock).toHaveBeenCalledWith(
        `${OPENROUTER_MODELS_API_URL}?output_modalities=speech`,
        expect.objectContaining({
          method: 'GET',
          headers: { Authorization: 'Bearer key' },
        }),
      );
    },
  );

  it('supports the public unauthenticated catalog and separate custom models URL', async () => {
    const fetchMock = mockModels({
      data: [{ id: full, supported_voices: [] }],
    });
    vi.stubGlobal('location', undefined);
    expect(
      await getVoiceEngineVoiceList('openRouter', {
        openRouterModel: full,
        openRouterModelsApiUrl: 'https://proxy.example.test/models?tag=demo',
        apiUrl: 'https://speech.example.test/must-not-receive-models',
      }),
    ).toEqual([]);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://proxy.example.test/models?tag=demo&output_modalities=speech',
      expect.objectContaining({ headers: {} }),
    );
  });

  it('supports generic voiceListApiUrl and relative browser URLs', async () => {
    const fetchMock = mockModels({
      data: [{ id: flash, supported_voices: [flashVoice] }],
    });
    await getVoiceEngineVoiceList('openRouter', {
      openRouterModel: flash,
      voiceListApiUrl: '/models?output_modalities=text',
    });
    expect(fetchMock.mock.calls[0][0]).toBe(
      `${location.origin}/models?output_modalities=speech`,
    );
  });

  it('requires an exact model before calling the API', async () => {
    const fetchMock = mockModels({ data: [] });
    await expect(getVoiceEngineVoiceList('openRouter')).rejects.toThrow(
      'explicitly',
    );
    await expect(
      getVoiceEngineVoiceList('openRouter', {
        openRouterModel: 'microsoft/mai-voice-2' as OpenRouterTtsModel,
      }),
    ).rejects.toThrow('explicitly');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([{ data: null }, {}, { data: 'invalid' }])(
    'rejects malformed model catalog %j',
    async (response) => {
      mockModels(response);
      await expect(
        getVoiceEngineVoiceList('openRouter', { openRouterModel: full }),
      ).rejects.toThrow('data must be an array');
    },
  );

  it.each([
    { data: [] },
    { data: [{ id: flash, supported_voices: [flashVoice] }] },
    { data: [{ id: full, supported_voices: null }] },
  ])('does not fall back to a different model %j', async (response) => {
    mockModels(response);
    await expect(
      getVoiceEngineVoiceList('openRouter', { openRouterModel: full }),
    ).rejects.toThrow(`unavailable for model: ${full}`);
  });

  it('reports HTTP failure and never parses it as voices', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 503,
      text: async () => 'unavailable',
    } as Response);
    await expect(
      getVoiceEngineVoiceList('openRouter', { openRouterModel: full }),
    ).rejects.toThrow('Failed to fetch OpenRouter voices: 503 - unavailable');
  });

  it('reports network failures', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(
      new TypeError('Failed to fetch'),
    );
    await expect(
      getVoiceEngineVoiceList('openRouter', { openRouterModel: full }),
    ).rejects.toMatchObject({ kind: 'network' });
  });

  it('rejects non-HTTP models endpoints before sending credentials', async () => {
    const fetchMock = mockModels({ data: [] });
    await expect(
      getVoiceEngineVoiceList('openRouter', {
        openRouterModel: full,
        openRouterModelsApiUrl: 'file:///models',
        apiKey: 'key',
      }),
    ).rejects.toMatchObject({ kind: 'configuration' });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
