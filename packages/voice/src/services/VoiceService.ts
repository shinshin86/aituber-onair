import type { AivisSpeechQueryParameterOverrides } from '../engines/AivisSpeechEngine';
import type { VoiceVoxQueryParameterOverrides } from '../engines/VoiceVoxEngine';
export type { VoiceVoxQueryParameterOverrides };
export type { AivisSpeechQueryParameterOverrides };
import { ChatScreenplay } from '../types/chat';
import { VoiceEngineType } from '../types/voiceEngine';

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
 * Voice service settings options
 */
export interface VoiceServiceOptions {
  /** Speaker ID */
  speaker: string;
  /** Engine type (voicevox, voicepeak, openai, nijivoice, aivisSpeech, aivisCloud, minimax, none) */
  engineType: VoiceEngineType;
  /** API key (if needed) */
  apiKey?: string;
  /** Audio playback callback */
  onPlay?: (
    audioBuffer: ArrayBuffer,
    options?: AudioPlayOptions,
  ) => Promise<void>;
  /** Audio playback complete callback */
  onComplete?: () => void;
  /** Custom VOICEVOX API endpoint URL */
  voicevoxApiUrl?: string;
  /** Custom VOICEPEAK API endpoint URL */
  voicepeakApiUrl?: string;
  /** Custom AIVIS SPEECH API endpoint URL */
  aivisSpeechApiUrl?: string;
  /** MiniMax Group ID (required for MiniMax engine) */
  groupId?: string;
  /** MiniMax endpoint ('global' or 'china') */
  endpoint?: string;
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

  // Aivis Cloud specific options
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
   * Stop playback
   */
  stop(): void;

  /**
   * Update service settings
   * @param options New settings options
   */
  updateOptions(options: Partial<VoiceServiceOptions>): void;
}
