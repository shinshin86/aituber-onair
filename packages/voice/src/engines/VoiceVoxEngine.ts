import { VOICE_VOX_API_URL } from '../constants/voiceEngine';
import { Talk } from '../types/voice';
import { VoiceEngine } from './VoiceEngine';

/**
 * VoiceVox voice synthesis engine
 */
export class VoiceVoxEngine implements VoiceEngine {
  private apiEndpoint: string = VOICE_VOX_API_URL;

  async fetchAudio(input: Talk, speaker: string): Promise<ArrayBuffer> {
    const talk = input as Talk;
    // get emotion from talk.style
    const emotion = talk.style || 'neutral';

    const ttsQueryResponse = await fetch(
      `${this.apiEndpoint}/audio_query?speaker=${speaker}&text=${encodeURIComponent(talk.message)}`,
      { method: 'POST' },
    );

    if (!ttsQueryResponse.ok) {
      throw new Error('Failed to fetch TTS query.');
    }

    const ttsQueryJson = await ttsQueryResponse.json();
    // adjust parameters according to emotion
    this.adjustEmotionParameters(ttsQueryJson, emotion);

    const synthesisResponse = await fetch(
      `${this.apiEndpoint}/synthesis?speaker=${speaker}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Transfer-Encoding': 'chunked',
        },
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
   * Adjust parameters according to emotion
   */
  private adjustEmotionParameters(ttsQueryJson: any, emotion: string): void {
    // default values
    ttsQueryJson.speedScale = 1.16;
    ttsQueryJson.pitchScale = -0.02;
    ttsQueryJson.intonationScale = 1.26;

    switch (emotion.toLowerCase()) {
      case 'happy':
        ttsQueryJson.speedScale = 1.25;
        ttsQueryJson.pitchScale = 0.05;
        ttsQueryJson.intonationScale = 1.4;
        break;
      case 'sad':
        ttsQueryJson.speedScale = 1.0;
        ttsQueryJson.pitchScale = -0.1;
        ttsQueryJson.intonationScale = 1.0;
        break;
      case 'angry':
        ttsQueryJson.speedScale = 1.2;
        ttsQueryJson.pitchScale = -0.05;
        ttsQueryJson.intonationScale = 1.5;
        break;
      case 'surprised':
        ttsQueryJson.speedScale = 1.3;
        ttsQueryJson.pitchScale = 0.1;
        ttsQueryJson.intonationScale = 1.4;
        break;
      // default: "neutral" etc. other than default values
    }
  }

  getTestMessage(textVoiceText?: string): string {
    return textVoiceText || 'ボイスボックスを使用します';
  }

  /**
   * Set custom API endpoint URL
   * @param apiUrl custom API endpoint URL
   */
  setApiEndpoint(apiUrl: string): void {
    this.apiEndpoint = apiUrl;
  }
}
