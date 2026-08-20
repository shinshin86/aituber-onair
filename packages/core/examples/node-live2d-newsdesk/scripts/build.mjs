import { copyFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { build } from 'esbuild';

const root = resolve(process.cwd());
const distDir = resolve(root, 'dist');
const harnessDistDir = resolve(distDir, 'harness');

await Promise.all([
  mkdir(distDir, { recursive: true }),
  mkdir(harnessDistDir, { recursive: true }),
]);

// Bundle the Core integration like the coding-agent example. Native, DOM-heavy,
// and runtime-loaded agent SDK dependencies remain external.
await build({
  entryPoints: {
    'script-gen': resolve(root, 'src/script-gen/cli.ts'),
    gen: resolve(root, 'src/gen/cli.ts'),
  },
  outdir: distDir,
  outExtension: { '.js': '.cjs' },
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: 'node22',
  sourcemap: true,
  logLevel: 'info',
  external: [
    '@napi-rs/canvas',
    'linkedom',
    '@mozilla/readability',
    '@openai/codex-sdk',
    'playwright',
  ],
});

await build({
  entryPoints: [resolve(root, 'harness/main.ts')],
  outfile: resolve(harnessDistDir, 'main.js'),
  bundle: true,
  platform: 'browser',
  format: 'esm',
  target: 'chrome120',
  sourcemap: true,
  logLevel: 'info',
});

await copyFile(
  resolve(root, 'harness/index.html'),
  resolve(harnessDistDir, 'index.html'),
);
