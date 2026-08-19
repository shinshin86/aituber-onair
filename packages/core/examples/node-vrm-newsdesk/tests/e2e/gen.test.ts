import { spawn } from 'node:child_process';
import { readFile, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import { createCanvas, loadImage } from '@napi-rs/canvas';

const testDirectory = path.dirname(new URL(import.meta.url).pathname);
const projectRoot = path.resolve(testDirectory, '..', '..');
const workDirectory = path.join(projectRoot, 'work', 'test-gen-e2e');
const scriptPath = path.join(
  projectRoot,
  'tests',
  'fixtures',
  'hello-sine.json',
);
const outputPath = path.join(workDirectory, 'hello.mp4');
const timingsPath = path.join(workDirectory, 'hello.timings.json');
const closedPngPath = path.join(workDirectory, 'mouth-closed.png');
const openPngPath = path.join(workDirectory, 'mouth-open.png');

interface CommandResult {
  stdout: string;
  stderr: string;
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

function firstAvatarPixelY(pixels: Uint8ClampedArray): number | null {
  for (let y = 220; y < 600; y += 1) {
    for (let x = 100; x < 980; x += 1) {
      const index = (y * 1080 + x) * 4;
      const difference = Math.max(
        Math.abs(pixels[index] - 32),
        Math.abs(pixels[index + 1] - 36),
        Math.abs(pixels[index + 2] - 44),
      );
      if (difference >= 12) return y;
    }
  }
  return null;
}

it('renders changing VRM frames into a vertical H.264/AAC video', async () => {
  await rm(workDirectory, { recursive: true, force: true });
  const generated = await run(process.execPath, [
    'dist/gen.cjs',
    '--script',
    scriptPath,
    '--output',
    outputPath,
  ]);
  const summary = JSON.parse(generated.stdout).render as {
    frames: number;
    mouthFrames: { closed: number; open: number };
    mouthExampleFrames: { closed: number | null; open: number | null };
    stateFrames: Record<string, number>;
    blinkFrames: number;
    averageMsPerFrame: number;
    avatarDiagnostics: {
      cameraDistance: number;
      avatarFraming: {
        visibleHeightRatio: number;
        lookAtHeightRatio: number;
        portraitWidthAdjusted: boolean;
      };
      avatarLighting: {
        ambientIntensity: number;
        directionalIntensity: number;
      };
    };
  };

  expect((await stat(outputPath)).size).toBeGreaterThan(0);
  expect(summary.mouthFrames.closed).toBeGreaterThan(0);
  expect(summary.mouthFrames.open).toBeGreaterThan(0);
  expect(summary.blinkFrames).toBeGreaterThan(0);
  expect(
    summary.stateFrames.mouth_closed_eyes_closed +
      summary.stateFrames.mouth_open_eyes_closed,
  ).toBeGreaterThan(0);
  expect(summary.averageMsPerFrame).toBeGreaterThan(0);
  expect(summary.avatarDiagnostics.cameraDistance).toBeGreaterThan(0);
  expect(summary.avatarDiagnostics.avatarFraming).toEqual({
    visibleHeightRatio: 0.39,
    lookAtHeightRatio: 0.845,
    portraitWidthAdjusted: true,
  });
  expect(summary.avatarDiagnostics.avatarLighting).toEqual({
    ambientIntensity: 1.4,
    directionalIntensity: 2.35,
  });

  const firstTimings = await readFile(timingsPath, 'utf8');
  await run(process.execPath, [
    'dist/gen.cjs',
    '--script',
    scriptPath,
    '--output',
    outputPath,
    '--render-only',
  ]);
  expect(await readFile(timingsPath, 'utf8')).toBe(firstTimings);

  const probe = await run('ffprobe', [
    '-v',
    'error',
    '-count_frames',
    '-show_entries',
    'stream=codec_type,codec_name,width,height,pix_fmt,r_frame_rate,nb_read_frames',
    '-of',
    'json',
    outputPath,
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
    scriptPath,
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
    scriptPath,
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
  expect(firstAvatarPixelY(closedPixels)).toBeGreaterThanOrEqual(250);
  expect(firstAvatarPixelY(closedPixels)).toBeLessThanOrEqual(340);
  expect(changedPixelCount(closedPixels, openPixels)).toBeGreaterThan(500);
});
