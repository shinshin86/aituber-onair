import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
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
const pngPath = path.join(workDirectory, 'frame.png');
const motionWorkDirectory = path.join(projectRoot, 'work', 'test-motion-e2e');
const motionScriptPath = path.join(
  projectRoot,
  'tests',
  'fixtures',
  'hello-sine-motion.json',
);
const motionOutputPath = path.join(motionWorkDirectory, 'motion.mp4');
const motionTimingsPath = path.join(motionWorkDirectory, 'motion.timings.json');

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
      else
        reject(
          new Error(`${command} exited with code ${code}\n${stderr || stdout}`),
        );
    });
  });
}

async function md5(filePath: string): Promise<string> {
  return createHash('md5')
    .update(await readFile(filePath))
    .digest('hex');
}

async function changedPixelsInRegion(
  firstPath: string,
  secondPath: string,
  region: { x: number; y: number; width: number; height: number },
): Promise<number> {
  const [first, second] = await Promise.all([
    loadImage(firstPath),
    loadImage(secondPath),
  ]);
  const canvas = createCanvas(first.width, first.height);
  const context = canvas.getContext('2d');
  context.drawImage(first, 0, 0);
  const firstPixels = context.getImageData(
    region.x,
    region.y,
    region.width,
    region.height,
  ).data;
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.drawImage(second, 0, 0);
  const secondPixels = context.getImageData(
    region.x,
    region.y,
    region.width,
    region.height,
  ).data;
  let changed = 0;
  for (let index = 0; index < firstPixels.length; index += 4) {
    const difference = Math.max(
      Math.abs(firstPixels[index] - secondPixels[index]),
      Math.abs(firstPixels[index + 1] - secondPixels[index + 1]),
      Math.abs(firstPixels[index + 2] - secondPixels[index + 2]),
      Math.abs(firstPixels[index + 3] - secondPixels[index + 3]),
    );
    if (difference >= 12) changed += 1;
  }
  return changed;
}

it('creates deterministic vertical H.264/AAC video and a PNG frame', async () => {
  await rm(workDirectory, { recursive: true, force: true });
  const generated = await run(process.execPath, [
    'dist/gen.cjs',
    '--script',
    scriptPath,
    '--output',
    outputPath,
  ]);
  const summary = JSON.parse(generated.stdout).render as {
    mouthFrames: { closed: number; open: number };
    stateFrames: Record<string, number>;
    blinkFrames: number;
  };

  expect((await stat(outputPath)).size).toBeGreaterThan(0);
  expect(summary.mouthFrames.closed).toBeGreaterThan(0);
  expect(summary.mouthFrames.open).toBeGreaterThan(0);
  expect(summary.blinkFrames).toBeGreaterThan(0);
  expect(
    summary.stateFrames.mouth_closed_eyes_closed +
      summary.stateFrames.mouth_open_eyes_closed,
  ).toBeGreaterThan(0);
  const firstHash = await md5(outputPath);
  await run(process.execPath, [
    'dist/gen.cjs',
    '--script',
    scriptPath,
    '--output',
    outputPath,
    '--render-only',
  ]);
  expect(await md5(outputPath)).toBe(firstHash);

  const probe = await run('ffprobe', [
    '-v',
    'error',
    '-show_entries',
    'stream=codec_type,codec_name,width,height,pix_fmt,r_frame_rate',
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
  });
  expect(audio?.codec_name).toBe('aac');

  await run(process.execPath, [
    'dist/gen.cjs',
    '--script',
    scriptPath,
    '--output',
    path.join(workDirectory, 'frame-source.mp4'),
    '--frame',
    '3',
    '--png',
    pngPath,
  ]);
  const png = await loadImage(pngPath);
  expect(png.width).toBe(1080);
  expect(png.height).toBe(1920);
});

