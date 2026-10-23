import { build } from 'esbuild';

// Bundle @aituber-onair/core: its dist uses extensionless ESM imports that
// Node cannot resolve directly. Keep only the native canvas module external.
await build({
  entryPoints: {
    gen: 'src/gen/cli.ts',
    autoscript: 'src/autoscript/cli.ts',
    'demo-cache': 'src/autoscript/demo-cache.ts',
  },
  outdir: 'dist',
  bundle: true,
  splitting: true,
  platform: 'node',
  format: 'esm',
  target: 'node22',
  sourcemap: true,
  logLevel: 'info',
  banner: {
    js: "import { createRequire as biimCreateRequire } from 'node:module'; const require = biimCreateRequire(import.meta.url);",
  },
  external: ['@napi-rs/canvas'],
});

await import('./demo.mjs');
await import('./dungeon-demo.mjs');
