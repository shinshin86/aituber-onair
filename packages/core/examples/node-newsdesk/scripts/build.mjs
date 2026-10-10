import { mkdir, copyFile } from 'node:fs/promises';
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
