import { describe, expect, it, vi, beforeEach } from 'vitest';
import { AIVIS_CLOUD_API_URL } from '../src/constants/voiceEngine';
import { Talk } from '../src/types/voice';
import { AivisCloudEngine } from '../src/engines/AivisCloudEngine';

// Mock fetch
global.fetch = vi.fn();

describe('AivisCloudEngine', () => {
  const mockFetch = global.fetch as any;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchAudio', () => {
    it('should fetch audio with required parameters', async () => {
      const engine = new AivisCloudEngine();
      engine.setModelUuid('test-model-uuid');

      const mockAudioBuffer = new ArrayBuffer(1024);
      const mockBlob = {
        arrayBuffer: vi.fn().mockResolvedValue(mockAudioBuffer),
      };

      mockFetch.mockResolvedValue({
        ok: true,
        blob: vi.fn().mockResolvedValue(mockBlob),
        headers: {
          get: vi.fn().mockImplementation((key: string) => {
            const headers: Record<string, string> = {
              'X-Aivis-Billing-Mode': 'PayAsYouGo',
              'X-Aivis-Character-Count': '50',
              'X-Aivis-Credits-Used': '0.5',
              'X-Aivis-Credits-Remaining': '99.5',
            };
            return headers[key] || null;
          }),
        },
      });

      const talk: Talk = {
        style: 'happy',
        message: 'Hello, this is a test message.',
      };

      const result = await engine.fetchAudio(
        talk,
        'unused-speaker',
        'test-api-key',
      );

      expect(result).toBe(mockAudioBuffer);
      expect(mockFetch).toHaveBeenCalledWith(AIVIS_CLOUD_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-api-key',
        },
        body: JSON.stringify({
          model_uuid: 'test-model-uuid',
          text: 'Hello, this is a test message.',
          use_ssml: true,
          speaking_rate: 1.0,
          emotional_intensity: 1.1, // Adjusted for happy emotion
          tempo_dynamics: 1.0,
          pitch: 0.0,
          volume: 1.0,
          leading_silence_seconds: 0.1,
          trailing_silence_seconds: 0.1,
          line_break_silence_seconds: 0.4,
          output_format: 'mp3',
          output_sampling_rate: 44100,
          output_audio_channels: 'mono',
        }),
      });
    });

    it('should use speaker parameter as model UUID if modelUuid is not set', async () => {
      const engine = new AivisCloudEngine();

      const mockAudioBuffer = new ArrayBuffer(1024);
      const mockBlob = {
        arrayBuffer: vi.fn().mockResolvedValue(mockAudioBuffer),
      };

      mockFetch.mockResolvedValue({
        ok: true,
        blob: vi.fn().mockResolvedValue(mockBlob),
        headers: {
          get: vi.fn().mockReturnValue(null),
        },
      });

      const talk: Talk = {
        style: 'talk',
        message: 'Test message',
      };

      await engine.fetchAudio(talk, 'speaker-as-model-uuid', 'test-api-key');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('"model_uuid":"speaker-as-model-uuid"'),
        }),
      );
    });

    it('should throw error if API key is missing', async () => {
      const engine = new AivisCloudEngine();
      const talk: Talk = {
        style: 'talk',
        message: 'Test',
      };

      await expect(
        engine.fetchAudio(talk, 'speaker', undefined),
      ).rejects.toThrow('Aivis Cloud API key is required');
    });

    it('should throw error if model UUID is not provided', async () => {
      const engine = new AivisCloudEngine();
      const talk: Talk = {
        style: 'talk',
        message: 'Test',
      };

      await expect(engine.fetchAudio(talk, '', 'api-key')).rejects.toThrow(
        'Aivis Cloud model UUID is required',
      );
    });

    it('should handle API errors correctly', async () => {
      const engine = new AivisCloudEngine();
      engine.setModelUuid('test-model');

      const testCases = [
        { status: 401, expectedError: 'Invalid API key for Aivis Cloud' },
        {
          status: 402,
          expectedError: 'Insufficient credit balance in Aivis Cloud account',
        },
        { status: 404, expectedError: 'Model UUID not found: test-model' },
        {
          status: 422,
          expectedError: 'Invalid request parameters: Bad request',
        },
        {
          status: 429,
          expectedError: 'Rate limit exceeded for Aivis Cloud API',
        },
        {
          status: 500,
          expectedError: 'Aivis Cloud server error: Internal error',
        },
      ];

      for (const { status, expectedError } of testCases) {
        mockFetch.mockResolvedValue({
          ok: false,
          status,
          text: vi
            .fn()
            .mockResolvedValue(
              status === 422 ? 'Bad request' : 'Internal error',
            ),
        });

        const talk: Talk = {
          style: 'talk',
          message: 'Test',
        };

        await expect(
          engine.fetchAudio(talk, 'speaker', 'api-key'),
        ).rejects.toThrow(expectedError);
      }
    });

    it('should apply all configuration options', async () => {
      const engine = new AivisCloudEngine();

      // Set all configuration options
      engine.setModelUuid('model-uuid');
      engine.setSpeakerUuid('speaker-uuid');
      engine.setStyleId(5);
      engine.setUseSSML(false);
      engine.setSpeakingRate(1.5);
      engine.setEmotionalIntensity(0.8);
      engine.setTempoDynamics(1.2);
      engine.setPitch(0.2);
      engine.setVolume(1.5);
      engine.setSilenceDurations(0.2, 0.3, 0.5);
      engine.setOutputFormat('opus');
      engine.setOutputBitrate(128);
      engine.setOutputSamplingRate(48000);
      engine.setOutputChannels('stereo');

      const mockAudioBuffer = new ArrayBuffer(1024);
      const mockBlob = {
        arrayBuffer: vi.fn().mockResolvedValue(mockAudioBuffer),
      };

      mockFetch.mockResolvedValue({
        ok: true,
        blob: vi.fn().mockResolvedValue(mockBlob),
        headers: {
          get: vi.fn().mockReturnValue(null),
        },
      });

      const talk: Talk = {
        style: 'talk',
        message: 'Test message',
      };

      await engine.fetchAudio(talk, 'unused', 'api-key');

      const callArgs = mockFetch.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);

      expect(callArgs[0]).toBe(AIVIS_CLOUD_API_URL);
      expect(callArgs[1].method).toBe('POST');
      expect(callArgs[1].headers).toEqual({
        'Content-Type': 'application/json',
        Authorization: 'Bearer api-key',
      });

      expect(body.model_uuid).toBe('model-uuid');
      expect(body.speaker_uuid).toBe('speaker-uuid');
      expect(body.style_id).toBe(5);
      expect(body.text).toBe('Test message');
      expect(body.use_ssml).toBe(false);
      expect(body.speaking_rate).toBe(1.5);
      expect(body.emotional_intensity).toBe(0.8);
      expect(body.tempo_dynamics).toBe(1.2);
      expect(body.pitch).toBe(0.2);
      expect(body.volume).toBe(1.5);
      expect(body.leading_silence_seconds).toBe(0.2);
      expect(body.trailing_silence_seconds).toBe(0.3);
      expect(body.line_break_silence_seconds).toBe(0.5);
      expect(body.output_format).toBe('opus');
      expect(body.output_bitrate).toBe(128);
      expect(body.output_sampling_rate).toBe(48000);
      expect(body.output_audio_channels).toBe('stereo');
    });

    it('should use style name instead of style ID when set', async () => {
      const engine = new AivisCloudEngine();
      engine.setModelUuid('model-uuid');
      engine.setStyleName('Happy');

      const mockAudioBuffer = new ArrayBuffer(1024);
      const mockBlob = {
        arrayBuffer: vi.fn().mockResolvedValue(mockAudioBuffer),
      };

      mockFetch.mockResolvedValue({
        ok: true,
        blob: vi.fn().mockResolvedValue(mockBlob),
        headers: {
          get: vi.fn().mockReturnValue(null),
        },
      });

      const talk: Talk = {
        style: 'talk',
        message: 'Test',
      };

      await engine.fetchAudio(talk, 'unused', 'api-key');

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.style_name).toBe('Happy');
      expect(body.style_id).toBeUndefined();
    });

    it('should not include bitrate for wav and flac formats', async () => {
      const engine = new AivisCloudEngine();
      engine.setModelUuid('model-uuid');
      engine.setOutputFormat('wav');
      engine.setOutputBitrate(192);

      const mockAudioBuffer = new ArrayBuffer(1024);
      const mockBlob = {
        arrayBuffer: vi.fn().mockResolvedValue(mockAudioBuffer),
      };

      mockFetch.mockResolvedValue({
        ok: true,
        blob: vi.fn().mockResolvedValue(mockBlob),
        headers: {
          get: vi.fn().mockReturnValue(null),
        },
      });

      const talk: Talk = {
        style: 'talk',
        message: 'Test',
      };

      await engine.fetchAudio(talk, 'unused', 'api-key');

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.output_bitrate).toBeUndefined();
    });
  });

  describe('getTestMessage', () => {
    it('should return default test message', () => {
      const engine = new AivisCloudEngine();
      expect(engine.getTestMessage()).toBe('Aivis Cloud APIを使用します');
    });

    it('should return custom test message', () => {
      const engine = new AivisCloudEngine();
      expect(engine.getTestMessage('Custom message')).toBe('Custom message');
    });
  });

  describe('parameter validation', () => {
    it('should clamp speaking rate to valid range', async () => {
      const engine = new AivisCloudEngine();
      engine.setSpeakingRate(3.0);
      engine.setModelUuid('test');

      const mockAudioBuffer = new ArrayBuffer(1024);
      const mockBlob = {
        arrayBuffer: vi.fn().mockResolvedValue(mockAudioBuffer),
      };

      mockFetch.mockResolvedValue({
        ok: true,
        blob: vi.fn().mockResolvedValue(mockBlob),
        headers: {
          get: vi.fn().mockReturnValue(null),
        },
      });

      const talk: Talk = { style: 'talk', message: 'Test' };
      await engine.fetchAudio(talk, 'unused', 'api-key');

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.speaking_rate).toBe(2.0); // Clamped to max
    });

    it('should clear style name when setting style ID', async () => {
      const engine = new AivisCloudEngine();
      engine.setStyleName('Happy');
      engine.setStyleId(5);
      engine.setModelUuid('test');

      const mockAudioBuffer = new ArrayBuffer(1024);
      const mockBlob = {
        arrayBuffer: vi.fn().mockResolvedValue(mockAudioBuffer),
      };

      mockFetch.mockResolvedValue({
        ok: true,
        blob: vi.fn().mockResolvedValue(mockBlob),
        headers: {
          get: vi.fn().mockReturnValue(null),
        },
      });

      const talk: Talk = { style: 'talk', message: 'Test' };
      await engine.fetchAudio(talk, 'unused', 'api-key');

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.style_id).toBe(5);
      expect(body.style_name).toBeUndefined();
    });
  });
});
