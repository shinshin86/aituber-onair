import { afterEach, describe, expect, it, vi } from 'vitest';
import { aivisCloudEngineHandler } from '../src/services/internal/engineHandlers/aivisCloud';
import { aivisSpeechEngineHandler } from '../src/services/internal/engineHandlers/aivisSpeech';
import { geminiTtsEngineHandler } from '../src/services/internal/engineHandlers/geminiTts';
import { gradiumEngineHandler } from '../src/services/internal/engineHandlers/gradium';
import { inworldEngineHandler } from '../src/services/internal/engineHandlers/inworld';
import { minimaxEngineHandler } from '../src/services/internal/engineHandlers/minimax';
import { noneEngineHandler } from '../src/services/internal/engineHandlers/none';
import { openAiEngineHandler } from '../src/services/internal/engineHandlers/openai';
import { openAiCompatibleEngineHandler } from '../src/services/internal/engineHandlers/openaiCompatible';
import { voicePeakEngineHandler } from '../src/services/internal/engineHandlers/voicepeak';
import { voiceVoxEngineHandler } from '../src/services/internal/engineHandlers/voicevox';
import { xaiEngineHandler } from '../src/services/internal/engineHandlers/xai';

type HandlerCase = {
  name: string;
  handler: any;
  options: Record<string, unknown>;
  allowedUpdateKeys: string[];
  expectedCalls: Record<string, unknown[]>;
};

