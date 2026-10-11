import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { resolveConfig } from '../src/avatars/live2d/adapter.js';
import { warmUpLive2d } from '../src/avatars/live2d/warmup.js';
import { openBrowserCompositor } from '../src/gen/compositor/browser.js';
import { loadAvatar } from '../src/avatars/registry.js';
import type { RenderConfig } from '../src/types.js';

vi.mock('pixi.js', () => {
  throw new Error('PixiJS was evaluated in Node.');
});
vi.mock('pixi-live2d-display-lipsyncpatch/cubism4', () => {
  throw new Error('Cubism display was evaluated in Node.');
});
vi.mock('playwright', () => {
  throw new Error('Chromium was loaded before asset validation.');
});
const raw = {
  model: 'avatar.model3.json',
  cubismCore: 'Core/live2dcubismcore.min.js',
};

it('selects Live2D metadata without loading browser or proprietary code', async () => {
  const avatar = await loadAvatar('live2d');
  expect(avatar.runtime).toBe('browser');
  expect(avatar.resolveConfig(raw, '/path/to/config.json')).toMatchObject({
    kind: 'live2d',
    model: '/path/to/avatar.model3.json',
    cubismCore: '/path/to/Core/live2dcubismcore.min.js',
    scale: 1,
    x: 0.5,
    y: 0.5,
    intensity: 1,
    framing: { scale: 2.5, x: 0.5, y: 0.4 },
    idleMotionGroup: null,
    warmupSeconds: 3,
  });
});

it('requires user-supplied files and rejects invalid Live2D settings', () => {
  expect(() => resolveConfig({}, 'config.json')).toThrow(
    /requires cubismCore.*not bundled or downloaded/,
  );
  expect(() =>
    resolveConfig({ cubismCore: raw.cubismCore }, 'config.json'),
  ).toThrow(/requires model/);
  for (const invalid of [
    { model: 'avatar.json' },
    { cubismCore: false },
    { warmupSeconds: 30.1 },
    { warmupSeconds: Number.NaN },
    { intensity: -1 },
    { idleMotionGroup: '' },
    { idleMotionGroup: false },
    { framing: null },
    { framing: { visibleHeightRatio: 1 } },
    { framing: { scale: 0 } },
    { animation: null },
  ])
    expect(() =>
      resolveConfig({ ...raw, ...invalid }, 'config.json'),
    ).toThrow();
  expect(
    resolveConfig(
      {
        ...raw,
        intensity: 0,
        warmupSeconds: 0,
        idleMotionGroup: 'Idle',
        framing: { x: 0.6 },
      },
      'config.json',
    ),
  ).toMatchObject({
    intensity: 0,
    warmupSeconds: 0,
    idleMotionGroup: 'Idle',
    framing: { scale: 2.5, x: 0.6, y: 0.4 },
  });
  expect(
    resolveConfig({ ...raw, cubismCore: '~/sdk/Core.js' }, 'config.json')
      .cubismCore,
  ).not.toContain('~');
});

it('reports missing Core/model before launching Chromium', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'newsdesk-live2d-'));
  try {
    const config = {
      avatar: 'live2d',
      avatarConfig: resolveConfig(
        { ...raw, cubismCore: 'core.js' },
        path.join(directory, 'config.json'),
      ),
    } as RenderConfig;
    await expect(
      openBrowserCompositor(config, new Float32Array()),
    ).rejects.toThrow(/Cubism Core file was not found.*--avatar-config/);
    await writeFile(
      config.avatarConfig.kind === 'live2d'
        ? config.avatarConfig.cubismCore
        : '',
      '// test fixture',
    );
    await expect(
      openBrowserCompositor(config, new Float32Array()),
    ).rejects.toThrow(/Live2D model file was not found/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

it('settles the model before frame zero using fixed uncaptured updates', () => {
  const advance = vi.fn();
  expect(warmUpLive2d(advance, 0.25, 10)).toEqual({
    configuredSeconds: 0.25,
    settledSeconds: 0.3,
    frames: 3,
    fixedDeltaSeconds: 0.1,
    capturedFrames: 0,
  });
  expect(advance.mock.calls.map(([input]) => input)).toEqual([
    { time: 0.1, deltaSeconds: 0.1, mouth: 0, eyesClosed: false },
    { time: 0.2, deltaSeconds: 0.1, mouth: 0, eyesClosed: false },
    { time: 0.3, deltaSeconds: 0.1, mouth: 0, eyesClosed: false },
  ]);
  advance.mockClear();
  expect(warmUpLive2d(advance, 0, 30).frames).toBe(0);
  expect(advance).not.toHaveBeenCalled();
});
