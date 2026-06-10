import {
  GRADIUM_TTS_API_URL,
  GRADIUM_VOICES_API_URL,
} from '../constants/voiceEngine';
import { Talk } from '../types/voice';
import { clampNumber } from './internal/utils';
import { VoiceEngine } from './VoiceEngine';

export type GradiumOutputFormat =
  | 'wav'
  | 'pcm'
  | 'opus'
  | 'ulaw_8000'
  | 'mulaw_8000'
  | 'alaw_8000'
  | 'pcm_8000'
  | 'pcm_16000'
  | 'pcm_22050'
  | 'pcm_24000'
  | 'pcm_44100'
  | 'pcm_48000';

export interface GradiumVoice {
  uid: string;
  name: string;
  is_catalog: boolean;
  is_pro_clone: boolean;
  description?: string | null;
  filename?: string | null;
  start_s?: number | null;
  language?: string | null;
  tags?: unknown[];
}

interface GradiumJsonConfig {
  temp?: number;
  cfg_coef?: number;
  padding_bonus?: number;
  rewrite_rules?: string;
}

/**
 * Gradium text-to-speech engine using the one-shot REST endpoint.
 */
export class GradiumEngine implements VoiceEngine {
  private apiEndpoint: string = GRADIUM_TTS_API_URL;
  private outputFormat: GradiumOutputFormat = 'wav';
  private temperature?: number;
  private voiceSimilarity?: number;
  private paddingBonus?: number;
  private rewriteRules?: string;

  /**
   * Set Gradium TTS API endpoint URL.
   */
  setApiEndpoint(apiUrl: string): void {
    const trimmed = apiUrl.trim();
    this.apiEndpoint = trimmed || GRADIUM_TTS_API_URL;
  }

  /**
   * Set Gradium output audio format.
   */
  setOutputFormat(outputFormat?: GradiumOutputFormat): void {
    this.outputFormat = this.isSupportedOutputFormat(outputFormat)
      ? outputFormat
      : 'wav';
  }

  /**
   * Set sampling temperature (0.0-1.4).
   */
  setTemperature(value?: number): void {
    this.temperature = clampNumber(value, 0, 1.4);
  }

  /**
   * Set voice similarity / cfg_coef (1.0-4.0).
   */
  setVoiceSimilarity(value?: number): void {
    this.voiceSimilarity = clampNumber(value, 1, 4);
  }

  /**
   * Set padding bonus / speed control (-4.0-4.0).
   */
  setPaddingBonus(value?: number): void {
    this.paddingBonus = clampNumber(value, -4, 4);
  }

  /**
   * Set Gradium text rewrite rules, such as "en" or "TimeEn,Date".
   */
  setRewriteRules(value?: string): void {
    const trimmed = value?.trim();
    this.rewriteRules = trimmed || undefined;
  }

  /**
   * Get voices visible to the authenticated Gradium organization.
   */
  async getVoiceList(
    apiKey: string,
    options: { includeCatalog?: boolean; limit?: number; skip?: number } = {},
  ): Promise<GradiumVoice[]> {
    if (!apiKey) {
      throw new Error('Gradium API key is required');
    }

    const url = new URL(GRADIUM_VOICES_API_URL);
    url.searchParams.set(
      'include_catalog',
      String(options.includeCatalog ?? true),
    );
    if (options.limit !== undefined) {
      url.searchParams.set('limit', String(options.limit));
    }
    if (options.skip !== undefined) {
      url.searchParams.set('skip', String(options.skip));
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'x-api-key': apiKey,
      },
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(
        `Failed to fetch Gradium voices: ${response.status}${errorText ? ` ${errorText}` : ''}`,
      );
    }

    return (await response.json()) as GradiumVoice[];
  }

  async fetchAudio(
    input: Talk,
    speaker: string,
    apiKey?: string,
  ): Promise<ArrayBuffer> {
    if (!apiKey) {
      throw new Error('Gradium API key is required');
    }

    if (!speaker) {
      throw new Error('Gradium voice ID is required');
    }

    const text = input.message.trim();

    if (!text) {
      throw new Error('Input text is empty');
    }

    const response = await fetch(this.createRequestUrl(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify({
        text,
        voice_id: speaker,
        output_format: this.outputFormat,
        only_audio: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(
        `Failed to fetch TTS from Gradium: ${response.status}${errorText ? ` ${errorText}` : ''}`,
      );
    }

    const blob = await response.blob();
    return await blob.arrayBuffer();
  }

  getTestMessage(textVoiceText?: string): string {
    return textVoiceText || 'Gradiumを使用します';
  }

  private createRequestUrl(): string {
    const url = new URL(this.apiEndpoint);
    const jsonConfig = this.createJsonConfig();

    if (Object.keys(jsonConfig).length > 0) {
      url.searchParams.set('json_config', JSON.stringify(jsonConfig));
    }

    return url.toString();
  }

  private createJsonConfig(): GradiumJsonConfig {
    const config: GradiumJsonConfig = {};

    if (this.temperature !== undefined) {
      config.temp = this.temperature;
    }
    if (this.voiceSimilarity !== undefined) {
      config.cfg_coef = this.voiceSimilarity;
    }
    if (this.paddingBonus !== undefined) {
      config.padding_bonus = this.paddingBonus;
    }
    if (this.rewriteRules !== undefined) {
      config.rewrite_rules = this.rewriteRules;
    }

    return config;
  }

  private isSupportedOutputFormat(
    outputFormat?: string,
  ): outputFormat is GradiumOutputFormat {
    return (
      outputFormat === 'wav' ||
      outputFormat === 'pcm' ||
      outputFormat === 'opus' ||
      outputFormat === 'ulaw_8000' ||
      outputFormat === 'mulaw_8000' ||
      outputFormat === 'alaw_8000' ||
      outputFormat === 'pcm_8000' ||
      outputFormat === 'pcm_16000' ||
      outputFormat === 'pcm_22050' ||
      outputFormat === 'pcm_24000' ||
      outputFormat === 'pcm_44100' ||
      outputFormat === 'pcm_48000'
    );
  }
}