const cases: HandlerCase[] = [
  {
    name: 'voicevox',
    handler: voiceVoxEngineHandler,
    options: {
      engineType: 'voicevox',
      speaker: '1',
      voicevoxApiUrl: 'http://localhost:50021',
      voicevoxQueryParameters: { speedScale: 1.1 },
      voicevoxSpeedScale: 1.2,
      voicevoxPitchScale: -0.1,
      voicevoxIntonationScale: 1.3,
      voicevoxVolumeScale: 0.9,
      voicevoxPrePhonemeLength: 0.2,
      voicevoxPostPhonemeLength: 0.3,
      voicevoxPauseLength: null,
      voicevoxPauseLengthScale: 1.1,
      voicevoxOutputSamplingRate: 48000,
      voicevoxOutputStereo: true,
      voicevoxEnableKatakanaEnglish: false,
      voicevoxEnableInterrogativeUpspeak: false,
      voicevoxCoreVersion: '0.15.0',
    },
    allowedUpdateKeys: [
      'voicevoxApiUrl',
      'voicevoxQueryParameters',
      'voicevoxSpeedScale',
      'voicevoxPitchScale',
      'voicevoxIntonationScale',
      'voicevoxVolumeScale',
      'voicevoxPrePhonemeLength',
      'voicevoxPostPhonemeLength',
      'voicevoxPauseLength',
      'voicevoxPauseLengthScale',
      'voicevoxOutputSamplingRate',
      'voicevoxOutputStereo',
      'voicevoxEnableKatakanaEnglish',
      'voicevoxEnableInterrogativeUpspeak',
      'voicevoxCoreVersion',
    ],
    expectedCalls: {
      setApiEndpoint: ['http://localhost:50021'],
      setQueryParameters: [{ speedScale: 1.1 }],
      setSpeedScale: [1.2],
      setPitchScale: [-0.1],
      setIntonationScale: [1.3],
      setVolumeScale: [0.9],
      setPrePhonemeLength: [0.2],
      setPostPhonemeLength: [0.3],
      setPauseLength: [null],
      setPauseLengthScale: [1.1],
      setOutputSamplingRate: [48000],
      setOutputStereo: [true],
      setEnableKatakanaEnglish: [false],
      setEnableInterrogativeUpspeak: [false],
      setCoreVersion: ['0.15.0'],
    },
  },
  {
    name: 'voicepeak',
    handler: voicePeakEngineHandler,
    options: {
      engineType: 'voicepeak',
      speaker: 'f1',
      voicepeakApiUrl: 'http://localhost:20202',
      voicepeakEmotion: 'happy',
      voicepeakSpeed: 120,
      voicepeakPitch: 80,
    },
    allowedUpdateKeys: [
      'voicepeakApiUrl',
      'voicepeakEmotion',
      'voicepeakSpeed',
      'voicepeakPitch',
    ],
    expectedCalls: {
      setApiEndpoint: ['http://localhost:20202'],
      setEmotion: ['happy'],
      setSpeed: [120],
      setPitch: [80],
    },
  },
  {
    name: 'aivisSpeech',
    handler: aivisSpeechEngineHandler,
    options: {
      engineType: 'aivisSpeech',
      speaker: '100',
      aivisSpeechApiUrl: 'http://localhost:10101',
      aivisSpeechQueryParameters: { tempoDynamicsScale: 1.1 },
      aivisSpeechSpeedScale: 1.2,
      aivisSpeechPitchScale: -0.1,
      aivisSpeechIntonationScale: 1.3,
      aivisSpeechTempoDynamicsScale: 1.4,
      aivisSpeechVolumeScale: 0.9,
      aivisSpeechPrePhonemeLength: 0.2,
      aivisSpeechPostPhonemeLength: 0.3,
      aivisSpeechPauseLength: null,
      aivisSpeechPauseLengthScale: 1.1,
      aivisSpeechOutputSamplingRate: 48000,
      aivisSpeechOutputStereo: true,
    },
    allowedUpdateKeys: [
      'aivisSpeechApiUrl',
      'aivisSpeechQueryParameters',
      'aivisSpeechSpeedScale',
      'aivisSpeechPitchScale',
      'aivisSpeechIntonationScale',
      'aivisSpeechTempoDynamicsScale',
      'aivisSpeechVolumeScale',
      'aivisSpeechPrePhonemeLength',
      'aivisSpeechPostPhonemeLength',
      'aivisSpeechPauseLength',
      'aivisSpeechPauseLengthScale',
      'aivisSpeechOutputSamplingRate',
      'aivisSpeechOutputStereo',
    ],
    expectedCalls: {
      setApiEndpoint: ['http://localhost:10101'],
      setQueryParameters: [{ tempoDynamicsScale: 1.1 }],
      setSpeedScale: [1.2],
      setPitchScale: [-0.1],
      setIntonationScale: [1.3],
      setTempoDynamicsScale: [1.4],
      setVolumeScale: [0.9],
      setPrePhonemeLength: [0.2],
      setPostPhonemeLength: [0.3],
      setPauseLength: [null],
      setPauseLengthScale: [1.1],
      setOutputSamplingRate: [48000],
      setOutputStereo: [true],
    },
  },
  {
    name: 'openai',
    handler: openAiEngineHandler,
    options: {
      engineType: 'openai',
      speaker: 'alloy',
      openAiModel: 'gpt-4o-mini-tts',
      openAiSpeed: 1.25,
    },
    allowedUpdateKeys: ['openAiModel', 'openAiSpeed'],
    expectedCalls: {
      setModel: ['gpt-4o-mini-tts'],
      setSpeed: [1.25],
    },
  },
  {
    name: 'xai',
    handler: xaiEngineHandler,
    options: {
      engineType: 'xai',
      speaker: 'alloy',
      xaiLanguage: 'ja',
      xaiCodec: 'pcm',
      xaiSampleRate: 24000,
      xaiBitRate: 128000,
    },
    allowedUpdateKeys: [
      'xaiLanguage',
      'xaiCodec',
      'xaiSampleRate',
      'xaiBitRate',
    ],
    expectedCalls: {
      setLanguage: ['ja'],
      setCodec: ['pcm'],
      setSampleRate: [24000],
      setBitRate: [128000],
    },
  },
  {
    name: 'inworld',
    handler: inworldEngineHandler,
    options: {
      engineType: 'inworld',
      speaker: 'voice',
      inworldApiUrl: 'https://api.example.com',
      inworldModel: 'inworld-tts-1',
      inworldAudioEncoding: 'LINEAR16',
      inworldSampleRateHertz: 24000,
      inworldBitRate: 128000,
      inworldSpeakingRate: 1.1,
      inworldLanguage: 'ja-JP',
      inworldDeliveryMode: 'streaming',
      inworldTemperature: 0.7,
    },
    allowedUpdateKeys: [
      'inworldApiUrl',
      'inworldModel',
      'inworldAudioEncoding',
      'inworldSampleRateHertz',
      'inworldBitRate',
      'inworldSpeakingRate',
      'inworldLanguage',
      'inworldDeliveryMode',
      'inworldTemperature',
    ],
    expectedCalls: {
      setApiEndpoint: ['https://api.example.com'],
      setModel: ['inworld-tts-1'],
      setAudioEncoding: ['LINEAR16'],
      setSampleRateHertz: [24000],
      setBitRate: [128000],
      setSpeakingRate: [1.1],
      setLanguage: ['ja-JP'],
      setDeliveryMode: ['streaming'],
      setTemperature: [0.7],
    },
  },
  {
    name: 'gradium',
    handler: gradiumEngineHandler,
    options: {
      engineType: 'gradium',
      speaker: 'voice',
      gradiumApiUrl: 'https://api.example.com',
      gradiumOutputFormat: 'mp3',
      gradiumTemperature: 0.5,
      gradiumVoiceSimilarity: 0.7,
      gradiumPaddingBonus: 0.2,
      gradiumRewriteRules: 'rule',
    },
    allowedUpdateKeys: [
      'gradiumApiUrl',
      'gradiumOutputFormat',
      'gradiumTemperature',
      'gradiumVoiceSimilarity',
      'gradiumPaddingBonus',
      'gradiumRewriteRules',
    ],
    expectedCalls: {
      setApiEndpoint: ['https://api.example.com'],
      setOutputFormat: ['mp3'],
      setTemperature: [0.5],
      setVoiceSimilarity: [0.7],
      setPaddingBonus: [0.2],
      setRewriteRules: ['rule'],
    },
  },
  {
    name: 'geminiTts',
    handler: geminiTtsEngineHandler,
    options: {
      engineType: 'geminiTts',
      speaker: 'Kore',
      geminiTtsApiUrl: 'https://generativelanguage.googleapis.com',
      geminiTtsModel: 'gemini-2.5-flash-preview-tts',
      geminiTtsLanguageCode: 'ja-JP',
      geminiTtsPrompt: 'Speak warmly',
    },
    allowedUpdateKeys: [
      'geminiTtsApiUrl',
      'geminiTtsModel',
      'geminiTtsLanguageCode',
      'geminiTtsPrompt',
    ],
    expectedCalls: {
      setApiEndpoint: ['https://generativelanguage.googleapis.com'],
      setModel: ['gemini-2.5-flash-preview-tts'],
      setLanguageCode: ['ja-JP'],
      setPrompt: ['Speak warmly'],
    },
  },
  {
    name: 'openaiCompatible',
    handler: openAiCompatibleEngineHandler,
    options: {
      engineType: 'openaiCompatible',
      speaker: 'voice',
      openAiCompatibleApiUrl: 'http://localhost:8000/v1/audio/speech',
      openAiCompatibleModel: 'local-tts',
      openAiCompatibleSpeed: 1.1,
    },
    allowedUpdateKeys: [
      'openAiCompatibleApiUrl',
      'openAiCompatibleModel',
      'openAiCompatibleSpeed',
    ],
    expectedCalls: {
      setApiEndpoint: ['http://localhost:8000/v1/audio/speech'],
      setModel: ['local-tts'],
      setSpeed: [1.1],
    },
  },
  {
    name: 'minimax',
    handler: minimaxEngineHandler,
    options: {
      engineType: 'minimax',
      speaker: 'voice',
      groupId: 'group',
      endpoint: 'global',
      minimaxModel: 'speech-02-hd',
      minimaxLanguageBoost: 'Japanese',
      minimaxVoiceSettings: {
        timber_weights: [{ voice_id: 'voice', weight: 1 }],
      },
      minimaxSpeed: 1.2,
      minimaxVolume: 1.5,
      minimaxPitch: 0,
      minimaxAudioSettings: { sample_rate: 32000 },
      minimaxSampleRate: 32000,
      minimaxBitrate: 128000,
      minimaxAudioFormat: 'mp3',
      minimaxAudioChannel: 1,
    },
    allowedUpdateKeys: [
      'groupId',
      'endpoint',
      'minimaxModel',
      'minimaxVoiceSettings',
      'minimaxAudioSettings',
      'minimaxSpeed',
      'minimaxVolume',
      'minimaxPitch',
      'minimaxSampleRate',
      'minimaxBitrate',
      'minimaxAudioFormat',
      'minimaxAudioChannel',
      'minimaxLanguageBoost',
    ],
    expectedCalls: {
      setGroupId: ['group'],
      setEndpoint: ['global'],
      setModel: ['speech-02-hd'],
      setLanguage: ['Japanese'],
      setVoiceSettings: [
        { timber_weights: [{ voice_id: 'voice', weight: 1 }] },
      ],
      setSpeed: [1.2],
      setVolume: [1.5],
      setPitch: [0],
      setAudioSettings: [{ sample_rate: 32000 }],
      setSampleRate: [32000],
      setBitrate: [128000],
      setAudioFormat: ['mp3'],
      setAudioChannel: [1],
    },
  },
  {
    name: 'aivisCloud',
    handler: aivisCloudEngineHandler,
    options: {
      engineType: 'aivisCloud',
      speaker: 'speaker',
      aivisCloudModelUuid: 'model',
      aivisCloudSpeakerUuid: 'speaker-uuid',
      aivisCloudStyleId: 1,
      aivisCloudUserDictionaryUuid: 'dictionary',
      aivisCloudUseSSML: true,
      aivisCloudLanguage: 'ja-JP',
      aivisCloudSpeakingRate: 1.1,
      aivisCloudEmotionalIntensity: 1.2,
      aivisCloudTempoDynamics: 1.3,
      aivisCloudPitch: 0.1,
      aivisCloudVolume: 0.9,
      aivisCloudLeadingSilence: 0.2,
      aivisCloudTrailingSilence: 0.3,
      aivisCloudLineBreakSilence: 0.4,
      aivisCloudOutputFormat: 'mp3',
      aivisCloudOutputBitrate: 128000,
      aivisCloudOutputSamplingRate: 44100,
      aivisCloudOutputChannels: 'stereo',
      aivisCloudEnableBillingLogs: false,
    },
    allowedUpdateKeys: [
      'aivisCloudModelUuid',
      'aivisCloudSpeakerUuid',
      'aivisCloudStyleId',
      'aivisCloudStyleName',
      'aivisCloudUserDictionaryUuid',
      'aivisCloudUseSSML',
      'aivisCloudLanguage',
      'aivisCloudSpeakingRate',
      'aivisCloudEmotionalIntensity',
      'aivisCloudTempoDynamics',
      'aivisCloudPitch',
      'aivisCloudVolume',
      'aivisCloudLeadingSilence',
      'aivisCloudTrailingSilence',
      'aivisCloudLineBreakSilence',
      'aivisCloudOutputFormat',
      'aivisCloudOutputBitrate',
      'aivisCloudOutputSamplingRate',
      'aivisCloudOutputChannels',
      'aivisCloudEnableBillingLogs',
    ],
    expectedCalls: {
      setModelUuid: ['model'],
      setSpeakerUuid: ['speaker-uuid'],
      setStyleId: [1],
      setUserDictionaryUuid: ['dictionary'],
      setUseSSML: [true],
      setLanguage: ['ja-JP'],
      setSpeakingRate: [1.1],
      setEmotionalIntensity: [1.2],
      setTempoDynamics: [1.3],
      setPitch: [0.1],
      setVolume: [0.9],
      setSilenceDurations: [0.2, 0.3, 0.4],
      setOutputFormat: ['mp3'],
      setOutputBitrate: [128000],
      setOutputSamplingRate: [44100],
      setOutputChannels: ['stereo'],
      setEnableBillingLogs: [false],
    },
  },
  {
    name: 'none',
    handler: noneEngineHandler,
    options: {
      engineType: 'none',
      speaker: '',
    },
    allowedUpdateKeys: [],
    expectedCalls: {},
  },
];

