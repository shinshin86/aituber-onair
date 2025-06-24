import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MinimaxEngine } from '../../../../src/services/voice/engines/MinimaxEngine';
import { Talk } from '../../../../src/types';

// Mock fetch
global.fetch = vi.fn();

describe('MinimaxEngine', () => {
  let engine: MinimaxEngine;

  beforeEach(() => {
    engine = new MinimaxEngine();
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchAudio', () => {
    const mockTalk: Talk = {
      style: 'happy',
      message: 'こんにちは、世界！',
    };

    it('should throw error if API key is missing', async () => {
      await expect(engine.fetchAudio(mockTalk, 'voice-id')).rejects.toThrow(
        'MiniMax API key is required',
      );
    });

    it('should throw error if GroupId is not set', async () => {
      await expect(
        engine.fetchAudio(mockTalk, 'voice-id', 'test-api-key'),
      ).rejects.toThrow(
        'MiniMax GroupId is required for production synthesis. Please set it using setGroupId(), or use testVoice() for testing.',
      );
    });

    it('should throw error if text exceeds 5000 characters', async () => {
      engine.setGroupId('test-group-id');

      const longText = 'a'.repeat(5001);
      const longTalk: Talk = {
        style: 'talk',
        message: longText,
      };

      await expect(
        engine.fetchAudio(longTalk, 'voice-id', 'test-api-key'),
      ).rejects.toThrow('Text exceeds maximum length of 5000 characters');
    });

    it('should successfully fetch audio', async () => {
      engine.setGroupId('test-group-id');

      const mockResponse = {
        data: {
          audio: '48656c6c6f', // "Hello" in hex
          status: 2,
        },
        base_resp: {
          status_code: 0,
          status_msg: '',
        },
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await engine.fetchAudio(
        mockTalk,
        'test-voice',
        'test-api-key',
      );

      expect(fetch).toHaveBeenCalledWith(
        'https://api.minimax.io/v1/t2a_v2?GroupId=test-group-id',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer test-api-key',
          },
          body: JSON.stringify({
            model: 'speech-02-hd',
            text: 'こんにちは、世界！',
            stream: false,
            voice_setting: {
              voice_id: 'test-voice',
              speed: 1.1,
              vol: 1,
              pitch: 1,
            },
            audio_setting: {
              sample_rate: 32000,
              bitrate: 128000,
              format: 'mp3',
              channel: 1,
            },
            language_boost: 'Japanese',
          }),
        },
      );

      expect(result).toBeInstanceOf(ArrayBuffer);
    });

    it('should handle API errors', async () => {
      engine.setGroupId('test-group-id');

      (fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => 'Unauthorized',
      });

      await expect(
        engine.fetchAudio(mockTalk, 'test-voice', 'test-api-key'),
      ).rejects.toThrow('Failed to fetch TTS from MiniMax: 401');
    });

    it('should handle API response errors', async () => {
      engine.setGroupId('test-group-id');

      const mockResponse = {
        base_resp: {
          status_code: 1001,
          status_msg: 'Invalid parameters',
        },
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      await expect(
        engine.fetchAudio(mockTalk, 'test-voice', 'test-api-key'),
      ).rejects.toThrow('MiniMax API error: 1001 - Invalid parameters');
    });

    it('should handle missing audio data', async () => {
      engine.setGroupId('test-group-id');

      const mockResponse = {
        data: {},
        base_resp: {
          status_code: 0,
          status_msg: '',
        },
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      await expect(
        engine.fetchAudio(mockTalk, 'test-voice', 'test-api-key'),
      ).rejects.toThrow('Audio data not found in MiniMax response');
    });

    it('should apply different voice settings for emotions', async () => {
      engine.setGroupId('test-group-id');

      const emotions = [
        {
          style: 'talk' as const,
          expected: { speed: 1.0, vol: 1.0, pitch: 0 },
        },
        {
          style: 'happy' as const,
          expected: { speed: 1.1, vol: 1.0, pitch: 1 },
        },
        {
          style: 'sad' as const,
          expected: { speed: 0.9, vol: 1.0, pitch: -1 },
        },
        {
          style: 'angry' as const,
          expected: { speed: 1.0, vol: 1.1, pitch: 0 },
        },
        {
          style: 'surprised' as const,
          expected: { speed: 1.2, vol: 1.0, pitch: 2 },
        },
      ];

      for (const { style, expected } of emotions) {
        const mockResponse = {
          data: { audio: '48656c6c6f' },
          base_resp: { status_code: 0, status_msg: '' },
        };

        (fetch as any).mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse,
        });

        const talk: Talk = { style, message: 'Test' };
        await engine.fetchAudio(talk, 'test-voice', 'test-api-key');

        const lastCall = (fetch as any).mock.calls.slice(-1)[0];
        const body = JSON.parse(lastCall[1].body);

        expect(body.voice_setting.speed).toBe(expected.speed);
        expect(body.voice_setting.vol).toBe(expected.vol);
        expect(body.voice_setting.pitch).toBe(expected.pitch);
      }
    });

    it('should handle invalid hex audio data', async () => {
      engine.setGroupId('test-group-id');

      const mockResponse = {
        data: {
          audio: 'invalid-hex-string!',
        },
        base_resp: {
          status_code: 0,
          status_msg: '',
        },
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const talk: Talk = { style: 'talk', message: 'Test' };

      await expect(
        engine.fetchAudio(talk, 'test-voice', 'test-api-key'),
      ).rejects.toThrow('Failed to process audio data');
    });
  });

  describe('setGroupId', () => {
    it('should set GroupId', () => {
      engine.setGroupId('new-group-id');
      // This will be tested in fetchAudio
    });
  });

  describe('setModel', () => {
    it('should set model', async () => {
      engine.setGroupId('test-group-id');
      engine.setModel('speech-02-turbo');

      const mockResponse = {
        data: { audio: '48656c6c6f' },
        base_resp: { status_code: 0, status_msg: '' },
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const talk: Talk = { style: 'talk', message: 'Test' };
      await engine.fetchAudio(talk, 'test-voice', 'test-api-key');

      const lastCall = (fetch as any).mock.calls[0];
      const body = JSON.parse(lastCall[1].body);
      expect(body.model).toBe('speech-02-turbo');
    });
  });

  describe('setLanguage', () => {
    it('should set language boost', async () => {
      engine.setGroupId('test-group-id');
      engine.setLanguage('English');

      const mockResponse = {
        data: { audio: '48656c6c6f' },
        base_resp: { status_code: 0, status_msg: '' },
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const talk: Talk = { style: 'talk', message: 'Test' };
      await engine.fetchAudio(talk, 'test-voice', 'test-api-key');

      const lastCall = (fetch as any).mock.calls[0];
      const body = JSON.parse(lastCall[1].body);
      expect(body.language_boost).toBe('English');
    });
  });

  describe('getTestMessage', () => {
    it('should return default test message', () => {
      expect(engine.getTestMessage()).toBe('MiniMax Audioを使用します');
    });

    it('should return custom test message', () => {
      expect(engine.getTestMessage('Custom message')).toBe('Custom message');
    });
  });

  describe('hexToArrayBuffer', () => {
    it('should convert hex string to ArrayBuffer', async () => {
      engine.setGroupId('test-group-id');

      const mockResponse = {
        data: {
          audio: '48656c6c6f', // "Hello" in hex
        },
        base_resp: {
          status_code: 0,
          status_msg: '',
        },
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const talk: Talk = { style: 'talk', message: 'Test' };
      const result = await engine.fetchAudio(
        talk,
        'test-voice',
        'test-api-key',
      );

      // Convert result back to string to verify
      const decoder = new TextDecoder();
      const view = new Uint8Array(result);
      expect(decoder.decode(view)).toBe('Hello');
    });

    it('should handle hex strings with whitespace', async () => {
      engine.setGroupId('test-group-id');

      const mockResponse = {
        data: {
          audio: '48 65 6c 6c 6f\n', // "Hello" in hex with spaces and newline
        },
        base_resp: {
          status_code: 0,
          status_msg: '',
        },
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const talk: Talk = { style: 'talk', message: 'Test' };
      const result = await engine.fetchAudio(
        talk,
        'test-voice',
        'test-api-key',
      );

      // Convert result back to string to verify
      const decoder = new TextDecoder();
      const view = new Uint8Array(result);
      expect(decoder.decode(view)).toBe('Hello');
    });

    it('should handle invalid hex audio data', async () => {
      engine.setGroupId('test-group-id');

      const mockResponse = {
        data: {
          audio: 'invalid-hex-string!',
        },
        base_resp: {
          status_code: 0,
          status_msg: '',
        },
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const talk: Talk = { style: 'talk', message: 'Test' };

      await expect(
        engine.fetchAudio(talk, 'test-voice', 'test-api-key'),
      ).rejects.toThrow('Failed to process audio data');
    });
  });

  describe('getVoiceList', () => {
    it('should fetch voice list successfully', async () => {
      const mockResponse = {
        data: {
          speakers: [
            {
              voice_id: 'test-voice-1',
              voice_name: 'Test Voice 1',
              gender: 'female',
              language: 'Japanese',
            },
            {
              voice_id: 'test-voice-2',
              voice_name: 'Test Voice 2',
              gender: 'male',
              language: 'English',
            },
          ],
        },
        base_resp: {
          status_code: 0,
          status_msg: '',
        },
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await engine.getVoiceList('test-api-key');

      expect(fetch).toHaveBeenCalledWith(
        'https://api.minimax.io/v1/query/tts_speakers',
        {
          method: 'GET',
          headers: {
            Authorization: 'Bearer test-api-key',
            'Content-Type': 'application/json',
          },
        },
      );

      expect(result).toHaveLength(2);
      expect(result[0].voice_id).toBe('test-voice-1');
      expect(result[1].voice_id).toBe('test-voice-2');
    });

    it('should throw error if API key is missing', async () => {
      await expect(engine.getVoiceList('')).rejects.toThrow(
        'MiniMax API key is required',
      );
    });

    it('should handle voice list API errors', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => 'Unauthorized',
      });

      await expect(engine.getVoiceList('test-api-key')).rejects.toThrow(
        'Failed to fetch voice list: 401',
      );
    });
  });

  describe('testVoice', () => {
    it('should test voice successfully without GroupId', async () => {
      const mockResponse = {
        data: {
          audio: '48656c6c6f',
        },
        base_resp: {
          status_code: 0,
          status_msg: '',
        },
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await engine.testVoice(
        'Test message for voice testing',
        'test-voice',
        'test-api-key',
      );

      expect(fetch).toHaveBeenCalledWith(
        'https://api.minimax.io/v1/t2a_v2?GroupId=1',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer test-api-key',
          },
          body: JSON.stringify({
            model: 'speech-02-hd',
            text: 'Test message for voice testing',
            stream: false,
            voice_setting: {
              voice_id: 'test-voice',
              speed: 1.0,
              vol: 1.0,
              pitch: 0,
            },
            audio_setting: {
              sample_rate: 32000,
              bitrate: 128000,
              format: 'mp3',
              channel: 1,
            },
            language_boost: 'Japanese',
          }),
        },
      );

      expect(result).toBeInstanceOf(ArrayBuffer);
    });

    it('should truncate long test text', async () => {
      const longText = 'a'.repeat(150);
      const expectedText = 'a'.repeat(100) + '...';

      const mockResponse = {
        data: { audio: '48656c6c6f' },
        base_resp: { status_code: 0, status_msg: '' },
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      await engine.testVoice(longText, 'test-voice', 'test-api-key');

      const lastCall = (fetch as any).mock.calls.slice(-1)[0];
      const body = JSON.parse(lastCall[1].body);
      expect(body.text).toBe(expectedText);
    });

    it('should throw error if voice ID is missing', async () => {
      await expect(
        engine.testVoice('Test text', '', 'test-api-key'),
      ).rejects.toThrow('Voice ID is required');
    });
  });

  describe('setEndpoint', () => {
    it('should set endpoint to china', async () => {
      engine.setEndpoint('china');
      expect(engine.getEndpoint()).toBe('china');

      // Test that China endpoint is used
      const mockResponse = {
        data: { speakers: [] },
        base_resp: { status_code: 0, status_msg: '' },
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      await engine.getVoiceList('test-api-key');

      expect(fetch).toHaveBeenCalledWith(
        'https://api.minimaxi.com/v1/query/tts_speakers',
        expect.any(Object),
      );
    });

    it('should set endpoint to global', async () => {
      engine.setEndpoint('global');
      expect(engine.getEndpoint()).toBe('global');

      // Test that Global endpoint is used
      const mockResponse = {
        data: { speakers: [] },
        base_resp: { status_code: 0, status_msg: '' },
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      await engine.getVoiceList('test-api-key');

      expect(fetch).toHaveBeenCalledWith(
        'https://api.minimax.io/v1/query/tts_speakers',
        expect.any(Object),
      );
    });
  });

  describe('setApiEndpoint', () => {
    it('should set china endpoint for minimaxi.com URL', () => {
      engine.setApiEndpoint('https://api.minimaxi.com/v1/t2a_v2');
      expect(engine.getEndpoint()).toBe('china');
    });

    it('should set global endpoint for minimax.io URL', () => {
      engine.setApiEndpoint('https://api.minimax.io/v1/t2a_v2');
      expect(engine.getEndpoint()).toBe('global');
    });
  });

  describe('hasGroupId', () => {
    it('should return false when GroupId is not set', () => {
      expect(engine.hasGroupId()).toBe(false);
    });

    it('should return true when GroupId is set', () => {
      engine.setGroupId('test-group-id');
      expect(engine.hasGroupId()).toBe(true);
    });
  });

  describe('fetchAudioWithOptions', () => {
    it('should allow synthesis without GroupId when requireGroupId is false', async () => {
      const mockTalk: Talk = {
        style: 'talk',
        message: 'Test message',
      };

      const mockResponse = {
        data: {
          audio: '48656c6c6f',
        },
        base_resp: {
          status_code: 0,
          status_msg: '',
        },
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await engine.fetchAudioWithOptions(
        mockTalk,
        'test-voice',
        'test-api-key',
        false, // requireGroupId = false
      );

      expect(result).toBeInstanceOf(ArrayBuffer);

      // Verify that temporary GroupId was used
      const lastCall = (fetch as any).mock.calls.slice(-1)[0];
      expect(lastCall[0]).toContain('GroupId=1');
    });
  });
});
