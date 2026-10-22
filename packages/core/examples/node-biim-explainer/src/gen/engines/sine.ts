import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { SAMPLE_RATE, writePcm16Wav } from '../audio.js';
import type { SynthesisResult } from './types.js';

function numberOption(
  options: Record<string, unknown>,
  key: string,
  fallback: number,
): number {
  const value = Number(options[key] ?? fallback);
  return Number.isFinite(value) ? value : fallback;
}

/** Generate deterministic gated sine-wave speech for tests and demos. */
export async function synthesize(
  text: string,
  options: Record<string, unknown>,
  workDir: string,
): Promise<SynthesisResult> {
  await mkdir(workDir, { recursive: true });
  const frequency = numberOption(options, 'frequency', 440);
  const secondsPerChar = numberOption(options, 'secondsPerChar', 0.08);
  const durationSec = Math.max(
    numberOption(options, 'minDuration', 0.5),
    Array.from(text.replace(/\s/g, '')).length * secondsPerChar,
  );
  const frames = Math.round(durationSec * SAMPLE_RATE);
  const samples = new Float32Array(frames);
  const amplitude = numberOption(options, 'amplitude', 0.22);
  for (let index = 0; index < frames; index += 1) {
    const time = index / SAMPLE_RATE;
    const gate = Math.floor(time / 0.09) % 2 === 0 ? 1 : 0.15;
    const fadeIn = Math.min(1, index / Math.round(SAMPLE_RATE * 0.02));
    const fadeOut = Math.min(
      1,
      (frames - index) / Math.round(SAMPLE_RATE * 0.02),
    );
    samples[index] =
      Math.sin(2 * Math.PI * frequency * time) *
      amplitude *
      gate *
      fadeIn *
      fadeOut;
  }
  const wavPath = path.join(workDir, 'voice.wav');
  const actualDuration = await writePcm16Wav(wavPath, samples, SAMPLE_RATE);
  return { wavPath, durationSec: actualDuration };
}