function createMockEngine() {
  const setterNames = new Set(
    cases.flatMap((testCase) => Object.keys(testCase.expectedCalls)),
  );
  return Object.fromEntries(
    ['fetchAudio', 'getTestMessage', ...setterNames, 'setStyleName'].map(
      (name) => [name, vi.fn()],
    ),
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('engine handlers', () => {
  it.each(cases)('should expose allowed update keys for $name', (testCase) => {
    expect(testCase.handler.allowedUpdateKeys).toEqual(
      testCase.allowedUpdateKeys,
    );
  });

  it.each(cases)('should apply configured options for $name', (testCase) => {
    const engine = createMockEngine();

    testCase.handler.applyOptions(engine, testCase.options);

    for (const [setterName, args] of Object.entries(testCase.expectedCalls)) {
      expect(engine[setterName]).toHaveBeenCalledWith(...args);
    }
  });

  it.each(cases)(
    'should not call setters for omitted options in $name',
    (testCase) => {
      const engine = createMockEngine();
      vi.spyOn(console, 'warn').mockImplementation(() => {});

      testCase.handler.applyOptions(engine, {
        engineType: testCase.options.engineType,
        speaker: testCase.options.speaker,
      });

      for (const setterName of Object.keys(testCase.expectedCalls)) {
        expect(engine[setterName]).not.toHaveBeenCalled();
      }
    },
  );

  it.each(cases)('should merge update values for $name', (testCase) => {
    const current = {
      engineType: testCase.options.engineType,
      speaker: testCase.options.speaker,
      existing: true,
    };
    const update = {
      updated: true,
    };

    expect(testCase.handler.mergeOptions(current, update)).toEqual({
      ...current,
      ...update,
    });
  });

  it('should use Aivis Cloud style name when style id is omitted', () => {
    const engine = createMockEngine();

    aivisCloudEngineHandler.applyOptions(engine as any, {
      engineType: 'aivisCloud',
      speaker: 'speaker',
      aivisCloudStyleName: 'normal',
    });

    expect(engine.setStyleName).toHaveBeenCalledWith('normal');
  });
});
