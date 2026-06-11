import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  MINIMAX_CHINA_API_URL,
  MINIMAX_GLOBAL_API_URL,
  MINIMAX_GLOBAL_VOICE_LIST_URL,
} from '../src/constants/voiceEngine';
import { MinimaxEngine, type MinimaxModel } from '../src/engines/MinimaxEngine';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('MinimaxEngine', () => {
  describe('Configuration Methods', () => {
    it('should set and use different models', () => {
      const engine = new MinimaxEngine();
      const models: MinimaxModel[] = [
        'speech-2.6-hd',
        'speech-2.6-turbo',
        'speech-2.5-hd-preview',
        'speech-2.5-turbo-preview',
        'speech-02-hd',
        'speech-02-turbo',
        'speech-01-hd',
        'speech-01-turbo',
      ];

      models.forEach((model) => {
        engine.setModel(model);
        // Since getModel is private, we'll test this through fetchAudio
        expect(() => engine.setModel(model)).not.toThrow();
      });
    });

    it('should set GroupId', () => {
      const engine = new MinimaxEngine();
      const groupId = 'test-group-id-123';

      expect(() => engine.setGroupId(groupId)).not.toThrow();
    });

    it('should set endpoint to global', () => {
      const engine = new MinimaxEngine();

      expect(() => engine.setEndpoint('global')).not.toThrow();
    });

    it('should set endpoint to china', () => {
      const engine = new MinimaxEngine();

      expect(() => engine.setEndpoint('china')).not.toThrow();
    });

    it('should set language', () => {
      const engine = new MinimaxEngine();

      expect(() => engine.setLanguage('English')).not.toThrow();
      expect(() => engine.setLanguage('Japanese')).not.toThrow();
    });
  });

  describe('Override Handling', () => {
    it('should apply voice and audio overrides in requests', async () => {
      const engine = new MinimaxEngine();
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          base_resp: { status_code: 0 },
          data: { audio: '00' },
        }),
      });
      const originalFetch = globalThis.fetch;
      globalThis.fetch = fetchMock as any;

      try {
        engine.setVoiceSettings({ speed: 1.4, vol: 0.85, pitch: 2 });
        engine.setSpeed(1.5);
        engine.setVolume(0.9);
        engine.setAudioSettings({
          sampleRate: 44100,
          bitrate: 96000,
          format: 'wav',
          channel: 2,
        });
        engine.setAudioFormat('mp3');
        engine.setSampleRate(32000);
        engine.setBitrate(128000);
        engine.setAudioChannel(1);

        await engine.testVoice('hello world', 'test-speaker', 'api-key');

        expect(fetchMock).toHaveBeenCalled();
        const call = fetchMock.mock.calls[0];
        expect(call[0]).toContain('GroupId=');
        const body = JSON.parse(call[1].body);
        expect(body.voice_setting.speed).toBe(1.5);
        expect(body.voice_setting.vol).toBe(0.9);
        expect(body.voice_setting.pitch).toBe(2);
        expect(body.audio_setting.sample_rate).toBe(32000);
        expect(body.audio_setting.bitrate).toBe(128000);
        expect(body.audio_setting.format).toBe('mp3');
        expect(body.audio_setting.channel).toBe(1);
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it('should fall back to defaults after clearing overrides', async () => {
      const engine = new MinimaxEngine();
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          base_resp: { status_code: 0 },
          data: { audio: '00' },
        }),
      });
      const originalFetch = globalThis.fetch;
      globalThis.fetch = fetchMock as any;

      try {
        engine.setSpeed(1.6);
        engine.setSpeed(undefined);
        engine.setSampleRate(44100);
        engine.setSampleRate(undefined);

        await engine.testVoice('hello world', 'test-speaker', 'api-key');

        const body = JSON.parse(fetchMock.mock.calls[0][1].body);
        expect(body.voice_setting.speed).toBe(1.0);
        expect(body.audio_setting.sample_rate).toBe(32000);
      } finally {
        globalThis.fetch = originalFetch;
      }
    });
  });

  describe('getVoiceList', () => {
    it('should fetch available MiniMax voices', async () => {
      const engine = new MinimaxEngine();
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

      await expect(engine.getVoiceList('api-key')).resolves.toEqual([
        {
          voice_id: 'voice-1',
          voice_name: 'Voice 1',
          gender: 'female',
          language: 'Japanese',
        },
      ]);
      expect(fetchMock).toHaveBeenCalledWith(
        MINIMAX_GLOBAL_VOICE_LIST_URL,
        expect.objectContaining({
          method: 'GET',
          headers: {
            Authorization: 'Bearer api-key',
            'Content-Type': 'application/json',
          },
        }),
      );
    });

    it('should validate API key and propagate voice list API errors', async () => {
      const engine = new MinimaxEngine();
      vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: false,
          status: 401,
          text: async () => 'unauthorized',
        }),
      );

      await expect(engine.getVoiceList('')).rejects.toThrow(
        'MiniMax API key is required',
      );
      await expect(engine.getVoiceList('api-key')).rejects.toThrow(
        'Failed to fetch voice list: 401 - unauthorized',
      );
    });

    it('should propagate MiniMax voice list base response errors', async () => {
      const engine = new MinimaxEngine();
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: async () => ({
            base_resp: {
              status_code: 1001,
              status_msg: 'invalid token',
            },
          }),
        }),
      );

      await expect(engine.getVoiceList('api-key')).rejects.toThrow(
        'MiniMax API error: 1001 - invalid token',
      );
    });
  });

  describe('testVoice', () => {
    it('should synthesize a test voice without requiring configured GroupId', async () => {
      const engine = new MinimaxEngine();
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          base_resp: { status_code: 0 },
          data: { audio: '000102ff' },
        }),
      });
      vi.stubGlobal('fetch', fetchMock);

      const result = await engine.testVoice('hello', 'voice-id', 'api-key');

      expect(new Uint8Array(result)).toEqual(new Uint8Array([0, 1, 2, 255]));
      expect(fetchMock.mock.calls[0][0]).toBe(
        `${MINIMAX_GLOBAL_API_URL}?GroupId=1`,
      );
      expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({
        model: 'speech-2.6-hd',
        text: 'hello',
        stream: false,
        voice_setting: {
          voice_id: 'voice-id',
          speed: 1,
          vol: 1,
          pitch: 0,
        },
        audio_setting: {
          sample_rate: 32000,
          bitrate: 128000,
          format: 'mp3',
          channel: 1,
        },
        language_boost: 'Japanese',
      });
    });

    it('should validate test voice inputs and invalid response structures', async () => {
      const engine = new MinimaxEngine();
      vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: async () => ({
            base_resp: { status_code: 0 },
            data: {},
          }),
        }),
      );

      await expect(engine.testVoice('hello', 'voice-id', '')).rejects.toThrow(
        'MiniMax API key is required',
      );
      await expect(engine.testVoice('hello', '', 'api-key')).rejects.toThrow(
        'Voice ID is required',
      );
      await expect(
        engine.testVoice('hello', 'voice-id', 'api-key'),
      ).rejects.toThrow('Audio data not found in MiniMax response');
    });

    it('should propagate test voice HTTP and base response errors', async () => {
      const engine = new MinimaxEngine();
      vi.spyOn(console, 'error').mockImplementation(() => {});
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce({
          ok: false,
          status: 402,
          text: async () => 'quota exceeded',
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            base_resp: {
              status_code: 2001,
              status_msg: 'bad voice',
            },
          }),
        });
      vi.stubGlobal('fetch', fetchMock);

      await expect(
        engine.testVoice('hello', 'voice-id', 'api-key'),
      ).rejects.toThrow('Failed to test voice: 402 - quota exceeded');
      await expect(
        engine.testVoice('hello', 'voice-id', 'api-key'),
      ).rejects.toThrow('MiniMax API error: 2001 - bad voice');
    });

    it('should reject invalid hex audio data', async () => {
      const engine = new MinimaxEngine();
      vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: async () => ({
            base_resp: { status_code: 0 },
            data: { audio: 'xyz' },
          }),
        }),
      );

      await expect(
        engine.testVoice('hello', 'voice-id', 'api-key'),
      ).rejects.toThrow('Failed to process audio data');
    });
  });

  describe('fetchAudio', () => {
    it('should synthesize production audio with GroupId', async () => {
      const engine = new MinimaxEngine();
      engine.setGroupId('group-id');
      engine.setEndpoint('china');
      engine.setModel('speech-02-hd');
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          base_resp: { status_code: 0 },
          data: { audio: '0a0b' },
        }),
      });
      vi.stubGlobal('fetch', fetchMock);

      const result = await engine.fetchAudio(
        {
          style: 'happy',
          message: '  hello  ',
        },
        'voice-id',
        'api-key',
      );

      expect(new Uint8Array(result)).toEqual(new Uint8Array([10, 11]));
      expect(fetchMock.mock.calls[0][0]).toBe(
        `${MINIMAX_CHINA_API_URL}?GroupId=group-id`,
      );
      expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({
        model: 'speech-02-hd',
        text: 'hello',
        voice_setting: {
          voice_id: 'voice-id',
          speed: 1.1,
          vol: 1,
          pitch: 1,
        },
      });
    });

    it('should validate production synthesis inputs', async () => {
      const engine = new MinimaxEngine();

      await expect(
        engine.fetchAudio({ style: 'talk', message: 'hello' }, 'voice-id'),
      ).rejects.toThrow('MiniMax API key is required');
      await expect(
        engine.fetchAudio(
          { style: 'talk', message: 'hello' },
          'voice-id',
          'api-key',
        ),
      ).rejects.toThrow('MiniMax GroupId is required');
      engine.setGroupId('group-id');
      await expect(
        engine.fetchAudio(
          { style: 'talk', message: 'x'.repeat(5001) },
          'voice-id',
          'api-key',
        ),
      ).rejects.toThrow('Text exceeds maximum length of 5000 characters');
    });
  });

  describe('getTestMessage', () => {
    it('should return default test message', () => {
      const engine = new MinimaxEngine();
      expect(engine.getTestMessage()).toBe('MiniMax Audioを使用します');
    });

    it('should return custom test message', () => {
      const engine = new MinimaxEngine();
      const customMessage = 'Custom test message';
      expect(engine.getTestMessage(customMessage)).toBe(customMessage);
    });
  });

  describe('endpoint helpers', () => {
    it('should expose current endpoint and infer endpoint from API URL', () => {
      const engine = new MinimaxEngine();

      expect(engine.hasGroupId()).toBe(false);
      expect(engine.getEndpoint()).toBe('global');
      engine.setGroupId('group-id');
      expect(engine.hasGroupId()).toBe(true);
      engine.setApiEndpoint('https://api.minimaxi.com/v1/t2a_v2');
      expect(engine.getEndpoint()).toBe('china');
      engine.setApiEndpoint('https://api.minimax.io/v1/t2a_v2');
      expect(engine.getEndpoint()).toBe('global');
    });
  });
});
