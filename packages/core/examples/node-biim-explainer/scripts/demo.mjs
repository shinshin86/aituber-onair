import { spawnSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { createCanvas } from '@napi-rs/canvas';

await mkdir('work', { recursive: true });
// Original calibration shapes and a quiet tone; no third-party footage.
const result = spawnSync(
  'ffmpeg',
  [
    '-y',
    '-v',
    'error',
    '-f',
    'lavfi',
    '-i',
    'testsrc2=size=640x360:rate=30:duration=4',
    '-f',
    'lavfi',
    '-i',
    'sine=frequency=220:sample_rate=48000:duration=4',
    '-af',
    'volume=0.2',
    '-c:v',
    'libx264',
    '-pix_fmt',
    'yuv420p',
    '-threads',
    '1',
    '-c:a',
    'aac',
    '-shortest',
    'work/demo.mp4',
  ],
  { encoding: 'utf8' },
);
if (result.error || result.status !== 0)
  throw new Error(
    `Demo generation requires ffmpeg on PATH: ${result.error?.message ?? result.stderr}`,
  );
const canvas = createCanvas(800, 500);
const ctx = canvas.getContext('2d');
ctx.fillStyle = '#132b45';
ctx.fillRect(0, 0, 800, 500);
ctx.fillStyle = '#ffe062';
ctx.fillRect(80, 80, 240, 240);
ctx.fillStyle = '#68d5d1';
ctx.beginPath();
ctx.arc(540, 240, 130, 0, Math.PI * 2);
ctx.fill();
ctx.fillStyle = '#ffffff';
ctx.font = '36px sans-serif';
ctx.fillText('Original shapes / JSON timeline', 80, 430);
await writeFile('work/demo-slide.png', canvas.toBuffer('image/png'));
