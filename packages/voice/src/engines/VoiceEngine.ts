import { Talk } from '../types/voice';

export interface DirectSpeechOptions {
  rate?: number;
  pitch?: number;
  volume?: number;
  lang?: string;
}

/**
 * Common interface for voice engines
 */
export interface VoiceEngine {
  /**
   * Get voice data
   * @param input script
   * @param speaker speaker ID
   * @param apiKey API key (if needed)
   * @returns ArrayBuffer of voice data
   */
  fetchAudio(
    input: Talk,
    speaker: string,
    apiKey?: string,
  ): Promise<ArrayBuffer>;

  /**
   * Get a test message
   * @returns test message
   */
  getTestMessage(textVoiceText?: string): string;

  /**
   * Set custom API endpoint URL
   * @param apiUrl custom API endpoint URL
   */
  setApiEndpoint?(apiUrl: string): void;
}

/**
 * Voice engine that sends speech directly to a runtime audio output.
 *
 * Some browser APIs, such as Web Speech API, do not expose synthesized audio
 * bytes. These engines still implement VoiceEngine for compatibility, but the
 * adapter must call speakDirectly() instead of fetchAudio().
 */
export interface SelfPlayingVoiceEngine extends VoiceEngine {
  readonly playsAudioDirectly: true;
  speakDirectly(
    input: Talk,
    speaker: string,
    options?: DirectSpeechOptions,
  ): Promise<void>;
  stopSpeaking(): void;
  isSpeaking?(): boolean;
}

export function isSelfPlayingVoiceEngine(
  engine: VoiceEngine,
): engine is SelfPlayingVoiceEngine {
  return (
    'playsAudioDirectly' in engine &&
    (engine as SelfPlayingVoiceEngine).playsAudioDirectly === true &&
    typeof (engine as SelfPlayingVoiceEngine).speakDirectly === 'function'
  );
}
