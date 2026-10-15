import { build } from 'esbuild';

// Bundle @aituber-onair/core: its dist uses extensionless ESM imports that
// Node cannot resolve directly. Keep only the native canvas module external.
await build({
  entryPoints: { gen: 'src/gen/cli.ts' },
  outdir: 'dist',
  bundle: true,
  splitting: true,
  platform: 'node',
  format: 'esm',
  target: 'node22',
  sourcemap: true,
  logLevel: 'info',
  banner: {
    js: "import { createRequire as yukkuriCreateRequire } from 'node:module'; const require = yukkuriCreateRequire(import.meta.url);",
  },
  external: ['@napi-rs/canvas'],
});
