import { mkdir, copyFile, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { build } from 'esbuild';

await mkdir('dist', { recursive: true });
await build({
  entryPoints: {
    'script-gen': resolve('src/script-gen/cli.ts'),
    gen: resolve('src/gen/cli.ts'),
  },
  outdir: 'dist',
  bundle: true,
  splitting: true,
  platform: 'node',
  format: 'esm',
  target: 'node22',
  sourcemap: true,
  metafile: true,
  logLevel: 'info',
  banner: {
    js: "import { createRequire as newsdeskCreateRequire } from 'node:module'; const require = newsdeskCreateRequire(import.meta.url);",
  },
  external: [
    'playwright',
    '@webtoon/psd',
    '@napi-rs/canvas',
    'linkedom',
    '@mozilla/readability',
    '@openai/codex-sdk',
  ],
});

await build({
  entryPoints: ['harness/main.ts'],
  outdir: 'dist/harness',
  bundle: true,
  splitting: true,
  platform: 'browser',
  format: 'esm',
  target: 'chrome120',
  sourcemap: true,
  logLevel: 'info',
});
await copyFile('harness/index.html', 'dist/harness/index.html');

// Use the same read-only vendored UMD wrapper as the original PSD example.
await build({
  entryPoints: ['src/avatars/psd/motionRuntime.ts'],
  outfile: 'dist/harness/motion-runtime.js',
  bundle: true,
  platform: 'browser',
  format: 'esm',
  target: 'chrome120',
  alias: { 'ag-psd': resolve('node_modules/ag-psd') },
  plugins: [
    {
      name: 'anime25drig-umd-global',
      setup(buildContext) {
        buildContext.onLoad(
          { filter: /anime25drig\/rigger\.js$/ },
          async (args) => {
            const source = await readFile(args.path, 'utf8');
            return {
              contents: `var module = undefined;\n${source}\nexport default globalThis.Rigger;\n`,
              loader: 'js',
            };
          },
        );
      },
    },
  ],
  sourcemap: true,
  logLevel: 'info',
});
