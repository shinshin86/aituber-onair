import { describe, expect, it, vi, beforeEach } from 'vitest';
import { VoiceEngineAdapter } from '../src/services/VoiceEngineAdapter';
import { VoiceServiceOptions } from '../src/services/VoiceService';
import { MinimaxModel } from '../src/engines/MinimaxEngine';

// Mock the VoiceEngineFactory
const mockGetEngine = vi.fn();
vi.mock('../src/engines/VoiceEngineFactory', () => ({
  VoiceEngineFactory: {
    getEngine: mockGetEngine,
  },
}));

// Mock fetch
global.fetch = vi.fn();

describe('VoiceEngineAdapter', () => {
  const mockFetch = global.fetch as any;
  let mockEngine: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create a mock engine with all necessary methods
    mockEngine = {
      fetchAudio: vi.fn(),
      setApiEndpoint: vi.fn(),
      setGroupId: vi.fn(),
      setEndpoint: vi.fn(),
      setModel: vi.fn(),
      setLanguage: vi.fn(),
      setVoiceSettings: vi.fn(),
      setSpeed: vi.fn(),
      setModelUuid: vi.fn(),
      setSpeakerUuid: vi.fn(),
      setStyleId: vi.fn(),
      setStyleName: vi.fn(),
      setUseSSML: vi.fn(),
      setSpeakingRate: vi.fn(),
      setEmotionalIntensity: vi.fn(),
      setTempoDynamics: vi.fn(),
      setPitch: vi.fn(),
      setVolume: vi.fn(),
      setAudioSettings: vi.fn(),
      setSampleRate: vi.fn(),
      setBitrate: vi.fn(),
      setAudioFormat: vi.fn(),
      setAudioChannel: vi.fn(),
      setSilenceDurations: vi.fn(),
      setOutputFormat: vi.fn(),
      setOutputBitrate: vi.fn(),
      setOutputSamplingRate: vi.fn(),
      setOutputChannels: vi.fn(),
      setEnableBillingLogs: vi.fn(),
    };

    // Set up the mock to return our mock engine
    mockGetEngine.mockReturnValue(mockEngine);
  });

  describe('MiniMax Integration', () => {
    it('should configure MiniMax engine with all options', async () => {
      const options: VoiceServiceOptions = {
        engineType: 'minimax',
        speaker: 'male-qn-qingse',
        apiKey: 'test-api-key',
        groupId: 'test-group-id',
        endpoint: 'global',
        minimaxModel: 'speech-2.5-hd-preview' as MinimaxModel,
        minimaxLanguageBoost: 'English',
        minimaxVoiceSettings: { speed: 0.95, vol: 0.9, pitch: -2 },
        minimaxSpeed: 1.1,
        minimaxVolume: 1.05,
        minimaxPitch: 3,
        minimaxAudioSettings: {
          sampleRate: 44100,
          bitrate: 96000,
          format: 'wav',
          channel: 2,
        },
        minimaxSampleRate: 48000,
        minimaxBitrate: 192000,
        minimaxAudioFormat: 'mp3',
        minimaxAudioChannel: 1,
        onPlay: vi.fn(), // Skip actual audio playback
      };

      const mockAudioBuffer = new ArrayBuffer(1024);
      mockEngine.fetchAudio.mockResolvedValue(mockAudioBuffer);

      const adapter = new VoiceEngineAdapter(options);

      await adapter.speak({
        text: 'Hello from MiniMax!',
        emotion: 'happy',
      });

      // Verify GroupId was set
      expect(mockEngine.setGroupId).toHaveBeenCalledWith('test-group-id');

      // Verify endpoint was set
      expect(mockEngine.setEndpoint).toHaveBeenCalledWith('global');

      // Verify model was set
      expect(mockEngine.setModel).toHaveBeenCalledWith('speech-2.5-hd-preview');
      expect(mockEngine.setLanguage).toHaveBeenCalledWith('English');
      expect(mockEngine.setVoiceSettings).toHaveBeenCalledWith({
        speed: 0.95,
        vol: 0.9,
        pitch: -2,
      });
      expect(mockEngine.setSpeed).toHaveBeenCalledWith(1.1);
      expect(mockEngine.setVolume).toHaveBeenCalledWith(1.05);
      expect(mockEngine.setPitch).toHaveBeenCalledWith(3);
      expect(mockEngine.setAudioSettings).toHaveBeenCalledWith({
        sampleRate: 44100,
        bitrate: 96000,
        format: 'wav',
        channel: 2,
      });
      expect(mockEngine.setSampleRate).toHaveBeenCalledWith(48000);
      expect(mockEngine.setBitrate).toHaveBeenCalledWith(192000);
      expect(mockEngine.setAudioFormat).toHaveBeenCalledWith('mp3');
      expect(mockEngine.setAudioChannel).toHaveBeenCalledWith(1);

      // Verify fetchAudio was called with correct parameters
      expect(mockEngine.fetchAudio).toHaveBeenCalledWith(
        {
          style: 'happy', // Converted from emotion
          message: 'Hello from MiniMax!',
        },
        'male-qn-qingse', // speaker
        'test-api-key', // apiKey
      );
    });

    it('should handle china endpoint configuration', async () => {
      const options: VoiceServiceOptions = {
        engineType: 'minimax',
        speaker: 'female-voice',
        apiKey: 'test-api-key',
        groupId: 'test-group-id',
        endpoint: 'china',
        minimaxModel: 'speech-02-turbo' as MinimaxModel,
        onPlay: vi.fn(),
      };

      const mockAudioBuffer = new ArrayBuffer(1024);
      mockEngine.fetchAudio.mockResolvedValue(mockAudioBuffer);

      const adapter = new VoiceEngineAdapter(options);

      await adapter.speak({
        text: 'Testing china endpoint',
      });

      expect(mockEngine.setEndpoint).toHaveBeenCalledWith('china');
      expect(mockEngine.setModel).toHaveBeenCalledWith('speech-02-turbo');
    });

    it('should handle all available MiniMax models', async () => {
      const models: MinimaxModel[] = [
        'speech-2.5-hd-preview',
        'speech-2.5-turbo-preview',
        'speech-02-hd',
        'speech-02-turbo',
        'speech-01-hd',
        'speech-01-turbo',
      ];

      const mockAudioBuffer = new ArrayBuffer(1024);
      mockEngine.fetchAudio.mockResolvedValue(mockAudioBuffer);

      for (const model of models) {
        const options: VoiceServiceOptions = {
          engineType: 'minimax',
          speaker: 'test-speaker',
          apiKey: 'test-api-key',
          groupId: 'test-group-id',
          minimaxModel: model,
          onPlay: vi.fn(),
        };

        const adapter = new VoiceEngineAdapter(options);
        await adapter.speak({ text: `Testing ${model}` });

        expect(mockEngine.setModel).toHaveBeenCalledWith(model);
      }
    });

    it('should warn when GroupId is not provided', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const options: VoiceServiceOptions = {
        engineType: 'minimax',
        speaker: 'test-speaker',
        apiKey: 'test-api-key',
        // groupId intentionally omitted
        onPlay: vi.fn(),
      };

      const mockAudioBuffer = new ArrayBuffer(1024);
      mockEngine.fetchAudio.mockResolvedValue(mockAudioBuffer);

      const adapter = new VoiceEngineAdapter(options);
      await adapter.speak({ text: 'Test without GroupId' });

      expect(consoleSpy).toHaveBeenCalledWith(
        'MiniMax engine requires GroupId, but it is not provided in options',
      );

      consoleSpy.mockRestore();
    });

    it('should not configure MiniMax-specific options for other engines', async () => {
      const options: VoiceServiceOptions = {
        engineType: 'openai',
        speaker: 'alloy',
        apiKey: 'test-api-key',
        // These should be ignored for non-MiniMax engines
        groupId: 'test-group-id',
        endpoint: 'global',
        minimaxModel: 'speech-2.5-hd-preview' as MinimaxModel,
        onPlay: vi.fn(),
      };

      const mockAudioBuffer = new ArrayBuffer(1024);
      mockEngine.fetchAudio.mockResolvedValue(mockAudioBuffer);

      const adapter = new VoiceEngineAdapter(options);
      await adapter.speak({ text: 'OpenAI test' });

      // These methods should NOT be called for non-MiniMax engines
      expect(mockEngine.setGroupId).not.toHaveBeenCalled();
      expect(mockEngine.setEndpoint).not.toHaveBeenCalled();
      expect(mockEngine.setModel).not.toHaveBeenCalled();
      expect(mockEngine.setLanguage).not.toHaveBeenCalled();
      expect(mockEngine.setVoiceSettings).not.toHaveBeenCalled();
      expect(mockEngine.setSpeed).not.toHaveBeenCalled();
      expect(mockEngine.setVolume).not.toHaveBeenCalled();
      expect(mockEngine.setPitch).not.toHaveBeenCalled();
      expect(mockEngine.setAudioSettings).not.toHaveBeenCalled();
      expect(mockEngine.setSampleRate).not.toHaveBeenCalled();
      expect(mockEngine.setBitrate).not.toHaveBeenCalled();
      expect(mockEngine.setAudioFormat).not.toHaveBeenCalled();
      expect(mockEngine.setAudioChannel).not.toHaveBeenCalled();
    });
  });

  describe('Emotion Conversion', () => {
    it('should convert emotions to styles correctly', async () => {
      const emotionMappings = [
        { emotion: 'angry', expectedStyle: 'angry' },
        { emotion: 'happy', expectedStyle: 'happy' },
        { emotion: 'sad', expectedStyle: 'sad' },
        { emotion: 'surprised', expectedStyle: 'surprised' },
        { emotion: 'neutral', expectedStyle: 'neutral' },
        { emotion: undefined, expectedStyle: 'neutral' },
        { emotion: 'unknown', expectedStyle: 'neutral' },
      ];

      const options: VoiceServiceOptions = {
        engineType: 'minimax',
        speaker: 'test-speaker',
        apiKey: 'test-api-key',
        groupId: 'test-group-id',
        onPlay: vi.fn(),
      };

      const mockAudioBuffer = new ArrayBuffer(1024);
      mockEngine.fetchAudio.mockResolvedValue(mockAudioBuffer);

      const adapter = new VoiceEngineAdapter(options);

      for (const mapping of emotionMappings) {
        await adapter.speak({
          text: 'Test message',
          emotion: mapping.emotion,
        });

        expect(mockEngine.fetchAudio).toHaveBeenCalledWith(
          expect.objectContaining({
            style: mapping.expectedStyle,
          }),
          expect.any(String),
          expect.any(String),
        );
      }
    });
  });

  describe('Custom Endpoint Configuration', () => {
    it('should configure custom endpoints for supported engines', async () => {
      const testCases = [
        {
          engineType: 'voicevox' as const,
          option: 'voicevoxApiUrl',
          url: 'http://localhost:50021',
        },
        {
          engineType: 'voicepeak' as const,
          option: 'voicepeakApiUrl' as const,
          url: 'http://localhost:20202',
        },
        {
          engineType: 'aivisSpeech' as const,
          option: 'aivisSpeechApiUrl' as const,
          url: 'http://localhost:10101',
        },
      ];

      const mockAudioBuffer = new ArrayBuffer(1024);
      mockEngine.fetchAudio.mockResolvedValue(mockAudioBuffer);

      for (const testCase of testCases) {
        const options = {
          engineType: testCase.engineType,
          speaker: 'test-speaker',
          [testCase.option]: testCase.url,
          onPlay: vi.fn(), // Skip actual audio playback
        } as VoiceServiceOptions;

        const adapter = new VoiceEngineAdapter(options);
        await adapter.speak({ text: 'Test custom endpoint' });

        expect(mockEngine.setApiEndpoint).toHaveBeenCalledWith(testCase.url);
      }
    });
  });

  describe('Text Processing', () => {
    it('should handle speakText method', async () => {
      const options: VoiceServiceOptions = {
        engineType: 'minimax',
        speaker: 'test-speaker',
        apiKey: 'test-api-key',
        groupId: 'test-group-id',
        onPlay: vi.fn(),
      };

      const mockAudioBuffer = new ArrayBuffer(1024);
      mockEngine.fetchAudio.mockResolvedValue(mockAudioBuffer);

      const adapter = new VoiceEngineAdapter(options);
      await adapter.speakText('[happy] Hello world!');

      expect(mockEngine.fetchAudio).toHaveBeenCalledWith(
        {
          style: 'happy',
          message: 'Hello world!',
        },
        'test-speaker',
        'test-api-key',
      );
    });

    it('should handle text without emotion tags', async () => {
      const options: VoiceServiceOptions = {
        engineType: 'minimax',
        speaker: 'test-speaker',
        apiKey: 'test-api-key',
        groupId: 'test-group-id',
        onPlay: vi.fn(),
      };

      const mockAudioBuffer = new ArrayBuffer(1024);
      mockEngine.fetchAudio.mockResolvedValue(mockAudioBuffer);

      const adapter = new VoiceEngineAdapter(options);
      await adapter.speakText('Plain text without emotion');

      expect(mockEngine.fetchAudio).toHaveBeenCalledWith(
        {
          style: 'neutral',
          message: 'Plain text without emotion',
        },
        'test-speaker',
        'test-api-key',
      );
    });
  });

  describe('Error Handling', () => {
    it('should propagate errors from engine', async () => {
      const options: VoiceServiceOptions = {
        engineType: 'minimax',
        speaker: 'test-speaker',
        apiKey: 'test-api-key',
        groupId: 'test-group-id',
      };

      mockEngine.fetchAudio.mockRejectedValue(new Error('API Error'));

      const adapter = new VoiceEngineAdapter(options);

      await expect(adapter.speak({ text: 'Test error' })).rejects.toThrow(
        'API Error',
      );
    });

    it('should handle missing API key gracefully', async () => {
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      const options: VoiceServiceOptions = {
        engineType: 'minimax',
        speaker: 'test-speaker',
        groupId: 'test-group-id',
        // apiKey intentionally omitted
      };

      mockEngine.fetchAudio.mockRejectedValue(new Error('API key is required'));

      const adapter = new VoiceEngineAdapter(options);

      await expect(
        adapter.speak({ text: 'Test without API key' }),
      ).rejects.toThrow();
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('Audio Playback Control', () => {
    it('should provide isPlaying status', () => {
      const options: VoiceServiceOptions = {
        engineType: 'minimax',
        speaker: 'test-speaker',
      };

      const adapter = new VoiceEngineAdapter(options);

      // Should return false initially (mocked behavior)
      expect(typeof adapter.isPlaying()).toBe('boolean');
    });

    it('should provide stop functionality', () => {
      const options: VoiceServiceOptions = {
        engineType: 'minimax',
        speaker: 'test-speaker',
      };

      const adapter = new VoiceEngineAdapter(options);

      expect(() => adapter.stop()).not.toThrow();
    });
  });

  describe('Options Update', () => {
    it('should update options correctly', () => {
      const options: VoiceServiceOptions = {
        engineType: 'minimax',
        speaker: 'original-speaker',
        apiKey: 'original-key',
      };

      const adapter = new VoiceEngineAdapter(options);

      expect(() =>
        adapter.updateOptions({
          speaker: 'updated-speaker',
          apiKey: 'updated-key',
        }),
      ).not.toThrow();
    });

    it('should update onComplete callback', () => {
      const options: VoiceServiceOptions = {
        engineType: 'minimax',
        speaker: 'test-speaker',
      };

      const adapter = new VoiceEngineAdapter(options);
      const mockCallback = vi.fn();

      expect(() =>
        adapter.updateOptions({
          onComplete: mockCallback,
        }),
      ).not.toThrow();
    });
  });
});
