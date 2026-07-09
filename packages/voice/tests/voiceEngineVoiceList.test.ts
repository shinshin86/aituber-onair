import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  AIVIS_CLOUD_AIVM_MODELS_SEARCH_API_URL,
  ELEVENLABS_VOICES_API_URL,
  GRADIUM_VOICES_API_URL,
  INWORLD_VOICES_API_URL,
  XAI_VOICES_API_URL,
  getVoiceEngineVoiceList,
} from '../src/index';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('getVoiceEngineVoiceList', () => {
  it('fetches local VOICEVOX-compatible speakers', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        {
          name: '四国めたん',
          styles: [{ id: 2, name: 'ノーマル' }],
        },
      ],
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      getVoiceEngineVoiceList('voicevox', {
        apiUrl: 'http://localhost:50021/',
      }),
    ).resolves.toEqual([{ id: '2', label: '四国めたん - ノーマル' }]);
    expect(fetchMock.mock.calls[0][0]).toBe('http://localhost:50021/speakers');
  });

  it('fetches xAI voices with a bearer token', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        voices: [{ voice_id: 'alloy', name: 'Alloy' }],
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      getVoiceEngineVoiceList('xai', { apiKey: 'xai-key' }),
    ).resolves.toEqual([{ id: 'alloy', label: 'Alloy' }]);
    expect(fetchMock).toHaveBeenCalledWith(
      XAI_VOICES_API_URL,
      expect.objectContaining({
        method: 'GET',
        headers: { Authorization: 'Bearer xai-key' },
      }),
    );
  });

  it('fetches ElevenLabs voices with an API key header', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        voices: [
          {
            voice_id: 'voice-id',
            name: 'Rachel',
            category: 'premade',
          },
        ],
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      getVoiceEngineVoiceList('elevenLabs', { apiKey: 'eleven-key' }),
    ).resolves.toEqual([
      {
        id: 'voice-id',
        label: 'Rachel (premade)',
        metadata: { category: 'premade' },
      },
    ]);
    expect(fetchMock).toHaveBeenCalledWith(
      ELEVENLABS_VOICES_API_URL,
      expect.objectContaining({
        method: 'GET',
        headers: { 'xi-api-key': 'eleven-key' },
      }),
    );
  });

  it('fetches and filters Inworld voices across pages', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          voices: [
            {
              voiceId: 'en-voice',
              displayName: 'English Voice',
              langCode: 'en-US',
            },
          ],
          nextPageToken: 'next',
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          voices: [
            {
              voiceId: 'ja-voice',
              displayName: 'Japanese Voice',
              langCode: 'ja_JP',
              gender: 'female',
            },
          ],
        }),
      });
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      getVoiceEngineVoiceList('inworld', {
        apiKey: 'inworld-key',
        language: 'ja-JP',
      }),
    ).resolves.toEqual([
      {
        id: 'ja-voice',
        label: 'Japanese Voice (ja-JP / female)',
        metadata: { language: 'ja-JP', gender: 'female' },
      },
      {
        id: 'en-voice',
        label: 'English Voice (en-US)',
        metadata: { language: 'en-US' },
      },
    ]);

    const firstUrl = new URL(fetchMock.mock.calls[0][0]);
    const secondUrl = new URL(fetchMock.mock.calls[1][0]);
    expect(`${firstUrl.origin}${firstUrl.pathname}`).toBe(
      INWORLD_VOICES_API_URL,
    );
    expect(firstUrl.searchParams.get('filter')).toBe('lang_code = "ja-JP"');
    expect(secondUrl.searchParams.get('pageToken')).toBe('next');
  });

  it('fetches Gradium voices with catalog options', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        {
          uid: 'gradium-id',
          name: 'Emma',
          is_catalog: true,
          is_pro_clone: false,
          language: 'en',
        },
      ],
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      getVoiceEngineVoiceList('gradium', {
        apiKey: 'gradium-key',
        includeCatalog: false,
        limit: 10,
        skip: 2,
      }),
    ).resolves.toEqual([
      {
        id: 'gradium-id',
        label: 'Emma',
        metadata: {
          language: 'en',
          catalog: 'true',
          proClone: 'false',
        },
      },
    ]);

    const [url, init] = fetchMock.mock.calls[0];
    const requestUrl = new URL(url);
    expect(`${requestUrl.origin}${requestUrl.pathname}`).toBe(
      GRADIUM_VOICES_API_URL,
    );
    expect(requestUrl.searchParams.get('include_catalog')).toBe('false');
    expect(requestUrl.searchParams.get('limit')).toBe('10');
    expect(requestUrl.searchParams.get('skip')).toBe('2');
    expect(init.headers).toEqual({ 'x-api-key': 'gradium-key' });
  });

  it('fetches Aivis Cloud model voices from the model search endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        aivm_models: [
          {
            aivm_model_uuid: 'model-uuid',
            name: 'まお',
            category: 'OriginalCharacter',
            voice_timbre: 'YouthfulFemale',
            speakers: [
              {
                aivm_speaker_uuid: 'speaker-uuid',
                name: 'まお',
                supported_languages: ['ja'],
                styles: [
                  { local_id: 0, name: 'ノーマル' },
                  { local_id: 1, name: 'あまあま' },
                ],
              },
            ],
          },
        ],
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      getVoiceEngineVoiceList('aivisCloud', {
        apiKey: 'aivis-key',
        limit: 1,
      }),
    ).resolves.toEqual([
      {
        id: 'model-uuid',
        label: 'まお',
        metadata: {
          speakers: 'まお',
          styles: 'ノーマル, あまあま',
          languages: 'ja',
          category: 'OriginalCharacter',
          voiceTimbre: 'YouthfulFemale',
        },
      },
    ]);

    const [url, init] = fetchMock.mock.calls[0];
    const requestUrl = new URL(url);
    expect(`${requestUrl.origin}${requestUrl.pathname}`).toBe(
      AIVIS_CLOUD_AIVM_MODELS_SEARCH_API_URL,
    );
    expect(requestUrl.searchParams.get('limit')).toBe('1');
    expect(init.headers).toEqual({ Authorization: 'Bearer aivis-key' });
  });

  it('gets Web Speech voices from browser speechSynthesis', async () => {
    vi.stubGlobal('speechSynthesis', {
      getVoices: vi.fn().mockReturnValue([
        {
          name: 'Kyoko',
          voiceURI: 'kyoko-uri',
          lang: 'ja-JP',
          localService: true,
          default: true,
        },
      ]),
    });

    await expect(getVoiceEngineVoiceList('webSpeech')).resolves.toEqual([
      {
        id: 'kyoko-uri',
        label: 'Kyoko (ja-JP)',
        metadata: {
          language: 'ja-JP',
          localService: 'true',
          default: 'true',
        },
      },
    ]);
  });

  it('rejects unsupported engines and missing API keys', async () => {
    await expect(getVoiceEngineVoiceList('minimax')).rejects.toThrow(
      'Voice list is not supported for engine: minimax',
    );
  });
});
