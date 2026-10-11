import { mkdtemp, mkdir, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { openBrowserCompositor } from '../src/gen/compositor/browser.js';
import type { CompositorSession } from '../src/gen/compositor/index.js';
import type { RenderConfig } from '../src/types.js';

const harness = vi.hoisted(() => ({
  origin: '',
  config: null as RenderConfig | null,
  launch: vi.fn(),
}));

vi.mock('playwright', () => ({ chromium: { launch: harness.launch } }));

let directory: string;
let session: CompositorSession | undefined;

function configFor(model: string): RenderConfig {
  return {
    width: 1080,
    height: 1920,
    fps: 30,
    avatar: 'mesh',
    avatarConfig: {
      kind: 'mesh',
      model,
      scale: 1,
      x: 0.5,
      y: 0.5,
      padTop: -0.07,
      padSide: -0.18,
      talkGain: 0.55,
    },
    show: { title: 'Test', subtitle: '', clock: '10:00' },
    seed: 42,
    audio: '',
    output: '',
    duration: 1,
    lines: [],
  };
}

beforeEach(async () => {
  directory = await mkdtemp(path.join(tmpdir(), 'mesh-assets-'));
  harness.config = null;
  harness.launch.mockReset().mockResolvedValue({
    newContext: async () => ({
      newPage: async () => ({
        on: () => {},
        goto: async (url: string) => {
          harness.origin = new URL(url).origin;
        },
        waitForFunction: async () => {},
        evaluate: async (_fn: unknown, input: { config: RenderConfig }) => {
          harness.config = input.config;
          return { actions: 0 };
        },
        locator: () => ({}),
      }),
    }),
    close: async () => {},
  });
});

afterEach(async () => {
  await session?.close();
  session = undefined;
  await rm(directory, { recursive: true, force: true });
});

it('serves only the selected archive without exposing its sibling files', async () => {
  const model = path.join(directory, 'Avatar One.MAVATAR');
  const bytes = Buffer.from([0x50, 0x4b, 0, 1, 2]);
  await writeFile(model, bytes);
  await writeFile(path.join(directory, 'secret.txt'), 'private');
  const config = configFor(model);
  session = await openBrowserCompositor(config, new Float32Array(30));

  expect(harness.config?.avatarConfig.model).toBe('/avatar/model.mavatar');
  expect(config.avatarConfig.model).toBe(model);
  const response = await fetch(`${harness.origin}/avatar/model.mavatar`);
  expect(response.status).toBe(200);
  expect(Buffer.from(await response.arrayBuffer())).toEqual(bytes);
  for (const request of [
    '/avatar/secret.txt',
    '/avatar/Avatar%20One.MAVATAR',
    '/avatar/model.mavatar/secret.txt',
    '/avatar/%2e%2e%2fsecret.txt',
  ]) {
    expect((await fetch(harness.origin + request)).status).toBe(404);
  }
});

it('serves project files while rejecting traversal and symlink escapes', async () => {
  const model = path.join(directory, 'project');
  await mkdir(path.join(model, 'built'), { recursive: true });
  await writeFile(path.join(model, 'rig.json'), '{"version":1}');
  await writeFile(path.join(model, 'built/base.png'), 'image');
  const secret = path.join(directory, 'secret.txt');
  await writeFile(secret, 'private');
  await symlink(secret, path.join(model, 'escape.txt'));
  session = await openBrowserCompositor(configFor(model), new Float32Array(30));

  expect(harness.config?.avatarConfig.model).toBe('/avatar/');
  expect(
    await (await fetch(`${harness.origin}/avatar/rig.json`)).json(),
  ).toEqual({
    version: 1,
  });
  expect(
    await (await fetch(`${harness.origin}/avatar/built/base.png`)).text(),
  ).toBe('image');
  for (const request of [
    '/avatar/%2e%2e%2fsecret.txt',
    '/avatar/..%5csecret.txt',
    '/avatar/escape.txt',
    '/avatar/%ZZ',
  ]) {
    expect((await fetch(harness.origin + request)).status).toBe(403);
  }
  expect((await fetch(`${harness.origin}/avatar/missing.png`)).status).toBe(
    404,
  );
});

it('rejects missing models and files that are not archives before launching Chromium', async () => {
  const file = path.join(directory, 'image.png');
  await writeFile(file, 'image');
  for (const model of [file, path.join(directory, 'missing.mavatar')]) {
    await expect(
      openBrowserCompositor(configFor(model), new Float32Array(30)),
    ).rejects.toThrow('.mavatar file or project folder was not found');
  }
  expect(harness.launch).not.toHaveBeenCalled();
});
