import { resolveConfig } from '../src/avatars/vrm/adapter.js';
import { loadAvatar } from '../src/avatars/registry.js';

vi.mock('three', () => {
  throw new Error('three.js was evaluated in Node.');
});
vi.mock('@pixiv/three-vrm', () => {
  throw new Error('VRM runtime was evaluated in Node.');
});
vi.mock('@pixiv/three-vrm-animation', () => {
  throw new Error('VRMA runtime was evaluated in Node.');
});

it('selects VRM metadata without evaluating its browser runtime', async () => {
  const avatar = await loadAvatar('vrm');
  expect(avatar.runtime).toBe('browser');
  expect(avatar.resolveConfig({}, 'config.json')).toMatchObject({
    kind: 'vrm',
    intensity: 1,
    framing: { visibleHeightRatio: 0.39, lookAtHeightRatio: 0.845 },
    lighting: { ambientIntensity: 1.4, directionalIntensity: 2.35 },
  });
});

it('resolves model/animation paths and permits an explicit static pose', () => {
  expect(
    resolveConfig(
      { model: 'm.vrm', animation: 'idle.vrma' },
      '/path/to/config.json',
    ),
  ).toMatchObject({ model: '/path/to/m.vrm', animation: '/path/to/idle.vrma' });
  expect(
    resolveConfig({ animation: null, intensity: 0 }, 'config.json'),
  ).toMatchObject({ animation: null, intensity: 0 });
  expect(
    resolveConfig(
      {
        framing: { visibleHeightRatio: 0.5 },
        lighting: { ambientIntensity: 0 },
      },
      'config.json',
    ),
  ).toMatchObject({
    framing: { visibleHeightRatio: 0.5, lookAtHeightRatio: 0.845 },
    lighting: { ambientIntensity: 0, directionalIntensity: 2.35 },
  });
});

it('rejects incorrect per-kind, nested, and numeric settings before rendering', () => {
  for (const raw of [
    { padTop: 0 },
    { animation: '' },
    { animation: false },
    { intensity: 3.1 },
    { framing: null },
    { framing: { visibleHeightRatio: 0 } },
    { framing: { scale: 1 } },
    { lighting: { ambientIntensity: 'bright' } },
    { lighting: { directionalIntensity: Number.NaN } },
  ]) {
    expect(() => resolveConfig(raw, 'config.json')).toThrow();
  }
});
