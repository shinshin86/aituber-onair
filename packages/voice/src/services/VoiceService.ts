import type { AivisSpeechQueryParameterOverrides } from '../engines/AivisSpeechEngine';
import type {
  ElevenLabsApplyTextNormalization,
  ElevenLabsVoiceSettingsOptions,
} from '../engines/ElevenLabsEngine';
import type { GeminiTtsModel } from '../engines';
import type { GradiumOutputFormat } from '../engines/GradiumEngine';
import type {
  InworldAudioEncoding,
  InworldDeliveryMode,
} from '../engines/InworldEngine';
import type { UnrealSpeechCodec } from '../engines/UnrealSpeechEngine';
import type { XaiBitRate, XaiCodec, XaiSampleRate } from '../engines/XaiEngine';
import type { VoiceVoxQueryParameterOverrides } from '../engines/VoiceVoxEngine';
export type { VoiceVoxQueryParameterOverrides };
export type { AivisSpeechQueryParameterOverrides };
import { ChatScreenplay } from '../types/chat';
import type { VoicepeakEmotionInput } from '../types/voice';

/**
 * MiniMax audio format types
 */
export type MinimaxAudioFormat = 'mp3' | 'wav' | 'aac' | 'pcm' | 'flac' | 'ogg';

/**
 * MiniMax voice setting overrides
 */
export interface MinimaxVoiceSettingsOptions {
  /** Speaking speed multiplier (default: 1.0) */
  speed?: number;
  /** Output volume multiplier (default: 1.0) */
  vol?: number;
  /** Pitch adjustment in semitones (default: 0) */
  pitch?: number;
}

/**
 * MiniMax audio setting overrides
 */
export interface MinimaxAudioSettingsOptions {
  /** Sampling rate in Hz (default: 32000) */
  sampleRate?: number;
  /** Bitrate in bps (default: 128000) */
  bitrate?: number;
  /** Output format (default: mp3) */
  format?: MinimaxAudioFormat;
  /** Number of audio channels (default: 1) */
  channel?: 1 | 2;
}

/**
 * Voice service common settings options
 */
interface VoiceServiceBaseOptions {
  /** API key (if needed) */
  apiKey?: string;
  /** Audio playback callback */
  onPlay?: (
    audioBuffer: ArrayBuffer,
    options?: AudioPlayOptions,
  ) => Promise<void>;
  /** Audio playback complete callback */
  onComplete?: () => void;
}

interface VoiceServiceCommonOptions extends VoiceServiceBaseOptions {
  /** Speaker ID */
  speaker: string;
}

export interface VoiceVoxVoiceServiceOptions extends VoiceServiceCommonOptions {
  /** Engine type */
  engineType: 'voicevox';
  /** Custom VOICEVOX API endpoint URL */
  voicevoxApiUrl?: string;
  /** VOICEVOX audio query parameter overrides */
  voicevoxQueryParameters?: VoiceVoxQueryParameterOverrides;
  /** VOICEVOX speedScale override */
  voicevoxSpeedScale?: number;
  /** VOICEVOX pitchScale override */
  voicevoxPitchScale?: number;
  /** VOICEVOX intonationScale override */
  voicevoxIntonationScale?: number;
  /** VOICEVOX volumeScale override */
  voicevoxVolumeScale?: number;
  /** VOICEVOX prePhonemeLength override */
  voicevoxPrePhonemeLength?: number;
  /** VOICEVOX postPhonemeLength override */
  voicevoxPostPhonemeLength?: number;
  /** VOICEVOX pauseLength override */
  voicevoxPauseLength?: number | null;
  /** VOICEVOX pauseLengthScale override */
  voicevoxPauseLengthScale?: number;
  /** VOICEVOX outputSamplingRate override */
  voicevoxOutputSamplingRate?: number;
  /** VOICEVOX outputStereo override */
  voicevoxOutputStereo?: boolean;
  /** VOICEVOX enable_katakana_english flag */
  voicevoxEnableKatakanaEnglish?: boolean;
  /** VOICEVOX enable_interrogative_upspeak flag */
  voicevoxEnableInterrogativeUpspeak?: boolean;
  /** VOICEVOX core_version specification */
  voicevoxCoreVersion?: string;
}

export interface VoicePeakVoiceServiceOptions
  extends VoiceServiceCommonOptions {
  /** Engine type */
  engineType: 'voicepeak';
  /** Custom VOICEPEAK API endpoint URL */
  voicepeakApiUrl?: string;
  /**
   * VoicePeak emotion override.
   * Accepts a single legacy tag or a weighted map (vpeakserver v0.2.0+).
   */
  voicepeakEmotion?: VoicepeakEmotionInput;
  /** VoicePeak speaking speed (50-200, integer) */
  voicepeakSpeed?: number;
  /** VoicePeak pitch (-300 to 300, integer) */
  voicepeakPitch?: number;
}

