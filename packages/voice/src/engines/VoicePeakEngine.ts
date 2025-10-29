import { VOICEPEAK_API_URL } from '../constants/voiceEngine';
import { EmotionTypeForVoicepeak, Talk } from '../types/voice';
import { VoiceEngine } from './VoiceEngine';

/**
 * VoicePeak voice synthesis engine
 */
export class VoicePeakEngine implements VoiceEngine {
  private apiEndpoint: string = VOICEPEAK_API_URL;
  private emotionOverride?: EmotionTypeForVoicepeak;
  private speedOverride?: number;
  private pitchOverride?: number;

  async fetchAudio(input: Talk, speaker: string): Promise<ArrayBuffer> {
    const talk = input as Talk;
    const resolvedEmotion =
      this.emotionOverride ?? this.mapEmotionStyle(talk.style || 'talk');
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

  setEmotion(emotion?: EmotionTypeForVoicepeak): void {
    this.emotionOverride = emotion;
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

  private buildUrl(
    path: string,
    params: Record<string, string | undefined>,
  ): string {
    const base = this.apiEndpoint.replace(/\/$/, '');
    const url = new URL(`${base}${path}`);
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) {
        url.searchParams.set(key, value);
      }
    }
    return url.toString();
  }
}
