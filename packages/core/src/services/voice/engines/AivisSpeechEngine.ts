import { AIVIS_SPEECH_API_URL } from '../../../constants';
import { Talk } from '../../../types';
import { VoiceEngine } from './VoiceEngine';

/**
 * AivisSpeech voice synthesis engine
 */
export class AivisSpeechEngine implements VoiceEngine {
  private apiEndpoint: string = AIVIS_SPEECH_API_URL;

  async fetchAudio(input: Talk, speaker: string): Promise<ArrayBuffer> {
    const talk = input as Talk;
    // talk.styleから感情を取得
    const emotion = talk.style || 'neutral';
    const text = talk.message.trim();

    const ttsQueryResponse = await fetch(
      `${this.apiEndpoint}/audio_query?speaker=${speaker}&text=${encodeURIComponent(text)}`,
      { method: 'POST' },
    );

    if (!ttsQueryResponse.ok) {
      throw new Error('Failed to fetch TTS query from AivisSpeech Engine.');
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
      throw new Error(
        'Failed to fetch TTS synthesis result from AivisSpeech Engine.',
      );
    }

    const blob = await synthesisResponse.blob();
    return await blob.arrayBuffer();
  }

  private adjustEmotionParameters(ttsQueryJson: any, emotion: string): void {
    // default values
    ttsQueryJson.speedScale = 1.0;
    ttsQueryJson.pitchScale = 0.0;
    ttsQueryJson.intonationScale = 1.0;
    ttsQueryJson.tempoDynamicsScale = 1.0;

    switch (emotion.toLowerCase()) {
      case 'happy':
        ttsQueryJson.speedScale = 1.1;
        ttsQueryJson.pitchScale = 0.05;
        ttsQueryJson.intonationScale = 1.2;
        ttsQueryJson.tempoDynamicsScale = 1.1;
        break;
      case 'sad':
        ttsQueryJson.speedScale = 0.9;
        ttsQueryJson.pitchScale = -0.03;
        ttsQueryJson.intonationScale = 0.8;
        ttsQueryJson.tempoDynamicsScale = 0.9;
        break;
      case 'angry':
        ttsQueryJson.speedScale = 1.0;
        ttsQueryJson.pitchScale = 0.0;
        ttsQueryJson.intonationScale = 1.4;
        ttsQueryJson.tempoDynamicsScale = 1.2;
        break;
      case 'surprised':
        ttsQueryJson.speedScale = 1.2;
        ttsQueryJson.pitchScale = 0.07;
        ttsQueryJson.intonationScale = 1.3;
        ttsQueryJson.tempoDynamicsScale = 1.0;
        break;
      // default: "neutral" etc. other than default values
    }
  }

  getTestMessage(textVoiceText?: string): string {
    return textVoiceText || 'アイビススピーチを使用します';
  }

  /**
   * Set custom API endpoint URL
   * @param apiUrl custom API endpoint URL
   */
  setApiEndpoint(apiUrl: string): void {
    this.apiEndpoint = apiUrl;
  }
}
