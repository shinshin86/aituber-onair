import type { MinimaxModel } from '@aituber-onair/voice';

export const ENGINE_DEFAULTS = {
  openai: {
    apiUrl: 'https://api.openai.com/v1/audio/speech',
    needsApiKey: true,
    acceptsApiKey: true,
    placeholder: 'sk-...',
    speaker: 'alloy',
  },
  openaiCompatible: {
    apiUrl: 'http://localhost:8880/v1/audio/speech',
    needsApiKey: false,
    acceptsApiKey: true,
    placeholder: 'Optional API key',
    speaker: '',
  },
  voicevox: {
    apiUrl: 'http://localhost:50021',
    needsApiKey: false,
    acceptsApiKey: false,
    placeholder: 'No API key needed',
    speaker: 1,
  },
  aivisSpeech: {
    apiUrl: 'http://localhost:10101',
    needsApiKey: false,
    acceptsApiKey: false,
    placeholder: 'No API key needed',
    speaker: '888753760',
  },
  aivisCloud: {
    apiUrl: 'https://api.aivis-project.com/v1/tts/synthesize',
    needsApiKey: true,
    acceptsApiKey: true,
    placeholder: 'Your Aivis Cloud API key',
    speaker: 'a59cb814-0083-4369-8542-f51a29e72af7',
  },
  voicepeak: {
    apiUrl: 'http://localhost:20202',
    needsApiKey: false,
    acceptsApiKey: false,
    placeholder: 'No API key needed',
    speaker: 'f1',
  },
  minimax: {
    apiUrl: 'https://api.minimax.io/v1/t2a_v2',
    needsApiKey: true,
    acceptsApiKey: true,
    placeholder: 'Your MiniMax API key',
    groupIdPlaceholder: 'Your Group ID',
    speaker: 'male-qn-qingse',
    defaultModel: 'speech-2.6-hd' as MinimaxModel,
  },
} as const;

export type EngineType = keyof typeof ENGINE_DEFAULTS;

export const MINIMAX_MODELS: Record<MinimaxModel, string> = {
  'speech-2.6-hd':
    'Latest flagship HD model with ultra-high fidelity and natural prosody.',
  'speech-2.6-turbo':
    'Latest Turbo model optimized for low latency and real-time responses.',
  'speech-2.5-hd-preview':
    'The brand new HD model. Ultimate Similarity, Ultra-High Quality',
  'speech-2.5-turbo-preview':
    'The brand new Turbo model. Ultimate Value, 40 Languages',
  'speech-02-hd':
    'Superior rhythm and stability, with outstanding performance in replication similarity and sound quality.',
  'speech-02-turbo':
    'Superior rhythm and stability, with enhanced multilingual capabilities and excellent performance.',
  'speech-01-hd': 'Rich Voices, Expressive Emotions, Authentic Languages',
  'speech-01-turbo': 'Excellent performance and low latency',
};

export const MINIMAX_VOICES: Record<string, string> = {
  'male-qn-qingse': 'Male - Qingse (Default)',
  Wise_Woman: 'Wise Woman',
  Friendly_Person: 'Friendly Person',
  Inspirational_girl: 'Inspirational Girl',
  Deep_Voice_Man: 'Deep Voice Man',
  Calm_Woman: 'Calm Woman',
  Casual_Guy: 'Casual Guy',
  Lively_Girl: 'Lively Girl',
  Patient_Man: 'Patient Man',
  Young_Knight: 'Young Knight',
  Determined_Man: 'Determined Man',
  Lovely_Girl: 'Lovely Girl',
  Decent_Boy: 'Decent Boy',
  Imposing_Manner: 'Imposing Manner',
  Elegant_Man: 'Elegant Man',
  Abbess: 'Abbess',
  Sweet_Girl_2: 'Sweet Girl 2',
  Exuberant_Girl: 'Exuberant Girl',
};

export const OPENAI_VOICES: Record<string, string> = {
  alloy: 'Alloy',
  ash: 'Ash',
  coral: 'Coral',
  echo: 'Echo',
  fable: 'Fable',
  onyx: 'Onyx',
  nova: 'Nova',
  sage: 'Sage',
  shimmer: 'Shimmer',
};

export interface SliderConfig {
  min: number;
  max: number;
  step: number;
  defaultValue: number;
  suffix?: string;
}

