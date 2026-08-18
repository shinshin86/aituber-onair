import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { build } from 'esbuild';

const root = resolve(process.cwd());
const distDir = resolve(root, 'dist');

await mkdir(distDir, { recursive: true });

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
  ],
});