it('auto-selects deterministic Anime2.5DRig motion with lip sync and idle movement', async () => {
  expect(
    existsSync(
      path.resolve(projectRoot, '../react-psd-app/public/avatar/sample.psd'),
    ),
  ).toBe(true);
  await rm(motionWorkDirectory, { recursive: true, force: true });

  const first = await run(process.execPath, [
    'dist/gen.cjs',
    '--script',
    motionScriptPath,
    '--output',
    motionOutputPath,
  ]);
  const firstTimings = await readFile(motionTimingsPath, 'utf8');
  const firstHash = await md5(motionOutputPath);
  const firstSummary = JSON.parse(first.stdout).render as {
    frames: number;
    avatarMode: string;
    blinkControl: string;
    mouthFrames: { closed: number; open: number };
    renderPerformance: { averageMsPerFrame: number };
    avatarDiagnostics: {
      runtime: string;
      eyeInput: string;
      canvasSize: { width: number; height: number };
      detection: { usable: boolean; summary: { strandCount: number } };
      virtualClock: {
        seed: number;
        timeMs: number;
        callbacksPerFrame: number;
        pendingCallbacks: number;
      };
    };
  };

  await run(process.execPath, [
    'dist/gen.cjs',
    '--script',
    motionScriptPath,
    '--output',
    motionOutputPath,
  ]);
  expect(await readFile(motionTimingsPath, 'utf8')).toBe(firstTimings);
  expect(await md5(motionOutputPath)).toBe(firstHash);

  expect(firstSummary.avatarMode).toBe('motion');
  expect(firstSummary.blinkControl).toBe('internal-seeded-automation');
  expect(firstSummary.mouthFrames.closed).toBeGreaterThan(0);
  expect(firstSummary.mouthFrames.open).toBeGreaterThan(0);
  expect(firstSummary.renderPerformance.averageMsPerFrame).toBeGreaterThan(0);
  expect(firstSummary.avatarDiagnostics).toMatchObject({
    runtime: 'anime25drig-webgl',
    eyeInput: 'internal-seeded-automation',
    canvasSize: { width: 1024, height: 1536 },
    detection: { usable: true },
    virtualClock: {
      seed: 42,
      callbacksPerFrame: 1,
      pendingCallbacks: 1,
    },
  });
  expect(
    firstSummary.avatarDiagnostics.detection.summary.strandCount,
  ).toBeGreaterThan(0);
  expect(firstSummary.avatarDiagnostics.virtualClock.timeMs).toBeCloseTo(
    ((firstSummary.frames - 1) / 30) * 1000,
    5,
  );

  const probe = await run('ffprobe', [
    '-v',
    'error',
    '-count_frames',
    '-show_entries',
    'stream=codec_type,codec_name,width,height,pix_fmt,r_frame_rate,nb_read_frames',
    '-of',
    'json',
    motionOutputPath,
  ]);
  const streams = JSON.parse(probe.stdout).streams as Array<
    Record<string, string | number>
  >;
  expect(streams.find((stream) => stream.codec_type === 'video')).toMatchObject(
    {
      codec_name: 'h264',
      width: 1080,
      height: 1920,
      pix_fmt: 'yuv420p',
      r_frame_rate: '30/1',
      nb_read_frames: String(firstSummary.frames),
    },
  );
  expect(
    streams.find((stream) => stream.codec_type === 'audio')?.codec_name,
  ).toBe('aac');

  const framePaths = {
    closed: path.join(motionWorkDirectory, 'closed.png'),
    open: path.join(motionWorkDirectory, 'open.png'),
    distant: path.join(motionWorkDirectory, 'distant.png'),
  };
  for (const [name, frame] of [
    ['closed', 0],
    ['open', 3],
    ['distant', 75],
  ] as const) {
    await run(process.execPath, [
      'dist/gen.cjs',
      '--script',
      motionScriptPath,
      '--output',
      path.join(motionWorkDirectory, `${name}-source.mp4`),
      '--frame',
      String(frame),
      '--png',
      framePaths[name],
    ]);
    const image = await loadImage(framePaths[name]);
    expect({ width: image.width, height: image.height }).toEqual({
      width: 1080,
      height: 1920,
    });
  }
  expect(
    await changedPixelsInRegion(framePaths.closed, framePaths.open, {
      x: 420,
      y: 720,
      width: 240,
      height: 260,
    }),
  ).toBeGreaterThan(250);
  expect(
    await changedPixelsInRegion(framePaths.open, framePaths.distant, {
      x: 200,
      y: 320,
      width: 680,
      height: 360,
    }),
  ).toBeGreaterThan(250);
});
