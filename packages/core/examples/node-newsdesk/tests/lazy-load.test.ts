import { build } from 'esbuild';
import { loadAvatar, parseAvatarKind } from '../src/avatars/registry.js';

// Loading an unrelated adapter must not run its module body.
vi.mock('../src/avatars/purupuru/adapter.js', () => {
  throw new Error('Unselected Purupuru module was loaded.');
});

it('selects PNGTuber without evaluating any other adapter', async () => {
  expect((await loadAvatar('pngtuber')).runtime).toBe('node');
  expect(() => parseAvatarKind('unknown')).toThrow(/Unknown avatar/);
  await expect(loadAvatar('vrm')).rejects.toThrow(/not available/);
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
    external: ['@napi-rs/canvas'],
  });
  const graph = JSON.stringify(result.metafile);
  expect(graph).not.toMatch(/playwright|puppeteer|three|pixi|cubism/i);
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
