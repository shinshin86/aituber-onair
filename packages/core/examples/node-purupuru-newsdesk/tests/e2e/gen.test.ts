import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFile, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import { loadImage } from '@napi-rs/canvas';

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

it('creates deterministic vertical H.264/AAC video and a PNG frame', async () => {
  await rm(workDirectory, { recursive: true, force: true });
  await run(process.execPath, [
    'dist/gen.cjs',
    '--script',
    scriptPath,
    '--output',
    outputPath,
  ]);

  expect((await stat(outputPath)).size).toBeGreaterThan(0);
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
