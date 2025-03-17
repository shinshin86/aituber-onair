import { NIJI_VOICE_API_URL } from '../../../constants';
import { VoiceActor, Talk } from '../../../types';
import { VoiceEngine } from './VoiceEngine';

/**
 * NijiVoice voice synthesis engine
 */
export class NijiVoiceEngine implements VoiceEngine {
  async fetchAudio(
    input: Talk,
    speaker: string,
    apiKey?: string,
    voiceActor?: VoiceActor,
  ): Promise<ArrayBuffer> {
    if (!apiKey) {
      throw new Error('NijiVoice API key is required');
    }

    const talk = input as Talk;
    const script = talk.message.trim();

    // get emotion from talk.style and process parameters
    const emotion = talk.style || 'neutral';
    const emotionParams = this.processEmotionParams(
      emotion,
      script,
      voiceActor,
    );

    const generateResponse = await fetch(
      `${NIJI_VOICE_API_URL}/voice-actors/${speaker}/generate-encoded-voice`,
      {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'Content-Type': 'application/json',
          accept: 'application/json',
        },
        body: JSON.stringify({
          script: emotionParams.script,
          speed: emotionParams.speed,
          emotionalLevel: emotionParams.emotionalLevel,
          format: 'mp3',
        }),
      },
    );

    if (!generateResponse.ok) {
      const errorBody = await generateResponse.text();
      console.error('NijiVoice generate-encoded-voice error:', errorBody);
      throw new Error('Failed to generate voice from NijiVoice');
    }

    interface GenerateEncodedVoiceResponse {
      generatedVoice: {
        base64Audio: string;
        duration: number;
        remainingCredits: number;
      };
    }

    const generateResult =
      (await generateResponse.json()) as GenerateEncodedVoiceResponse;
    const base64Audio = generateResult.generatedVoice?.base64Audio;

    if (!base64Audio) {
      throw new Error('Base64 audio not found in NijiVoice response');
    }

    return this.base64ToArrayBuffer(base64Audio);
  }

  private processEmotionParams(
    emotion: string,
    script: string,
    voiceActor?: VoiceActor,
  ) {
    // set default values
    const defaultEmotionalLevel = 0.7; // default emotional level
    const defaultSpeed = 1.0; // default speed

    let emotionalLevel: string | undefined;
    // if voiceActor does not exist, use default values
    let speed = voiceActor?.recommendedVoiceSpeed
      ? String(voiceActor.recommendedVoiceSpeed)
      : String(defaultSpeed);

    // base emotional level (use voiceActor's recommendedEmotionalLevel or default values)
    const baseEmotionalLevel = voiceActor?.recommendedEmotionalLevel
      ? Number(voiceActor.recommendedEmotionalLevel)
      : defaultEmotionalLevel;

    // base speed (use voiceActor's recommendedVoiceSpeed or default values)
    let baseSpeed = voiceActor?.recommendedVoiceSpeed
      ? Number(voiceActor.recommendedVoiceSpeed)
      : defaultSpeed;

    // adjust according to emotion
    let adjustment = '0.0';

    switch (emotion.toLowerCase()) {
      case 'happy':
        adjustment = '0.2';
        baseSpeed *= 1.1;
        break;
      case 'sad':
        adjustment = '-0.4';
        baseSpeed *= 0.9;
        break;
      case 'angry':
        adjustment = '0.4';
        baseSpeed *= 1.0;
        break;
      case 'surprised':
        adjustment = '0.3';
        baseSpeed *= 1.2;
        break;
      default:
        // if default, set emotional level
        emotionalLevel = String(baseEmotionalLevel);
        break;
    }

    if (adjustment !== '0.0') {
      emotionalLevel = (
        Math.round(
          Math.min(Math.max(baseEmotionalLevel + Number(adjustment), 0), 1.5) *
            10,
        ) / 10
      ).toString();
    }

    // ensure speed is always between 0.4 and 3.0
    speed = (
      Math.round(Math.min(Math.max(baseSpeed, 0.4), 3.0) * 10) / 10
    ).toString();

    return { script, emotionalLevel, speed };
  }

  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const sanitizedBase64 = base64.replace(/[\r\n\s]/g, '');
    const binaryString = atob(sanitizedBase64);
    const len = binaryString.length;
    const buffer = new ArrayBuffer(len);
    const view = new Uint8Array(buffer);

    for (let i = 0; i < len; i++) {
      view[i] = binaryString.charCodeAt(i);
    }

    return buffer;
  }

  getTestMessage(textVoiceText?: string): string {
    return textVoiceText || 'にじボイスを使用します';
  }
}