export interface OpenAiVoiceServiceOptions extends VoiceServiceCommonOptions {
  /** Engine type */
  engineType: 'openai';
  /** OpenAI TTS model (tts-1, tts-1-hd, gpt-4o-mini-tts) */
  openAiModel?: string;
  /** OpenAI TTS speaking speed (0.25-4.0, default: 1.0) */
  openAiSpeed?: number;
}

export interface XaiVoiceServiceOptions extends VoiceServiceCommonOptions {
  /** Engine type */
  engineType: 'xai';
  /** xAI TTS language (BCP-47 or auto, default: auto) */
  xaiLanguage?: string;
  /** xAI output codec (default: mp3) */
  xaiCodec?: XaiCodec;
  /** xAI output sample rate (default: 24000) */
  xaiSampleRate?: XaiSampleRate;
  /** xAI MP3 bit rate (default: 128000) */
  xaiBitRate?: XaiBitRate;
}

export interface UnrealSpeechVoiceServiceOptions
  extends VoiceServiceCommonOptions {
  /** Engine type */
  engineType: 'unrealSpeech';
  /** Custom Unreal Speech /stream endpoint URL */
  unrealSpeechApiUrl?: string;
  /** Unreal Speech output bitrate (default: 192k) */
  unrealSpeechBitrate?: string;
  /** Unreal Speech speaking speed (-1.0-1.0, default: 0) */
  unrealSpeechSpeed?: number;
  /** Unreal Speech pitch (0.5-1.5, default: 1.0) */
  unrealSpeechPitch?: number;
  /** Unreal Speech output codec */
  unrealSpeechCodec?: UnrealSpeechCodec;
  /** Unreal Speech generation temperature (0.1-0.8) */
  unrealSpeechTemperature?: number;
}

export interface ElevenLabsVoiceServiceOptions
  extends VoiceServiceCommonOptions {
  /** Engine type */
  engineType: 'elevenLabs';
  /** Custom ElevenLabs text-to-speech API base endpoint URL */
  elevenLabsApiUrl?: string;
  /** ElevenLabs model ID */
  elevenLabsModel?: string;
  /** ElevenLabs output format query parameter */
  elevenLabsOutputFormat?: string;
  /** ElevenLabs optional language code */
  elevenLabsLanguageCode?: string;
  /** ElevenLabs voice settings override */
  elevenLabsVoiceSettings?: ElevenLabsVoiceSettingsOptions;
  /** ElevenLabs stability override (0.0-1.0) */
  elevenLabsStability?: number;
  /** ElevenLabs similarity boost override (0.0-1.0) */
  elevenLabsSimilarityBoost?: number;
  /** ElevenLabs style exaggeration override (0.0-1.0) */
  elevenLabsStyle?: number;
  /** ElevenLabs speaker boost flag */
  elevenLabsUseSpeakerBoost?: boolean;
  /** ElevenLabs voice speed override (0.7-1.2) */
  elevenLabsSpeed?: number;
  /** ElevenLabs deterministic generation seed */
  elevenLabsSeed?: number;
  /** Previous text context */
  elevenLabsPreviousText?: string;
  /** Next text context */
  elevenLabsNextText?: string;
  /** Text normalization mode */
  elevenLabsApplyTextNormalization?: ElevenLabsApplyTextNormalization;
  /** Language text normalization flag */
  elevenLabsApplyLanguageTextNormalization?: boolean;
  /** Enable ElevenLabs request logging */
  elevenLabsEnableLogging?: boolean;
}

export interface InworldVoiceServiceOptions extends VoiceServiceCommonOptions {
  /** Engine type */
  engineType: 'inworld';
  /** Custom Inworld TTS endpoint URL */
  inworldApiUrl?: string;
  /** Inworld TTS model ID */
  inworldModel?: string;
  /** Inworld output audio encoding (default: MP3) */
  inworldAudioEncoding?: InworldAudioEncoding;
  /** Inworld output sample rate in hertz (default: 48000) */
  inworldSampleRateHertz?: number;
  /** Inworld output bitrate in bps */
  inworldBitRate?: number;
  /** Inworld speaking rate */
  inworldSpeakingRate?: number;
  /** Optional BCP-47 language tag */
  inworldLanguage?: string;
  /** Inworld TTS-2 delivery mode */
  inworldDeliveryMode?: InworldDeliveryMode;
  /** Inworld generation temperature for non TTS-2 models */
  inworldTemperature?: number;
}

