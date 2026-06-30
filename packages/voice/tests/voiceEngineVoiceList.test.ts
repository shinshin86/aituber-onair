import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ELEVENLABS_VOICES_API_URL,
  GRADIUM_VOICES_API_URL,
  INWORLD_VOICES_API_URL,
  MINIMAX_CHINA_VOICE_LIST_URL,
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

  it('fetches MiniMax voices from the selected endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        base_resp: { status_code: 0 },
        data: {
          speakers: [
            {
              voice_id: 'voice-1',
              voice_name: 'Voice 1',
              gender: 'female',
              language: 'Japanese',
            },
          ],
        },
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      getVoiceEngineVoiceList('minimax', {
        apiKey: 'minimax-key',
        endpoint: 'china',
      }),
    ).resolves.toEqual([
      {
        id: 'voice-1',
        label: 'Voice 1 (female)',
        metadata: { gender: 'female', language: 'Japanese' },
      },
    ]);
    expect(fetchMock).toHaveBeenCalledWith(
      MINIMAX_CHINA_VOICE_LIST_URL,
      expect.objectContaining({
        method: 'GET',
        headers: {
          Authorization: 'Bearer minimax-key',
          'Content-Type': 'application/json',
        },
      }),
    );
  });

  it('rejects unsupported engines and missing API keys', async () => {
    await expect(getVoiceEngineVoiceList('aivisCloud')).rejects.toThrow(
      'Voice list is not supported for engine: aivisCloud',
    );
    await expect(getVoiceEngineVoiceList('minimax')).rejects.toThrow(
      'MiniMax API key is required',
    );
  });
});
