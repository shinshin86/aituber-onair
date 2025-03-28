import { VoiceActor, Talk } from '../../../types';

/**
 * Common interface for voice engines
 */
export interface VoiceEngine {
  /**
   * Get voice data
   * @param input script
   * @param speaker speaker ID
   * @param apiKey API key (if needed)
   * @param voiceActor voice actor information (for NijiVoice)
   * @returns ArrayBuffer of voice data
   */
  fetchAudio(
    input: Talk,
    speaker: string,
    apiKey?: string,
    voiceActor?: VoiceActor,
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
