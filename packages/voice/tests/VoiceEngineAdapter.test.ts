import { describe, expect, it, vi, beforeEach } from 'vitest';
import type {
  XaiBitRate,
  XaiCodec,
  XaiSampleRate,
} from '../src/engines/XaiEngine';
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
      setQueryParameters: vi.fn(),
      setSpeedScale: vi.fn(),
      setPitchScale: vi.fn(),
      setIntonationScale: vi.fn(),
      setTempoDynamicsScale: vi.fn(),
      setVolumeScale: vi.fn(),
      setPrePhonemeLength: vi.fn(),
      setPostPhonemeLength: vi.fn(),
      setPauseLength: vi.fn(),
      setPauseLengthScale: vi.fn(),
      setOutputStereo: vi.fn(),
      setEnableKatakanaEnglish: vi.fn(),
      setEnableInterrogativeUpspeak: vi.fn(),
      setCoreVersion: vi.fn(),
      setGroupId: vi.fn(),
      setEndpoint: vi.fn(),
      setModel: vi.fn(),
      setLanguageCode: vi.fn(),
      setPrompt: vi.fn(),
      setCodec: vi.fn(),
      setRate: vi.fn(),
      setEmotion: vi.fn(),
      setLanguage: vi.fn(),
      setVoiceSettings: vi.fn(),
      setStability: vi.fn(),
      setSimilarityBoost: vi.fn(),
      setStyle: vi.fn(),
      setUseSpeakerBoost: vi.fn(),
      setSeed: vi.fn(),
      setPreviousText: vi.fn(),
      setNextText: vi.fn(),
      setApplyTextNormalization: vi.fn(),
      setApplyLanguageTextNormalization: vi.fn(),
      setEnableLogging: vi.fn(),
      setAudioEncoding: vi.fn(),
      setSampleRateHertz: vi.fn(),
      setDeliveryMode: vi.fn(),
      setSpeed: vi.fn(),
      setBitRate: vi.fn(),
      setModelUuid: vi.fn(),
      setSpeakerUuid: vi.fn(),
      setStyleId: vi.fn(),
      setStyleName: vi.fn(),
      setUserDictionaryUuid: vi.fn(),
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
      setTemperature: vi.fn(),
      setNoiseScale: vi.fn(),
      setSilenceDurations: vi.fn(),
      setOutputFormat: vi.fn(),
      setOutputBitrate: vi.fn(),
      setOutputSamplingRate: vi.fn(),
      setOutputChannels: vi.fn(),
      setEnableBillingLogs: vi.fn(),
      setVoiceSimilarity: vi.fn(),
      setPaddingBonus: vi.fn(),
      setRewriteRules: vi.fn(),
    };

    // Set up the mock to return our mock engine
    mockGetEngine.mockReturnValue(mockEngine);
  });

  describe('VOICEVOX Integration', () => {
    it('should configure VOICEVOX engine with provided overrides', async () => {
      const options: VoiceServiceOptions = {
        engineType: 'voicevox',
        speaker: '1',
        voicevoxApiUrl: 'http://localhost:50021',
        voicevoxQueryParameters: {
          speedScale: 1.05,
          volumeScale: 0.95,
        },
        voicevoxSpeedScale: 1.2,
        voicevoxPitchScale: -0.1,
        voicevoxIntonationScale: 1.3,
        voicevoxVolumeScale: 0.9,
        voicevoxPrePhonemeLength: 0.2,
        voicevoxPostPhonemeLength: 0.15,
        voicevoxPauseLength: null,
        voicevoxPauseLengthScale: 1.1,
        voicevoxOutputSamplingRate: 48000,
        voicevoxOutputStereo: true,
        voicevoxEnableKatakanaEnglish: false,
        voicevoxEnableInterrogativeUpspeak: false,
        voicevoxCoreVersion: '0.15.0',
        onPlay: vi.fn(),
      };

      const mockAudioBuffer = new ArrayBuffer(1024);
      mockEngine.fetchAudio.mockResolvedValue(mockAudioBuffer);

      const adapter = new VoiceEngineAdapter(options);
      await adapter.speak({ text: 'VOICEVOX test' });

      expect(mockEngine.setApiEndpoint).toHaveBeenCalledWith(
        'http://localhost:50021',
      );
      expect(mockEngine.setQueryParameters).toHaveBeenCalledWith({
        speedScale: 1.05,
        volumeScale: 0.95,
      });
      expect(mockEngine.setSpeedScale).toHaveBeenCalledWith(1.2);
      expect(mockEngine.setPitchScale).toHaveBeenCalledWith(-0.1);
      expect(mockEngine.setIntonationScale).toHaveBeenCalledWith(1.3);
      expect(mockEngine.setVolumeScale).toHaveBeenCalledWith(0.9);
      expect(mockEngine.setPrePhonemeLength).toHaveBeenCalledWith(0.2);
      expect(mockEngine.setPostPhonemeLength).toHaveBeenCalledWith(0.15);
      expect(mockEngine.setPauseLength).toHaveBeenCalledWith(null);
      expect(mockEngine.setPauseLengthScale).toHaveBeenCalledWith(1.1);
      expect(mockEngine.setOutputSamplingRate).toHaveBeenCalledWith(48000);
      expect(mockEngine.setOutputStereo).toHaveBeenCalledWith(true);
      expect(mockEngine.setEnableKatakanaEnglish).toHaveBeenCalledWith(false);
      expect(mockEngine.setEnableInterrogativeUpspeak).toHaveBeenCalledWith(
        false,
      );
      expect(mockEngine.setCoreVersion).toHaveBeenCalledWith('0.15.0');
    });
  });

  describe('VoicePeak Integration', () => {
    it('should configure VoicePeak engine with provided overrides', async () => {
      const options: VoiceServiceOptions = {
        engineType: 'voicepeak',
        speaker: 'f1',
        voicepeakApiUrl: 'http://localhost:20202',
        voicepeakEmotion: 'angry',
        voicepeakSpeed: 180,
        voicepeakPitch: 120,
        onPlay: vi.fn(),
      };

      const mockAudioBuffer = new ArrayBuffer(1024);
      mockEngine.fetchAudio.mockResolvedValue(mockAudioBuffer);

      const adapter = new VoiceEngineAdapter(options);
      await adapter.speak({ text: 'VoicePeak test' });

      expect(mockEngine.setApiEndpoint).toHaveBeenCalledWith(
        'http://localhost:20202',
      );
      expect(mockEngine.setEmotion).toHaveBeenCalledWith('angry');
      expect(mockEngine.setSpeed).toHaveBeenCalledWith(180);
      expect(mockEngine.setPitch).toHaveBeenCalledWith(120);
    });
  });

  describe('AivisSpeech Integration', () => {
    it('should configure AivisSpeech engine with provided overrides', async () => {
      const options: VoiceServiceOptions = {
        engineType: 'aivisSpeech',
        speaker: '100',
        aivisSpeechApiUrl: 'http://localhost:10101',
        aivisSpeechQueryParameters: {
          speedScale: 0.95,
          tempoDynamicsScale: 1.05,
        },
        aivisSpeechSpeedScale: 1.1,
        aivisSpeechPitchScale: -0.05,
        aivisSpeechIntonationScale: 1.4,
        aivisSpeechTempoDynamicsScale: 1.2,
        aivisSpeechVolumeScale: 0.9,
        aivisSpeechPrePhonemeLength: 0.18,
        aivisSpeechPostPhonemeLength: 0.12,
        aivisSpeechPauseLength: null,
        aivisSpeechPauseLengthScale: 1.15,
        aivisSpeechOutputSamplingRate: 44100,
        aivisSpeechOutputStereo: true,
        onPlay: vi.fn(),
      };

      const mockAudioBuffer = new ArrayBuffer(1024);
      mockEngine.fetchAudio.mockResolvedValue(mockAudioBuffer);

      const adapter = new VoiceEngineAdapter(options);
      await adapter.speak({ text: 'AivisSpeech test' });

      expect(mockEngine.setApiEndpoint).toHaveBeenCalledWith(
        'http://localhost:10101',
      );
      expect(mockEngine.setQueryParameters).toHaveBeenCalledWith({
        speedScale: 0.95,
        tempoDynamicsScale: 1.05,
      });
      expect(mockEngine.setSpeedScale).toHaveBeenCalledWith(1.1);
      expect(mockEngine.setPitchScale).toHaveBeenCalledWith(-0.05);
      expect(mockEngine.setIntonationScale).toHaveBeenCalledWith(1.4);
      expect(mockEngine.setTempoDynamicsScale).toHaveBeenCalledWith(1.2);
      expect(mockEngine.setVolumeScale).toHaveBeenCalledWith(0.9);
      expect(mockEngine.setPrePhonemeLength).toHaveBeenCalledWith(0.18);
      expect(mockEngine.setPostPhonemeLength).toHaveBeenCalledWith(0.12);
      expect(mockEngine.setPauseLength).toHaveBeenCalledWith(null);
      expect(mockEngine.setPauseLengthScale).toHaveBeenCalledWith(1.15);
      expect(mockEngine.setOutputSamplingRate).toHaveBeenCalledWith(44100);
      expect(mockEngine.setOutputStereo).toHaveBeenCalledWith(true);
    });
  });

  describe('OpenAI Integration', () => {
    it('should configure OpenAI engine with provided overrides', async () => {
      const options: VoiceServiceOptions = {
        engineType: 'openai',
        speaker: 'alloy',
        apiKey: 'sk-test',
        openAiModel: 'gpt-4o-mini-tts',
        openAiSpeed: 1.75,
        onPlay: vi.fn(),
      };

      const mockAudioBuffer = new ArrayBuffer(1024);
      mockEngine.fetchAudio.mockResolvedValue(mockAudioBuffer);

      const adapter = new VoiceEngineAdapter(options);
      await adapter.speak({ text: 'OpenAI test' });

      expect(mockEngine.setModel).toHaveBeenCalledWith('gpt-4o-mini-tts');
      expect(mockEngine.setSpeed).toHaveBeenCalledWith(1.75);
      expect(mockEngine.fetchAudio).toHaveBeenCalled();
    });
  });

  describe('xAI Integration', () => {
    it('should configure xAI engine with provided overrides', async () => {
      const options: VoiceServiceOptions = {
        engineType: 'xai',
        speaker: 'eve',
        apiKey: 'xai-api-key',
        xaiLanguage: 'ja',
        xaiCodec: 'wav' as XaiCodec,
        xaiSampleRate: 44100 as XaiSampleRate,
        xaiBitRate: 192000 as XaiBitRate,
        onPlay: vi.fn(),
      };

      const mockAudioBuffer = new ArrayBuffer(1024);
      mockEngine.fetchAudio.mockResolvedValue(mockAudioBuffer);

      const adapter = new VoiceEngineAdapter(options);
      await adapter.speak({ text: 'xAI test' });

      expect(mockEngine.setLanguage).toHaveBeenCalledWith('ja');
      expect(mockEngine.setCodec).toHaveBeenCalledWith('wav');
      expect(mockEngine.setSampleRate).toHaveBeenCalledWith(44100);
      expect(mockEngine.setBitRate).toHaveBeenCalledWith(192000);
      expect(mockEngine.fetchAudio).toHaveBeenCalled();
    });
  });

  describe('Unreal Speech Integration', () => {
    it('should configure Unreal Speech engine with provided overrides', async () => {
      const options: VoiceServiceOptions = {
        engineType: 'unrealSpeech',
        speaker: 'af_bella',
        apiKey: 'unreal-api-key',
        unrealSpeechApiUrl: 'https://example.com/stream',
        unrealSpeechBitrate: '320k',
        unrealSpeechSpeed: 0.3,
        unrealSpeechPitch: 1.1,
        unrealSpeechCodec: 'pcm_mulaw',
        unrealSpeechTemperature: 0.35,
        onPlay: vi.fn(),
      };

      const mockAudioBuffer = new ArrayBuffer(1024);
      mockEngine.fetchAudio.mockResolvedValue(mockAudioBuffer);

      const adapter = new VoiceEngineAdapter(options);
      await adapter.speak({ text: 'Unreal Speech test' });

      expect(mockEngine.setApiEndpoint).toHaveBeenCalledWith(
        'https://example.com/stream',
      );
      expect(mockEngine.setBitrate).toHaveBeenCalledWith('320k');
      expect(mockEngine.setSpeed).toHaveBeenCalledWith(0.3);
      expect(mockEngine.setPitch).toHaveBeenCalledWith(1.1);
      expect(mockEngine.setCodec).toHaveBeenCalledWith('pcm_mulaw');
      expect(mockEngine.setTemperature).toHaveBeenCalledWith(0.35);
      expect(mockEngine.fetchAudio).toHaveBeenCalled();
    });
  });

  describe('ElevenLabs Integration', () => {
    it('should configure ElevenLabs engine with provided overrides', async () => {
      const options: VoiceServiceOptions = {
        engineType: 'elevenLabs',
        speaker: 'JBFqnCBsd6RMkjVDRZzb',
        apiKey: 'eleven-api-key',
        elevenLabsApiUrl: 'https://example.com/v1/text-to-speech',
        elevenLabsModel: 'eleven_flash_v2_5',
        elevenLabsOutputFormat: 'mp3_22050_32',
        elevenLabsLanguageCode: 'ja',
        elevenLabsVoiceSettings: {
          stability: 0.5,
          similarityBoost: 0.75,
        },
        elevenLabsStability: 0.4,
        elevenLabsSimilarityBoost: 0.8,
        elevenLabsStyle: 0.1,
        elevenLabsUseSpeakerBoost: true,
        elevenLabsSpeed: 1.05,
        elevenLabsSeed: 123,
        elevenLabsPreviousText: 'previous',
        elevenLabsNextText: 'next',
        elevenLabsApplyTextNormalization: 'auto',
        elevenLabsApplyLanguageTextNormalization: false,
        elevenLabsEnableLogging: false,
        onPlay: vi.fn(),
      };

      const mockAudioBuffer = new ArrayBuffer(1024);
      mockEngine.fetchAudio.mockResolvedValue(mockAudioBuffer);

      const adapter = new VoiceEngineAdapter(options);
      await adapter.speak({ text: 'ElevenLabs test' });

      expect(mockEngine.setApiEndpoint).toHaveBeenCalledWith(
        'https://example.com/v1/text-to-speech',
      );
      expect(mockEngine.setModel).toHaveBeenCalledWith('eleven_flash_v2_5');
      expect(mockEngine.setOutputFormat).toHaveBeenCalledWith('mp3_22050_32');
      expect(mockEngine.setLanguageCode).toHaveBeenCalledWith('ja');
      expect(mockEngine.setVoiceSettings).toHaveBeenCalledWith({
        stability: 0.5,
        similarityBoost: 0.75,
      });
      expect(mockEngine.setStability).toHaveBeenCalledWith(0.4);
      expect(mockEngine.setSimilarityBoost).toHaveBeenCalledWith(0.8);
      expect(mockEngine.setStyle).toHaveBeenCalledWith(0.1);
      expect(mockEngine.setUseSpeakerBoost).toHaveBeenCalledWith(true);
      expect(mockEngine.setSpeed).toHaveBeenCalledWith(1.05);
      expect(mockEngine.setSeed).toHaveBeenCalledWith(123);
      expect(mockEngine.setPreviousText).toHaveBeenCalledWith('previous');
      expect(mockEngine.setNextText).toHaveBeenCalledWith('next');
      expect(mockEngine.setApplyTextNormalization).toHaveBeenCalledWith('auto');
      expect(mockEngine.setApplyLanguageTextNormalization).toHaveBeenCalledWith(
        false,
      );
      expect(mockEngine.setEnableLogging).toHaveBeenCalledWith(false);
      expect(mockEngine.fetchAudio).toHaveBeenCalled();
    });
  });

  describe('Inworld Integration', () => {
    it('should configure Inworld engine with provided overrides', async () => {
      const options: VoiceServiceOptions = {
        engineType: 'inworld',
        speaker: 'Ashley',
        apiKey: 'inworld-basic-key',
        inworldApiUrl: 'https://example.com/tts/v1/voice',
        inworldModel: 'inworld-tts-2',
        inworldAudioEncoding: 'MP3',
        inworldSampleRateHertz: 48000,
        inworldBitRate: 128000,
        inworldSpeakingRate: 1.05,
        inworldLanguage: 'ja-JP',
        inworldDeliveryMode: 'BALANCED',
        inworldTemperature: 0.8,
        onPlay: vi.fn(),
      };

      const mockAudioBuffer = new ArrayBuffer(1024);
      mockEngine.fetchAudio.mockResolvedValue(mockAudioBuffer);

      const adapter = new VoiceEngineAdapter(options);
      await adapter.speak({ text: 'Inworld test' });

      expect(mockEngine.setApiEndpoint).toHaveBeenCalledWith(
        'https://example.com/tts/v1/voice',
      );
      expect(mockEngine.setModel).toHaveBeenCalledWith('inworld-tts-2');
      expect(mockEngine.setAudioEncoding).toHaveBeenCalledWith('MP3');
      expect(mockEngine.setSampleRateHertz).toHaveBeenCalledWith(48000);
      expect(mockEngine.setBitRate).toHaveBeenCalledWith(128000);
      expect(mockEngine.setSpeakingRate).toHaveBeenCalledWith(1.05);
      expect(mockEngine.setLanguage).toHaveBeenCalledWith('ja-JP');
      expect(mockEngine.setDeliveryMode).toHaveBeenCalledWith('BALANCED');
      expect(mockEngine.setTemperature).toHaveBeenCalledWith(0.8);
      expect(mockEngine.fetchAudio).toHaveBeenCalledWith(
        {
          style: 'neutral',
          message: 'Inworld test',
        },
        'Ashley',
        'inworld-basic-key',
      );
    });
  });

  describe('Gradium Integration', () => {
    it('should configure Gradium engine with provided overrides', async () => {
      const options: VoiceServiceOptions = {
        engineType: 'gradium',
        speaker: 'YTpq7expH9539ERJ',
        apiKey: 'gradium-api-key',
        gradiumApiUrl: 'https://example.com/api/post/speech/tts',
        gradiumOutputFormat: 'opus',
        gradiumTemperature: 0.3,
        gradiumVoiceSimilarity: 2.5,
        gradiumPaddingBonus: -1,
        gradiumRewriteRules: 'en',
        onPlay: vi.fn(),
      };

      const mockAudioBuffer = new ArrayBuffer(1024);
      mockEngine.fetchAudio.mockResolvedValue(mockAudioBuffer);

      const adapter = new VoiceEngineAdapter(options);
      await adapter.speak({ text: 'Gradium test' });

      expect(mockEngine.setApiEndpoint).toHaveBeenCalledWith(
        'https://example.com/api/post/speech/tts',
      );
      expect(mockEngine.setOutputFormat).toHaveBeenCalledWith('opus');
      expect(mockEngine.setTemperature).toHaveBeenCalledWith(0.3);
      expect(mockEngine.setVoiceSimilarity).toHaveBeenCalledWith(2.5);
      expect(mockEngine.setPaddingBonus).toHaveBeenCalledWith(-1);
      expect(mockEngine.setRewriteRules).toHaveBeenCalledWith('en');
      expect(mockEngine.fetchAudio).toHaveBeenCalledWith(
        {
          style: 'neutral',
          message: 'Gradium test',
        },
        'YTpq7expH9539ERJ',
        'gradium-api-key',
      );
    });
  });

  describe('OpenAI Compatible Integration', () => {
    it('should configure an OpenAI-compatible engine with provided overrides', async () => {
      const options: VoiceServiceOptions = {
        engineType: 'openaiCompatible',
        speaker: 'af_bella',
        openAiCompatibleApiUrl: 'http://localhost:8880/v1/audio/speech',
        openAiCompatibleModel: 'example-model',
        openAiCompatibleSpeed: 1.3,
        onPlay: vi.fn(),
      };

      const mockAudioBuffer = new ArrayBuffer(1024);
      mockEngine.fetchAudio.mockResolvedValue(mockAudioBuffer);

      const adapter = new VoiceEngineAdapter(options);
      await adapter.speak({ text: 'OpenAI compatible test' });

      expect(mockEngine.setApiEndpoint).toHaveBeenCalledWith(
        'http://localhost:8880/v1/audio/speech',
      );
      expect(mockEngine.setModel).toHaveBeenCalledWith('example-model');
      expect(mockEngine.setSpeed).toHaveBeenCalledWith(1.3);
      expect(mockEngine.fetchAudio).toHaveBeenCalled();
    });

    it('should allow OpenAI-compatible engine without speaker', async () => {
      const options: VoiceServiceOptions = {
        engineType: 'openaiCompatible',
        openAiCompatibleApiUrl: 'http://localhost:8880/v1/audio/speech',
        openAiCompatibleModel: 'example-model',
        onPlay: vi.fn(),
      };

      const mockAudioBuffer = new ArrayBuffer(1024);
      mockEngine.fetchAudio.mockResolvedValue(mockAudioBuffer);

      const adapter = new VoiceEngineAdapter(options);
      await adapter.speak({ text: 'OpenAI compatible test without speaker' });

      expect(mockEngine.fetchAudio).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'OpenAI compatible test without speaker',
        }),
        '',
        undefined,
      );
    });
  });

  describe('AivisCloud Integration', () => {
    it('should configure Aivis Cloud engine with provided overrides', async () => {
      const options: VoiceServiceOptions = {
        engineType: 'aivisCloud',
        speaker: 'model-default',
        apiKey: 'cloud-key',
        aivisCloudModelUuid: 'override-model',
        aivisCloudSpeakerUuid: 'speaker-uuid',
        aivisCloudStyleName: 'Happy',
        aivisCloudUseSSML: false,
        aivisCloudLanguage: 'ja',
        aivisCloudSpeakingRate: 1.25,
        aivisCloudEmotionalIntensity: 1.4,
        aivisCloudTempoDynamics: 1.1,
        aivisCloudPitch: 0.15,
        aivisCloudVolume: 1.3,
        aivisCloudLeadingSilence: 0.05,
        aivisCloudTrailingSilence: 0.2,
        aivisCloudLineBreakSilence: 0.6,
        aivisCloudOutputFormat: 'opus',
        aivisCloudOutputBitrate: 192,
        aivisCloudOutputSamplingRate: 48000,
        aivisCloudOutputChannels: 'stereo',
        aivisCloudUserDictionaryUuid: 'dict-uuid',
        aivisCloudEnableBillingLogs: true,
        onPlay: vi.fn(),
      };

      const mockAudioBuffer = new ArrayBuffer(1024);
      mockEngine.fetchAudio.mockResolvedValue(mockAudioBuffer);

      const adapter = new VoiceEngineAdapter(options);
      await adapter.speak({ text: 'Aivis Cloud test' });

      expect(mockEngine.setModelUuid).toHaveBeenCalledWith('override-model');
      expect(mockEngine.setSpeakerUuid).toHaveBeenCalledWith('speaker-uuid');
      expect(mockEngine.setStyleName).toHaveBeenCalledWith('Happy');
      expect(mockEngine.setUseSSML).toHaveBeenCalledWith(false);
      expect(mockEngine.setLanguage).toHaveBeenCalledWith('ja');
      expect(mockEngine.setSpeakingRate).toHaveBeenCalledWith(1.25);
      expect(mockEngine.setEmotionalIntensity).toHaveBeenCalledWith(1.4);
      expect(mockEngine.setTempoDynamics).toHaveBeenCalledWith(1.1);
      expect(mockEngine.setPitch).toHaveBeenCalledWith(0.15);
      expect(mockEngine.setVolume).toHaveBeenCalledWith(1.3);
      expect(mockEngine.setSilenceDurations).toHaveBeenCalledWith(
        0.05,
        0.2,
        0.6,
      );
      expect(mockEngine.setOutputFormat).toHaveBeenCalledWith('opus');
      expect(mockEngine.setOutputBitrate).toHaveBeenCalledWith(192);
      expect(mockEngine.setOutputSamplingRate).toHaveBeenCalledWith(48000);
      expect(mockEngine.setOutputChannels).toHaveBeenCalledWith('stereo');
      expect(mockEngine.setUserDictionaryUuid).toHaveBeenCalledWith(
        'dict-uuid',
      );
      expect(mockEngine.setEnableBillingLogs).toHaveBeenCalledWith(true);
      expect(mockEngine.fetchAudio).toHaveBeenCalled();
    });
  });

  describe('MiniMax Integration', () => {
    it('should configure MiniMax engine with all options', async () => {
      const options: VoiceServiceOptions = {
        engineType: 'minimax',
        speaker: 'male-qn-qingse',
        apiKey: 'test-api-key',
        groupId: 'test-group-id',
        endpoint: 'global',
        minimaxModel: 'speech-2.6-hd' as MinimaxModel,
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
      expect(mockEngine.setModel).toHaveBeenCalledWith('speech-2.6-hd');
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
        'speech-2.6-hd',
        'speech-2.6-turbo',
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
        minimaxModel: 'speech-2.6-hd' as MinimaxModel,
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
      expect(mockEngine.setQueryParameters).not.toHaveBeenCalled();
      expect(mockEngine.setSpeedScale).not.toHaveBeenCalled();
      expect(mockEngine.setPitchScale).not.toHaveBeenCalled();
      expect(mockEngine.setIntonationScale).not.toHaveBeenCalled();
      expect(mockEngine.setTempoDynamicsScale).not.toHaveBeenCalled();
      expect(mockEngine.setVolumeScale).not.toHaveBeenCalled();
      expect(mockEngine.setPrePhonemeLength).not.toHaveBeenCalled();
      expect(mockEngine.setPostPhonemeLength).not.toHaveBeenCalled();
      expect(mockEngine.setPauseLength).not.toHaveBeenCalled();
      expect(mockEngine.setPauseLengthScale).not.toHaveBeenCalled();
      expect(mockEngine.setOutputSamplingRate).not.toHaveBeenCalled();
      expect(mockEngine.setOutputStereo).not.toHaveBeenCalled();
      expect(mockEngine.setEnableKatakanaEnglish).not.toHaveBeenCalled();
      expect(mockEngine.setEnableInterrogativeUpspeak).not.toHaveBeenCalled();
      expect(mockEngine.setCoreVersion).not.toHaveBeenCalled();
    });
  });

  describe('PiperPlus Integration', () => {
    it('should configure PiperPlus engine with provided overrides', async () => {
      const options: VoiceServiceOptions = {
        engineType: 'piperPlus',
        speaker: 'tsukuyomi',
        piperPlusSpeed: 1.2,
        piperPlusNoiseScale: 0.7,
        onPlay: vi.fn(),
      };

      const mockAudioBuffer = new ArrayBuffer(1024);
      mockEngine.fetchAudio.mockResolvedValue(mockAudioBuffer);

      const adapter = new VoiceEngineAdapter(options);
      await adapter.speak({ text: 'PiperPlus test' });

      expect(mockEngine.setSpeed).toHaveBeenCalledWith(1.2);
      expect(mockEngine.setNoiseScale).toHaveBeenCalledWith(0.7);
      expect(mockEngine.fetchAudio).toHaveBeenCalledWith(
        {
          style: 'neutral',
          message: 'PiperPlus test',
        },
        'tsukuyomi',
        undefined,
      );
    });

    it('should reuse the same PiperPlus engine across multiple speaks', async () => {
      const options: VoiceServiceOptions = {
        engineType: 'piperPlus',
        speaker: 'tsukuyomi',
        onPlay: vi.fn(),
      };

      const piperEngine = {
        ...mockEngine,
        fetchAudio: vi.fn().mockResolvedValue(new ArrayBuffer(1024)),
      };

      mockGetEngine.mockImplementation((engineType: string) => {
        if (engineType === 'piperPlus') {
          return piperEngine;
        }

        return mockEngine;
      });

      const adapter = new VoiceEngineAdapter(options);
      await adapter.speak({ text: '1回目' });
      await adapter.speak({ text: '2回目' });

      expect(mockGetEngine).toHaveBeenCalledTimes(1);
      expect(piperEngine.fetchAudio).toHaveBeenCalledTimes(2);
    });

    it('should drop the cached PiperPlus engine after switching away', async () => {
      const piperEngine = {
        ...mockEngine,
        fetchAudio: vi.fn().mockResolvedValue(new ArrayBuffer(1024)),
      };
      const minimaxEngine = {
        ...mockEngine,
        fetchAudio: vi.fn().mockResolvedValue(new ArrayBuffer(1024)),
      };

      mockGetEngine.mockImplementation((engineType: string) => {
        if (engineType === 'piperPlus') {
          return piperEngine;
        }

        return minimaxEngine;
      });

      const adapter = new VoiceEngineAdapter({
        engineType: 'piperPlus',
        speaker: 'tsukuyomi',
        onPlay: vi.fn(),
      });

      await adapter.speak({ text: 'PiperPlus' });

      adapter.switchEngine({
        engineType: 'minimax',
        speaker: 'minimax-speaker',
        groupId: 'group-id',
        onPlay: vi.fn(),
      });

      await adapter.speak({ text: 'MiniMax' });

      expect(mockGetEngine).toHaveBeenNthCalledWith(1, 'piperPlus');
      expect(mockGetEngine).toHaveBeenNthCalledWith(2, 'minimax');
      expect(piperEngine.fetchAudio).toHaveBeenCalledTimes(1);
      expect(minimaxEngine.fetchAudio).toHaveBeenCalledTimes(1);
    });
  });

  describe('Web Speech Integration', () => {
    it('should speak directly without fetching or playing audio buffers', async () => {
      const onPlay = vi.fn();
      const onComplete = vi.fn();
      const webSpeechEngine = {
        ...mockEngine,
        playsAudioDirectly: true,
        speakDirectly: vi.fn().mockResolvedValue(undefined),
        stopSpeaking: vi.fn(),
        isSpeaking: vi.fn().mockReturnValue(false),
      };
      mockGetEngine.mockReturnValue(webSpeechEngine);

      const adapter = new VoiceEngineAdapter({
        engineType: 'webSpeech',
        speaker: 'Kyoko',
        webSpeechRate: 1.2,
        webSpeechPitch: 1.1,
        webSpeechVolume: 0.8,
        webSpeechLanguage: 'ja-JP',
        onPlay,
        onComplete,
      });

      await adapter.speak({ text: 'Web Speech test', emotion: 'happy' });

      expect(webSpeechEngine.setRate).toHaveBeenCalledWith(1.2);
      expect(webSpeechEngine.setPitch).toHaveBeenCalledWith(1.1);
      expect(webSpeechEngine.setVolume).toHaveBeenCalledWith(0.8);
      expect(webSpeechEngine.setLanguage).toHaveBeenCalledWith('ja-JP');
      expect(webSpeechEngine.fetchAudio).not.toHaveBeenCalled();
      expect(webSpeechEngine.speakDirectly).toHaveBeenCalledWith(
        {
          style: 'happy',
          message: 'Web Speech test',
        },
        'Kyoko',
      );
      expect(onPlay).not.toHaveBeenCalled();
      expect(onComplete).toHaveBeenCalledTimes(1);
    });

    it('should stop active direct speech playback', async () => {
      let resolveSpeech: (() => void) | undefined;
      const webSpeechEngine = {
        ...mockEngine,
        playsAudioDirectly: true,
        speakDirectly: vi.fn(
          () =>
            new Promise<void>((resolve) => {
              resolveSpeech = resolve;
            }),
        ),
        stopSpeaking: vi.fn(),
        isSpeaking: vi.fn().mockReturnValue(true),
      };
      mockGetEngine.mockReturnValue(webSpeechEngine);

      const adapter = new VoiceEngineAdapter({
        engineType: 'webSpeech',
        speaker: 'Kyoko',
      });

      const speechPromise = adapter.speak({ text: 'stop me' });
      await vi.waitFor(() => {
        expect(webSpeechEngine.speakDirectly).toHaveBeenCalled();
      });

      expect(adapter.isPlaying()).toBe(true);
      adapter.stop();

      await expect(speechPromise).rejects.toThrow('Speech playback stopped');
      expect(webSpeechEngine.stopSpeaking).toHaveBeenCalledTimes(1);

      resolveSpeech?.();
    });
  });

  describe('Gemini TTS Integration', () => {
    it('should configure Gemini TTS engine with provided overrides', async () => {
      const options: VoiceServiceOptions = {
        engineType: 'geminiTts',
        speaker: 'Zephyr',
        apiKey: 'test-api-key',
        geminiTtsModel: 'gemini-3.1-flash-tts-preview',
        geminiTtsLanguageCode: 'en-US',
        geminiTtsPrompt: 'Speak cheerfully',
        geminiTtsApiUrl: 'https://generativelanguage.googleapis.com/v1beta',
        onPlay: vi.fn(),
      };

      const mockAudioBuffer = new ArrayBuffer(1024);
      mockEngine.fetchAudio.mockResolvedValue(mockAudioBuffer);

      const adapter = new VoiceEngineAdapter(options);
      await adapter.speak({ text: 'Gemini TTS test' });

      expect(mockEngine.setModel).toHaveBeenCalledWith(
        'gemini-3.1-flash-tts-preview',
      );
      expect(mockEngine.setLanguageCode).toHaveBeenCalledWith('en-US');
      expect(mockEngine.setPrompt).toHaveBeenCalledWith('Speak cheerfully');
      expect(mockEngine.setApiEndpoint).toHaveBeenCalledWith(
        'https://generativelanguage.googleapis.com/v1beta',
      );
      expect(mockEngine.fetchAudio).toHaveBeenCalled();
    });

    it('should apply updated Gemini TTS options for the current engine', async () => {
      const options: VoiceServiceOptions = {
        engineType: 'geminiTts',
        speaker: 'Zephyr',
        apiKey: 'test-access-token',
        onPlay: vi.fn(),
      };

      const mockAudioBuffer = new ArrayBuffer(1024);
      mockEngine.fetchAudio.mockResolvedValue(mockAudioBuffer);

      const adapter = new VoiceEngineAdapter(options);
      await adapter.speak({ text: 'Initial' });

      vi.clearAllMocks();
      mockEngine.fetchAudio.mockResolvedValue(mockAudioBuffer);

      adapter.updateOptions({
        geminiTtsModel: 'gemini-2.5-pro-preview-tts',
        geminiTtsLanguageCode: 'en-US',
        geminiTtsPrompt: 'Speak cheerfully',
        geminiTtsApiUrl: 'https://generativelanguage.googleapis.com/v1beta',
      });

      await adapter.speak({ text: 'After update' });

      expect(mockEngine.setModel).toHaveBeenCalledWith(
        'gemini-2.5-pro-preview-tts',
      );
      expect(mockEngine.setLanguageCode).toHaveBeenCalledWith('en-US');
      expect(mockEngine.setPrompt).toHaveBeenCalledWith('Speak cheerfully');
      expect(mockEngine.setApiEndpoint).toHaveBeenCalledWith(
        'https://generativelanguage.googleapis.com/v1beta',
      );
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
        {
          engineType: 'openaiCompatible' as const,
          option: 'openAiCompatibleApiUrl' as const,
          url: 'http://localhost:8880/v1/audio/speech',
        },
        {
          engineType: 'geminiTts' as const,
          option: 'geminiTtsApiUrl' as const,
          url: 'https://generativelanguage.googleapis.com/v1beta',
        },
        {
          engineType: 'inworld' as const,
          option: 'inworldApiUrl' as const,
          url: 'https://api.inworld.ai/tts/v1/voice',
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

    it('should apply updated options for the current engine', async () => {
      const options: VoiceServiceOptions = {
        engineType: 'voicevox',
        speaker: '1',
        voicevoxApiUrl: 'http://localhost:50021',
        onPlay: vi.fn(),
      };

      const mockAudioBuffer = new ArrayBuffer(1024);
      mockEngine.fetchAudio.mockResolvedValue(mockAudioBuffer);

      const adapter = new VoiceEngineAdapter(options);
      adapter.updateOptions({
        voicevoxApiUrl: 'http://localhost:50022',
        voicevoxSpeedScale: 1.15,
      });

      await adapter.speak({ text: 'Updated voicevox options' });

      expect(mockEngine.setApiEndpoint).toHaveBeenCalledWith(
        'http://localhost:50022',
      );
      expect(mockEngine.setSpeedScale).toHaveBeenCalledWith(1.15);
    });

    it('should apply updated OpenAI options for the current engine', async () => {
      const options: VoiceServiceOptions = {
        engineType: 'openai',
        speaker: 'alloy',
        apiKey: 'test-api-key',
        onPlay: vi.fn(),
      };

      const mockAudioBuffer = new ArrayBuffer(1024);
      mockEngine.fetchAudio.mockResolvedValue(mockAudioBuffer);

      const adapter = new VoiceEngineAdapter(options);
      adapter.updateOptions({
        openAiModel: 'gpt-4o-mini-tts',
        openAiSpeed: 1.5,
      });

      await adapter.speak({ text: 'Updated openai options' });

      expect(mockEngine.setModel).toHaveBeenCalledWith('gpt-4o-mini-tts');
      expect(mockEngine.setSpeed).toHaveBeenCalledWith(1.5);
    });

    it('should apply updated xAI options for the current engine', async () => {
      const options: VoiceServiceOptions = {
        engineType: 'xai',
        speaker: 'eve',
        apiKey: 'xai-api-key',
        onPlay: vi.fn(),
      };

      const mockAudioBuffer = new ArrayBuffer(1024);
      mockEngine.fetchAudio.mockResolvedValue(mockAudioBuffer);

      const adapter = new VoiceEngineAdapter(options);
      adapter.updateOptions({
        xaiLanguage: 'ja',
        xaiCodec: 'pcm',
        xaiSampleRate: 24000,
        xaiBitRate: 96000,
      });

      await adapter.speak({ text: 'Updated xai options' });

      expect(mockEngine.setLanguage).toHaveBeenCalledWith('ja');
      expect(mockEngine.setCodec).toHaveBeenCalledWith('pcm');
      expect(mockEngine.setSampleRate).toHaveBeenCalledWith(24000);
      expect(mockEngine.setBitRate).toHaveBeenCalledWith(96000);
    });

    it('should apply updated Unreal Speech options for the current engine', async () => {
      const options: VoiceServiceOptions = {
        engineType: 'unrealSpeech',
        speaker: 'af_bella',
        apiKey: 'unreal-api-key',
        onPlay: vi.fn(),
      };

      const mockAudioBuffer = new ArrayBuffer(1024);
      mockEngine.fetchAudio.mockResolvedValue(mockAudioBuffer);

      const adapter = new VoiceEngineAdapter(options);
      adapter.updateOptions({
        unrealSpeechApiUrl: 'https://example.com/stream',
        unrealSpeechBitrate: '320k',
        unrealSpeechSpeed: 0.25,
        unrealSpeechPitch: 1.2,
        unrealSpeechCodec: 'pcm_s16le',
        unrealSpeechTemperature: 0.4,
      });

      await adapter.speak({ text: 'Updated Unreal Speech options' });

      expect(mockEngine.setApiEndpoint).toHaveBeenCalledWith(
        'https://example.com/stream',
      );
      expect(mockEngine.setBitrate).toHaveBeenCalledWith('320k');
      expect(mockEngine.setSpeed).toHaveBeenCalledWith(0.25);
      expect(mockEngine.setPitch).toHaveBeenCalledWith(1.2);
      expect(mockEngine.setCodec).toHaveBeenCalledWith('pcm_s16le');
      expect(mockEngine.setTemperature).toHaveBeenCalledWith(0.4);
    });

    it('should apply updated ElevenLabs options for the current engine', async () => {
      const options: VoiceServiceOptions = {
        engineType: 'elevenLabs',
        speaker: 'JBFqnCBsd6RMkjVDRZzb',
        apiKey: 'eleven-api-key',
        onPlay: vi.fn(),
      };

      const mockAudioBuffer = new ArrayBuffer(1024);
      mockEngine.fetchAudio.mockResolvedValue(mockAudioBuffer);

      const adapter = new VoiceEngineAdapter(options);
      adapter.updateOptions({
        elevenLabsApiUrl: 'https://example.com/v1/text-to-speech',
        elevenLabsModel: 'eleven_flash_v2_5',
        elevenLabsOutputFormat: 'mp3_22050_32',
        elevenLabsLanguageCode: 'ja',
        elevenLabsStability: 0.4,
        elevenLabsSimilarityBoost: 0.8,
        elevenLabsStyle: 0.1,
        elevenLabsUseSpeakerBoost: true,
        elevenLabsSpeed: 1.05,
        elevenLabsSeed: 123,
        elevenLabsPreviousText: 'previous',
        elevenLabsNextText: 'next',
        elevenLabsApplyTextNormalization: 'on',
        elevenLabsApplyLanguageTextNormalization: true,
        elevenLabsEnableLogging: false,
      });

      await adapter.speak({ text: 'Updated ElevenLabs options' });

      expect(mockEngine.setApiEndpoint).toHaveBeenCalledWith(
        'https://example.com/v1/text-to-speech',
      );
      expect(mockEngine.setModel).toHaveBeenCalledWith('eleven_flash_v2_5');
      expect(mockEngine.setOutputFormat).toHaveBeenCalledWith('mp3_22050_32');
      expect(mockEngine.setLanguageCode).toHaveBeenCalledWith('ja');
      expect(mockEngine.setStability).toHaveBeenCalledWith(0.4);
      expect(mockEngine.setSimilarityBoost).toHaveBeenCalledWith(0.8);
      expect(mockEngine.setStyle).toHaveBeenCalledWith(0.1);
      expect(mockEngine.setUseSpeakerBoost).toHaveBeenCalledWith(true);
      expect(mockEngine.setSpeed).toHaveBeenCalledWith(1.05);
      expect(mockEngine.setSeed).toHaveBeenCalledWith(123);
      expect(mockEngine.setPreviousText).toHaveBeenCalledWith('previous');
      expect(mockEngine.setNextText).toHaveBeenCalledWith('next');
      expect(mockEngine.setApplyTextNormalization).toHaveBeenCalledWith('on');
      expect(mockEngine.setApplyLanguageTextNormalization).toHaveBeenCalledWith(
        true,
      );
      expect(mockEngine.setEnableLogging).toHaveBeenCalledWith(false);
    });

    it('should apply updated Inworld options for the current engine', async () => {
      const options: VoiceServiceOptions = {
        engineType: 'inworld',
        speaker: 'Ashley',
        apiKey: 'inworld-basic-key',
        onPlay: vi.fn(),
      };

      const mockAudioBuffer = new ArrayBuffer(1024);
      mockEngine.fetchAudio.mockResolvedValue(mockAudioBuffer);

      const adapter = new VoiceEngineAdapter(options);
      adapter.updateOptions({
        inworldApiUrl: 'https://example.com/tts/v1/voice',
        inworldModel: 'inworld-tts-1.5-mini',
        inworldAudioEncoding: 'LINEAR16',
        inworldSampleRateHertz: 24000,
        inworldBitRate: 96000,
        inworldSpeakingRate: 1.1,
        inworldLanguage: 'ja-JP',
        inworldDeliveryMode: 'CREATIVE',
        inworldTemperature: 0.7,
      });

      await adapter.speak({ text: 'Updated Inworld options' });

      expect(mockEngine.setApiEndpoint).toHaveBeenCalledWith(
        'https://example.com/tts/v1/voice',
      );
      expect(mockEngine.setModel).toHaveBeenCalledWith('inworld-tts-1.5-mini');
      expect(mockEngine.setAudioEncoding).toHaveBeenCalledWith('LINEAR16');
      expect(mockEngine.setSampleRateHertz).toHaveBeenCalledWith(24000);
      expect(mockEngine.setBitRate).toHaveBeenCalledWith(96000);
      expect(mockEngine.setSpeakingRate).toHaveBeenCalledWith(1.1);
      expect(mockEngine.setLanguage).toHaveBeenCalledWith('ja-JP');
      expect(mockEngine.setDeliveryMode).toHaveBeenCalledWith('CREATIVE');
      expect(mockEngine.setTemperature).toHaveBeenCalledWith(0.7);
    });

    it('should apply updated Gradium options for the current engine', async () => {
      const options: VoiceServiceOptions = {
        engineType: 'gradium',
        speaker: 'YTpq7expH9539ERJ',
        apiKey: 'gradium-api-key',
        onPlay: vi.fn(),
      };

      const mockAudioBuffer = new ArrayBuffer(1024);
      mockEngine.fetchAudio.mockResolvedValue(mockAudioBuffer);

      const adapter = new VoiceEngineAdapter(options);
      adapter.updateOptions({
        gradiumApiUrl: 'https://example.com/api/post/speech/tts',
        gradiumOutputFormat: 'pcm_24000',
        gradiumTemperature: 0.2,
        gradiumVoiceSimilarity: 3,
        gradiumPaddingBonus: 1.5,
        gradiumRewriteRules: 'TimeEn,Date',
      });

      await adapter.speak({ text: 'Updated Gradium options' });

      expect(mockEngine.setApiEndpoint).toHaveBeenCalledWith(
        'https://example.com/api/post/speech/tts',
      );
      expect(mockEngine.setOutputFormat).toHaveBeenCalledWith('pcm_24000');
      expect(mockEngine.setTemperature).toHaveBeenCalledWith(0.2);
      expect(mockEngine.setVoiceSimilarity).toHaveBeenCalledWith(3);
      expect(mockEngine.setPaddingBonus).toHaveBeenCalledWith(1.5);
      expect(mockEngine.setRewriteRules).toHaveBeenCalledWith('TimeEn,Date');
    });

    it('should apply updated OpenAI-compatible options for the current engine', async () => {
      const options: VoiceServiceOptions = {
        engineType: 'openaiCompatible',
        speaker: 'af_bella',
        onPlay: vi.fn(),
      };

      const mockAudioBuffer = new ArrayBuffer(1024);
      mockEngine.fetchAudio.mockResolvedValue(mockAudioBuffer);

      const adapter = new VoiceEngineAdapter(options);
      adapter.updateOptions({
        openAiCompatibleApiUrl: 'http://localhost:8881/v1/audio/speech',
        openAiCompatibleModel: 'example-model-v1',
        openAiCompatibleSpeed: 1.4,
      });

      await adapter.speak({ text: 'Updated openai compatible options' });

      expect(mockEngine.setApiEndpoint).toHaveBeenCalledWith(
        'http://localhost:8881/v1/audio/speech',
      );
      expect(mockEngine.setModel).toHaveBeenCalledWith('example-model-v1');
      expect(mockEngine.setSpeed).toHaveBeenCalledWith(1.4);
    });

    it('should apply updated PiperPlus options for the current engine', async () => {
      const options: VoiceServiceOptions = {
        engineType: 'piperPlus',
        speaker: 'tsukuyomi',
        onPlay: vi.fn(),
      };

      const mockAudioBuffer = new ArrayBuffer(1024);
      mockEngine.fetchAudio.mockResolvedValue(mockAudioBuffer);

      const adapter = new VoiceEngineAdapter(options);
      adapter.updateOptions({
        piperPlusSpeed: 1.1,
        piperPlusNoiseScale: 0.6,
      });

      await adapter.speak({ text: 'Updated piperPlus options' });

      expect(mockEngine.setSpeed).toHaveBeenCalledWith(1.1);
      expect(mockEngine.setNoiseScale).toHaveBeenCalledWith(0.6);
    });

    it('should apply updated Web Speech options for the current engine', async () => {
      const webSpeechEngine = {
        ...mockEngine,
        playsAudioDirectly: true,
        speakDirectly: vi.fn().mockResolvedValue(undefined),
        stopSpeaking: vi.fn(),
      };
      mockGetEngine.mockReturnValue(webSpeechEngine);

      const adapter = new VoiceEngineAdapter({
        engineType: 'webSpeech',
        speaker: 'Kyoko',
      });
      adapter.updateOptions({
        webSpeechRate: 1.35,
        webSpeechLanguage: 'ja-JP',
      });

      await adapter.speak({ text: 'Updated webSpeech options' });

      expect(webSpeechEngine.setRate).toHaveBeenCalledWith(1.35);
      expect(webSpeechEngine.setLanguage).toHaveBeenCalledWith('ja-JP');
    });

    it('should allow cross-engine options in updateOptions for backward compatibility', () => {
      const options: VoiceServiceOptions = {
        engineType: 'openai',
        speaker: 'alloy',
        apiKey: 'test-api-key',
      };
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const adapter = new VoiceEngineAdapter(options);

      expect(() =>
        adapter.updateOptions({
          minimaxModel: 'speech-2.6-hd',
        } as any),
      ).not.toThrow();
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('legacy lenient updateOptions() path'),
        expect.any(Error),
      );
    });

    it('should switch engine using updateOptions for backward compatibility', async () => {
      const options: VoiceServiceOptions = {
        engineType: 'openai',
        speaker: 'alloy',
        apiKey: 'openai-api-key',
        onPlay: vi.fn(),
      };

      const mockAudioBuffer = new ArrayBuffer(1024);
      mockEngine.fetchAudio.mockResolvedValue(mockAudioBuffer);

      const adapter = new VoiceEngineAdapter(options);

      adapter.updateOptions({
        engineType: 'minimax',
        speaker: 'minimax-speaker',
        apiKey: 'minimax-api-key',
        groupId: 'minimax-group-id',
        onPlay: vi.fn(),
      });

      await adapter.speak({ text: 'Engine switched by updateOptions' });

      expect(mockEngine.setGroupId).toHaveBeenCalledWith('minimax-group-id');
      expect(mockEngine.fetchAudio).toHaveBeenCalledWith(
        expect.any(Object),
        'minimax-speaker',
        'minimax-api-key',
      );
    });

    it('should switch engine using switchEngine', async () => {
      const options: VoiceServiceOptions = {
        engineType: 'openai',
        speaker: 'alloy',
        apiKey: 'openai-api-key',
        onPlay: vi.fn(),
      };

      const mockAudioBuffer = new ArrayBuffer(1024);
      mockEngine.fetchAudio.mockResolvedValue(mockAudioBuffer);

      const adapter = new VoiceEngineAdapter(options);
      adapter.switchEngine({
        engineType: 'minimax',
        speaker: 'minimax-speaker',
        apiKey: 'minimax-api-key',
        groupId: 'minimax-group-id',
        onPlay: vi.fn(),
      });

      await adapter.speak({ text: 'Engine switched' });

      expect(mockEngine.setGroupId).toHaveBeenCalledWith('minimax-group-id');
      expect(mockEngine.fetchAudio).toHaveBeenCalledWith(
        expect.any(Object),
        'minimax-speaker',
        'minimax-api-key',
      );
    });

    it('should keep creating new engines for non-Piper providers', async () => {
      const options: VoiceServiceOptions = {
        engineType: 'openai',
        speaker: 'alloy',
        apiKey: 'openai-api-key',
        onPlay: vi.fn(),
      };

      const openAiEngine1 = {
        ...mockEngine,
        fetchAudio: vi.fn().mockResolvedValue(new ArrayBuffer(1024)),
      };
      const openAiEngine2 = {
        ...mockEngine,
        fetchAudio: vi.fn().mockResolvedValue(new ArrayBuffer(1024)),
      };

      mockGetEngine
        .mockReturnValueOnce(openAiEngine1)
        .mockReturnValueOnce(openAiEngine2);

      const adapter = new VoiceEngineAdapter(options);
      await adapter.speak({ text: '1回目' });
      await adapter.speak({ text: '2回目' });

      expect(mockGetEngine).toHaveBeenCalledTimes(2);
      expect(openAiEngine1.fetchAudio).toHaveBeenCalledTimes(1);
      expect(openAiEngine2.fetchAudio).toHaveBeenCalledTimes(1);
    });
  });
});
