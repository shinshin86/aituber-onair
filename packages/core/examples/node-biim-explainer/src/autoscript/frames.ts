import { spawn } from 'node:child_process';
import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { runCommand } from '../gen/process.js';

export interface Sample {
  at: number;
  difference: number;
  reasons: string[];
}
export function difference(a: Uint8Array, b: Uint8Array): number {
  if (a.length !== b.length || !a.length)
    throw new Error('Mismatched frame dimensions');
  return (
    a.reduce((sum, pixel, i) => sum + Math.abs(pixel - b[i]), 0) /
    (a.length * 255)
  );
}
/** Sample on a one-second analysis grid. Cap evenly across the whole video. */
export function selectFrames(
  deltas: number[],
  interval: number,
  threshold: number,
  cap: number,
): Sample[] {
  if (
    !Number.isFinite(interval) ||
    interval < 1 ||
    !Number.isInteger(cap) ||
    cap < 1 ||
    threshold <= 0 ||
    threshold > 1
  )
    throw new Error('Invalid sampling settings');
  const candidates: Sample[] = [];
  let nextFixed = 0;
  for (let at = 0; at < deltas.length; at++) {
    const reasons: string[] = [];
    if (at >= nextFixed) {
      reasons.push('interval');
      nextFixed = at + interval;
    }
    if (at && deltas[at] >= threshold) reasons.push('scene-change');
    if (reasons.length)
      candidates.push({ at, difference: deltas[at], reasons });
  }
  if (candidates.length <= cap) return candidates;
  if (cap === 1) return candidates.slice(0, 1);
  return Array.from(
    { length: cap },
    (_, i) => candidates[Math.round((i * (candidates.length - 1)) / (cap - 1))],
  );
}
export async function probeDuration(filename: string): Promise<number> {
  const { stdout } = await runCommand('ffprobe', [
    '-v',
    'error',
    '-select_streams',
    'v:0',
    '-show_entries',
    'stream=duration:format=duration',
    '-of',
    'json',
    filename,
  ]);
  const info = JSON.parse(stdout);
  if (!info.streams?.length) throw new Error('Input has no video stream');
  const duration = Number(info.streams[0].duration ?? info.format?.duration);
  if (!Number.isFinite(duration) || duration <= 0)
    throw new Error('Cannot determine video duration');
  return duration;
}
async function scan(filename: string): Promise<number[]> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      'ffmpeg',
      [
        '-v',
        'error',
        '-i',
        filename,
        '-vf',
        'fps=1:start_time=0,scale=64:36',
        '-an',
        '-pix_fmt',
        'gray',
        '-f',
        'rawvideo',
        'pipe:1',
      ],
      { stdio: ['ignore', 'pipe', 'pipe'] },
    );
    let pending = Buffer.alloc(0);
    let previous: Buffer | undefined;
    let stderr = '';
    const deltas: number[] = [];
    child.stdout.on('data', (chunk: Buffer) => {
      pending = Buffer.concat([pending, chunk]);
      while (pending.length >= 64 * 36) {
        const current = pending.subarray(0, 64 * 36);
        deltas.push(previous ? difference(previous, current) : 0);
        previous = Buffer.from(current);
        pending = pending.subarray(64 * 36);
      }
    });
    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk;
    });
    child.on('error', reject);
    child.on('close', (code) =>
      code === 0
        ? resolve(deltas)
        : reject(new Error(`ffmpeg frame scan failed: ${stderr}`)),
    );
  });
}
export async function sampleVideo(
  filename: string,
  directory: string,
  settings: {
    interval: number;
    threshold: number;
    cap: number;
    times?: number[];
  },
) {
  const duration = await probeDuration(filename);
  let samples = selectFrames(
    await scan(filename),
    settings.interval,
    settings.threshold,
    settings.cap,
  ).filter((f) => f.at < duration);
  if (settings.times) {
    const times = [...new Set(settings.times)].sort((a, b) => a - b);
    if (times.some((at) => !Number.isFinite(at) || at < 0 || at >= duration))
      throw new Error('External event time is outside the source video');
    if (times.length > settings.cap)
      throw new Error(
        'Event frames exceed --max-frames; increase the cap to retain exact event times',
      );
    const regular = samples.filter(
      (f) => !times.some((at) => Math.abs(at - f.at) < 1e-6),
    );
    const budget = settings.cap - times.length;
    const chosen =
      regular.length <= budget
        ? regular
        : budget <= 0
          ? []
          : Array.from(
              { length: budget },
              (_, i) =>
                regular[
                  Math.min(
                    regular.length - 1,
                    Math.floor((i * regular.length) / budget),
                  )
                ],
            );
    samples = [
      ...chosen,
      ...times.map((at) => ({
        at,
        difference: 0,
        reasons: ['external-event'],
      })),
    ].sort((a, b) => a.at - b.at);
  }
  if (!samples.length) throw new Error('No video frames could be sampled');
  await mkdir(directory, { recursive: true });
  if (settings.times) {
    let next = 0;
    await Promise.all(
      Array.from({ length: 3 }, async () => {
        while (next < samples.length) {
          const i = next++;
          await runCommand('ffmpeg', [
            '-y',
            '-v',
            'error',
            '-ss',
            String(samples[i].at),
            '-i',
            filename,
            '-vf',
            'scale=640:-2',
            '-frames:v',
            '1',
            path.join(directory, `${String(i + 1).padStart(4, '0')}.png`),
          ]);
        }
      }),
    );
  } else {
    const select = samples.map((s) => `eq(n\\,${s.at})`).join('+');
    await runCommand('ffmpeg', [
      '-y',
      '-v',
      'error',
      '-i',
      filename,
      '-vf',
      `fps=1:start_time=0,select=${select},scale=640:-2`,
      '-fps_mode',
      'vfr',
      path.join(directory, '%04d.png'),
    ]);
  }
  const frames = await Promise.all(
    samples.map(async (sample, i) => ({
      ...sample,
      image: (
        await readFile(
          path.join(directory, `${String(i + 1).padStart(4, '0')}.png`),
        )
      ).toString('base64'),
    })),
  );
  return { duration, frames };
}
