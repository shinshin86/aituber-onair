import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { resolveConfig } from '../src/avatars/inochi2d/adapter.js';
import { REQUIRED_RUNTIME_FILES } from '../src/avatars/inochi2d/defaults.js';
import {
  installBrowserVirtualClock,
  VirtualClock,
} from '../src/avatars/inochi2d/virtualClock.js';
import { loadAvatar } from '../src/avatars/registry.js';
import { openBrowserCompositor } from '../src/gen/compositor/browser.js';
import type { RenderConfig } from '../src/types.js';

vi.mock('playwright', () => {
  throw new Error('Chromium was loaded before asset validation.');
});
vi.mock('../src/avatars/inochi2d/engine.js', () => {
  throw new Error('WASM bridge engine was evaluated in Node.');
});

it('loads Inochi2D metadata without evaluating its browser engine', async () => {
  const avatar = await loadAvatar('inochi2d');
  expect(avatar.runtime).toBe('browser');
  const config = avatar.resolveConfig({}, '/path/to/config.json');
  expect(config).toMatchObject({
    kind: 'inochi2d',
    scale: 1,
    x: 0.5,
    y: 0.5,
    intensity: 1,
    framing: { scale: 0.4, x: 0, y: 1800 },
    idleAnimation: 'original_idle_calm_breath',
  });
  expect(config.model).toMatch(/react-inochi2d-app.*Aka.original-rig.inx$/);
});

it('resolves config-relative assets and rejects invalid per-kind settings', () => {
  expect(
    resolveConfig(
      {
        model: 'aka.inx',
        runtime: 'runtime',
        motion: null,
        idleAnimation: null,
        intensity: 0,
        framing: { x: -12 },
      },
      '/path/to/avatar.json',
    ),
  ).toMatchObject({
    model: '/path/to/aka.inx',
    runtime: '/path/to/runtime',
    motion: null,
    idleAnimation: null,
    intensity: 0,
    framing: { x: -12 },
  });
  for (const invalid of [
    { model: 'avatar.json' },
    { runtime: '' },
    { motion: false },
    { motion: 'motion.inx' },
    { idleAnimation: '' },
    { idleAnimation: 1 },
    { framing: null },
    { framing: { scale: 0 } },
    { framing: { y: Number.NaN } },
    { framing: { z: 1 } },
    { intensity: 3.1 },
    { cubismCore: 'core.js' },
  ])
    expect(() => resolveConfig(invalid, '/path/to/avatar.json')).toThrow();
  expect(
    resolveConfig({ model: '~/models/aka.inx' }, 'config.json').model,
  ).not.toContain('~');
});

it('reports missing WASM/model/motion files before launching Chromium', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'newsdesk-inochi2d-'));
  try {
    const avatarConfig = resolveConfig(
      { model: 'aka.inx', runtime: 'runtime', motion: 'motion.json' },
      path.join(directory, 'avatar.json'),
    );
    const config = { avatar: 'inochi2d', avatarConfig } as RenderConfig;
    await expect(
      openBrowserCompositor(config, new Float32Array()),
    ).rejects.toThrow(
      /runtime file inochi_bridge.js was not found.*--avatar-config/,
    );
    await mkdir(avatarConfig.runtime);
    for (const name of REQUIRED_RUNTIME_FILES)
      await writeFile(path.join(avatarConfig.runtime, name), 'test fixture');
    await expect(
      openBrowserCompositor(config, new Float32Array()),
    ).rejects.toThrow(/Inochi2D model was not found/);
    await writeFile(avatarConfig.model, 'test fixture');
    await expect(
      openBrowserCompositor(config, new Float32Array()),
    ).rejects.toThrow(/Inochi2D motion was not found/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

it('flushes rAF once in insertion order and defers nested callbacks', () => {
  const clock = new VirtualClock();
  const calls: [string, number][] = [];
  clock.reset(42);
  clock.requestAnimationFrame((timestamp) => {
    calls.push(['first', timestamp]);
    clock.requestAnimationFrame((next) => calls.push(['nested', next]));
  });
  const cancelled = clock.requestAnimationFrame(() =>
    calls.push(['cancelled', 0]),
  );
  clock.cancelAnimationFrame(cancelled);
  clock.requestAnimationFrame((timestamp) => calls.push(['second', timestamp]));
  clock.advance(1 / 30);
  expect(clock.flushAnimationFrame()).toBe(2);
  expect(calls).toEqual([
    ['first', 1000 / 30],
    ['second', 1000 / 30],
  ]);
  expect(clock.pendingAnimationFrames()).toBe(1);
  clock.advance(1 / 30);
  expect(clock.flushAnimationFrame()).toBe(1);
  expect(calls[2]).toEqual(['nested', 2000 / 30]);
  for (const invalid of [-1, Number.NaN, Number.POSITIVE_INFINITY])
    expect(() => clock.advance(invalid)).toThrow();
});

it('resets the complete clock and seeded random stream between runs', () => {
  const clock = new VirtualClock();
  clock.reset(42);
  const values = Array.from({ length: 10 }, () => clock.random());
  clock.requestAnimationFrame(() => {});
  clock.advance(10);
  clock.reset(42);
  expect(clock.now()).toBe(0);
  expect(clock.pendingAnimationFrames()).toBe(0);
  expect(Array.from({ length: 10 }, () => clock.random())).toEqual(values);
  clock.reset(43);
  expect(Array.from({ length: 10 }, () => clock.random())).not.toEqual(values);
});

it('installs and restores browser clock APIs without leaking virtual time', () => {
  const originalDateNow = Date.now;
  const originalRandom = Math.random;
  const originalRequest = vi.fn();
  const originalCancel = vi.fn();
  const originalPerformanceNow = () => 100;
  const browser = {
    requestAnimationFrame: originalRequest,
    cancelAnimationFrame: originalCancel,
    performance: { now: originalPerformanceNow },
  };
  vi.stubGlobal('window', browser);
  const clock = new VirtualClock();
  clock.reset(42, 123.5);
  const restore = installBrowserVirtualClock(clock);
  try {
    expect(browser.performance.now()).toBe(123.5);
    expect(Date.now()).toBe(123);
    expect(Math.random).not.toBe(originalRandom);
    const callback = vi.fn();
    const id = window.requestAnimationFrame(callback);
    expect(originalRequest).not.toHaveBeenCalled();
    window.cancelAnimationFrame(id);
    expect(clock.pendingAnimationFrames()).toBe(0);
  } finally {
    restore();
    vi.unstubAllGlobals();
  }
  expect(browser.requestAnimationFrame).toBe(originalRequest);
  expect(browser.cancelAnimationFrame).toBe(originalCancel);
  expect(browser.performance.now).toBe(originalPerformanceNow);
  expect(Date.now).toBe(originalDateNow);
  expect(Math.random).toBe(originalRandom);
});
