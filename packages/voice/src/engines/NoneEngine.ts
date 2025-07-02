import { VoiceActor, Talk } from '../types/voice';
import { VoiceEngine } from './VoiceEngine';

/**
 * None (no voice) engine
 * Implementation using Null Object pattern that performs no voice processing
 */
export class NoneEngine implements VoiceEngine {
  /**
   * Get voice data (performs no processing)
   * @param input script
   * @param speaker speaker ID
   * @param apiKey API key (not used)
   * @param voiceActor voice actor information (not used)
   * @returns empty ArrayBuffer
   */
  async fetchAudio(
    input: Talk,
    speaker: string,
    apiKey?: string,
    voiceActor?: VoiceActor,
  ): Promise<ArrayBuffer> {
    // Return empty ArrayBuffer since no voice is needed
    return new ArrayBuffer(0);
  }

  /**
   * Get test message
   * @param textVoiceText custom text
   * @returns test message
   */
  getTestMessage(textVoiceText?: string): string {
    return textVoiceText || 'No voice mode is active';
  }

  /**
   * Set custom API endpoint URL (performs no processing)
   * @param apiUrl custom API endpoint URL
   */
  setApiEndpoint?(apiUrl: string): void {
    // No processing needed in no voice mode
  }
}
