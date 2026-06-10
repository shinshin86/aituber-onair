import { XAI_TTS_API_URL } from '../constants/voiceEngine';
import { Talk } from '../types/voice';
import { fetchWithTimeout } from './internal/utils';
import { VoiceEngine } from './VoiceEngine';

export type XaiCodec = 'mp3' | 'wav' | 'pcm' | 'mulaw' | 'alaw';
export type XaiSampleRate = 8000 | 16000 | 22050 | 24000 | 44100 | 48000;
export type XaiBitRate = 32000 | 64000 | 96000 | 128000 | 192000;

const XAI_DEFAULT_LANGUAGE = 'auto';
const XAI_DEFAULT_CODEC: XaiCodec = 'mp3';
const XAI_DEFAULT_SAMPLE_RATE: XaiSampleRate = 24000;
const XAI_DEFAULT_BIT_RATE: XaiBitRate = 128000;

const XAI_CODECS = ['mp3', 'wav', 'pcm', 'mulaw', 'alaw'] as const;
const XAI_SAMPLE_RATES = [8000, 16000, 22050, 24000, 44100, 48000] as const;
const XAI_BIT_RATES = [32000, 64000, 96000, 128000, 192000] as const;

function isXaiCodec(value: string): value is XaiCodec {
  return (XAI_CODECS as readonly string[]).includes(value);
}

function isXaiSampleRate(value: number): value is XaiSampleRate {
  return (XAI_SAMPLE_RATES as readonly number[]).includes(value);
}

function isXaiBitRate(value: number): value is XaiBitRate {
  return (XAI_BIT_RATES as readonly number[]).includes(value);
}

/**
 * xAI TTS voice synthesis engine
 */
export class XaiEngine implements VoiceEngine {
  private language: string = XAI_DEFAULT_LANGUAGE;
  private codec: XaiCodec = XAI_DEFAULT_CODEC;
  private sampleRate: XaiSampleRate = XAI_DEFAULT_SAMPLE_RATE;
  private bitRate: XaiBitRate = XAI_DEFAULT_BIT_RATE;

  /**
   * Set synthesis language (BCP-47 or auto)
   */
  setLanguage(language: string): void {
    const trimmed = language.trim();
    this.language = trimmed.length > 0 ? trimmed : XAI_DEFAULT_LANGUAGE;
  }

  /**
   * Set output codec
   */
  setCodec(codec: XaiCodec): void {
    const normalized = codec.trim().toLowerCase();
    this.codec = isXaiCodec(normalized) ? normalized : XAI_DEFAULT_CODEC;
  }

  /**
   * Set output sample rate
   */
  setSampleRate(sampleRate: XaiSampleRate): void {
    this.sampleRate = isXaiSampleRate(sampleRate)
      ? sampleRate
      : XAI_DEFAULT_SAMPLE_RATE;
  }

  /**
   * Set MP3 bit rate
   */
  setBitRate(bitRate: XaiBitRate): void {
    this.bitRate = isXaiBitRate(bitRate) ? bitRate : XAI_DEFAULT_BIT_RATE;
  }

  async fetchAudio(
    input: Talk,
    speaker: string,
    apiKey?: string,
  ): Promise<ArrayBuffer> {
    if (!apiKey) {
      throw new Error('xAI API key is required');
    }

    const text = input.message.trim();
    if (!text) {
      throw new Error('Input text is empty');
    }

    if (!speaker) {
      throw new Error('xAI TTS voice ID is required');
    }

    const outputFormat: {
      codec: XaiCodec;
      sample_rate: XaiSampleRate;
      bit_rate?: XaiBitRate;
    } = {
      codec: this.codec,
      sample_rate: this.sampleRate,
    };

    if (this.codec === 'mp3') {
      outputFormat.bit_rate = this.bitRate;
    }

    const response = await fetchWithTimeout(XAI_TTS_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        text,
        voice_id: speaker,
        language: this.language,
        output_format: outputFormat,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      console.error(
        'Failed to fetch TTS from xAI TTS:',
        response.status,
        errorText,
      );
      throw new Error('Failed to fetch TTS from xAI TTS.');
    }

    const blob = await response.blob();
    return await blob.arrayBuffer();
  }

  getTestMessage(textVoiceText?: string): string {
    return textVoiceText || 'xAI TTSを使用します';
  }
}
