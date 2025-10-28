import { OPENAI_TTS_API_URL } from '../constants/voiceEngine';
import { Talk } from '../types/voice';
import { VoiceEngine } from './VoiceEngine';

/**
 * OpenAI TTS voice synthesis engine
 */
export class OpenAiEngine implements VoiceEngine {
  private speed: number = 1.0;
  private model: string = 'tts-1';

  /**
   * Set speaking speed (0.25 - 4.0)
   */
  setSpeed(speed: number): void {
    const clamped = Math.max(0.25, Math.min(4.0, speed));
    this.speed = Number.isFinite(clamped) ? clamped : 1.0;
  }

  /**
   * Set TTS model (tts-1, tts-1-hd, gpt-4o-mini-tts)
   */
  setModel(model: string): void {
    const trimmed = model.trim();
    this.model = trimmed.length > 0 ? trimmed : 'tts-1';
  }

  async fetchAudio(
    input: Talk,
    speaker: string,
    apiKey?: string,
  ): Promise<ArrayBuffer> {
    if (!apiKey) {
      throw new Error('OpenAI API key is required');
    }

    if (!speaker) {
      throw new Error('OpenAI TTS voice name is required');
    }

    const talk = input as Talk;
    const text = talk.message.trim();

    if (!text) {
      throw new Error('Input text is empty');
    }

    const response = await fetch(OPENAI_TTS_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        voice: speaker,
        input: text,
        speed: this.speed,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      console.error(
        'Failed to fetch TTS from OpenAI TTS:',
        response.status,
        errorText,
      );
      throw new Error('Failed to fetch TTS from OpenAI TTS.');
    }

    const blob = await response.blob();
    return await blob.arrayBuffer();
  }

  getTestMessage(textVoiceText?: string): string {
    return textVoiceText || 'OpenAI TTSを使用します';
  }
}
