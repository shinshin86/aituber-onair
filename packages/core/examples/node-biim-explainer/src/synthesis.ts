import { createHash } from 'node:crypto';
import { mkdir, copyFile } from 'node:fs/promises';
import path from 'node:path';
import { decodeWav, SAMPLE_RATE, type DecodedAudio } from './gen/audio.js';
import { synthesize as sine } from './gen/engines/sine.js';
import { synthesize as voice } from './gen/engines/aituberVoice.js';
import { mixAt } from './media.js';
import { resolveTimeline } from './timeline.js';
import type { BiimScript } from './types.js';

/** Cache audio by text + engine settings. No credentials or render configs are serialized. */
export async function synthesizeTimeline(
  script: BiimScript,
  workDir: string,
  cacheDir: string,
) {
  await mkdir(cacheDir, { recursive: true });
  const audio: (DecodedAudio | undefined)[] = [];
  const durations: number[] = [];
  for (const [i, line] of script.lines.entries()) {
    if (line.spoken === false) {
      durations[i] = line.duration as number;
      continue;
    }
    const settings = script.speakers[line.speaker].voice;
    const text = line.reading ?? line.text;
    const hash = createHash('sha256')
      .update(JSON.stringify({ text, ...settings }))
      .digest('hex');
    const cached = path.join(cacheDir, `${hash}.wav`);
    try {
      audio[i] = await decodeWav(cached);
    } catch {
      try {
        const directory = path.join(workDir, `line-${i}`);
        await mkdir(directory, { recursive: true });
        const result = await (settings.engine === 'sine' ? sine : voice)(
          text,
          settings.options ?? {},
          directory,
        );
        audio[i] = await decodeWav(result.wavPath);
        await copyFile(result.wavPath, cached);
      } catch (error) {
        throw new Error(
          `lines[${i}] (speaker ${line.speaker}): ${(error as Error).message}`,
        );
      }
    }
    durations[i] = (audio[i] as DecodedAudio).duration;
  }
  const timeline = resolveTimeline(script, durations, false);
  const samples = new Float32Array(Math.ceil(timeline.duration * SAMPLE_RATE));
  timeline.lines.forEach((line, i) => {
    if (audio[i])
      mixAt(
        samples,
        (audio[i] as DecodedAudio).samples,
        line.start,
        1,
        line.end,
      );
  });
  return {
    timeline,
    narration: {
      samples,
      sampleRate: SAMPLE_RATE,
      duration: samples.length / SAMPLE_RATE,
    },
  };
}
