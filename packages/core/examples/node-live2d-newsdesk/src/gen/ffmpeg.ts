import { spawn } from 'node:child_process';
import { once } from 'node:events';
import type { Writable } from 'node:stream';
import type { RenderConfig } from '../types.js';

export function assertFfmpeg(): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn('ffmpeg', ['-version'], {
      stdio: ['ignore', 'ignore', 'pipe'],
    });
    child.on('error', () =>
      reject(new Error('ffmpeg is not installed or not on PATH.')),
    );
    child.on('close', (code) =>
      code === 0 ? resolve() : reject(new Error('ffmpeg check failed.')),
    );
  });
}

/** Write one raw RGBA frame, waiting for back-pressure to clear. */
export async function writeFrame(
  stream: Writable,
  frame: Buffer,
): Promise<void> {
  if (!stream.write(frame)) await once(stream, 'drain');
}

export interface EncodeMp4Options {
  config: RenderConfig;
  writeFrames: (stdin: Writable) => Promise<void>;
}

/**
 * Encode raw RGBA frames from stdin plus the narration WAV into an H.264/AAC
 * MP4. Encoder flags are chosen for deterministic output so the same script
 * renders byte-identically.
 */
export function encodeMp4({
  config,
  writeFrames,
}: EncodeMp4Options): Promise<void> {
  const args = [
    '-y',
    '-v',
    'error',
    '-f',
    'rawvideo',
    '-pixel_format',
    'rgba',
    '-video_size',
    `${config.width}x${config.height}`,
    '-framerate',
    String(config.fps),
    '-i',
    'pipe:0',
    '-i',
    config.audio,
    '-map',
    '0:v:0',
    '-map',
    '1:a:0',
    '-map_metadata',
    '-1',
    '-c:v',
    'libx264',
    '-preset',
    'medium',
    '-crf',
    '18',
    '-pix_fmt',
    'yuv420p',
    '-r',
    String(config.fps),
    '-threads',
    '1',
    '-flags:v',
    '+bitexact',
    '-c:a',
    'aac',
    '-b:a',
    '160k',
    '-flags:a',
    '+bitexact',
    '-shortest',
    '-movflags',
    '+faststart',
    config.output,
  ];
  return new Promise((resolve, reject) => {
    const child = spawn('ffmpeg', args, { stdio: ['pipe', 'ignore', 'pipe'] });
    let stderr = '';
    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    child.on('error', reject);
    child.on('close', (code) =>
      code === 0
        ? resolve()
        : reject(new Error(`ffmpeg exited with code ${code}\n${stderr}`)),
    );
    Promise.resolve()
      .then(() => writeFrames(child.stdin))
      .then(() => child.stdin.end())
      .catch((error: Error) => {
        child.stdin.destroy(error);
        child.kill('SIGTERM');
        reject(error);
      });
  });
}
