import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import { createCanvas, loadImage } from '@napi-rs/canvas';

const testDirectory = path.dirname(new URL(import.meta.url).pathname);
const projectRoot = path.resolve(testDirectory, '..', '..');
const workDirectory = path.join(projectRoot, 'work', 'test-gen-e2e');
const fixtureScriptPath = path.join(
  projectRoot,
  'tests',
  'fixtures',
  'hello-sine.json',
);
const firstOutputPath = path.join(workDirectory, 'hello-first.mp4');
const firstTimingsPath = path.join(workDirectory, 'hello-first.timings.json');
const closedPngPath = path.join(workDirectory, 'mouth-closed.png');
const openPngPath = path.join(workDirectory, 'mouth-open.png');
const siblingAssets = [
  path.resolve(
    projectRoot,
    '../react-inochi2d-app/public/inochi2d/runtime/inochi_bridge.js',
  ),
  path.resolve(
    projectRoot,
    '../react-inochi2d-app/public/inochi2d/runtime/inochi2d_bg.wasm',
  ),
  path.resolve(
    projectRoot,
    '../react-inochi2d-app/public/inochi2d/models/Aka.original-rig.inx',
  ),
  path.resolve(
    projectRoot,
    '../react-inochi2d-app/public/inochi2d/models/Aka.original.motion.json',
  ),
];

interface CommandResult {
  stdout: string;
  stderr: string;
}

interface RenderSummary {
  frames: number;
  mouthFrames: { closed: number; open: number };
  mouthExampleFrames: { closed: number | null; open: number | null };
  stateFrames: Record<string, number>;
  blinkFrames: number;
  averageMsPerFrame: number;
  avatarDiagnostics: {
    runtime: string;
    canvasSize: { width: number; height: number };
    mouthParameterId: string;
    mouthParameterKind: string;
    eyeParameterIds: string[];
    idleAnimation: string;
    idleAnimationActive: boolean;
    avatarFraming: { scale: number; x: number; y: number };
    virtualClock: {
      seed: number;
      timeMs: number;
      callbacksPerFrame: number;
      pendingCallbacks: number;
    };
  };
}

function run(command: string, args: string[]): Promise<CommandResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: projectRoot,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve({ stdout, stderr });
      else {
        reject(
          new Error(`${command} exited with code ${code}\n${stderr || stdout}`),
        );
      }
    });
  });
}

async function md5(filePath: string): Promise<string> {
  return createHash('md5')
    .update(await readFile(filePath))
    .digest('hex');
}

async function readPixels(filePath: string): Promise<Uint8ClampedArray> {
  const image = await loadImage(filePath);
  const canvas = createCanvas(image.width, image.height);
  const context = canvas.getContext('2d');
  context.drawImage(image, 0, 0);
  return context.getImageData(0, 0, image.width, image.height).data;
}

function changedPixelCount(
  first: Uint8ClampedArray,
  second: Uint8ClampedArray,
): number {
  let changed = 0;
  for (let index = 0; index < first.length; index += 4) {
    const difference = Math.max(
      Math.abs(first[index] - second[index]),
      Math.abs(first[index + 1] - second[index + 1]),
      Math.abs(first[index + 2] - second[index + 2]),
      Math.abs(first[index + 3] - second[index + 3]),
    );
    if (difference >= 12) changed += 1;
  }
  return changed;
}

function nonBackgroundPixelCount(pixels: Uint8ClampedArray): number {
  let visible = 0;
  for (let index = 0; index < pixels.length; index += 4) {
    if (
      pixels[index] !== 32 ||
      pixels[index + 1] !== 36 ||
      pixels[index + 2] !== 44
    ) {
      visible += 1;
    }
  }
  return visible;
}