export interface GradiumVoiceServiceOptions extends VoiceServiceCommonOptions {
  /** Engine type */
  engineType: 'gradium';
  /** Custom Gradium one-shot TTS endpoint URL */
  gradiumApiUrl?: string;
  /** Gradium output audio format (default: wav) */
  gradiumOutputFormat?: GradiumOutputFormat;
  /** Gradium sampling temperature (0.0-1.4, default: 0.7) */
  gradiumTemperature?: number;
  /** Gradium voice similarity / cfg_coef (1.0-4.0, default: 2.0) */
  gradiumVoiceSimilarity?: number;
  /** Gradium padding bonus / speed control (-4.0-4.0, default: 0.0) */
  gradiumPaddingBonus?: number;
  /** Gradium text rewrite rules, such as en or TimeEn,Date */
  gradiumRewriteRules?: string;
}

export interface GeminiTtsVoiceServiceOptions
  extends VoiceServiceCommonOptions {
  /** Engine type */
  engineType: 'geminiTts';
  /** Custom Gemini API endpoint URL */
  geminiTtsApiUrl?: string;
  /** Gemini TTS model name */
  geminiTtsModel?: GeminiTtsModel;
  /** Gemini TTS language code (default: ja-JP) */
  geminiTtsLanguageCode?: string;
  /** Gemini TTS optional prompt */
  geminiTtsPrompt?: string;
}

export interface OpenAiCompatibleVoiceServiceOptions
  extends VoiceServiceBaseOptions {
  /** Engine type */
  engineType: 'openaiCompatible';
  /** Optional voice name for compatible endpoints that support it */
  speaker?: string;
  /** OpenAI-compatible speech endpoint URL */
  openAiCompatibleApiUrl?: string;
  /** OpenAI-compatible model name expected by the endpoint */
  openAiCompatibleModel?: string;
  /** OpenAI-compatible speaking speed (0.25-4.0, default: 1.0) */
  openAiCompatibleSpeed?: number;
}

export interface AivisSpeechVoiceServiceOptions
  extends VoiceServiceCommonOptions {
  /** Engine type */
  engineType: 'aivisSpeech';
  /** Custom AIVIS SPEECH API endpoint URL */
  aivisSpeechApiUrl?: string;
  /** AivisSpeech audio query parameter overrides */
  aivisSpeechQueryParameters?: AivisSpeechQueryParameterOverrides;
  /** AivisSpeech speedScale override */
  aivisSpeechSpeedScale?: number;
  /** AivisSpeech pitchScale override */
  aivisSpeechPitchScale?: number;
  /** AivisSpeech intonationScale override */
  aivisSpeechIntonationScale?: number;
  /** AivisSpeech tempoDynamicsScale override */
  aivisSpeechTempoDynamicsScale?: number;
  /** AivisSpeech volumeScale override */
  aivisSpeechVolumeScale?: number;
  /** AivisSpeech prePhonemeLength override */
  aivisSpeechPrePhonemeLength?: number;
  /** AivisSpeech postPhonemeLength override */
  aivisSpeechPostPhonemeLength?: number;
  /** AivisSpeech pauseLength override */
  aivisSpeechPauseLength?: number | null;
  /** AivisSpeech pauseLengthScale override */
  aivisSpeechPauseLengthScale?: number;
  /** AivisSpeech outputSamplingRate override */
  aivisSpeechOutputSamplingRate?: number;
  /** AivisSpeech outputStereo override */
  aivisSpeechOutputStereo?: boolean;
}

export interface MinimaxVoiceServiceOptions extends VoiceServiceCommonOptions {
  /** Engine type */
  engineType: 'minimax';
  /** MiniMax Group ID (required for MiniMax engine) */
  groupId?: string;
  /** MiniMax endpoint ('global' or 'china') */
  endpoint?: 'global' | 'china';
  /** MiniMax model to use */
  minimaxModel?: string;
  /** MiniMax voice settings override */
  minimaxVoiceSettings?: MinimaxVoiceSettingsOptions;
  /** MiniMax audio settings override */
  minimaxAudioSettings?: MinimaxAudioSettingsOptions;
  /** MiniMax speed override (voice_setting.speed) */
  minimaxSpeed?: number;
  /** MiniMax volume override (voice_setting.vol) */
  minimaxVolume?: number;
  /** MiniMax pitch override (voice_setting.pitch) */
  minimaxPitch?: number;
  /** MiniMax audio sample rate override (audio_setting.sample_rate) */
  minimaxSampleRate?: number;
  /** MiniMax audio bitrate override (audio_setting.bitrate) */
  minimaxBitrate?: number;
  /** MiniMax audio format override (audio_setting.format) */
  minimaxAudioFormat?: MinimaxAudioFormat;
  /** MiniMax audio channel override (audio_setting.channel) */
  minimaxAudioChannel?: 1 | 2;
  /** MiniMax language boost override */
  minimaxLanguageBoost?: string;
}

