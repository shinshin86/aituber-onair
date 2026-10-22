import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { VoiceServiceOptions } from '@aituber-onair/core';
import { normalizeToWav } from '../audio.js';
import type { SynthesisResult } from './types.js';

/** Capture Core's synthesized audio without playing it on the host. */
export async function synthesize(
  text: string,
  options: Record<string, unknown>,
  workDir: string,
): Promise<SynthesisResult> {
  // The sine demo does not need Core or a running speech server.
  const { VoiceEngineAdapter } = await import('@aituber-onair/core');
  await mkdir(workDir, { recursive: true });
  let audio: ArrayBuffer | null = null;
  const adapter = new VoiceEngineAdapter({
    ...options,
    onPlay: async (buffer: ArrayBuffer) => {
      audio = buffer;
    },
  } as VoiceServiceOptions);
  await adapter.speakText(text);
  if (!audio)
    throw new Error(
      `VoiceEngineAdapter (${options.engineType}) returned no audio.`,
    );
  const source = path.join(workDir, 'source.audio');
  const wavPath = path.join(workDir, 'voice.wav');
  await writeFile(source, Buffer.from(audio));
  return { wavPath, durationSec: await normalizeToWav(source, wavPath) };
}
