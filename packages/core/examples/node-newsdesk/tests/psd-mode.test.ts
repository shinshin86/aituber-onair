import { openPsdCompositor } from '../src/avatars/psd/compositor.js';
import { resolveConfig } from '../src/avatars/psd/adapter.js';
import type { CompositorSession } from '../src/gen/compositor/index.js';
import type { RenderConfig } from '../src/types.js';

const { browserOpen, nodeOpen } = vi.hoisted(() => ({
  browserOpen: vi.fn(),
  nodeOpen: vi.fn(),
}));
vi.mock('../src/gen/compositor/browser.js', () => ({
  openBrowserCompositor: browserOpen,
}));
vi.mock('../src/gen/compositor/node.js', () => ({
  openNodeCompositor: nodeOpen,
}));
vi.mock('../src/avatars/psd/static.js', () => ({
  createStaticAdapter: () => ({ runtime: 'node' }),
}));
function candidate(usable: boolean): CompositorSession {
  return {
    frameFormat: 'png',
    launchMode: 'swiftshader',
    actions: 0,
    avatarDiagnostics: { detection: { usable, reason: 'missing part: face' } },
    renderFrame: vi.fn(),
    close: vi.fn(async () => {}),
  };
}
function config(mode: 'auto' | 'static' | 'motion'): RenderConfig {
  return {
    avatar: 'psd',
    avatarConfig: resolveConfig({ mode }, 'config.json'),
  } as RenderConfig;
}
beforeEach(() => {
  vi.clearAllMocks();
});

it('keeps the usable auto-detected motion session open', async () => {
  const motion = candidate(true);
  browserOpen.mockResolvedValue(motion);
  expect(await openPsdCompositor(config('auto'), new Float32Array())).toBe(
    motion,
  );
  expect(motion.close).not.toHaveBeenCalled();
  expect(nodeOpen).not.toHaveBeenCalled();
});

it('closes the ineligible motion candidate before static fallback', async () => {
  const motion = candidate(false);
  browserOpen.mockResolvedValue(motion);
  nodeOpen.mockImplementation(async () => {
    expect(motion.close).toHaveBeenCalledOnce();
    return { ...candidate(false), frameFormat: 'rgba', launchMode: 'node' };
  });
  expect(
    await openPsdCompositor(config('auto'), new Float32Array()),
  ).toMatchObject({
    launchMode: 'node',
    avatarDiagnostics: {
      requestedMode: 'auto',
      detection: { usable: false, reason: 'missing part: face' },
    },
  });
});

it('closes and reports the exact rigger diagnostic when motion is forced', async () => {
  const motion = candidate(false);
  browserOpen.mockResolvedValue(motion);
  await expect(
    openPsdCompositor(config('motion'), new Float32Array()),
  ).rejects.toThrow('missing part: face');
  expect(motion.close).toHaveBeenCalledOnce();
  expect(nodeOpen).not.toHaveBeenCalled();
});