export interface PiperPlusVoiceServiceOptions
  extends VoiceServiceCommonOptions {
  /** Engine type */
  engineType: 'piperPlus';
  /** PiperPlus asset base path */
  piperPlusBasePath?: string;
  /** PiperPlus model config filename */
  piperPlusModelConfigFile?: string;
  /** PiperPlus model filename */
  piperPlusModelFile?: string;
  /** PiperPlus HTS voice filename */
  piperPlusVoiceFile?: string;
  /** PiperPlus speaking speed */
  piperPlusSpeed?: number;
  /** PiperPlus noise scale */
  piperPlusNoiseScale?: number;
}

export interface AivisCloudVoiceServiceOptions
  extends VoiceServiceCommonOptions {
  /** Engine type */
  engineType: 'aivisCloud';
  /** Aivis Cloud model UUID */
  aivisCloudModelUuid?: string;
  /** Aivis Cloud speaker UUID */
  aivisCloudSpeakerUuid?: string;
  /** Aivis Cloud style ID (0-31) */
  aivisCloudStyleId?: number;
  /** Aivis Cloud style name */
  aivisCloudStyleName?: string;
  /** Aivis Cloud user dictionary UUID */
  aivisCloudUserDictionaryUuid?: string;
  /** Enable SSML interpretation (default: true) */
  aivisCloudUseSSML?: boolean;
  /** Synthesis language (BCP 47, default: ja) */
  aivisCloudLanguage?: string;
  /** Speaking rate (0.5-2.0, default: 1.0) */
  aivisCloudSpeakingRate?: number;
  /** Emotional intensity (0.0-2.0, default: 1.0) */
  aivisCloudEmotionalIntensity?: number;
  /** Tempo dynamics (0.0-2.0, default: 1.0) */
  aivisCloudTempoDynamics?: number;
  /** Pitch (-1.0-1.0, default: 0.0) */
  aivisCloudPitch?: number;
  /** Volume (0.0-2.0, default: 1.0) */
  aivisCloudVolume?: number;
  /** Leading silence in seconds (default: 0.1) */
  aivisCloudLeadingSilence?: number;
  /** Trailing silence in seconds (default: 0.1) */
  aivisCloudTrailingSilence?: number;
  /** Line break silence in seconds (default: 0.4) */
  aivisCloudLineBreakSilence?: number;
  /** Output format (wav, flac, mp3, aac, opus) */
  aivisCloudOutputFormat?: 'wav' | 'flac' | 'mp3' | 'aac' | 'opus';
  /** Output bitrate in kbps (8-320) */
  aivisCloudOutputBitrate?: number;
  /** Output sampling rate in Hz */
  aivisCloudOutputSamplingRate?:
    | 8000
    | 11025
    | 12000
    | 16000
    | 22050
    | 24000
    | 44100
    | 48000;
  /** Output audio channels (mono or stereo) */
  aivisCloudOutputChannels?: 'mono' | 'stereo';
  /** Enable billing/usage information logs (default: false) */
  aivisCloudEnableBillingLogs?: boolean;
}

export interface NoneVoiceServiceOptions extends VoiceServiceCommonOptions {
  /** Engine type */
  engineType: 'none';
}

/**
 * Voice service settings options
 */
export type VoiceServiceOptions =
  | VoiceVoxVoiceServiceOptions
  | VoicePeakVoiceServiceOptions
  | OpenAiVoiceServiceOptions
  | XaiVoiceServiceOptions
  | UnrealSpeechVoiceServiceOptions
  | ElevenLabsVoiceServiceOptions
  | InworldVoiceServiceOptions
  | GradiumVoiceServiceOptions
  | GeminiTtsVoiceServiceOptions
  | OpenAiCompatibleVoiceServiceOptions
  | AivisSpeechVoiceServiceOptions
  | AivisCloudVoiceServiceOptions
  | MinimaxVoiceServiceOptions
  | PiperPlusVoiceServiceOptions
  | NoneVoiceServiceOptions;

/**
 * Voice service update options
 */
