import { ChatScreenplay, VoiceEngineType } from '../../types';

/**
 * Voice service settings options
 */
export interface VoiceServiceOptions {
  /** Speaker ID */
  speaker: string;
  /** Engine type (voicevox, voicepeak, openai, nijivoice, aivisSpeech) */
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
