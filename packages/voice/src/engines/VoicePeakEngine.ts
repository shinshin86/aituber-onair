import { VOICEPEAK_API_URL } from '../constants/voiceEngine';
import { Talk } from '../types/voice';
import { VoiceEngine } from './VoiceEngine';

/**
 * VoicePeak voice synthesis engine
 */
export class VoicePeakEngine implements VoiceEngine {
  private apiEndpoint: string = VOICEPEAK_API_URL;

  async fetchAudio(input: Talk, speaker: string): Promise<ArrayBuffer> {
    const talk = input as Talk;

    const ttsQueryResponse = await fetch(
      `${this.apiEndpoint}/audio_query?speaker=${speaker}&text=${encodeURIComponent(talk.message)}`,
      { method: 'POST' },
    );

    if (!ttsQueryResponse.ok) {
      throw new Error('Failed to fetch TTS query.');
    }

    const ttsQueryJson = await ttsQueryResponse.json();

    // set emotion from talk.style
    ttsQueryJson['emotion'] = this.mapEmotionStyle(talk.style || 'neutral');

    const synthesisResponse = await fetch(
      `${this.apiEndpoint}/synthesis?speaker=${speaker}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ttsQueryJson),
      },
    );

    if (!synthesisResponse.ok) {
      throw new Error('Failed to fetch TTS synthesis result.');
    }

    const blob = await synthesisResponse.blob();
    return await blob.arrayBuffer();
  }

  /**
   * Map emotion style to VoicePeak's emotion parameters
   */
  private mapEmotionStyle(style: string): string {
    switch (style.toLowerCase()) {
      case 'happy':
      case 'fun':
        return 'happy';
      case 'angry':
        return 'angry';
      case 'sad':
        return 'sad';
      case 'surprised':
        return 'surprised';
      default:
        return 'neutral';
    }
  }

  getTestMessage(textVoiceText?: string): string {
    return textVoiceText || 'ボイスピークを使用します';
  }

  /**
   * Set custom API endpoint URL
   * @param apiUrl custom API endpoint URL
   */
  setApiEndpoint(apiUrl: string): void {
    this.apiEndpoint = apiUrl;
  }
}
