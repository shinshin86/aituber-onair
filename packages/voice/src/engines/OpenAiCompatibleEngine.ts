import { OPENAI_COMPATIBLE_TTS_API_URL } from '../constants/voiceEngine';
import { Talk } from '../types/voice';
import { VoiceEngine } from './VoiceEngine';

/**
 * OpenAI-compatible TTS engine for self-hosted endpoints such as Kokoro FastAPI
 */
export class OpenAiCompatibleEngine implements VoiceEngine {
  private apiUrl: string = OPENAI_COMPATIBLE_TTS_API_URL;
  private speed: number = 1.0;
  private model: string = 'kokoro';

  /**
   * Set custom OpenAI-compatible speech endpoint
   */
  setApiEndpoint(apiUrl: string): void {
    const trimmed = apiUrl.trim();
    this.apiUrl = trimmed.length > 0 ? trimmed : OPENAI_COMPATIBLE_TTS_API_URL;
  }

  /**
   * Set speaking speed (0.25 - 4.0)
   */
  setSpeed(speed: number): void {
    const clamped = Math.max(0.25, Math.min(4.0, speed));
    this.speed = Number.isFinite(clamped) ? clamped : 1.0;
  }

  /**
   * Set model name used by the compatible endpoint
   */
  setModel(model: string): void {
    const trimmed = model.trim();
    this.model = trimmed.length > 0 ? trimmed : 'kokoro';
  }

  async fetchAudio(
    input: Talk,
    speaker: string,
    apiKey?: string,
  ): Promise<ArrayBuffer> {
    if (!speaker) {
      throw new Error('OpenAI-compatible TTS voice name is required');
    }

    const text = input.message.trim();
    if (!text) {
      throw new Error('Input text is empty');
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (apiKey) {
      headers.Authorization = `Bearer ${apiKey}`;
    }

    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers,
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
        'Failed to fetch TTS from OpenAI-compatible TTS:',
        response.status,
        errorText,
      );
      throw new Error('Failed to fetch TTS from OpenAI-compatible TTS.');
    }

    const blob = await response.blob();
    return await blob.arrayBuffer();
  }

  getTestMessage(textVoiceText?: string): string {
    return textVoiceText || 'OpenAI互換TTSを使用します';
  }
}
