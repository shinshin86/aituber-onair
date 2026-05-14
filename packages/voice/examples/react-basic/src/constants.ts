import type {
  ElevenLabsApplyTextNormalization,
  GeminiTtsModel,
  InworldAudioEncoding,
  InworldDeliveryMode,
  MinimaxModel,
  UnrealSpeechCodec,
  XaiBitRate,
  XaiCodec,
  XaiSampleRate,
} from '@aituber-onair/voice';

export const ENGINE_DEFAULTS = {
  openai: {
    apiUrl: 'https://api.openai.com/v1/audio/speech',
    needsApiKey: true,
    acceptsApiKey: true,
    placeholder: 'sk-...',
    speaker: 'alloy',
  },
  xai: {
    apiUrl: 'https://api.x.ai/v1/tts',
    needsApiKey: true,
    acceptsApiKey: true,
    placeholder: 'xai-...',
    speaker: 'eve',
    defaultLanguage: 'auto',
    defaultCodec: 'mp3' as XaiCodec,
    defaultSampleRate: 24000 as XaiSampleRate,
    defaultBitRate: 128000 as XaiBitRate,
  },
  unrealSpeech: {
    apiUrl: 'https://api.v8.unrealspeech.com/stream',
    needsApiKey: true,
    acceptsApiKey: true,
    placeholder: 'Your Unreal Speech API key',
    speaker: 'af_bella',
    defaultBitrate: '192k',
    defaultCodec: 'libmp3lame' as UnrealSpeechCodec,
  },
  elevenLabs: {
    apiUrl: 'https://api.elevenlabs.io/v1/text-to-speech',
    voicesApiUrl: 'https://api.elevenlabs.io/v2/voices',
    needsApiKey: true,
    acceptsApiKey: true,
    placeholder: 'Your ElevenLabs API key',
    speaker: '',
    defaultModel: 'eleven_multilingual_v2',
    defaultOutputFormat: 'mp3_44100_128',
  },
  inworld: {
    apiUrl: 'https://api.inworld.ai/tts/v1/voice',
    voicesApiUrl: 'https://api.inworld.ai/voices/v1/voices',
    needsApiKey: true,
    acceptsApiKey: true,
    placeholder: 'Your Inworld Basic Base64 credentials',
    speaker: 'Ashley',
    defaultModel: 'inworld-tts-2',
    defaultAudioEncoding: 'MP3' as InworldAudioEncoding,
    defaultSampleRateHertz: 48000,
    defaultLanguage: 'ja-JP',
  },
  geminiTts: {
    apiUrl: 'https://generativelanguage.googleapis.com/v1beta',
    needsApiKey: true,
    acceptsApiKey: true,
    placeholder: 'Your Google API key',
    speaker: 'Zephyr',
    defaultModel: 'gemini-3.1-flash-tts-preview' as GeminiTtsModel,
    defaultLanguageCode: 'ja-JP',
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
    speaker: '',
  },
  aivisSpeech: {
    apiUrl: 'http://localhost:10101',
    needsApiKey: false,
    acceptsApiKey: false,
    placeholder: 'No API key needed',
    speaker: '',
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
    speaker: '',
    defaultModel: 'speech-2.6-hd' as MinimaxModel,
  },
  piperPlus: {
    apiUrl: '',
    needsApiKey: false,
    acceptsApiKey: false,
    placeholder: '',
    speaker: 'default',
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

export const GEMINI_TTS_MODELS: Record<string, string> = {
  'gemini-3.1-flash-tts-preview':
    '3.1 Flash TTS Preview — Expressive speech with audio-tag control',
  'gemini-2.5-flash-preview-tts': 'Flash Preview TTS — Optimized for latency',
  'gemini-2.5-pro-preview-tts': 'Pro Preview TTS — Highest quality control',
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

export const XAI_VOICES: Record<string, string> = {
  ara: 'Ara',
  eve: 'Eve',
  leo: 'Leo',
  rex: 'Rex',
  sal: 'Sal',
};

export const XAI_VOICE_OPTIONS = Object.entries(XAI_VOICES).map(
  ([id, label]) => ({
    id,
    label,
  }),
);

export const UNREAL_SPEECH_CODECS: Record<UnrealSpeechCodec, string> = {
  libmp3lame: 'MP3 (libmp3lame)',
  pcm_mulaw: 'PCM mu-law',
  pcm_s16le: 'PCM signed 16-bit',
};

export const ELEVENLABS_MODELS: Record<string, string> = {
  eleven_multilingual_v2: 'Multilingual v2 — high quality',
  eleven_flash_v2_5: 'Flash v2.5 — low latency',
  eleven_turbo_v2_5: 'Turbo v2.5 — balanced latency and quality',
};

export const ELEVENLABS_OUTPUT_FORMATS: Record<string, string> = {
  mp3_44100_128: 'MP3 44.1kHz 128kbps',
  mp3_22050_32: 'MP3 22.05kHz 32kbps',
  mp3_44100_192: 'MP3 44.1kHz 192kbps',
  pcm_16000: 'PCM 16kHz',
  pcm_22050: 'PCM 22.05kHz',
  pcm_24000: 'PCM 24kHz',
  pcm_44100: 'PCM 44.1kHz',
  ulaw_8000: 'u-law 8kHz',
};

export const INWORLD_MODELS: Record<string, string> = {
  'inworld-tts-2': 'TTS-2 — highest quality for expressive speech',
  'inworld-tts-1.5-mini': 'TTS 1.5 Mini — cost-efficient',
  'inworld-tts-1.5-max': 'TTS 1.5 Max — high quality',
};

export const INWORLD_AUDIO_ENCODINGS: Record<InworldAudioEncoding, string> = {
  MP3: 'MP3',
  OGG_OPUS: 'OGG Opus',
  FLAC: 'FLAC',
  LINEAR16: 'Linear 16-bit PCM',
  WAV: 'WAV',
  PCM: 'PCM',
  ALAW: 'A-law',
  MULAW: 'Mu-law',
};

export const INWORLD_DELIVERY_MODES: Record<InworldDeliveryMode, string> = {
  STABLE: 'Stable',
  BALANCED: 'Balanced',
  CREATIVE: 'Creative',
};

export const INWORLD_VOICE_LANGUAGE_OPTIONS = {
  all: 'All languages (Japanese first)',
  'ja-JP': 'Japanese (ja-JP)',
  en: 'English (en)',
  'es-ES': 'Spanish (es-ES)',
  'fr-FR': 'French (fr-FR)',
  'de-DE': 'German (de-DE)',
  'ko-KR': 'Korean (ko-KR)',
  'zh-CN': 'Chinese (zh-CN)',
  'pt-BR': 'Portuguese (pt-BR)',
  'it-IT': 'Italian (it-IT)',
} as const;

export const VOICEPEAK_WEIGHT_KEYS = [
  'happy',
  'fun',
  'angry',
  'sad',
  'surprised',
] as const;

export const GEMINI_TTS_VOICES: Record<string, string> = {
  Zephyr: 'Zephyr — Bright',
  Puck: 'Puck — Upbeat',
  Charon: 'Charon — Informative',
  Kore: 'Kore — Firm',
  Fenrir: 'Fenrir — Excitable',
  Leda: 'Leda — Youthful',
  Orus: 'Orus — Firm',
  Aoede: 'Aoede — Breezy',
  Callirrhoe: 'Callirrhoe — Easy-going',
  Autonoe: 'Autonoe — Bright',
  Enceladus: 'Enceladus — Breathy',
  Iapetus: 'Iapetus — Clear',
  Umbriel: 'Umbriel — Easy-going',
  Algieba: 'Algieba — Smooth',
  Despina: 'Despina — Smooth',
  Erinome: 'Erinome — Clear',
  Algenib: 'Algenib — Gravelly',
  Rasalgethi: 'Rasalgethi — Informative',
  Laomedeia: 'Laomedeia — Upbeat',
  Achernar: 'Achernar — Soft',
  Alnilam: 'Alnilam — Firm',
  Schedar: 'Schedar — Even',
  Gacrux: 'Gacrux — Mature',
  Pulcherrima: 'Pulcherrima — Forward',
  Achird: 'Achird — Friendly',
  Zubenelgenubi: 'Zubenelgenubi — Casual',
  Vindemiatrix: 'Vindemiatrix — Gentle',
  Sadachbia: 'Sadachbia — Lively',
  Sadaltager: 'Sadaltager — Knowledgeable',
  Sulafat: 'Sulafat — Warm',
};

export interface SpeakerOption {
  id: string;
  label: string;
}

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
  voicepeakEmotionWeight: { min: 0, max: 100, step: 1, defaultValue: 0 },
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
  unrealSpeechSpeed: {
    min: -1,
    max: 1,
    step: 0.05,
    defaultValue: 0,
  },
  unrealSpeechPitch: {
    min: 0.5,
    max: 1.5,
    step: 0.05,
    defaultValue: 1,
  },
  unrealSpeechTemperature: {
    min: 0.1,
    max: 0.8,
    step: 0.05,
    defaultValue: 0.25,
  },
  elevenLabsStability: { min: 0, max: 1, step: 0.05, defaultValue: 0.5 },
  elevenLabsSimilarityBoost: {
    min: 0,
    max: 1,
    step: 0.05,
    defaultValue: 0.75,
  },
  elevenLabsStyle: { min: 0, max: 1, step: 0.05, defaultValue: 0 },
  elevenLabsSpeed: {
    min: 0.7,
    max: 1.2,
    step: 0.05,
    defaultValue: 1,
    suffix: 'x',
  },
  inworldSpeakingRate: {
    min: 0.5,
    max: 1.5,
    step: 0.05,
    defaultValue: 1,
    suffix: 'x',
  },
  inworldTemperature: {
    min: 0.1,
    max: 2,
    step: 0.05,
    defaultValue: 1,
  },
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
  piperPlusSpeed: {
    min: 0.5,
    max: 2.0,
    step: 0.05,
    defaultValue: 1,
    suffix: 'x',
  },
  piperPlusNoiseScale: {
    min: 0,
    max: 2.0,
    step: 0.05,
    defaultValue: 1,
  },
};

export type DefaultBooleanOption = 'default' | 'true' | 'false';
export type InworldDeliveryModeOption = 'default' | InworldDeliveryMode;
export type InworldVoiceLanguageOption =
  keyof typeof INWORLD_VOICE_LANGUAGE_OPTIONS;
export type ElevenLabsApplyTextNormalizationOption =
  | 'default'
  | ElevenLabsApplyTextNormalization;
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
export type VoicepeakEmotionMode = 'single' | 'weighted';
export type VoicePeakEmotionOption =
  | 'neutral'
  | 'happy'
  | 'fun'
  | 'angry'
  | 'sad'
  | 'surprised';
