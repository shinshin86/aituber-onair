import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  VoiceEngineAdapter,
  type AudioPlayOptions,
  type VoiceServiceOptions,
} from '@aituber-onair/core';
import { normalizeToWav } from '../audio.js';
import type { SynthesisResult } from './types.js';

const DEFAULT_AIVIS_SPEECH_URL = 'http://127.0.0.1:10101';

interface AdapterOptions extends Record<string, unknown> {
  engineType?: string;
  aivisSpeechApiUrl?: string;
  onPlay?: (
    audioBuffer: ArrayBuffer,
    options?: AudioPlayOptions,
  ) => Promise<void>;
}

/** Synthesize through Core's VoiceEngineAdapter and capture its onPlay audio. */
export async function synthesize(
  text: string,
  rawOptions: Record<string, unknown>,
  workDir: string,
): Promise<SynthesisResult> {
  await mkdir(workDir, { recursive: true });
  const options = rawOptions as AdapterOptions;
  if (options.engineType === 'aivisSpeech') {
    await assertAivisSpeechAvailable(
      options.aivisSpeechApiUrl || DEFAULT_AIVIS_SPEECH_URL,
    );
  }

  const sourceWavPath = path.join(workDir, 'adapter.wav');
  const wavPath = path.join(workDir, 'voice.wav');
  let audioBuffer: ArrayBuffer | null = null;
  const callerOnPlay = options.onPlay;
  const adapter = new VoiceEngineAdapter({
    ...options,
    onPlay: async (buffer: ArrayBuffer, playOptions?: AudioPlayOptions) => {
      audioBuffer = buffer;
      await callerOnPlay?.(buffer, playOptions);
    },
  } as unknown as VoiceServiceOptions);

  try {
    await adapter.speakText(text);
  } catch (error) {
    if (options.engineType === 'aivisSpeech') {
      const url = options.aivisSpeechApiUrl || DEFAULT_AIVIS_SPEECH_URL;
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(
        `AivisSpeech synthesis failed at ${url}. Confirm AivisSpeech is ` +
          `running and the speaker/style ID is installed.\n${message}`,
        { cause: error },
      );
    }
    throw error;
  }
  if (!audioBuffer) {
    throw new Error(
      `VoiceEngineAdapter (${options.engineType || 'unknown'}) returned no audio buffer.`,
    );
  }
  await writeFile(sourceWavPath, Buffer.from(audioBuffer));
  const durationSec = await normalizeToWav(sourceWavPath, wavPath);
  return { wavPath, durationSec };
}

async function assertAivisSpeechAvailable(url: string): Promise<void> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5_000);
  try {
    await fetch(url, { signal: controller.signal });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Cannot connect to AivisSpeech at ${url}.\nStart AivisSpeech: 1) launch the AivisSpeech application, 2) wait for its API server to start, 3) confirm aivisSpeechApiUrl and retry.\n${message}`,
      { cause: error },
    );
  } finally {
    clearTimeout(timeout);
  }
}
