import { build } from 'esbuild';
import {
  loadAvatar,
  parseAvatarKind,
  resolveAvatarConfig,
} from '../src/avatars/registry.js';
import { openCompositor } from '../src/gen/compositor/index.js';

// Loading an unrelated adapter must not run its module body.
vi.mock('../src/avatars/purupuru/adapter.js', () => {
  throw new Error('Unselected Purupuru module was loaded.');
});
vi.mock('../src/avatars/vrm/adapter.js', () => {
  throw new Error('Unselected VRM module was loaded.');
});
vi.mock('../src/avatars/mesh/adapter.js', () => {
  throw new Error('Unselected Mesh module was loaded.');
});
vi.mock('../src/avatars/inochi2d/adapter.js', () => {
  throw new Error('Unselected Inochi2D module was loaded.');
});
vi.mock('../src/avatars/psd/adapter.js', () => {
  throw new Error('Unselected PSD module was loaded.');
});
vi.mock('../src/gen/compositor/browser.js', () => {
  throw new Error('Browser compositor was loaded for a Node avatar.');
});

it('selects PNGTuber without evaluating any other adapter', async () => {
  expect((await loadAvatar('pngtuber')).runtime).toBe('node');
  const avatarConfig = await resolveAvatarConfig('pngtuber', {}, 'config.json');
  const stage = await openCompositor(
    {
      width: 1080,
      height: 1920,
      fps: 30,
      avatar: 'pngtuber',
      avatarConfig,
      seed: 42,
      show: { title: 'News', subtitle: '', clock: '10:00' },
      duration: 1,
      lines: [],
      audio: '',
      output: '',
    },
    new Float32Array(30),
  );
  try {
    expect(stage.frameFormat).toBe('rgba');
    await stage.renderFrame(0, 0);
  } finally {
    await stage.close();
  }
  expect(() => parseAvatarKind('unknown')).toThrow(/Unknown avatar/);
});

it('keeps optional browser runtimes out of the Node CLI module graph', async () => {
  const result = await build({
    entryPoints: ['src/gen/cli.ts'],
    bundle: true,
    splitting: true,
    platform: 'node',
    format: 'esm',
    outdir: 'dist',
    write: false,
    metafile: true,
    external: ['@napi-rs/canvas', 'playwright'],
  });
  const outputs = result.metafile?.outputs ?? {};
  const entry = Object.keys(outputs).find(
    (key) => outputs[key].entryPoint === 'src/gen/cli.ts',
  );
  expect(entry).toBeDefined();
  const visited = new Set<string>();
  const visit = (file: string) => {
    if (visited.has(file)) return;
    visited.add(file);
    for (const dependency of outputs[file]?.imports ?? []) {
      if (dependency.kind !== 'dynamic-import' && !dependency.external)
        visit(dependency.path);
    }
  };
  if (entry) visit(entry);
  const graph = JSON.stringify([...visited].map((file) => outputs[file]));
  expect(graph).not.toMatch(/playwright|puppeteer|three|pixi|cubism|inochi2d/i);
  const registryOutput = Object.values(result.metafile?.outputs ?? {}).find(
    (output) =>
      Object.keys(output.inputs).some((input) =>
        input.endsWith('avatars/registry.ts'),
      ),
  );
  expect(
    registryOutput?.imports.some((value) => value.kind === 'dynamic-import'),
  ).toBe(true);
});
