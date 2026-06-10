import { VOICEPEAK_API_URL } from '../constants/voiceEngine';
import {
  EmotionTypeForVoicepeak,
  Talk,
  VoicepeakEmotionInput,
  VoicepeakEmotionWeights,
} from '../types/voice';
import { buildQueryUrl } from './internal/utils';
import { VoiceEngine } from './VoiceEngine';

const VOICEPEAK_EMOTION_KEYS: readonly EmotionTypeForVoicepeak[] = [
  'happy',
  'fun',
  'angry',
  'sad',
  'neutral',
  'surprised',
] as const;

/**
 * VoicePeak voice synthesis engine
 */
export class VoicePeakEngine implements VoiceEngine {
  private apiEndpoint: string = VOICEPEAK_API_URL;
  private emotionOverride?: VoicepeakEmotionInput;
  private speedOverride?: number;
  private pitchOverride?: number;

  async fetchAudio(input: Talk, speaker: string): Promise<ArrayBuffer> {
    const talk = input as Talk;
    const resolvedEmotionRaw =
      typeof this.emotionOverride === 'string'
        ? this.emotionOverride
        : this.emotionOverride === undefined
          ? this.mapEmotionStyle(talk.style || 'talk')
          : this.serializeWeights(this.emotionOverride);
    const resolvedEmotion = this.normalizeEmotionParam(resolvedEmotionRaw);
    const resolvedSpeed = this.speedOverride;
    const resolvedPitch = this.pitchOverride;

    const ttsQueryUrl = this.buildUrl('/audio_query', {
      speaker,
      text: talk.message,
      emotion: resolvedEmotion,
      speed: resolvedSpeed === undefined ? undefined : String(resolvedSpeed),
      pitch: resolvedPitch === undefined ? undefined : String(resolvedPitch),
    });

    const ttsQueryResponse = await fetch(ttsQueryUrl, { method: 'POST' });

    if (!ttsQueryResponse.ok) {
      throw new Error('Failed to fetch TTS query.');
    }

    const ttsQueryJson = await ttsQueryResponse.json();

    // set emotion from talk.style
    if (resolvedEmotion !== undefined) {
      ttsQueryJson.emotion = resolvedEmotion;
    }
    if (resolvedSpeed !== undefined) {
      ttsQueryJson.speed = resolvedSpeed;
    }
    if (resolvedPitch !== undefined) {
      ttsQueryJson.pitch = resolvedPitch;
    }
    ttsQueryJson.text = talk.message;
    ttsQueryJson.speaker = speaker;

    const synthesisUrl = this.buildUrl('/synthesis', { speaker });

    const synthesisResponse = await fetch(synthesisUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ttsQueryJson),
    });

    if (!synthesisResponse.ok) {
      throw new Error('Failed to fetch TTS synthesis result.');
    }

    const blob = await synthesisResponse.blob();
    return await blob.arrayBuffer();
  }

  /**
   * Map emotion style to VoicePeak's emotion parameters
   */
  private mapEmotionStyle(style: string): EmotionTypeForVoicepeak {
    switch (style.toLowerCase()) {
      case 'happy':
      case 'fun':
        return 'happy';
      case 'angry':
        return 'angry';
      case 'sad':
        return 'sad';
      case 'surprised':
        return 'surprised';
      default:
        return 'neutral';
    }
  }

  getTestMessage(textVoiceText?: string): string {
    return textVoiceText || 'ボイスピークを使用します';
  }

  /**
   * Set custom API endpoint URL
   * @param apiUrl custom API endpoint URL
   */
  setApiEndpoint(apiUrl: string): void {
    this.apiEndpoint = apiUrl;
  }

  setEmotion(emotion?: VoicepeakEmotionInput): void {
    if (emotion === undefined) {
      this.emotionOverride = undefined;
      return;
    }

    if (typeof emotion === 'string') {
      this.emotionOverride = emotion;
      return;
    }

    if (emotion === null || Array.isArray(emotion)) {
      throw new Error(
        'VoicePeak emotion override must be a string or a weight map.',
      );
    }

    let sum = 0;
    for (const [key, value] of Object.entries(emotion)) {
      if (!VOICEPEAK_EMOTION_KEYS.includes(key as EmotionTypeForVoicepeak)) {
        throw new Error(
          `VoicePeak emotion weights contain an unknown key "${key}". Valid keys: happy, fun, angry, sad, neutral, surprised.`,
        );
      }

      if (!Number.isFinite(value) || !Number.isInteger(value)) {
        throw new Error(
          `VoicePeak emotion weight for "${key}" must be an integer, got ${value}.`,
        );
      }

      if (value < 0 || value > 100) {
        throw new Error(
          `VoicePeak emotion weight for "${key}" must be between 0 and 100, got ${value}.`,
        );
      }

      if (key !== 'neutral') {
        sum += value;
      }
    }

    if (sum > 100) {
      throw new Error(
        `VoicePeak emotion weights must sum to 100 or less (neutral excluded), got ${sum}.`,
      );
    }

    this.emotionOverride = { ...emotion };
  }

  setSpeed(speed?: number): void {
    this.speedOverride = this.normalizeInteger(speed, 50, 200);
  }

  setPitch(pitch?: number): void {
    this.pitchOverride = this.normalizeInteger(pitch, -300, 300);
  }

  private normalizeInteger(
    value: number | null | undefined,
    min: number,
    max: number,
  ): number | undefined {
    if (value === null || value === undefined) {
      return undefined;
    }
    if (!Number.isFinite(value)) {
      return undefined;
    }
    const rounded = Math.round(value);
    if (rounded < min) {
      return min;
    }
    if (rounded > max) {
      return max;
    }
    return rounded;
  }

  private serializeWeights(
    weights: VoicepeakEmotionWeights,
  ): string | undefined {
    const serialized = Object.entries(weights)
      .filter(
        ([key, value]) =>
          key !== 'neutral' && value !== undefined && value !== 0,
      )
      .map(([key, value]) => `${key}=${value}`)
      .join(',');

    return serialized.length > 0 ? serialized : undefined;
  }

  private normalizeEmotionParam(
    emotion: EmotionTypeForVoicepeak | string | undefined,
  ): string | undefined {
    return emotion === 'neutral' ? undefined : emotion;
  }

  private buildUrl(
    path: string,
    params: Record<string, string | undefined>,
  ): string {
    return buildQueryUrl(this.apiEndpoint, path, params);
  }
}
