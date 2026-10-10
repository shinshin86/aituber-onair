import { resolveConfig } from '../src/avatars/psd/adapter.js';
import { loadAvatar } from '../src/avatars/registry.js';
import { openCompositor } from '../src/gen/compositor/index.js';
import type { RenderConfig } from '../src/types.js';

vi.mock('../src/gen/compositor/browser.js', () => {
  throw new Error('Browser compositor was loaded for static PSD.');
});
vi.mock('../src/avatars/psd/engine.js', () => {
  throw new Error('PSD motion engine was loaded in Node.');
});
vi.mock('playwright', () => {
  throw new Error('Chromium was loaded for static PSD.');
});

it('validates PSD-specific config and resolves paths without loading a renderer', async () => {
  const adapter = await loadAvatar('psd');
  expect(adapter.runtime).toBe('hybrid');
  expect(adapter.resolveConfig({}, 'config.json')).toMatchObject({
    kind: 'psd',
    mode: 'auto',
    scale: 1,
    x: 0.5,
    y: 0.5,
    intensity: 1,
    roles: {},
    framing: { scale: 2, x: 0.5, y: 0.8 },
  });
  expect(
    resolveConfig(
      {
        model: 'avatar.psd',
        mode: 'static',
        roles: { mouthOpen: 'Face/Mouth/Open' },
      },
      '/path/to/config.json',
    ),
  ).toMatchObject({
    model: '/path/to/avatar.psd',
    mode: 'static',
    roles: { mouthOpen: 'Face/Mouth/Open' },
  });
  for (const invalid of [
    { mode: 'vrm' },
    { mode: null },
    { model: 'avatar.psb' },
    { roles: { bad: 'Layer' } },
    { roles: { eyesOpen: '' } },
    { roles: { eyesOpen: 1 } },
    { intensity: 3.1 },
    { framing: { scale: 0 } },
    { framing: { x: 1.1 } },
    { framing: { y: null } },
    { framing: { unknown: 1 } },
    { cubismCore: 'core.js' },
  ])
    expect(() => resolveConfig(invalid, 'config.json')).toThrow();
});

it('composites forced static PSD in Node without importing Chromium or motion code', async () => {
  const config: RenderConfig = {
    avatar: 'psd',
    avatarConfig: resolveConfig({ mode: 'static' }, 'config.json'),
    width: 1080,
    height: 1920,
    fps: 30,
    seed: 42,
    duration: 1,
    lines: [],
    show: { title: 'News', subtitle: '', clock: '10:00' },
    audio: '',
    output: '',
  };
  const session = await openCompositor(config, new Float32Array(30));
  try {
    expect(session.launchMode).toBe('node');
    expect(session.avatarDiagnostics).toMatchObject({
      mode: 'static',
      requestedMode: 'static',
    });
    const first = await session.renderFrame(20, 0.8);
    const repeated = await session.renderFrame(20, 0.8);
    expect(first.bytes.equals(repeated.bytes)).toBe(true);
    expect(first.bytes.length).toBe(1080 * 1920 * 4);
  } finally {
    await session.close();
  }
});
