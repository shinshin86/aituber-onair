import { OPENAI_TTS_API_URL } from '../../../constants';
import { Talk } from '../../../types';
import { VoiceEngine } from './VoiceEngine';

/**
 * OpenAI TTS voice synthesis engine
 */
export class OpenAiEngine implements VoiceEngine {
  async fetchAudio(
    input: Talk,
    speaker: string,
    apiKey?: string,
  ): Promise<ArrayBuffer> {
    if (!apiKey) {
      throw new Error('OpenAI API key is required');
    }

    const talk = input as Talk;
    const text = talk.message.trim();

    const response = await fetch(OPENAI_TTS_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'tts-1',
        voice: speaker,
        input: text,
      }),
    });

    if (!response.ok) {
      console.error('Failed to fetch TTS from OpenAI TTS:', response.status);
      throw new Error('Failed to fetch TTS from OpenAI TTS.');
    }

    const blob = await response.blob();
    return await blob.arrayBuffer();
  }

  getTestMessage(textVoiceText?: string): string {
    return textVoiceText || 'OpenAI TTSを使用します';
  }
}
