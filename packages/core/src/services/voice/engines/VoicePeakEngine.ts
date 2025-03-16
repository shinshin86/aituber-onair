import { VOICEPEAK_API_URL } from '../../../constants';
import { Talk } from '../messages';
import { VoiceEngine } from './VoiceEngine';

/**
 * VoicePeak voice synthesis engine
 */
export class VoicePeakEngine implements VoiceEngine {
  async fetchAudio(input: Talk, speaker: string): Promise<ArrayBuffer> {
    const talk = input as Talk;

    const ttsQueryResponse = await fetch(
      `${VOICEPEAK_API_URL}/audio_query?speaker=${speaker}&text=${encodeURIComponent(talk.message)}`,
      { method: 'POST' },
    );

    if (!ttsQueryResponse.ok) {
      throw new Error('Failed to fetch TTS query.');
    }

    const ttsQueryJson = await ttsQueryResponse.json();

    // set emotion from talk.style
    ttsQueryJson['emotion'] = this.mapEmotionStyle(talk.style || 'neutral');

    const synthesisResponse = await fetch(
      `${VOICEPEAK_API_URL}/synthesis?speaker=${speaker}`,
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
      default:
        return 'neutral';
    }
  }

  getTestMessage(textVoiceText?: string): string {
    return textVoiceText || 'ボイスピークを使用します';
  }
}
