import { OPENAI_COMPATIBLE_TTS_API_URL } from '../constants/voiceEngine';
import type { Talk } from '../types/voice';
import { VoiceEngine } from './VoiceEngine';
import { clampNumberWithFallback, fetchWithTimeout } from './internal/utils';

/**
 * OpenAI-compatible TTS engine for self-hosted endpoints such as Kokoro FastAPI
 */
export class OpenAiCompatibleEngine implements VoiceEngine {
  private apiUrl: string = OPENAI_COMPATIBLE_TTS_API_URL;
  private speed: number = 1.0;
  private model: string = '';

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

    // Local/self-hosted endpoints (e.g. Qwen3-TTS on a shared GPU) can exceed
    // the default 30s on their first inference (CUDA kernel JIT). Keep the
    // request until the backend's own 600s backend cap.
    const response = await fetchWithTimeout(
      this.apiUrl,
      {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
      },
      120_000,
    );

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      console.error(
        'Failed to fetch TTS from OpenAI-compatible TTS:',
        response.status,
        errorText,
      );
      const detail = errorText
        ? errorText.replace(/\s+/g, ' ').slice(0, 200)
        : response.statusText || 'unknown error';
      throw new Error(
        `Failed to fetch TTS from OpenAI-compatible TTS (HTTP ${response.status}): ${detail}`,
      );
    }

    const blob = await response.blob();
    return await blob.arrayBuffer();
  }

  getTestMessage(textVoiceText?: string): string {
    return textVoiceText || 'OpenAI互換TTSを使用します';
  }
}
