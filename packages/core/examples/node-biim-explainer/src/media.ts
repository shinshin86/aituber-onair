import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { inner, layout } from './layout.js';
import { runCommand } from './gen/process.js';
import {
  decodeWav,
  SAMPLE_RATE,
  writePcm16Wav,
  type DecodedAudio,
} from './gen/audio.js';
import type { BiimScript, Timeline } from './types.js';

export async function probeVideo(
  file: string,
): Promise<{ duration: number; audio: boolean }> {
  const { stdout } = await runCommand('ffprobe', [
    '-v',
    'error',
    '-show_format',
    '-show_streams',
    '-of',
    'json',
    file,
  ]);
  const probe = JSON.parse(stdout);
  if (
    !probe.streams.some((s: { codec_type: string }) => s.codec_type === 'video')
  )
    throw new Error('no video stream');
  const duration = Number(probe.format.duration);
  if (!Number.isFinite(duration) || duration <= 0)
    throw new Error('video must have a finite duration');
  return {
    duration,
    audio: probe.streams.some(
      (s: { codec_type: string }) => s.codec_type === 'audio',
    ),
  };
}

export async function resolveMedia(timeline: Timeline, baseDir: string) {
  for (const clip of timeline.main) {
    if (!clip.video) continue;
    try {
      const probe = await probeVideo(path.resolve(baseDir, clip.video));
      const from = clip.from ?? 0;
      const to = clip.to ?? probe.duration;
      if (from >= probe.duration || to > probe.duration + 0.02)
        throw new Error(
          `range must be within source duration (${probe.duration}s)`,
        );
      clip.playbackEnd = Math.min(
        clip.end,
        clip.start + (to - from) / (clip.speed ?? 1),
      );
    } catch (error) {
      throw new Error(`main[${clip.index}].video: ${(error as Error).message}`);
    }
  }
}

export function tempoFilters(speed: number): string {
  const parts: number[] = [];
  let remaining = speed;
  while (remaining > 2) {
    parts.push(2);
    remaining /= 2;
  }
  while (remaining < 0.5) {
    parts.push(0.5);
    remaining /= 0.5;
  }
  parts.push(remaining);
  return parts.map((value) => `atempo=${value}`).join(',');
}

export interface PreparedVideo {
  directory: string;
  frames: number;
}
export async function prepareVideos(
  timeline: Timeline,
  baseDir: string,
  workDir: string,
): Promise<Map<number, PreparedVideo>> {
  const result = new Map<number, PreparedVideo>();
  const rect = inner(layout(timeline.width, false, false).main);
  // H.264 inputs may have odd display dimensions; decoded PNGs support either.
  const w = Math.floor(rect.w);
  const h = Math.floor(rect.h);
  for (const clip of timeline.main) {
    if (!clip.video) continue;
    const directory = path.join(workDir, `video-${clip.index}`);
    await mkdir(directory, { recursive: true });
    const duration = (clip.playbackEnd ?? clip.end) - clip.start;
    const speed = clip.speed ?? 1;
    const scale =
      clip.fit === 'cover'
        ? `scale=${w}:${h}:force_original_aspect_ratio=increase,crop=${w}:${h}`
        : `scale=${w}:${h}:force_original_aspect_ratio=decrease,pad=${w}:${h}:(ow-iw)/2:(oh-ih)/2:black`;
    const frames = Math.max(1, Math.ceil(duration * timeline.fps));
    await runCommand('ffmpeg', [
      '-y',
      '-v',
      'error',
      '-ss',
      String(clip.from ?? 0),
      '-i',
      path.resolve(baseDir, clip.video),
      '-an',
      '-vf',
      `setpts=(PTS-STARTPTS)/${speed},fps=${timeline.fps},${scale},tpad=stop_mode=clone:stop_duration=${1 / timeline.fps}`,
      '-frames:v',
      String(frames),
      '-threads',
      '1',
      path.join(directory, '%08d.png'),
    ]);
    result.set(clip.index, { directory, frames });
  }
  return result;
}

export function mixAt(
  target: Float32Array,
  source: Float32Array,
  start: number,
  gain: number,
  end = Number.POSITIVE_INFINITY,
) {
  const offset = Math.round(start * SAMPLE_RATE);
  const count = Math.min(
    source.length,
    target.length - offset,
    Math.round((end - start) * SAMPLE_RATE),
  );
  for (let i = 0; i < count; i++) target[offset + i] += source[i] * gain;
}

export async function mixAudio(
  script: BiimScript,
  timeline: Timeline,
  narration: DecodedAudio,
  baseDir: string,
  workDir: string,
  output: string,
) {
  const mixed = new Float32Array(narration.samples);
  for (const clip of timeline.main) {
    if (!clip.video || !clip.audio) continue;
    const file = path.resolve(baseDir, clip.video);
    if (!(await probeVideo(file)).audio) continue;
    const wav = path.join(workDir, `video-${clip.index}.wav`);
    const speed = clip.speed ?? 1;
    const duration = (clip.playbackEnd ?? clip.end) - clip.start;
    await runCommand('ffmpeg', [
      '-y',
      '-v',
      'error',
      '-ss',
      String(clip.from ?? 0),
      '-i',
      file,
      '-t',
      String(duration),
      '-vn',
      '-af',
      tempoFilters(speed),
      '-ar',
      String(SAMPLE_RATE),
      '-ac',
      '1',
      '-c:a',
      'pcm_s16le',
      wav,
    ]);
    mixAt(
      mixed,
      (await decodeWav(wav)).samples,
      clip.start,
      script.defaults?.mainAudioVolume ?? 0.25,
      clip.playbackEnd ?? clip.end,
    );
  }
  // Peak-normalize only when necessary, preserving the relative voice/background gain.
  let peak = 1;
  for (const sample of mixed) peak = Math.max(peak, Math.abs(sample));
  if (peak > 1) for (let i = 0; i < mixed.length; i++) mixed[i] /= peak;
  await writePcm16Wav(output, mixed);
}