export type VoiceVoxVoiceServiceOptionsUpdate = Partial<
  Omit<VoiceVoxVoiceServiceOptions, 'engineType'>
>;
export type VoicePeakVoiceServiceOptionsUpdate = Partial<
  Omit<VoicePeakVoiceServiceOptions, 'engineType'>
>;
export type OpenAiVoiceServiceOptionsUpdate = Partial<
  Omit<OpenAiVoiceServiceOptions, 'engineType'>
>;
export type XaiVoiceServiceOptionsUpdate = Partial<
  Omit<XaiVoiceServiceOptions, 'engineType'>
>;
export type UnrealSpeechVoiceServiceOptionsUpdate = Partial<
  Omit<UnrealSpeechVoiceServiceOptions, 'engineType'>
>;
export type ElevenLabsVoiceServiceOptionsUpdate = Partial<
  Omit<ElevenLabsVoiceServiceOptions, 'engineType'>
>;
export type InworldVoiceServiceOptionsUpdate = Partial<
  Omit<InworldVoiceServiceOptions, 'engineType'>
>;
export type GradiumVoiceServiceOptionsUpdate = Partial<
  Omit<GradiumVoiceServiceOptions, 'engineType'>
>;
export type GeminiTtsVoiceServiceOptionsUpdate = Partial<
  Omit<GeminiTtsVoiceServiceOptions, 'engineType'>
>;
export type OpenAiCompatibleVoiceServiceOptionsUpdate = Partial<
  Omit<OpenAiCompatibleVoiceServiceOptions, 'engineType'>
>;
export type AivisSpeechVoiceServiceOptionsUpdate = Partial<
  Omit<AivisSpeechVoiceServiceOptions, 'engineType'>
>;
export type AivisCloudVoiceServiceOptionsUpdate = Partial<
  Omit<AivisCloudVoiceServiceOptions, 'engineType'>
>;
export type MinimaxVoiceServiceOptionsUpdate = Partial<
  Omit<MinimaxVoiceServiceOptions, 'engineType'>
>;
export type PiperPlusVoiceServiceOptionsUpdate = Partial<
  Omit<PiperPlusVoiceServiceOptions, 'engineType'>
>;
export type NoneVoiceServiceOptionsUpdate = Partial<
  Omit<NoneVoiceServiceOptions, 'engineType'>
>;

export type VoiceServiceOptionsUpdate =
  | VoiceVoxVoiceServiceOptionsUpdate
  | VoicePeakVoiceServiceOptionsUpdate
  | OpenAiVoiceServiceOptionsUpdate
  | XaiVoiceServiceOptionsUpdate
  | UnrealSpeechVoiceServiceOptionsUpdate
  | ElevenLabsVoiceServiceOptionsUpdate
  | InworldVoiceServiceOptionsUpdate
  | GradiumVoiceServiceOptionsUpdate
  | GeminiTtsVoiceServiceOptionsUpdate
  | OpenAiCompatibleVoiceServiceOptionsUpdate
  | AivisSpeechVoiceServiceOptionsUpdate
  | AivisCloudVoiceServiceOptionsUpdate
  | MinimaxVoiceServiceOptionsUpdate
  | PiperPlusVoiceServiceOptionsUpdate
  | NoneVoiceServiceOptionsUpdate;

/**
 * Audio playback options
 */
export interface AudioPlayOptions {
  /** ID of HTML element to play audio */
  audioElementId?: string;
  /** Enable animation processing */
  enableAnimation?: boolean;
}

/**
 * Voice service interface
 */
export interface VoiceService {
  /**
   * Speak screenplay as audio
   * @param screenplay Screenplay (text and emotion)
   * @param options Audio playback options (default settings if omitted)
   */
  speak(screenplay: ChatScreenplay, options?: AudioPlayOptions): Promise<void>;

  /**
   * Speak text as audio
   * @param text Text (with emotion tags) to speak
   * @param options Audio playback options (default settings if omitted)
   */
  speakText(text: string, options?: AudioPlayOptions): Promise<void>;

  /**
   * Get whether currently playing
   */
  isPlaying(): boolean;

  /**
   * Get current service settings
   */
  getOptions(): VoiceServiceOptions;

  /**
   * Stop playback
   */
  stop(): void;

  /**
   * Update service settings
   * @param options New settings options
   */
  updateOptions(
    options: VoiceServiceOptionsUpdate | Partial<VoiceServiceOptions>,
  ): void;

  /**
   * Switch voice engine with complete options for the target engine
   * @param options New engine options
   */
  switchEngine?(options: VoiceServiceOptions): void;
}
