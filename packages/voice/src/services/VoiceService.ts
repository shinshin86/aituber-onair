import { ChatScreenplay } from '../types/chat';
import { VoiceEngineType } from '../types/voiceEngine';

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

  // Aivis Cloud specific options
  /** Aivis Cloud model UUID */
  aivisCloudModelUuid?: string;
  /** Aivis Cloud speaker UUID */
  aivisCloudSpeakerUuid?: string;
  /** Aivis Cloud style ID (0-31) */
  aivisCloudStyleId?: number;
  /** Aivis Cloud style name */
  aivisCloudStyleName?: string;
  /** Enable SSML interpretation (default: true) */
  aivisCloudUseSSML?: boolean;
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