it('renders deterministic Inochi2D frames into a vertical H.264/AAC video', async () => {
  expect(siblingAssets.every(existsSync)).toBe(true);
  await rm(workDirectory, { recursive: true, force: true });
  await mkdir(workDirectory, { recursive: true });

  const firstRun = await run(process.execPath, [
    'dist/gen.cjs',
    '--script',
    fixtureScriptPath,
    '--output',
    firstOutputPath,
  ]);
  const firstTimings = await readFile(firstTimingsPath, 'utf8');
  const firstMp4Md5 = await md5(firstOutputPath);
  const secondRun = await run(process.execPath, [
    'dist/gen.cjs',
    '--script',
    fixtureScriptPath,
    '--output',
    firstOutputPath,
  ]);
  const summary = JSON.parse(firstRun.stdout).render as RenderSummary;
  const secondSummary = JSON.parse(secondRun.stdout).render as RenderSummary;

  expect((await stat(firstOutputPath)).size).toBeGreaterThan(0);
  expect(summary.mouthFrames.closed).toBeGreaterThan(0);
  expect(summary.mouthFrames.open).toBeGreaterThan(0);
  expect(summary.blinkFrames).toBeGreaterThan(0);
  expect(
    summary.stateFrames.mouth_closed_eyes_closed +
      summary.stateFrames.mouth_open_eyes_closed,
  ).toBeGreaterThan(0);
  expect(summary.averageMsPerFrame).toBeGreaterThan(0);
  expect(secondSummary.frames).toBe(summary.frames);
  expect(summary.avatarDiagnostics.runtime).toBe('inox2d-wasm-webgl2');
  expect(summary.avatarDiagnostics.canvasSize).toEqual({
    width: 1080,
    height: 1920,
  });
  expect(summary.avatarDiagnostics.mouthParameterId).toBe('Mouth:: Shape');
  expect(summary.avatarDiagnostics.mouthParameterKind).toBe('vec2');
  expect(summary.avatarDiagnostics.eyeParameterIds).toEqual([
    'Eye:: Left:: Blink',
    'Eye:: Right:: Blink',
  ]);
  expect(summary.avatarDiagnostics.idleAnimation).toBe(
    'original_idle_calm_breath',
  );
  expect(summary.avatarDiagnostics.idleAnimationActive).toBe(true);
  expect(summary.avatarDiagnostics.avatarFraming).toEqual({
    scale: 0.65,
    x: 0,
    y: 1450,
  });
  expect(summary.avatarDiagnostics.virtualClock).toMatchObject({
    seed: 42,
    callbacksPerFrame: 1,
    pendingCallbacks: 1,
  });
  expect(summary.avatarDiagnostics.virtualClock.timeMs).toBeCloseTo(
    ((summary.frames - 1) / 30) * 1000,
    5,
  );

  expect(await readFile(firstTimingsPath, 'utf8')).toBe(firstTimings);

  const probe = await run('ffprobe', [
    '-v',
    'error',
    '-count_frames',
    '-show_entries',
    'stream=codec_type,codec_name,width,height,pix_fmt,r_frame_rate,nb_read_frames',
    '-of',
    'json',
    firstOutputPath,
  ]);
  const streams = JSON.parse(probe.stdout).streams as Array<
    Record<string, string | number>
  >;
  const video = streams.find((stream) => stream.codec_type === 'video');
  const audio = streams.find((stream) => stream.codec_type === 'audio');
  expect(video).toMatchObject({
    codec_name: 'h264',
    width: 1080,
    height: 1920,
    pix_fmt: 'yuv420p',
    r_frame_rate: '30/1',
    nb_read_frames: String(summary.frames),
  });
  expect(audio?.codec_name).toBe('aac');

  const closedFrame = summary.mouthExampleFrames.closed;
  const openFrame = summary.mouthExampleFrames.open;
  expect(closedFrame).not.toBeNull();
  expect(openFrame).not.toBeNull();
  await run(process.execPath, [
    'dist/gen.cjs',
    '--script',
    fixtureScriptPath,
    '--output',
    path.join(workDirectory, 'closed-frame-source.mp4'),
    '--frame',
    String(closedFrame),
    '--png',
    closedPngPath,
  ]);
  await run(process.execPath, [
    'dist/gen.cjs',
    '--script',
    fixtureScriptPath,
    '--output',
    path.join(workDirectory, 'open-frame-source.mp4'),
    '--frame',
    String(openFrame),
    '--png',
    openPngPath,
  ]);
  const closedImage = await loadImage(closedPngPath);
  const openImage = await loadImage(openPngPath);
  expect(closedImage.width).toBe(1080);
  expect(closedImage.height).toBe(1920);
  expect(openImage.width).toBe(1080);
  expect(openImage.height).toBe(1920);

  const closedPixels = await readPixels(closedPngPath);
  const openPixels = await readPixels(openPngPath);
  expect(nonBackgroundPixelCount(closedPixels)).toBeGreaterThan(50_000);
  expect(nonBackgroundPixelCount(openPixels)).toBeGreaterThan(50_000);
  expect(changedPixelCount(closedPixels, openPixels)).toBeGreaterThan(500);

  expect(await md5(firstOutputPath)).toBe(firstMp4Md5);
});