export const SLIDER_CONFIG: Record<string, SliderConfig> = {
  openaiSpeed: {
    min: 0.25,
    max: 1.75,
    step: 0.05,
    defaultValue: 1,
    suffix: 'x',
  },
  voicepeakSpeed: { min: 50, max: 150, step: 1, defaultValue: 100 },
  voicepeakPitch: { min: -300, max: 300, step: 1, defaultValue: 0 },
  voicevoxSpeedScale: {
    min: 0.5,
    max: 1.5,
    step: 0.05,
    defaultValue: 1,
    suffix: 'x',
  },
  voicevoxPitchScale: { min: -0.3, max: 0.3, step: 0.01, defaultValue: 0 },
  voicevoxIntonationScale: { min: 0.5, max: 1.5, step: 0.05, defaultValue: 1 },
  voicevoxVolumeScale: { min: 0.5, max: 1.5, step: 0.05, defaultValue: 1 },
  voicevoxPrePhonemeLength: {
    min: 0,
    max: 0.2,
    step: 0.005,
    defaultValue: 0.1,
    suffix: 's',
  },
  voicevoxPostPhonemeLength: {
    min: 0,
    max: 0.2,
    step: 0.005,
    defaultValue: 0.1,
    suffix: 's',
  },
  voicevoxPauseLength: {
    min: 0,
    max: 0.6,
    step: 0.05,
    defaultValue: 0.3,
    suffix: 's',
  },
  voicevoxPauseLengthScale: { min: 0.5, max: 1.5, step: 0.05, defaultValue: 1 },
  minimaxSpeed: {
    min: 0.1,
    max: 1.9,
    step: 0.05,
    defaultValue: 1,
    suffix: 'x',
  },
  minimaxVolume: {
    min: 0.1,
    max: 1.9,
    step: 0.05,
    defaultValue: 1,
    suffix: 'x',
  },
  minimaxPitch: { min: -12, max: 12, step: 1, defaultValue: 0 },
  aivisSpeedScale: {
    min: 0.5,
    max: 1.5,
    step: 0.05,
    defaultValue: 1,
    suffix: 'x',
  },
  aivisPitchScale: { min: -0.3, max: 0.3, step: 0.01, defaultValue: 0 },
  aivisIntonationScale: { min: 0.5, max: 1.5, step: 0.05, defaultValue: 1 },
  aivisTempoDynamicsScale: { min: 0.5, max: 1.5, step: 0.05, defaultValue: 1 },
  aivisVolumeScale: { min: 0.5, max: 1.5, step: 0.05, defaultValue: 1 },
  aivisPrePhonemeLength: {
    min: 0,
    max: 0.2,
    step: 0.005,
    defaultValue: 0.1,
    suffix: 's',
  },
  aivisPostPhonemeLength: {
    min: 0,
    max: 0.2,
    step: 0.005,
    defaultValue: 0.1,
    suffix: 's',
  },
  aivisPauseLength: {
    min: 0,
    max: 0.6,
    step: 0.05,
    defaultValue: 0.3,
    suffix: 's',
  },
  aivisPauseLengthScale: { min: 0.5, max: 1.5, step: 0.05, defaultValue: 1 },
  aivisCloudSpeakingRate: {
    min: 0.5,
    max: 1.5,
    step: 0.05,
    defaultValue: 1,
    suffix: 'x',
  },
  aivisCloudEmotionalIntensity: { min: 0, max: 2, step: 0.05, defaultValue: 1 },
  aivisCloudTempoDynamics: { min: 0, max: 2, step: 0.05, defaultValue: 1 },
  aivisCloudPitch: { min: -1, max: 1, step: 0.05, defaultValue: 0 },
  aivisCloudVolume: { min: 0, max: 2, step: 0.05, defaultValue: 1 },
  aivisCloudLeadingSilence: {
    min: 0,
    max: 0.6,
    step: 0.05,
    defaultValue: 0.3,
    suffix: 's',
  },
  aivisCloudTrailingSilence: {
    min: 0,
    max: 0.6,
    step: 0.05,
    defaultValue: 0.3,
    suffix: 's',
  },
  aivisCloudLineBreakSilence: {
    min: 0,
    max: 0.6,
    step: 0.05,
    defaultValue: 0.3,
    suffix: 's',
  },
};

export type DefaultBooleanOption = 'default' | 'true' | 'false';
export type OutputStereoOption = 'default' | 'mono' | 'stereo';
export type LocalOutputSamplingRateOption =
  | 'default'
  | '8000'
  | '11025'
  | '16000'
  | '22050'
  | '24000'
  | '44100'
  | '48000';
export type AivisCloudBooleanOption = DefaultBooleanOption;
export type AivisCloudOutputFormatOption =
  | 'default'
  | 'wav'
  | 'flac'
  | 'mp3'
  | 'aac'
  | 'opus';
export type AivisCloudOutputSamplingRateOption =
  | 'default'
  | '8000'
  | '11025'
  | '12000'
  | '16000'
  | '22050'
  | '24000'
  | '44100'
  | '48000';
export type AivisCloudOutputChannelOption = 'default' | 'mono' | 'stereo';
export type VoicePeakEmotionOption =
  | 'neutral'
  | 'happy'
  | 'fun'
  | 'angry'
  | 'sad'
  | 'surprised';
