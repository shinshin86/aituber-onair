import { OPENAI_COMPATIBLE_TTS_API_URL } from '../constants/voiceEngine';
import { Talk } from '../types/voice';
import { clampNumberWithFallback, fetchWithTimeout } from './internal/utils';
import { VoiceEngine } from './VoiceEngine';

/**
 * OpenAI-compatible TTS engine for self-hosted endpoints such as Kokoro FastAPI
 */
export class OpenAiCompatibleEngine implements VoiceEngine {
  private apiUrl: string = OPENAI_COMPATIBLE_TTS_API_URL;
  private speed: number = 1.0;
  private model: string = '';
  private timeoutMs = 30_000;

  /** Set a request timeout (0 disables the timeout) in milliseconds (default: 30000). */
  setTimeout(timeoutMs: number): void {
    if (
      !Number.isFinite(timeoutMs) ||
      timeoutMs < 0 ||
      timeoutMs > 2_147_483_647
    ) {
      throw new RangeError(
        'OpenAI-compatible timeout must be between 0 and 2147483647 milliseconds',
      );
    }
    this.timeoutMs = timeoutMs;
  }

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
    this.speed = clampNumberWithFallback(speed, 0.25, 4.0, 1.0);
  }

  /**
   * Set model name used by the compatible endpoint
   */
  setModel(model: string): void {
    this.model = model.trim();
  }

  async fetchAudio(
    input: Talk,
    speaker: string,
    apiKey?: string,
  ): Promise<ArrayBuffer> {
    const text = input.message.trim();
    if (!text) {
      throw new Error('Input text is empty');
    }

    if (!this.model) {
      throw new Error('OpenAI-compatible TTS model is required');
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (apiKey) {
      headers.Authorization = `Bearer ${apiKey}`;
    }

    const trimmedSpeaker = speaker.trim();
    const requestBody: Record<string, string | number> = {
      model: this.model,
      input: text,
      speed: this.speed,
    };

    if (trimmedSpeaker) {
      requestBody.voice = trimmedSpeaker;
    }

    const fetchAudio = this.timeoutMs === 0 ? fetch : fetchWithTimeout;
    const response = await fetchAudio(
      this.apiUrl,
      {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
      },
      this.timeoutMs,
    );

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
