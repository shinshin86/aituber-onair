import { GEMINI_TTS_API_URL } from '../constants/voiceEngine';
import type { Talk } from '../types/voice';
import { createPcm16Wav } from '../utils/wavHeader';
import { fetchWithTimeout } from './internal/utils';
import type { VoiceEngine } from './VoiceEngine';

export type GeminiTtsModel =
  | 'gemini-3.1-flash-tts-preview'
  | 'gemini-2.5-flash-preview-tts'
  | 'gemini-2.5-pro-preview-tts'
  | (string & {});

const DEFAULT_GEMINI_TTS_MODEL: GeminiTtsModel = 'gemini-3.1-flash-tts-preview';
const DEFAULT_LANGUAGE_CODE = 'ja-JP';

interface GeminiGenerateContentResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        inlineData?: {
          data?: string;
        };
      }>;
    };
  }>;
}

/**
 * Gemini TTS voice synthesis engine.
 * Uses the Gemini API with API key authentication.
 */
export class GeminiTtsEngine implements VoiceEngine {
  private baseUrl: string = GEMINI_TTS_API_URL;
  private model: GeminiTtsModel = DEFAULT_GEMINI_TTS_MODEL;
  private languageCode: string = DEFAULT_LANGUAGE_CODE;
  private prompt?: string;

  /**
   * Set custom Gemini TTS API endpoint
   */
  setApiEndpoint(apiUrl: string): void {
    const trimmed = apiUrl.trim();
    this.baseUrl =
      trimmed.length > 0 ? trimmed.replace(/\/+$/, '') : GEMINI_TTS_API_URL;
  }

  /**
   * Set Gemini TTS model
   */
  setModel(model: GeminiTtsModel): void {
    const trimmed = model.trim();
    this.model = (
      trimmed.length > 0 ? trimmed : DEFAULT_GEMINI_TTS_MODEL
    ) as GeminiTtsModel;
  }

  /**
   * Set synthesis language code
   */
  setLanguageCode(languageCode: string): void {
    const trimmed = languageCode.trim();
    this.languageCode = trimmed.length > 0 ? trimmed : DEFAULT_LANGUAGE_CODE;
  }

  /**
   * Set optional synthesis prompt
   */
  setPrompt(prompt?: string): void {
    const trimmed = prompt?.trim();
    this.prompt = trimmed ? trimmed : undefined;
  }

  async fetchAudio(
    input: Talk,
    speaker: string,
    apiKey?: string,
  ): Promise<ArrayBuffer> {
    const trimmedApiKey = apiKey?.trim();
    if (!trimmedApiKey) {
      throw new Error('Gemini TTS API key is required');
    }

    const trimmedSpeaker = speaker.trim();
    if (!trimmedSpeaker) {
      throw new Error('Gemini TTS voice name is required');
    }

    const text = input.message.trim();
    if (!text) {
      throw new Error('Input text is empty');
    }

    const requestText = this.prompt ? `${this.prompt}\n${text}` : text;
    const url = `${this.baseUrl}/models/${this.model}:generateContent`;
    const response = await fetchWithTimeout(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': trimmedApiKey,
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: requestText,
              },
            ],
          },
        ],
        generationConfig: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            languageCode: this.languageCode,
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: trimmedSpeaker,
              },
            },
          },
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      console.error(
        'Failed to fetch TTS from Gemini TTS:',
        response.status,
        errorText,
      );
      throw new Error('Failed to fetch TTS from Gemini TTS.');
    }

    const result = (await response.json()) as GeminiGenerateContentResponse;
    const audioContent = result.candidates
      ?.flatMap((candidate) => candidate.content?.parts ?? [])
      .find((part) => typeof part.inlineData?.data === 'string')
      ?.inlineData?.data;

    if (!audioContent) {
      throw new Error('No audio content in Gemini TTS response.');
    }

    const decoded = globalThis.atob(audioContent);
    const bytes = new Uint8Array(decoded.length);

    for (let index = 0; index < decoded.length; index++) {
      bytes[index] = decoded.charCodeAt(index);
    }

    return createPcm16Wav(bytes, 24000);
  }

  getTestMessage(textVoiceText?: string): string {
    return textVoiceText || 'Gemini TTSを使用します';
  }
}
