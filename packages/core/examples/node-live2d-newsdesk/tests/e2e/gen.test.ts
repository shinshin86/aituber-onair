import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import os from 'node:os';
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
const scriptPath = path.join(workDirectory, 'hello-sine.local.json');
const outputPath = path.join(workDirectory, 'hello.mp4');
const timingsPath = path.join(workDirectory, 'hello.timings.json');
const closedPngPath = path.join(workDirectory, 'mouth-closed.png');
const openPngPath = path.join(workDirectory, 'mouth-open.png');
const cubismCorePath =
  process.env.LIVE2D_CORE_PATH ||
  path.resolve(
    projectRoot,
    '../react-live2d-app/public/scripts/live2dcubismcore.min.js',
  );
const live2DModelPath =
  process.env.LIVE2D_MODEL_PATH ||
  path.join(
    os.homedir(),
    'Documents',
    'live2d_models',
    'hiyori_pro_jp',
    'runtime',
    'hiyori_pro_t11.model3.json',
  );
const missingAssets = [
  !existsSync(cubismCorePath) ? 'LIVE2D_CORE_PATH' : null,
  !existsSync(live2DModelPath) ? 'LIVE2D_MODEL_PATH' : null,
].filter((value): value is string => value !== null);

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

const live2dIt = missingAssets.length === 0 ? it : it.skip;
live2dIt(
  `renders changing Live2D frames into a vertical H.264/AAC video${
    missingAssets.length > 0 ? ` (missing ${missingAssets.join(' and ')})` : ''
  }`,
  async () => {
    await rm(workDirectory, { recursive: true, force: true });
    await mkdir(workDirectory, { recursive: true });
    const fixture = JSON.parse(await readFile(fixtureScriptPath, 'utf8')) as {
      avatar: string;
      cubismCore: string;
      [key: string]: unknown;
    };
    await writeFile(
      scriptPath,
      `${JSON.stringify(
        { ...fixture, avatar: live2DModelPath, cubismCore: cubismCorePath },
        null,
        2,
      )}\n`,
      'utf8',
    );

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
        coreVersion: string;
        modelSize: { width: number; height: number };
        mouthParameterId: string | null;
        eyeParameterIds: string[];
        idleMotionGroup: string | null;
        idleMotionActive: boolean;
        avatarFraming: {
          scale: number;
          x: number;
          y: number;
          renderedScale: number;
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
    expect(summary.avatarDiagnostics.coreVersion).toMatch(/^\d+\.\d+\.\d+$/);
    expect(summary.avatarDiagnostics.modelSize.width).toBeGreaterThan(0);
    expect(summary.avatarDiagnostics.modelSize.height).toBeGreaterThan(0);
    expect(summary.avatarDiagnostics.mouthParameterId).not.toBeNull();
    expect(summary.avatarDiagnostics.eyeParameterIds).toEqual([
      'ParamEyeLOpen',
      'ParamEyeROpen',
    ]);
    expect(summary.avatarDiagnostics.idleMotionGroup).toBe('Idle');
    expect(summary.avatarDiagnostics.idleMotionActive).toBe(true);
    expect(summary.avatarDiagnostics.avatarFraming).toMatchObject({
      scale: 2.5,
      x: 0.5,
      y: 0.4,
    });
    expect(
      summary.avatarDiagnostics.avatarFraming.renderedScale,
    ).toBeGreaterThan(0);

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
    expect(changedPixelCount(closedPixels, openPixels)).toBeGreaterThan(500);
  },
);
