import { GEMINI_TTS_API_URL } from '../constants/voiceEngine';
import type { Talk } from '../types/voice';
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

  private createWavFromPcm(pcmData: Uint8Array): ArrayBuffer {
    const sampleRate = 24000;
    const numChannels = 1;
    const bitsPerSample = 16;
    const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
    const blockAlign = numChannels * (bitsPerSample / 8);
    const headerSize = 44;
    const dataSize = pcmData.byteLength;
    const totalSize = headerSize + dataSize;
    const wavBuffer = new ArrayBuffer(totalSize);
    const view = new DataView(wavBuffer);
    const bytes = new Uint8Array(wavBuffer);

    bytes.set([0x52, 0x49, 0x46, 0x46], 0);
    view.setUint32(4, totalSize - 8, true);
    bytes.set([0x57, 0x41, 0x56, 0x45], 8);
    bytes.set([0x66, 0x6d, 0x74, 0x20], 12);
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitsPerSample, true);
    bytes.set([0x64, 0x61, 0x74, 0x61], 36);
    view.setUint32(40, dataSize, true);
    bytes.set(pcmData, headerSize);

    return wavBuffer;
  }

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
    const response = await fetch(url, {
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

    return this.createWavFromPcm(bytes);
  }

  getTestMessage(textVoiceText?: string): string {
    return textVoiceText || 'Gemini TTSを使用します';
  }
}
